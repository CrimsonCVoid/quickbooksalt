#!/usr/bin/env node
/**
 * Re-import customers from carolina_comfort_full.csv — the richer source with
 * real addresses, real emails, per-filter quantities, and pre-mapped tax data.
 *
 * Idempotent: matches existing customers by company_name (case-insensitive
 * loose match), updates them in place. Locations and location_filters are
 * fully replaced for matched customers (wipe + reinsert) since the new CSV
 * is the source of truth. Service plans likewise.
 *
 * Filter SKUs (12x28, 16x16, 16x20, …) are upserted once into the catalog.
 *
 * Run AFTER 0004_tax_rate.sql is applied:
 *   node scripts/import-full.mjs
 */

import { readFileSync } from "node:fs";

// ─── env ────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n").filter(l => l && !l.trimStart().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; })
    .filter(Boolean)
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = (env.OWNER_EMAIL || "").split(",")[0].trim().toLowerCase();
if (!URL_BASE || !SERVICE) { console.error("Missing Supabase env"); process.exit(1); }

const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

// ─── owner ──────────────────────────────────────────────
const ow = await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=200`, { headers: H }).then(r => r.json());
const owner = (ow.users || []).find(u => (u.email || "").toLowerCase() === OWNER_EMAIL);
if (!owner) { console.error("Owner not found"); process.exit(1); }
const OWNER_ID = owner.id;
console.log(`Importing as ${OWNER_EMAIL}`);

// ─── CSV ────────────────────────────────────────────────
function parseCSV(text) {
  const rows = []; let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c !== "\r") field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csvText = readFileSync("./carolina_comfort_full.csv", "utf8");
const [header, ...dataRows] = parseCSV(csvText);

// Filter-size columns (everything between "Total w/ Tax" and "Total Filters")
const sizeCols = header.slice(
  header.indexOf("Total w/ Tax") + 1,
  header.indexOf("Total Filters")
);

// ─── helpers ────────────────────────────────────────────
function parseAddress(raw) {
  if (!raw) return {};
  const parens = raw.match(/\(([^)]*)\)/g);
  const note = parens ? parens.map(p => p.slice(1, -1)).join(" · ") : null;
  let s = raw.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const zipM = s.match(/\b(\d{5})\s*$/);
  const postal = zipM?.[1] || null;
  if (zipM) s = s.slice(0, zipM.index).trim();
  const stM = s.match(/\s([A-Z]{2})\s*$/);
  const state = stM?.[1] || null;
  if (stM) s = s.slice(0, stM.index).trim();
  let line1 = null, city = s;
  if (/^\d/.test(s)) {
    const sx = s.match(/\b(Hwy|Highway|Rd|Road|St|Street|Ave|Avenue|Blvd|Ln|Lane|Dr|Drive|Way|Pkwy|Parkway|Ct|Court|Cir|Circle|Pl|Place|By Pass)\b/i);
    if (sx) {
      // Suite/unit can come after the suffix; pull anything that looks like "Suite X" or "#X" or "Unit X" into line1.
      const idx = sx.index + sx[0].length;
      let head = s.slice(0, idx).trim();
      let rest = s.slice(idx).trim();
      const suiteM = rest.match(/^\s*(Suite\s+\S+|Unit\s+\S+|Ste\s+\S+|#\S+)\s*/i);
      if (suiteM) { head += " " + suiteM[0].trim(); rest = rest.slice(suiteM[0].length).trim(); }
      line1 = head;
      city = rest;
    }
  }
  return { line1, city: city || null, state, postal, note };
}

const parsePrice = (p) => {
  if (!p) return 0;
  const m = String(p).match(/\$?\s*([\d,]+\.?\d*)/);
  return m ? parseFloat(m[1].replace(/,/g, "")) : 0;
};

const parseRate = (p) => {
  if (!p) return 0;
  const m = String(p).match(/([\d.]+)\s*%?/);
  return m ? parseFloat(m[1]) / 100 : 0;
};

function parseFreq(f) {
  const n = parseInt(String(f), 10);
  return !isNaN(n) && n > 0 ? { active: true, days: n * 7, raw: f } : { active: false, days: null, raw: f };
}

// ─── upsert filter SKUs ─────────────────────────────────
console.log(`\nFilter sizes in CSV: ${sizeCols.join(", ")}`);
const skuByName = new Map();
for (const size of sizeCols) {
  const isRoll = /roll/i.test(size);
  const name = isRoll ? `${size}` : size;
  // Look up existing
  const ex = await fetch(
    `${URL_BASE}/rest/v1/filter_skus?owner_id=eq.${OWNER_ID}&name=eq.${encodeURIComponent(name)}&select=id`,
    { headers: H }
  ).then(r => r.json());
  if (ex[0]) {
    skuByName.set(size, ex[0].id);
    continue;
  }
  const r = await fetch(`${URL_BASE}/rest/v1/filter_skus`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: OWNER_ID,
      name,
      size: isRoll ? null : size,
      description: isRoll ? "Roll material — billed per roll, not per finished filter." : null,
      unit_price: 0,
    }),
  });
  const [created] = await r.json();
  skuByName.set(size, created.id);
}
console.log(`SKUs ready: ${skuByName.size}`);

// ─── per-row import ─────────────────────────────────────
let updated = 0, created = 0, errors = 0;

for (const r of dataRows) {
  if (!r[0]) continue;
  const row = Object.fromEntries(header.map((h, i) => [h, r[i] || ""]));
  const name = row["Billing Name"].trim();
  if (!name) continue;

  const addr = parseAddress(row["Service Address"]);
  const isExempt = /N\/A/i.test(row["Tax Rate"]) && /likely exempt|jail/i.test(row["Notes"] || "" + name);
  const taxRate = isExempt ? 0 : parseRate(row["Tax Rate"]);
  const cyclePrice = parsePrice(row["Price"]);
  const freq = parseFreq(row["Frequency (weeks)"]);

  // Compose customer notes
  const noteParts = [];
  const filterSummary = sizeCols
    .filter(sz => row[sz] && row[sz] !== "0")
    .map(sz => `${row[sz]}× ${sz}`)
    .join(", ");
  if (filterSummary) noteParts.push(`Filter mix: ${filterSummary}`);
  if (row["Notes"]) noteParts.push(`Notes: ${row["Notes"]}`);
  if (addr.note) noteParts.push(`Address note: ${addr.note}`);
  if (row["County"]) noteParts.push(`Tax: ${row["Tax Rate"]} (${row["County"]})`);
  if (isExempt) noteParts.push("⚠ Likely tax-exempt — confirm Form E-595E is on file before zeroing tax.");
  if (/NOT REOPENING/i.test(name)) noteParts.push("⚠ Closed — not currently billing.");
  if (/verify ga nexus/i.test(row["Notes"] || "")) noteParts.push("⚠ GA tax: only collect if Carolina Comfort has GA nexus.");

  const cleanName = name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const archived = /NOT REOPENING/i.test(name);

  // Find existing customer by case-insensitive name match (loose)
  const existing = await fetch(
    `${URL_BASE}/rest/v1/customers?owner_id=eq.${OWNER_ID}&select=id,company_name`,
    { headers: H }
  ).then(r => r.json());
  const existingMatch = existing.find(c => {
    const a = c.company_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const b = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return a === b || a.startsWith(b.slice(0, Math.min(b.length, 12))) || b.startsWith(a.slice(0, Math.min(a.length, 12)));
  });

  const customerData = {
    owner_id: OWNER_ID,
    company_name: cleanName,
    email: (row["Email"] || "").trim().match(/^\S+@\S+/) ? row["Email"].trim() : null,
    billing_line1: addr.line1,
    billing_city: addr.city,
    billing_state: addr.state,
    billing_postal: addr.postal,
    payment_terms_days: 15,
    default_payment_method: "check",
    tax_rate: taxRate,
    archived,
    notes: noteParts.join("\n"),
  };

  let customerId;
  try {
    if (existingMatch) {
      await fetch(`${URL_BASE}/rest/v1/customers?id=eq.${existingMatch.id}`, {
        method: "PATCH", headers: H, body: JSON.stringify(customerData),
      }).then(async r => { if (!r.ok) throw new Error(await r.text()); });
      customerId = existingMatch.id;
      updated++;
    } else {
      const r2 = await fetch(`${URL_BASE}/rest/v1/customers`, {
        method: "POST",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify(customerData),
      });
      if (!r2.ok) throw new Error(await r2.text());
      customerId = (await r2.json())[0].id;
      created++;
    }

    // Wipe & re-create the location for this customer
    await fetch(`${URL_BASE}/rest/v1/locations?customer_id=eq.${customerId}`, { method: "DELETE", headers: H });
    const locR = await fetch(`${URL_BASE}/rest/v1/locations`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({
        owner_id: OWNER_ID, customer_id: customerId,
        label: "Service location",
        line1: addr.line1, city: addr.city, state: addr.state, postal: addr.postal,
      }),
    });
    const [loc] = await locR.json();

    // location_filters from the size columns
    const lfRows = [];
    for (const sz of sizeCols) {
      const qty = parseInt(row[sz] || "0", 10);
      if (qty > 0) {
        lfRows.push({
          owner_id: OWNER_ID,
          location_id: loc.id,
          sku_id: skuByName.get(sz),
          quantity: qty,
          // unit_price stays at SKU's 0 — cycle price covers everything via the plan's labor_fee.
        });
      }
    }
    if (lfRows.length) {
      await fetch(`${URL_BASE}/rest/v1/location_filters`, {
        method: "POST", headers: H, body: JSON.stringify(lfRows),
      });
    }

    // Service plan (replace any existing)
    await fetch(`${URL_BASE}/rest/v1/service_plans?customer_id=eq.${customerId}`, { method: "DELETE", headers: H });
    if (freq.active && cyclePrice > 0 && !archived) {
      await fetch(`${URL_BASE}/rest/v1/service_plans`, {
        method: "POST", headers: H,
        body: JSON.stringify({
          owner_id: OWNER_ID,
          customer_id: customerId,
          name: `${freq.days / 7}-week filter service`,
          frequency: "custom_days",
          custom_interval_days: freq.days,
          location_ids: [],
          labor_fee: cyclePrice,
          labor_fee_label: "Filter service (all filters included)",
          lead_time_days: 7,
          next_due_date: new Date(Date.now() + freq.days * 86_400_000).toISOString().slice(0, 10),
          active: true,
        }),
      });
    }

    console.log(`✓ ${cleanName.padEnd(42)} ${lfRows.length} filters · ${(taxRate * 100).toFixed(2)}%${archived ? " · ARCHIVED" : ""}`);
  } catch (e) {
    errors++;
    console.error(`✗ ${cleanName}: ${e.message}`);
  }
}

console.log(`\nDone — ${updated} updated, ${created} created, ${errors} errors.`);
console.log(`Filter SKUs: ${skuByName.size} in catalog.`);
