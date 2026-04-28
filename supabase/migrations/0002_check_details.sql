-- ============================================================
-- Add structured "pay by check" fields to settings.
-- These render in a prominent block on the invoice PDF + email
-- so customers don't have to hunt for the info when writing a check.
-- ============================================================

alter table settings
  add column if not exists check_pay_to        text,
  add column if not exists check_address_line1 text,
  add column if not exists check_address_line2 text,
  add column if not exists check_city          text,
  add column if not exists check_state         text,
  add column if not exists check_postal        text,
  add column if not exists check_memo_template text;

comment on column settings.check_pay_to        is '"Make checks payable to" — usually the legal business name.';
comment on column settings.check_address_line1 is 'Mail-to street.';
comment on column settings.check_address_line2 is 'Mail-to suite/unit (optional).';
comment on column settings.check_city          is 'Mail-to city.';
comment on column settings.check_state         is 'Mail-to state (2-letter).';
comment on column settings.check_postal        is 'Mail-to ZIP.';
comment on column settings.check_memo_template is 'Memo line. Use {invoice_number} as a placeholder. Default: "Invoice {invoice_number}".';
