-- ============================================================
-- Default payment terms 15 → 30 (Net 30 from invoice date).
-- Updates the column defaults so newly-created customers get 30.
-- (Data update for existing customers is handled separately via REST.)
-- ============================================================

alter table customers
  alter column payment_terms_days set default 30;

alter table settings
  alter column default_terms_days set default 30;
