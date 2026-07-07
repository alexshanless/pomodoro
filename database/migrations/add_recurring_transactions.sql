-- ============================================================
-- MIGRATION: add_recurring_transactions
-- Adds real recurring-transaction support to financial_transactions.
--
-- Before this migration the app UI offered a "recurring" flag but the
-- columns did not exist: the flag was silently dropped on save and no
-- occurrences were ever generated.
--
-- is_recurring / recurring_type mark a transaction as a recurring
-- "anchor". The app generates missed occurrences on load as normal
-- transactions pointing back via parent_transaction_id. The unique
-- index makes occurrence generation idempotent across devices
-- (upsert with ON CONFLICT DO NOTHING).
--
-- Idempotent: safe to run more than once.
-- ============================================================

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS recurring_type TEXT;

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID
    REFERENCES financial_transactions(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'financial_transactions_recurring_type_check'
  ) THEN
    ALTER TABLE financial_transactions
      ADD CONSTRAINT financial_transactions_recurring_type_check
      CHECK (recurring_type IS NULL OR recurring_type IN ('weekly', 'monthly', 'yearly'));
  END IF;
END $$;

-- One occurrence per anchor per timestamp. NULL parents (normal
-- transactions) are unaffected because NULLs are distinct.
CREATE UNIQUE INDEX IF NOT EXISTS financial_transactions_recurring_occurrence
  ON financial_transactions (parent_transaction_id, occurred_at);
