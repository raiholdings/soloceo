/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  reactStrictMode: true,
  // Ảnh sản phẩm có thể ở bất kỳ host nào (CEO tự dán link)
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
