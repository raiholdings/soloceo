base="/opt/deerflow/frontend/src/components/landing/sections"
repl={
"case-study-section.tsx":[
  ('title="Case Studies"','title="Câu chuyện thành công"'),
  ('subtitle="See how SoloCEO AI is used in the wild"','subtitle="Các Solo CEO đang dùng SoloCEO AI để vận hành doanh nghiệp"'),
],
"community-section.tsx":[
  ('subtitle="Contribute brilliant ideas to shape the future of SoloCEO AI. Collaborate, innovate, and make impacts."','subtitle="Tham gia cộng đồng Solo CEO — kết nối, chia sẻ ý tưởng và cùng nhau phát triển doanh nghiệp một người."'),
],
"sandbox-section.tsx":[
  ('title="Agent Runtime Environment"','title="Môi trường làm việc của trợ lý AI"'),
],
"skills-section.tsx":[
  ('title="Agent Skills"','title="Kho kỹ năng cho trợ lý AI"'),
],
"whats-new-section.tsx":[
  ('title="Whats New in SoloCEO AI 2.0"','title="Có gì mới ở SoloCEO AI"'),
  ('subtitle="SoloCEO AI is now evolving from a Deep Research agent into a full-stack Super Agent"','subtitle="Trợ lý AI toàn diện: nghiên cứu, dựng sản phẩm, bán hàng và vận hành doanh nghiệp một người"'),
],
}
import os
for f,pairs in repl.items():
    p=os.path.join(base,f)
    if not os.path.exists(p): continue
    s=open(p).read()
    for a,b in pairs: s=s.replace(a,b)
    open(p,"w").write(s)
    print("việt hoá",f)
