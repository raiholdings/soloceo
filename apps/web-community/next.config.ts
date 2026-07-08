import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@soloceo/ui", "@soloceo/shared"],
  // Trang chủ = SoloCEO AI (DeerFlow, ai.soloceo.vn) — quyết định 08/07.
  // Các trang /cong-dong, /tai-khoan, /danh-ba... vẫn phục vụ tại đây
  // (OAuth WoWonder + cộng đồng phụ thuộc).
  async redirects() {
    return [
      {
        source: "/",
        destination: "https://ai.soloceo.vn",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
