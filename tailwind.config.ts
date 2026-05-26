import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "oklch(21% 0.01 260)",
        paper: "oklch(98% 0.006 75)",
        muted: "oklch(55% 0.018 250)",
        line: "oklch(90% 0.012 250)",
        coral: "oklch(63% 0.18 23)",
        teal: "oklch(63% 0.12 188)"
      },
      boxShadow: {
        airbnb: "0 18px 60px -35px oklch(20% 0.02 260 / 0.42)",
        marker: "0 8px 24px -10px oklch(20% 0.02 260 / 0.52)"
      }
    }
  },
  plugins: []
};

export default config;
