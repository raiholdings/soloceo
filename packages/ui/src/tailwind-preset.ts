import type { Config } from "tailwindcss";
import { designTokens } from "./tokens";

// Preset Tailwind dùng chung cho web-community và web-platform.
const preset: Omit<Config, "content"> = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: designTokens.colors.accent,
          soft: designTokens.colors.accentSoft,
        },
        surface: {
          DEFAULT: "rgb(255 255 255 / 0.06)",
          border: "rgb(255 255 255 / 0.12)",
        },
        canvas: designTokens.colors.background,
      },
      borderRadius: {
        glass: designTokens.glass.radius,
      },
      backdropBlur: {
        glass: designTokens.glass.blur,
      },
    },
  },
};

export default preset;
