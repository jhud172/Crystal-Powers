import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#060816",
        mist: "#d8def7",
        accent: "#7c3aed",
        accentSoft: "#22d3ee",
        ember: "#f97316"
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        sans: ["Space Grotesk", "sans-serif"]
      },
      boxShadow: {
        halo: "0 0 0 1px rgba(255,255,255,0.05), 0 24px 80px rgba(5,10,25,0.45)",
        glow: "0 20px 60px rgba(124,58,237,0.28)"
      }
    }
  },
  plugins: []
} satisfies Config;
