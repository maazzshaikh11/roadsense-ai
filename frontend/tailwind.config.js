/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#070f1c", 900: "#0b1626", 850: "#0e1d33", 800: "#12233d", 700: "#1b3355" },
        ink: "#e7eef7",
        muted: "#93a4bc",
        teal: { accent: "#2dd4bf" },
      },
    },
  },
  plugins: [],
};
