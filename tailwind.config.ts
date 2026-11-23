import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#211C1F", ink: "#171519", pink: { DEFAULT: "#FF66BF", dark: "#E04DA6" },
        teal: { DEFAULT: "#0F5257", light: "#E3F0F0" }, mauve: "#EDE3E9", muted: "#61575C",
        soft: "#EBEDEE", success: "#238B68", warning: "#E6A23C", danger: "#D94F4F",
      },
      fontFamily: {
        heading: ["var(--font-manrope)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(33,28,31,.05), 0 8px 24px -12px rgba(33,28,31,.12)" },
    },
  },
  plugins: [],
};
export default config;
