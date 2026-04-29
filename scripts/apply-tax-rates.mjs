#!/usr/bin/env node
/**
 * Apply NC + GA sales tax rates to imported customers based on city/county.
 *
 * Run AFTER applying migration 0004_tax_rate.sql (which adds the column).
 *
 *   node scripts/apply-tax-rates.mjs
 *
 * Lookup table is keyed by city (case-insensitive). Walden Ridge defaults
 * to Henderson County NC (6.75%) per user instruction — flag if it's the
 * Tennessee one. McDowell Jail is set to 0% and noted as exempt pending
 * a Streamlined Sales Tax certificate (Form E-595E).
 */

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n").filter(l => l && !l.trimStart().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; })
    .filter(Boolean)
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

// city → { rate: fraction, county: name, state: code, note?: string }
const RATE_TABLE = {
  // Buncombe NC — 7.00%
  asheville:     { rate: 0.0700, county: "Buncombe",     state: "NC" },
  arden:         { rate: 0.0700, county: "Buncombe",     state: "NC" },
  fairview:      { rate: 0.0700, county: "Buncombe",     state: "NC" },
  // Henderson NC — 6.75%
  hendersonville:{ rate: 0.0675, county: "Henderson",    state: "NC" },
  fletcher:      { rate: 0.0675, county: "Henderson",    state: "NC" },
  "flat rock":   { rate: 0.0675, county: "Henderson",    state: "NC" },
  // Haywood NC — 7.00%
  waynesville:   { rate: 0.0700, county: "Haywood",      state: "NC" },
  canton:        { rate: 0.0700, county: "Haywood",      state: "NC" },
  // Gaston NC — 7.00%
  gastonia:      { rate: 0.0700, county: "Gaston",       state: "NC" },
  // Clay NC — 7.00%
  hayesville:    { rate: 0.0700, county: "Clay",         state: "NC" },
  // Transylvania NC — 6.75%
  brevard:       { rate: 0.0675, county: "Transylvania", state: "NC" },
  // McDowell NC — 6.75%
  marion:        { rate: 0.0675, county: "McDowell",     state: "NC" },
  // GA — only collect if you have GA nexus.
  cornelia:      { rate: 0.0700, county: "Habersham",    state: "GA" },
  dahlonega:     { rate: 0.0800, county: "Lumpkin",      state: "GA" },
  toccoa:        { rate: 0.0700, county: "Stephens",     state: "GA" },
  jasper:        { rate: 0.0700, county: "Pickens",      state: "GA" },
  // Walden Ridge — assumed Henderson Co NC (no state in source).
  "walden ridge":{ rate: 0.0675, county: "Henderson (assumed)", state: "NC", note: "Confirm: Walden Ridge could be the TN community — verify before next billing cycle." },
};

const EXEMPT_BY_NAME = {
  "mcdowell jail": {
    rate: 0,
    note: "Tax-exempt: county jail is a political subdivision. Requires NC Form E-595E (Streamlined Sales Tax certificate) signed by the entity. UNTIL THE FORM IS ON FILE the system should still be charging tax — set rate to 0.0675 manually until it arrives.",
  },
};

// Fetch all customers
const r = await fetch(`${URL_BASE}/rest/v1/customers?select=id,company_name,billing_city`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
});
const customers = await r.json();
console.log(`Loaded ${customers.length} customers`);

let applied = 0, skipped = 0, exempted = 0;
const skipList = [];

for (const c of customers) {
  const nameKey = c.company_name.toLowerCase();
  const cityKey = (c.billing_city || "").toLowerCase().trim();

  let entry, note;

  // Exemption first (overrides geography)
  for (const [k, v] of Object.entries(EXEMPT_BY_NAME)) {
    if (nameKey.includes(k)) { entry = v; note = v.note; break; }
  }

  // Geography lookup
  if (!entry) entry = RATE_TABLE[cityKey];

  if (!entry) {
    skipped++;
    skipList.push(`${c.company_name} (city: ${c.billing_city || "—"})`);
    continue;
  }

  // Pull current notes so we can append (don't overwrite the filter mix etc.)
  const existing = await fetch(
    `${URL_BASE}/rest/v1/customers?id=eq.${c.id}&select=notes`,
    { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } }
  ).then(r => r.json());
  const oldNotes = existing[0]?.notes || "";

  const taxLine = entry.county
    ? `Sales tax: ${(entry.rate * 100).toFixed(3).replace(/\.?0+$/, "")}% (${entry.county} County, ${entry.state})`
    : `Sales tax: ${(entry.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%`;
  const noteToAdd = entry.note || note;
  const newNotes = [oldNotes, "", taxLine, noteToAdd ? `⚠ ${noteToAdd}` : null]
    .filter(Boolean).join("\n").trim();

  const upd = await fetch(`${URL_BASE}/rest/v1/customers?id=eq.${c.id}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tax_rate: entry.rate, notes: newNotes }),
  });
  if (!upd.ok) {
    const t = await upd.text();
    console.error(`✗ ${c.company_name}: ${t}`);
    continue;
  }
  if (entry.rate === 0) exempted++;
  else applied++;
  console.log(`✓ ${c.company_name.padEnd(36)} → ${(entry.rate * 100).toFixed(3).replace(/\.?0+$/, "").padStart(5)}% ${entry.county ? `(${entry.county})` : ""}`);
}

console.log(`\n${applied} rates applied, ${exempted} marked exempt, ${skipped} skipped:`);
skipList.forEach(s => console.log(`  - ${s}`));
