import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B2A5B",
        blue: "#2F80ED",
        lightBlue: "#EAF3FF",
        ink: "#1F2937",
        sub: "#6B7280",
      },
      boxShadow: {
        soft: "0 18px 60px rgba(11, 42, 91, 0.08)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans JP",
          "Hiragino Kaku Gothic ProN",
          "Yu Gothic",
          "Meiryo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
