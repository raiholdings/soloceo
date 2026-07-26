// → src/app/san-pham/du-lieu/page.tsx
// revalidate phải nằm ngay trong page.tsx để Next.js phân tích tĩnh được;
// tái xuất từ component không đảm bảo nhận.
export const revalidate = 600;
export { default } from "@/components/landing/san-pham-du-lieu";
