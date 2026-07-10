package main

import (
	"strings"
)

// Native evaluator cho cây điều kiện JSON (schema arishem-style, research/R6 §A.1).
// Đây là engine mặc định — chạy được NGAY không cần lib arishem. Khi đã xác minh
// JSON schema arishem thật, thay hàm evalCondition bằng arishem.Compile/Eval
// (seam: chỉ đổi file này, contract HTTP /evaluate giữ nguyên).
//
// conditionJson mẫu:
//   { "logic":"and", "sub_conditions":[
//       {"lhs":{"fact":"action.amount"}, "op":"gt", "rhs":{"const":5000000}} ]}

type condition struct {
	Logic         string        `json:"logic"`          // "and" | "or"
	SubConditions []condition   `json:"sub_conditions"` // nhóm lồng
	LHS           *operand      `json:"lhs"`            // lá: vế trái
	Op            string        `json:"op"`             // eq|ne|gt|gte|lt|lte|in|contains|regex|exists
	RHS           *operand      `json:"rhs"`            // lá: vế phải
}

type operand struct {
	Fact  *string      `json:"fact"`  // đường dẫn dot trong context, vd "action.amount"
	Const interface{}  `json:"const"` // hằng
}

// evalCondition trả true nếu context khớp điều kiện. Rỗng (không lá, không nhóm) → true.
func evalCondition(c condition, ctx map[string]interface{}) bool {
	// Nhóm logic
	if len(c.SubConditions) > 0 {
		if strings.EqualFold(c.Logic, "or") {
			for _, sc := range c.SubConditions {
				if evalCondition(sc, ctx) {
					return true
				}
			}
			return false
		}
		// mặc định "and"
		for _, sc := range c.SubConditions {
			if !evalCondition(sc, ctx) {
				return false
			}
		}
		return true
	}
	// Lá
	if c.LHS == nil {
		return true // điều kiện rỗng = luôn khớp
	}
	left := resolveOperand(*c.LHS, ctx)
	var right interface{}
	if c.RHS != nil {
		right = resolveOperand(*c.RHS, ctx)
	}
	return applyOp(c.Op, left, right)
}

func resolveOperand(o operand, ctx map[string]interface{}) interface{} {
	if o.Fact != nil {
		return lookup(ctx, *o.Fact)
	}
	return o.Const
}

// lookup đọc giá trị theo đường dẫn dot (a.b.c) trong map lồng nhau.
func lookup(ctx map[string]interface{}, path string) interface{} {
	cur := interface{}(ctx)
	for _, k := range strings.Split(path, ".") {
		m, ok := cur.(map[string]interface{})
		if !ok {
			return nil
		}
		cur = m[k]
	}
	return cur
}

func applyOp(op string, l, r interface{}) bool {
	switch op {
	case "exists":
		return l != nil
	case "eq":
		return equalLoose(l, r)
	case "ne":
		return !equalLoose(l, r)
	case "gt", "gte", "lt", "lte":
		lf, lok := toFloat(l)
		rf, rok := toFloat(r)
		if !lok || !rok {
			return false
		}
		switch op {
		case "gt":
			return lf > rf
		case "gte":
			return lf >= rf
		case "lt":
			return lf < rf
		case "lte":
			return lf <= rf
		}
	case "in":
		if arr, ok := r.([]interface{}); ok {
			for _, item := range arr {
				if equalLoose(l, item) {
					return true
				}
			}
		}
		return false
	case "contains":
		ls, lok := l.(string)
		rs, rok := r.(string)
		return lok && rok && strings.Contains(ls, rs)
	}
	return false
}

func equalLoose(a, b interface{}) bool {
	if af, aok := toFloat(a); aok {
		if bf, bok := toFloat(b); bok {
			return af == bf
		}
	}
	return toStr(a) == toStr(b)
}

func toFloat(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	}
	return 0, false
}

func toStr(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	if v == nil {
		return ""
	}
	return ""
}
