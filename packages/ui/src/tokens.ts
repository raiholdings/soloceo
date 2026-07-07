// Design tokens — tái dùng phong cách raiholdings.vn (CLAUDE.md Giai đoạn 2):
// nền tối, glassmorphism blur 20px, radius 16px, accent #7C5CFF.

export const designTokens = {
  colors: {
    accent: "#7C5CFF",
    accentSoft: "#9B84FF",
    background: "#0B0B12",
    surface: "rgba(255, 255, 255, 0.06)",
    surfaceBorder: "rgba(255, 255, 255, 0.12)",
    textPrimary: "#F4F4F8",
    textSecondary: "#A0A0B8",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
  },
  glass: {
    blur: "20px",
    radius: "16px",
  },
} as const;
