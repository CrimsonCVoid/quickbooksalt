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

  /** Default structured check-payment details — overridable in /admin/settings */
  defaultCheck: {
    payTo: "Carolina Comfort HVAC",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "NC",
    postal: "",
    memoTemplate: "Invoice {invoice_number}",
  },

  /** Default free-form additional instructions (extra notes under structured fields) */
  defaultCheckInstructions: "",

  /** Default payment terms (Net N) */
  defaultPaymentTermsDays: 15,

  /** Default invoice number prefix — e.g. CCH-2026-0001 */
  invoiceNumberPrefix: "CCH",
} as const;

export type Brand = typeof brand;
