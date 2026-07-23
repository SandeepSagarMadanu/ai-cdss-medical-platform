/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f19",      // Deep corporate navy
        card: "#121826",            // Glass dark gray-blue
        primary: "#3b82f6",         // Medical blue
        secondary: "#10b981",       // Diagnostics green
        accent: "#f59e0b",          // Warning amber
        border: "#1e293b",          // Slate divider border
        textMuted: "#94a3b8",       // Cool gray text
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
