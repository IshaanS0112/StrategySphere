/** @type {import('tailwindcss').Config} */

// Paper theme. Token values live as CSS variables in index.css; this file only
// gives them Tailwind names. See docs/DESIGN.md.
// Channel form so Tailwind can inject an alpha: bg-primary/10 etc.
const token = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: token("card"),
        "surface-2": token("surface-2"),
        border: token("border"),
        strong: token("border-strong"),
        muted: token("muted-foreground"),
        subtle: token("text-subtle"),

        primary: token("primary"),
        "primary-fg": token("primary-foreground"),
        "brand-tint": "var(--brand-tint)",

        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        info: token("info"),

        // Highlight mode: chart-1 carries the point, 2 and 3 are context.
        "chart-1": token("chart-1"),
        "chart-2": token("chart-2"),
        "chart-3": token("chart-3"),
      },
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["Instrument Serif", "Georgia", "Times New Roman", "serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // The house scale, in px. Dense app UI: body 14, table 13, labels 12.
        "2xs": ["11px", { lineHeight: "16px" }],
        xs: ["12px", { lineHeight: "18px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "21px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["18px", { lineHeight: "26px" }],
        "2xl": ["20px", { lineHeight: "28px" }],
        "3xl": ["24px", { lineHeight: "29px" }],
        "4xl": ["30px", { lineHeight: "33px" }],
        "5xl": ["36px", { lineHeight: "38px" }],
        "6xl": ["48px", { lineHeight: "48px" }],
      },
      letterSpacing: {
        label: "0.08em",
        display: "-0.02em",
      },
      borderRadius: {
        // Editorial means sharp: 2px controls, 4px cards.
        DEFAULT: "2px",
        md: "2px",
        lg: "4px",
        xl: "4px",
      },
      boxShadow: {
        // Paper uses elevation only on things that float above the page.
        popover: "0 8px 24px rgba(21, 23, 26, 0.08)",
      },
      transitionTimingFunction: {
        "out-quint": "cubic-bezier(0.2, 0, 0, 1)",
        "in-quint": "cubic-bezier(0.4, 0, 1, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 180ms cubic-bezier(0.2, 0, 0, 1) both",
      },
    },
  },
  plugins: [],
};
