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
          // ── Brand shell palette ────────────────────────────────────────────
          shellDeep:   "#0F0E47",   // Sidebar background — darkest navy
          shellMid:    "#272757",   // Topbar background — deep brand navy
          shellAccent: "#505081",   // Active nav / interactive states
          shellMuted:  "#8686AC",   // Muted text on dark surfaces / nav icons

          // ── Interactive / accent ───────────────────────────────────────────
          primary:       "#505081",
          primaryHover:  "#272757",
          primaryDeep:   "#0F0E47",
          primarySubtle: "#EEEEF8",
          // accent: DEFAULT keeps `text-destrova-accent` working; .hover adds sub-token
          accent: {
            DEFAULT: "#505081",
            hover:   "#272757",
          },
          accentDeep: "#272757", // legacy alias — kept for backward compat

          // ── Background semantic tokens (new) ──────────────────────────────
          bg: {
            base:     "#ECEBF6", // deepest page canvas (Level 0)
            surface:  "#FDFDFF", // card / panel (Level 2)
            elevated: "#FFFFFF", // modal / dropdown (Level 3)
          },

          // ── Surface hierarchy (existing, kept) ────────────────────────────
          canvas:        "#ECEBF6",
          pageShell:     "#F1F0FA",
          surface:       "#FDFDFF",
          surfaceMuted:  "#F2F1FA",
          surfaceRaised: "#F8F7FD",
          sidebarTint:   "#EEEEF8",

          // ── Legacy aliases (kept so nothing breaks) ────────────────────────
          bgLight:      "#F0F0F8",
          bgDark:       "#0B1220",
          surfaceLight: "#FFFFFF",
          surfaceDark:  "#111827",

          // ── Borders ────────────────────────────────────────────────────────
          // DEFAULT keeps `border-destrova-border` working; .subtle adds sub-token
          border: {
            DEFAULT: "#D9D8E8",
            subtle:  "#E9E8F4",
          },
          borderMuted:  "#E9E8F4", // legacy alias — kept
          borderStrong: "#B9B7D1",
          borderLight:  "#D9D8E8", // legacy alias — kept
          borderDark:   "#1F2937",

          // ── Text semantic tokens (new) ────────────────────────────────────
          text: {
            primary:   "#0B1220",
            secondary: "#334155",
            muted:     "#64748B",
          },

          // ── Text hierarchy flat tokens (existing, kept) ───────────────────
          ink:           "#0B1220",
          inkStrong:     "#111827",
          inkMuted:      "#334155",
          inkSoft:       "#64748B",
          inkFaint:      "#94A3B8",
          textPrimary:   "#0B1220",
          textSecondary: "#334155",
          textMuted:     "#64748B",

          // ── Semantic status tokens (new) ──────────────────────────────────
          danger:  "#DC2626", // red-600
          warning: "#D97706", // amber-600
          success: "#16A34A", // green-600

          // ── Shared SaaS platform palette (P0) — use for new UI; legacy destrova.* unchanged
          saas: {
            primary:       "#2563EB",
            primaryHover:  "#1D4ED8",
            canvas:        "#F8FAFC",
            surface:       "#FFFFFF",
            surfaceMuted:  "#F1F5F9",
            border:        "#E5E7EB",
            borderSubtle:  "#F3F4F6",
            hover:         "#F1F5F9",
            sidebarHover:  "#EFF6FF",
            textPrimary:   "#111827",
            textSecondary: "#374151",
            textMuted:     "#6B7280",
            textFaint:     "#9CA3AF",
            success:       "#22C55E",
            warning:       "#F59E0B",
            danger:        "#EF4444",
            info:          "#2563EB",
            status: {
              safe:     { fg: "#22C55E", bg: "rgba(34,197,94,0.10)" },
              atRisk:   { fg: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
              breached: { fg: "#EF4444", bg: "rgba(239,68,68,0.10)" },
              paused:   { fg: "#6B7280", bg: "rgba(107,114,128,0.10)" },
            },
          },

          // ── Agent workspace palette (Adım 1) — blue SaaS; legacy destrova.primary unchanged
          agent: {
            primary:       "#2563EB",
            primaryHover:  "#1D4ED8",
            canvas:        "#F8FAFC",
            surface:       "#FFFFFF",
            border:        "#E5E7EB",
            hover:         "#F1F5F9",
            sidebarHover:  "#EFF6FF",
            textPrimary:   "#111827",
            textMuted:     "#6B7280",
            textFaint:     "#9CA3AF",
            success:       "#22C55E",
            warning:       "#F59E0B",
            danger:        "#EF4444",
            info:          "#2563EB",
            slaBreachedTrack: "#FEE2E2",
            slaBreachedFill:  "#EF4444",
          },

          // ── Customer portal palette (Adım 1) — blue SaaS; legacy destrova.primary unchanged
          customer: {
            primary:       "#2563EB",
            primaryHover:  "#1D4ED8",
            canvas:        "#F8FAFC",
            surface:       "#FFFFFF",
            border:        "#E5E7EB",
            hover:         "#F1F5F9",
            textPrimary:   "#111827",
            textMuted:     "#6B7280",
            success:       "#22C55E",
            warning:       "#F59E0B",
            danger:        "#EF4444",
            info:          "#2563EB",
          },
        },
      },

      borderRadius: {
        // Existing Tailwind scale preserved; these add named semantic shortcuts
        card:  "0.75rem",   // 12px — consistent card / panel corner
        btn:   "0.5rem",    //  8px — button corner
        input: "0.375rem",  //  6px — input / select corner
        "saas-button": "10px",
        "saas-card":   "14px",
        "saas-badge":  "9999px",
        "agent-button": "10px",
        "agent-card":   "14px",
        "agent-badge":  "9999px",
        "customer-button": "10px",
        "customer-card":   "14px",
        "customer-badge":  "9999px",
      },

      boxShadow: {
        // ── Existing shadows (kept) ────────────────────────────────────────
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
        "destrova-cta":
          "0 1px 0 0 rgb(255 255 255 / 0.16) inset, 0 8px 18px -8px rgb(80 80 129 / 0.55), 0 2px 6px -2px rgb(80 80 129 / 0.35)",
        "destrova-cta-deep":
          "0 1px 0 0 rgb(255 255 255 / 0.14) inset, 0 10px 24px -10px rgb(39 39 87 / 0.55), 0 2px 6px -2px rgb(39 39 87 / 0.35)",
        "destrova-ring":
          "0 0 0 1px rgb(80 80 129 / 0.12), 0 8px 24px -12px rgb(80 80 129 / 0.28)",
        "destrova-inset":
          "inset 0 1px 0 0 rgb(255 255 255 / 0.6), inset 0 0 0 1px rgb(15 23 42 / 0.04)",

        // ── SaaS platform shadows (P0) ─────────────────────────────────────
        "saas-card":       "0 1px 2px rgba(0,0,0,0.05)",
        "saas-card-hover": "0 8px 24px rgba(15,23,42,0.08)",
        "saas-elevated":   "0 4px 12px rgba(15,23,42,0.05)",

        // ── Agent workspace shadows (Adım 1) ───────────────────────────────
        "agent-card":       "0 1px 2px rgba(0,0,0,0.05)",
        "agent-card-hover": "0 8px 24px rgba(15,23,42,0.08)",
        "agent-event":      "0 1px 2px rgba(0,0,0,0.05)",
        "agent-event-elevated": "0 4px 12px rgba(15,23,42,0.05)",

        // ── Customer portal shadows (Adım 1) ───────────────────────────────
        "customer-card":       "0 1px 2px rgba(0,0,0,0.05)",
        "customer-card-hover": "0 8px 24px rgba(15,23,42,0.08)",

        // ── New semantic shadows ───────────────────────────────────────────
        modal:
          "0 0 0 1px rgb(15 14 71 / 0.06), 0 8px 16px -4px rgb(15 14 71 / 0.10), 0 32px 64px -16px rgb(15 14 71 / 0.18)",
        dropdown:
          "0 0 0 1px rgb(15 14 71 / 0.05), 0 4px 8px -2px rgb(15 14 71 / 0.07), 0 12px 24px -8px rgb(15 14 71 / 0.10)",
      },

      backgroundImage: {
        "destrova-brand":
          "linear-gradient(135deg, #505081 0%, #272757 55%, #0F0E47 100%)",
        "destrova-brand-soft":
          "linear-gradient(135deg, #6666A0 0%, #505081 100%)",
        "destrova-header":
          "linear-gradient(180deg, #F6F6FC 0%, #FFFFFF 100%)",
        "destrova-hero":
          "linear-gradient(180deg, #EEEEF8 0%, #F0F0F8 100%)",
        "destrova-canvas-glow":
          "radial-gradient(60rem 40rem at 10% -10%, rgba(80,80,129,0.06), transparent 60%), radial-gradient(50rem 30rem at 110% 10%, rgba(39,39,87,0.04), transparent 60%)",
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

      fontSize: {
        // Existing Tailwind scale is preserved; these add semantic extremes
        display: ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }], // 36px display heading
        caption: ["0.75rem", { lineHeight: "1.5" }],                             // 12px small label
      },

      keyframes: {
        // ── Existing (kept) ────────────────────────────────────────────────
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
        // ── New subtle micro-animations (150-200ms) ────────────────────────
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },

      animation: {
        // ── Existing (kept) ────────────────────────────────────────────────
        "slide-up-fade": "slide-up-fade 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in":       "fade-in 0.3s ease both",
        "pulse-soft":    "pulse-soft 2.2s ease-in-out infinite",
        // ── New fast variants ──────────────────────────────────────────────
        "fade-in-fast":  "fade-in 0.15s ease both",
        "slide-up":      "slide-up 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
