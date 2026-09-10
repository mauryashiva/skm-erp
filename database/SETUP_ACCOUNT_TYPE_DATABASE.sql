-- ==============================================================================
-- SKM ERP - SETUP_ACCOUNT_TYPE_DATABASE.sql
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/bwxsjrfjagphwaabvasr/sql)
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Central Account Types Table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.account_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type VARCHAR(150) NOT NULL,
    short_name VARCHAR(50),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactivated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_account_type_name UNIQUE (account_type)
);

-- 3. Account Type Division Assignment Junction Table
CREATE TABLE IF NOT EXISTS public.account_type_divisions (
    account_type_id UUID NOT NULL REFERENCES public.account_types(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_type_id, division_id)
);

-- 4. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_account_types_name ON public.account_types(account_type);
CREATE INDEX IF NOT EXISTS idx_account_types_active ON public.account_types(is_active);
CREATE INDEX IF NOT EXISTS idx_account_type_div_div ON public.account_type_divisions(division_id);
CREATE INDEX IF NOT EXISTS idx_account_type_div_at ON public.account_type_divisions(account_type_id);

-- 5. Enable Supabase Realtime for instant multi-client synchronization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'account_types'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.account_types;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'account_type_divisions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.account_type_divisions;
    END IF;
END $$;

ALTER TABLE public.account_types REPLICA IDENTITY FULL;
ALTER TABLE public.account_type_divisions REPLICA IDENTITY FULL;

-- 6. Disable RLS and Grant Privileges so API access works seamlessly
ALTER TABLE public.account_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_type_divisions DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.account_types TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.account_type_divisions TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 7. Seed standard initial account types if table is empty
INSERT INTO public.account_types (account_type, short_name, description, is_active)
VALUES
    ('Asset', 'ASSET', 'Economic resources expected to benefit future operations', true),
    ('Liability', 'LIAB', 'Financial debts or obligations owed to outside parties', true),
    ('Equity', 'EQTY', 'Owner or shareholder stake in the corporate entity', true),
    ('Revenue / Income', 'REV', 'Inflow of proceeds from goods sold and services rendered', true),
    ('Direct Expense', 'EXP_DIR', 'Expenditures directly attributable to production and acquisition', true),
    ('Indirect Expense', 'EXP_IND', 'Administrative, overhead, and operating operating expenses', true),
    ('Bank Account', 'BANK', 'Corporate commercial and operational banking accounts', true),
    ('Cash Account', 'CASH', 'Physical currency and petty cash registers', true),
    ('Sundry Debtors', 'DEBTOR', 'Trade customer receivables', true),
    ('Sundry Creditors', 'CREDITOR', 'Trade supplier and vendor payables', true)
ON CONFLICT (account_type) DO NOTHING;

-- Assign all seeded account types to all authoritative divisions
INSERT INTO public.account_type_divisions (account_type_id, division_id)
SELECT at.id, d.id
FROM public.account_types at
CROSS JOIN public.divisions d
ON CONFLICT (account_type_id, division_id) DO NOTHING;
