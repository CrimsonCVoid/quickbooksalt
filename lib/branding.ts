/**
 * Default branding. Anything user-customizable at runtime lives in the `settings`
 * table — read via `getSettings()`. This file is the fallback / build-time defaults.
 */
export const brand = {
  name: "Filter Monkey",
  tagline: "The right filter, delivered.",
  domain: "filtermonkey.com",

  colors: {
    yellow: "#FFD60A",
    yellowDark: "#E6BD00",
    ink: "#1E1E1E",
    paper: "#FAFAF7",
    line: "#E8E6DE",
    muted: "#6B6B66",
  },

  fonts: {
    sans: "Space Grotesk",
    display: "Archivo Black",
  },

  /** Default check-payment instructions — overridable in /admin/settings */
  defaultCheckInstructions: [
    "Make checks payable to: Filter Monkey LLC",
    "Mail to: PO Box ___, ___, ___",
    "Reference invoice number on memo line.",
  ].join("\n"),

  /** Default payment terms (Net N) */
  defaultPaymentTermsDays: 15,

  /** Default invoice number prefix — e.g. FM-2026-0001 */
  invoiceNumberPrefix: "FM",
} as const;

export type Brand = typeof brand;
