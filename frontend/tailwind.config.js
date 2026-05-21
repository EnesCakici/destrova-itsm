/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        destrova: {
          // ── Brand shell palette (new identity) ────────────────────────────────
          shellDeep:   "#0F0E47",   // Sidebar background — darkest navy
          shellMid:    "#272757",   // Topbar background — deep brand navy
          shellAccent: "#505081",   // Active nav / interactive states
          shellMuted:  "#8686AC",   // Muted text on dark surfaces / nav icons

          // ── Interactive / accent (aligned to palette) ──────────────────────
          primary:       "#505081",
          primaryHover:  "#272757",
          primaryDeep:   "#0F0E47",
          primarySubtle: "#EEEEF8", // Very light indigo bg for subtle highlights
          accent:        "#505081",
          accentDeep:    "#272757",

          // ── Surface hierarchy ──────────────────────────────────────────────
          canvas:       "#ECEBF6", // Level 0 — stronger lavender canvas
          pageShell:    "#F1F0FA", // Level 1 — Page shell
          surface:      "#FDFDFF", // Level 2 — Content surfaces (less harsh than pure white)
          surfaceMuted:  "#F2F1FA", // Nested / subtle surfaces
          surfaceRaised: "#F8F7FD", // Slightly elevated
          sidebarTint:   "#EEEEF8", // Sidebar gradient target (non-customer)

          // ── Legacy aliases (kept so nothing breaks) ────────────────────────
          bgLight:      "#F0F0F8",
          bgDark:       "#0B1220",
          surfaceLight: "#FFFFFF",
          surfaceDark:  "#111827",

          // ── Borders (palette-tinted neutral) ──────────────────────────────
          border:       "#D9D8E8",
          borderMuted:  "#E9E8F4",
          borderStrong: "#B9B7D1",
          borderLight:  "#D9D8E8",
          borderDark:   "#1F2937",

          // ── Text hierarchy (unchanged) ────────────────────────────────────
          ink:           "#0B1220",
          inkStrong:     "#111827",
          inkMuted:      "#334155",
          inkSoft:       "#64748B",
          inkFaint:      "#94A3B8",
          textPrimary:   "#0B1220",
          textSecondary: "#334155",
          textMuted:     "#64748B",
        },
      },
      boxShadow: {
        card:
          "0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        "card-hover":
          "0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.03)",
        selected:
          "0 0 0 2px rgba(37, 99, 235, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        destrova:
          "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "destrova-sm":
          "0 1px 0 0 rgb(15 23 42 / 0.04)",
        "destrova-md":
          "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.06)",
        "destrova-card":
          "0 1px 0 0 rgb(15 23 42 / 0.04), 0 1px 2px 0 rgb(15 23 42 / 0.06), 0 20px 40px -24px rgb(15 23 42 / 0.22)",
        "destrova-xl":
          "0 1px 0 0 rgb(15 23 42 / 0.04), 0 24px 48px -28px rgb(15 23 42 / 0.24), 0 8px 16px -12px rgb(15 23 42 / 0.08)",
        // CTA shadow aligned to new primary #505081
        "destrova-cta":
          "0 1px 0 0 rgb(255 255 255 / 0.16) inset, 0 8px 18px -8px rgb(80 80 129 / 0.55), 0 2px 6px -2px rgb(80 80 129 / 0.35)",
        "destrova-cta-deep":
          "0 1px 0 0 rgb(255 255 255 / 0.14) inset, 0 10px 24px -10px rgb(39 39 87 / 0.55), 0 2px 6px -2px rgb(39 39 87 / 0.35)",
        // Ring shadow aligned to new primary
        "destrova-ring":
          "0 0 0 1px rgb(80 80 129 / 0.12), 0 8px 24px -12px rgb(80 80 129 / 0.28)",
        "destrova-inset":
          "inset 0 1px 0 0 rgb(255 255 255 / 0.6), inset 0 0 0 1px rgb(15 23 42 / 0.04)",
      },
      backgroundImage: {
        // Brand gradients — new deep indigo palette
        "destrova-brand":
          "linear-gradient(135deg, #505081 0%, #272757 55%, #0F0E47 100%)",
        "destrova-brand-soft":
          "linear-gradient(135deg, #6666A0 0%, #505081 100%)",
        "destrova-header":
          "linear-gradient(180deg, #F6F6FC 0%, #FFFFFF 100%)",
        "destrova-hero":
          "linear-gradient(180deg, #EEEEF8 0%, #F0F0F8 100%)",
        // Canvas glow updated to palette colors
        "destrova-canvas-glow":
          "radial-gradient(60rem 40rem at 10% -10%, rgba(80,80,129,0.06), transparent 60%), radial-gradient(50rem 30rem at 110% 10%, rgba(39,39,87,0.04), transparent 60%)",
        // Legacy light sidebar gradient (used for non-customer roles)
        "destrova-sidebar":
          "linear-gradient(180deg, #FFFFFF 0%, #F6F6FC 100%)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        "slide-up-fade": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.45" },
        },
      },
      animation: {
        "slide-up-fade": "slide-up-fade 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in":       "fade-in 0.3s ease both",
        "pulse-soft":    "pulse-soft 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
