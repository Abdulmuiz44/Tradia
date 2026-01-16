// tailwind.config.js - STRICT MONOCHROME THEME
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MONOCHROME ONLY - No colored themes
        primary: "#000000",        // Pure black
        "primary-foreground": "#ffffff",
        secondary: "#f3f4f6",      // Light gray
        "secondary-foreground": "#000000",
        accent: "#000000",         // Black accent
        "accent-foreground": "#ffffff",
        destructive: "#374151",    // Dark gray for destructive
        "destructive-foreground": "#ffffff",
        muted: "#f3f4f6",
        "muted-foreground": "#6b7280",
        background: "#ffffff",
        foreground: "#000000",
        card: "#ffffff",
        "card-foreground": "#000000",
        popover: "#ffffff",
        "popover-foreground": "#000000",
        border: "#e5e7eb",
        input: "#e5e7eb",
        ring: "#000000",
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
