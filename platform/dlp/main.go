// svc-dlp — mask PII trước khi prompt rời hệ thống (research/R6 §B, Nghị định 13).
// HTTP POST /mask {text} -> {masked, findings:[{type,count}]}.
// Engine mặc định = regex ruleset VN (chạy được NGAY, không cần lib godlp). godlp
// là seam nâng cấp: thay hàm maskText bằng godlp.Deidentify khi đã xác minh API.
// KHÔNG trả giá trị PII — chỉ loại + số lượng (log Langfuse).
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"regexp"
)

type detector struct {
	name    string
	re      *regexp.Regexp
	keepEnd int // giữ N ký tự cuối, còn lại thay '*'
}

// Ruleset PII VN — đồng bộ platform/dlp/rules-vn.yaml (research/R6 §6).
// Thứ tự QUAN TRỌNG: detector chạy trước thay match trước. Xếp theo độ dài/độ
// đặc thù giảm dần để dãy dài (thẻ 16, CCCD 12) không bị dãy ngắn ăn mất.
var detectors = []detector{
	{"bank_card", regexp.MustCompile(`\b(?:\d[ -]?){16}\b`), 4},
	{"cccd_12", regexp.MustCompile(`\b0\d{11}\b`), 4},
	{"phone_vn", regexp.MustCompile(`(?:\+84|0)(?:3|5|7|8|9)\d{8}`), 3},
	// Số tài khoản NH: CHỈ khớp khi có keyword neo (STK/tài khoản) để KHÔNG
	// mask nhầm mọi dãy số. Chỉ phần chữ số bị che (giữ nhãn) — xem maskValue.
	{"bank_account", regexp.MustCompile(`(?i)(?:số tài khoản|tài khoản|stk)\s*[:.]?\s*\d{8,16}`), 4},
	{"mst", regexp.MustCompile(`\b\d{10}(?:-\d{3})?\b`), 3},
	{"cmnd_9", regexp.MustCompile(`\b\d{9}\b`), 3},
	{"email", regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`), 0},
	{"bien_so_xe", regexp.MustCompile(`\b\d{2}[A-Z]{1,2}[- ]?\d{3,5}\b`), 0},
}

type maskReq struct {
	Text string `json:"text"`
}
type finding struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}
type maskResp struct {
	Masked   string    `json:"masked"`
	Findings []finding `json:"findings"`
}

func maskText(text string) (string, []finding) {
	findings := []finding{}
	out := text
	for _, d := range detectors {
		matches := d.re.FindAllString(out, -1)
		if len(matches) == 0 {
			continue
		}
		findings = append(findings, finding{Type: d.name, Count: len(matches)})
		out = d.re.ReplaceAllStringFunc(out, func(m string) string {
			return maskValue(m, d.keepEnd)
		})
	}
	return out, findings
}

func maskValue(s string, keepEnd int) string {
	r := []rune(s)
	if keepEnd <= 0 || keepEnd >= len(r) {
		return string(regexpNonSpace(r))
	}
	masked := make([]rune, 0, len(r))
	cut := len(r) - keepEnd
	for i, c := range r {
		if i < cut && c != ' ' && c != '-' {
			masked = append(masked, '*')
		} else {
			masked = append(masked, c)
		}
	}
	return string(masked)
}

func regexpNonSpace(r []rune) []rune {
	out := make([]rune, len(r))
	for i, c := range r {
		if c == ' ' || c == '-' || c == '@' || c == '.' {
			out[i] = c
		} else {
			out[i] = '*'
		}
	}
	return out
}

func main() {
	http.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	http.HandleFunc("/mask", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}
		var req maskReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		masked, findings := maskText(req.Text)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(maskResp{Masked: masked, Findings: findings})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("svc-dlp nghe :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
