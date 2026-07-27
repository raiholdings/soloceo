import { BaoCaoIndex } from "@/components/landing/soloceo-bao-cao";
export const metadata = {
  title: "Báo cáo nghiên cứu — SoloCEO",
  description:
    "Báo cáo thị trường, công nghệ và ý tưởng mới cho Solo CEO Việt Nam. Đội AI SoloCEO viết mỗi ngày một bản từ dữ liệu thật.",
};
export const revalidate = 300;
export default async function Page() { return await BaoCaoIndex(); }
