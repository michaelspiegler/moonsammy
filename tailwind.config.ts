import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  // Safelist important classes that might get purged
  safelist: [
    "bg-red-500",
    "bg-red-600",
    "bg-red-700",
    "text-red-500",
    "text-red-600",
    "text-red-700",
    "border-red-500",
    "border-red-600",
    "hover:bg-red-600",
    "hover:bg-red-700",
    "bg-destructive",
    "text-destructive-foreground",
    "hover:bg-destructive/90",
    "bg-green-50",
    "bg-green-500",
    "bg-blue-50",
    "bg-blue-500",
    "bg-yellow-50",
    "bg-yellow-500",
    "bg-gray-50",
    "bg-gray-100",
    "bg-gray-200",
    "bg-gray-300",
    "bg-gray-800",
    "bg-gray-900",
    "text-white",
    "rounded-full",
    "object-cover",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)", // Explicit red color
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        punk: ["Impact", "Arial Black", "Helvetica", "sans-serif"],
        mono: ["Courier New", "Monaco", "Lucida Console", "monospace"],
      },
    },
  },
  plugins: [],
}
export default config
