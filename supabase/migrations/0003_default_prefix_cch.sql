-- ============================================================
-- Change the default invoice-number prefix from 'FM' (legacy) to 'CCH'
-- (Carolina Comfort HVAC). Existing rows keep whatever they had — only
-- newly-inserted settings rows get the new default.
-- ============================================================

alter table settings
  alter column invoice_number_prefix set default 'CCH';
