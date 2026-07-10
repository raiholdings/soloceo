// svc-rules-engine — HITL gate (arishem) cho SoloCEO OS v2 (research/R6 §A).
// HTTP POST /evaluate {action, context} -> {decision, ruleId, tier}. Đọc bảng Rule
// từ Postgres, đánh giá cây điều kiện (evaluator.go). Fail-safe: không match →
// DEFAULT_ACTION_POLICY (đồng bộ packages/shared). api-core còn 1 lớp fail-closed nữa.
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Đồng bộ với packages/shared/src/constants/sensitive-actions.ts (DEFAULT_ACTION_POLICY).
var defaultPolicy = map[string]struct {
	Decision string
	Tier     int
}{
	"spend_money":        {"REQUIRE_APPROVAL", 2},
	"send_bulk_email":    {"REQUIRE_APPROVAL", 1},
	"submit_application": {"REQUIRE_APPROVAL", 2},
	"sign_document":      {"REQUIRE_APPROVAL", 2},
	"publish_public":     {"REQUIRE_APPROVAL", 1},
	"delete_data":        {"REQUIRE_APPROVAL", 2},
	"deploy_infra":       {"REQUIRE_APPROVAL", 1},
	"transfer_ownership": {"REQUIRE_APPROVAL", 2},
	"export_pii":         {"REQUIRE_APPROVAL", 2},
}

type evalReq struct {
	Action  string                 `json:"action"`
	Context map[string]interface{} `json:"context"`
}
type evalResp struct {
	Decision string `json:"decision"`
	RuleID   string `json:"ruleId,omitempty"`
	Tier     int    `json:"tier,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

var pool *pgxpool.Pool

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL bắt buộc")
	}
	var err error
	pool, err = pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("kết nối DB lỗi: %v", err)
	}
	defer pool.Close()

	http.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	http.HandleFunc("/evaluate", handleEvaluate)

	addr := ":" + envOr("PORT", "8080")
	log.Printf("svc-rules-engine nghe %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func handleEvaluate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	var req evalReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	orgID, _ := req.Context["orgId"].(string)

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	// Rule áp dụng: đúng action, bật, của org này hoặc toàn nền tảng; ưu tiên priority nhỏ.
	rows, err := pool.Query(ctx,
		`SELECT id, decision, COALESCE("approvalTier",0), "conditionJson"
		   FROM "Rule"
		  WHERE enabled AND "actionType"=$1 AND ("orgId"=$2 OR "orgId" IS NULL)
		  ORDER BY priority ASC, ("orgId" IS NULL) ASC`, req.Action, orgID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, decision string
			var tier int
			var condRaw []byte
			if err := rows.Scan(&id, &decision, &tier, &condRaw); err != nil {
				continue
			}
			var cond condition
			if len(condRaw) > 0 {
				_ = json.Unmarshal(condRaw, &cond)
			}
			if evalCondition(cond, req.Context) {
				writeJSON(w, evalResp{Decision: decision, RuleID: id, Tier: tier})
				return
			}
		}
	} else {
		log.Printf("query rule lỗi: %v", err)
	}

	// Không rule nào khớp → chính sách mặc định (fail-safe).
	if p, ok := defaultPolicy[req.Action]; ok {
		writeJSON(w, evalResp{Decision: p.Decision, Tier: p.Tier, Reason: "default_policy"})
		return
	}
	// Action không nhạy cảm → cho phép.
	writeJSON(w, evalResp{Decision: "ALLOW", Reason: "not_sensitive"})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
