#!/usr/bin/env node
/**
 * One-off import: ./carolina_comfort_clients.csv -> customers + locations + service_plans.
 *
 * Each CSV row becomes:
 *   - 1 customer (with filter mix snapshotted into notes)
 *   - 1 location (parsed from "Service Address")
 *   - 1 service_plan (if frequency is a number; "As needed" / "N/A" rows skip it)
 *
 * The cycle price from the CSV ends up as `service_plans.labor_fee` so the
 * generated invoices show one line: "Filter service — $X.XX". Once the user
 * adds individual SKUs and assigns them to locations, lines will itemize.
 */

import { readFileSync } from "node:fs";

// ─── env ────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null;
    })
    .filter(Boolean)
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = (env.OWNER_EMAIL || "").split(",")[0].trim().toLowerCase();
if (!URL_BASE || !SERVICE) { console.error("Missing Supabase env"); process.exit(1); }

// ─── find owner ─────────────────────────────────────────
const ownerRes = await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=200`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
});
const { users } = await ownerRes.json();
const owner = (users || []).find((u) => (u.email || "").toLowerCase() === OWNER_EMAIL);
if (!owner) { console.error(`Owner ${OWNER_EMAIL} not found in auth.users`); process.exit(1); }
const OWNER_ID = owner.id;
console.log(`Importing as ${OWNER_EMAIL} (${OWNER_ID})`);

// ─── helpers ────────────────────────────────────────────
function parseCSV(text) {
  const rows = []; let row = [], field = "", inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuote = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuote = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c !== "\r") { field += c; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseAddress(raw) {
  if (!raw) return {};
  const parens = raw.match(/\(([^)]*)\)/g);
  const noteFromParens = parens ? parens.map(p => p.replace(/^\(|\)$/g, "")).join(" · ") : null;
  let s = raw.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();

  const zipMatch = s.match(/\b(\d{5})\s*$/);
  const postal = zipMatch?.[1] || null;
  if (zipMatch) s = s.slice(0, zipMatch.index).trim();

  const stateMatch = s.match(/\s([A-Z]{2})\s*$/);
  const state = stateMatch?.[1] || null;
  if (stateMatch) s = s.slice(0, stateMatch.index).trim();

  let line1 = null, city = s;
  if (/^\d/.test(s)) {
    const suffix = s.match(/\b(Hwy|Highway|Rd|Road|St|Street|Ave|Avenue|Blvd|Ln|Lane|Dr|Drive|Way|Pkwy|Parkway|Ct|Court|Cir|Circle|Pl|Place)\b/i);
    if (suffix) {
      const idx = suffix.index + suffix[0].length;
      line1 = s.slice(0, idx).trim();
      city = s.slice(idx).trim();
    }
  }
  return { line1, city: city || null, state, postal, addressNote: noteFromParens };
}

const parsePrice = (p) => {
  if (!p) return 0;
  const m = p.match(/\$?([\d,]+\.?\d*)/);
  return m ? parseFloat(m[1].replace(/,/g, "")) : 0;
};

function parseFrequency(f) {
  const n = parseInt(f, 10);
  if (!isNaN(n) && n > 0) return { active: true, intervalDays: n * 7, raw: f };
  return { active: false, intervalDays: null, raw: f };
}

// ─── parse CSV ──────────────────────────────────────────
const csvText = readFileSync("./carolina_comfort_clients.csv", "utf8");
const allRows = parseCSV(csvText);
const [, ...dataRows] = allRows; // drop header

const items = [];
for (const r of dataRows) {
  if (!r[0] || r.length < 2) continue;
  const [nameRaw, addr, email, filters, price, freq] = r;
  const name = nameRaw.trim();
  if (/duplicate consolidation/i.test(name)) continue;

  const addrInfo = parseAddress(addr);
  const priceNum = parsePrice(price);
  const f = parseFrequency(freq);

  const notes = [];
  if (filters && !/^per invoice|see invoice/i.test(filters)) notes.push(`Filter mix: ${filters}`);
  else if (filters) notes.push(`Filter mix: per invoice (${filters})`);
  if (price && /see invoice/i.test(price)) notes.push("Price: per invoice");
  if (addrInfo.addressNote) notes.push(`Address note: ${addrInfo.addressNote}`);
  if (/NOT REOPENING/i.test(name)) notes.push("⚠ NOT REOPENING — historical record only");
  if (!f.active) notes.push(`Frequency: ${f.raw} (no auto-recurring plan created)`);

  items.push({
    customer: {
      owner_id: OWNER_ID,
      company_name: name.replace(/\s*\(NOT REOPENING\)\s*/i, "").trim(),
      email: (email || "").trim() || null,
      payment_terms_days: 15,
      default_payment_method: "check",
      archived: /NOT REOPENING/i.test(name),
      notes: notes.join("\n") || null,
    },
    location: {
      owner_id: OWNER_ID,
      label: "Service location",
      line1: addrInfo.line1,
      city: addrInfo.city,
      state: addrInfo.state,
      postal: addrInfo.postal,
    },
    plan: f.active && priceNum > 0 ? {
      owner_id: OWNER_ID,
      name: `${f.intervalDays / 7}-week filter service`,
      frequency: "custom_days",
      custom_interval_days: f.intervalDays,
      location_ids: [],
      labor_fee: priceNum,
      labor_fee_label: "Filter service (all filters included)",
      lead_time_days: 7,
      next_due_date: new Date(Date.now() + f.intervalDays * 86400000).toISOString().slice(0, 10),
      active: true,
    } : null,
  });
}

console.log(`Parsed ${items.length} customers from CSV`);

// ─── insert ─────────────────────────────────────────────
async function postRest(table, body, returnRow = false) {
  const r = await fetch(`${URL_BASE}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...(returnRow ? { Prefer: "return=representation" } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${table}: ${r.status} ${t}`);
  }
  return returnRow ? (await r.json())[0] : null;
}

let createdCustomers = 0, createdLocations = 0, createdPlans = 0, errors = 0;
for (const it of items) {
  try {
    const cust = await postRest("customers", it.customer, true);
    createdCustomers++;
    const loc = { ...it.location, customer_id: cust.id };
    await postRest("locations", loc, false);
    createdLocations++;
    if (it.plan) {
      await postRest("service_plans", { ...it.plan, customer_id: cust.id }, false);
      createdPlans++;
    }
    console.log(`✓ ${it.customer.company_name}${it.plan ? "  + plan" : ""}${it.customer.archived ? "  (archived)" : ""}`);
  } catch (e) {
    errors++;
    console.error(`✗ ${it.customer.company_name}: ${e.message}`);
  }
}

console.log(`\nDone — ${createdCustomers} customers, ${createdLocations} locations, ${createdPlans} plans, ${errors} errors.`);
