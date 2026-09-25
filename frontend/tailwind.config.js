/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#0b1220",
          panel: "#111a2c",
          panel2: "#16213a",
          border: "#22304a",
          hover: "#1a2740",
        },
        accent: {
          DEFAULT: "#38bdf8",
          dim: "#0ea5e9",
          soft: "#0c4a6e",
        },
        text: {
          primary: "#e6edf7",
          secondary: "#93a4c3",
          muted: "#64759a",
        },
        status: {
          critical: "#f87171",
          warning: "#fbbf24",
          success: "#34d399",
          info: "#38bdf8",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
      },
      keyframes: {
        pulseAlert: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseAlert: "pulseAlert 1.8s ease-in-out infinite",
        fadeIn: "fadeIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
