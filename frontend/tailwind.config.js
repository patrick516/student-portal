/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))", // light gray / white
        foreground: "hsl(var(--foreground))", // dark gray / black
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "#4F46E5", // Indigo-600
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#10B981", // Emerald-500
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F59E0B", // Amber-500
          foreground: "#1F2937", // Gray-800
        },
        muted: {
          DEFAULT: "#F3F4F6", // Gray-100
          foreground: "#6B7280", // Gray-500
        },
        destructive: {
          DEFAULT: "#EF4444", // Red-500
          foreground: "#FFFFFF",
        },
        border: "#E5E7EB", // Gray-200
        input: "#F9FAFB", // Gray-50
        ring: "#C7D2FE", // Indigo-200
        chart: {
          1: "#3B82F6", // Blue-500
          2: "#10B981", // Green-500
          3: "#FBBF24", // Yellow-400
          4: "#F97316", // Orange-500
          5: "#EF4444", // Red-500
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
