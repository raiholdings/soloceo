import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const COMMUNITY_URL =
  process.env.NEXT_PUBLIC_COMMUNITY_FORUM_URL ?? "https://my.soloceo.vn";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@soloceo/ui", "@soloceo/shared"],
  async redirects() {
    return [
      // Cộng đồng chuyển sang mạng xã hội WoWonder (my.soloceo.vn)
      { source: "/cong-dong", destination: COMMUNITY_URL, permanent: false },
      { source: "/cong-dong/:path*", destination: COMMUNITY_URL, permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
