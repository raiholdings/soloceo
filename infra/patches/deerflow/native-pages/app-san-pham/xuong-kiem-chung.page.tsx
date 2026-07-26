// → src/app/san-pham/xuong-kiem-chung/page.tsx
// revalidate phải nằm ngay trong page.tsx để Next.js phân tích tĩnh được;
// tái xuất từ component không đảm bảo nhận.
export const revalidate = 300;
export { default } from "@/components/landing/san-pham-xuong";
