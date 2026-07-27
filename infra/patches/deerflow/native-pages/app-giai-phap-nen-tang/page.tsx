import { CongNgheIndex } from "@/components/landing/soloceo-cong-nghe";
export const metadata = {
  title: "Công nghệ mã nguồn mở cho Solo CEO — hơn 100 nền tảng | SoloCEO",
  description:
    "Hơn 100 nền tảng mã nguồn mở đã cài thật, chạy thật: CRM, helpdesk, thương mại điện tử, marketing, dữ liệu. Có bản demo bấm vào thử và khoá học tiếng Việt đi kèm.",
  alternates: { canonical: "https://soloceo.vn/giai-phap/nen-tang" },
  openGraph: {
    title: "Hơn 100 công nghệ mã nguồn mở đã kiểm chứng — SoloCEO",
    description: "Giới thiệu, bản demo chạy thật và khoá học tiếng Việt cho từng nền tảng.",
    url: "https://soloceo.vn/giai-phap/nen-tang",
    type: "website",
  },
};
export const revalidate = 600;
export default async function Page() { return await CongNgheIndex(); }
