/**
 * Default branding. Anything user-customizable at runtime lives in the `settings`
 * table — read via `getSettings()`. This file is the fallback / build-time defaults.
 */
export const brand = {
  name: "Carolina Comfort HVAC",
  tagline: "Filter service & maintenance.",
  domain: "carolinacomfort.info",

  // UI tokens for the admin web app. The PDF intentionally renders pure B&W.
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
    "Make checks payable to: Carolina Comfort HVAC",
    "Mail to: __ Street, ____, NC ____",
    "Reference invoice number on memo line.",
  ].join("\n"),

  /** Default payment terms (Net N) */
  defaultPaymentTermsDays: 15,

  /** Default invoice number prefix — e.g. CCH-2026-0001 */
  invoiceNumberPrefix: "CCH",
} as const;

export type Brand = typeof brand;
