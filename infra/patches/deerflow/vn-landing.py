import re, os
base="/opt/deerflow/frontend/src/components/landing"

# ---- hero.tsx ----
p=f"{base}/hero.tsx"
s=open(p).read()
# HERO_WORDS → việc của Solo CEO
s=re.sub(r'const HERO_WORDS = \[.*?\];',
'''const HERO_WORDS = [
  "Nghiên cứu thị trường",
  "Dựng website bán hàng",
  "Viết nội dung",
  "Lập kế hoạch kinh doanh",
  "Phân tích dữ liệu",
  "Tạo báo cáo",
  "Quản lý khách hàng",
];''', s, flags=re.S)
s=s.replace('<span className="whitespace-nowrap">SuperAgent</span>','<span className="whitespace-nowrap">cho Solo CEO</span>')
s=s.replace(
'''          An open-source SuperAgent harness that researches, codes, and creates.
          With the help of sandboxes, memories, tools, skills and subagents, it
          handles different levels of tasks that could take minutes to hours.''',
'''          Hệ điều hành AI cho doanh nghiệp một người. Trợ lý siêu năng lực giúp
          bạn nghiên cứu, dựng sản phẩm, bán hàng và vận hành — làm được cả
          những việc mất từ vài phút đến vài giờ, thay cho cả một đội ngũ.''')
s=s.replace('<span className="text-md">Get Started with 2.0</span>','<span className="text-md">Bắt đầu ngay</span>')
open(p,"w").write(s)
print("hero.tsx: Việt hoá")

# ---- header.tsx: Star on GitHub → Cộng đồng Solo CEO (my.soloceo.vn) ----
p=f"{base}/header.tsx"
s=open(p).read()
s=s.replace('href="https://github.com/bytedance/deer-flow"','href="https://my.soloceo.vn/"')
s=s.replace('href={homeURL ?? "https://github.com/bytedance/deer-flow"}','href={homeURL ?? "https://soloceo.vn/"}')
s=s.replace('<span className="hidden sm:inline">Star on GitHub</span>','<span className="hidden sm:inline">Cộng đồng Solo CEO</span>')
# đổi target về my.soloceo.vn mở tab mới
open(p,"w").write(s)
print("header.tsx: link cộng đồng → my.soloceo.vn")

# ---- footer.tsx: link GitHub/community → my.soloceo.vn ----
p=f"{base}/footer.tsx"
if os.path.exists(p):
    s=open(p).read()
    s=s.replace("https://github.com/bytedance/deer-flow","https://my.soloceo.vn/")
    s=s.replace("https://discord.gg/clawd","https://my.soloceo.vn/")
    open(p,"w").write(s)
    print("footer.tsx: link → my.soloceo.vn")
