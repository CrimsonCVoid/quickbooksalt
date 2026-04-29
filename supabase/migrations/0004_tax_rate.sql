-- ============================================================
-- Per-customer sales tax rate.
--
-- Stored as a fraction (e.g. 0.0700 for 7%). Applied to invoice.subtotal
-- to produce invoice.tax at generation time. Sourcing in NC is destination-
-- based — each customer has one location, so customer-level rate works.
-- If a customer ever has locations in different jurisdictions, split them
-- into separate customer records (or move tax_rate to locations later).
-- ============================================================

alter table customers
  add column if not exists tax_rate numeric(6,4) not null default 0;

comment on column customers.tax_rate is
  'Combined state + county sales tax rate as a fraction. e.g. 0.0700 = 7%. NC HVAC repair/maintenance services are taxable on the full invoice (filters + labor) under G.S. 105-164.4(a)(16). Set to 0 for tax-exempt customers — log the exemption form (E-595E) reference in the customer notes.';
