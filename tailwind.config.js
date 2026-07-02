/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "rgb(224,94,70)", // aslinya "rgba(84, 176, 178, 1)",
          foreground: "rgba(227, 243, 243, 1)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "shine": {
          "0%": { left: "-100%" },
          "100%": { left: "100%" }
        },
        "tilt": {
          "0%, 50%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(0.5deg)" },
          "75%": { transform: "rotate(-0.5deg)" },
        },
        "fadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 }
        },
        "scaleIn": {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.5)", opacity: "0.4" },
          "100%": { transform: "scale(1)", opacity: "0.8" },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'gradient-y': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'center top',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center bottom',
          },
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left top',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right bottom',
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0)',
            opacity: '0.3',
          },
          '50%': {
            transform: 'translateY(-15px)',
            opacity: '0.8',
          },
        },
        'scan-line': {
          '0%': {
            transform: 'translateY(0%)',
          },
          '100%': {
            transform: 'translateY(100%)',
          },
        },
        'blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
        'rotate-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'data-flow': {
          '0%': {
            height: '0%',
            top: '0%',
            opacity: '0.7',
          },
          '100%': {
            height: '100%',
            top: '100%',
            opacity: '0',
          },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "reverse-spin-slow": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "scanner": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        "pulse-short": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
        "data-flow-right": {
          "0%": { transform: "translateX(0%)", opacity: "0" },
          "50%": { transform: "translateX(100%)", opacity: "0.8" },
          "100%": { transform: "translateX(200%)", opacity: "0" },
        },
        "data-flow-left": {
          "0%": { transform: "translateX(0%)", opacity: "0" },
          "50%": { transform: "translateX(-100%)", opacity: "0.8" },
          "100%": { transform: "translateX(-200%)", opacity: "0" },
        },
        "graph-draw": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        "counter-slide": {
          "0%": { transform: "translateY(0%)" },
          "10%": { transform: "translateY(-10%)" },
          "20%": { transform: "translateY(-20%)" },
          "30%": { transform: "translateY(-30%)" },
          "40%": { transform: "translateY(-40%)" },
          "50%": { transform: "translateY(-50%)" },
          "60%": { transform: "translateY(-60%)" },
          "70%": { transform: "translateY(-70%)" },
          "80%": { transform: "translateY(-80%)" },
          "90%": { transform: "translateY(-90%)" },
          "100%": { transform: "translateY(-100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "tilt": "tilt 10s infinite linear",
        "ping-slow": "ping-slow 3s ease-in-out infinite",
        "shine": "shine 1.5s ease-in-out infinite",
        "fadeIn": "fadeIn 1s ease-out forwards",
        "scaleIn": "scaleIn 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        'spin-slow': 'spin-slow 8s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'gradient-y': 'gradient-y 3s ease infinite',
        'gradient-xy': 'gradient-xy 3s ease infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 8s ease-in-out infinite',
        'scan-line': 'scan-line 2s linear infinite',
        'blink': 'blink 1.5s infinite',
        'rotate-slow': 'rotate-slow 10s linear infinite',
        'data-flow': 'data-flow 5s linear infinite',
        'animate-spin-slow': 'spin-slow 8s linear infinite',
        'reverse-spin-slow': 'reverse-spin-slow 12s linear infinite',
        'scanner': 'scanner 2s ease-in-out infinite',
        'pulse-short': 'pulse-short 1.2s ease-in-out infinite',
        'data-flow-right': 'data-flow-right 4s linear infinite',
        'data-flow-left': 'data-flow-left 4s linear infinite',
        'graph-draw': 'graph-draw 3s ease-in-out infinite',
        'counter': 'blink 1s infinite',
        'counter-slide': 'counter-slide 10s steps(10, end) infinite',
      },
      height: {
        'calc-vh': 'calc(100vh - 160px)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require('tailwind-scrollbar')],
}