-- ==============================================================================
-- SKM ERP - 002_add_email_gender_and_audit_logs.sql
-- Migration: Add Email & Gender to Profiles + Immutable Audit Logs Foundation
-- ==============================================================================

-- 1. Add email and gender to profiles table if they don't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gender'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN gender VARCHAR(20) CHECK (gender IN ('Male', 'Female'));
    END IF;
END $$;

-- 2. Create Audit Logs Table (Single Authoritative Source for ERP Change History)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,          -- e.g. 'pincodes', 'account_types', 'users'
    entity_id VARCHAR(100) NOT NULL,           -- Record UUID or ID
    action VARCHAR(50) NOT NULL,               -- 'CREATE', 'UPDATE', 'ASSIGN_DIVISIONS', 'ACTIVATE', 'DEACTIVATE', 'DELETE'
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_username VARCHAR(100) NOT NULL,      -- Historical snapshot of username
    actor_name VARCHAR(255) NOT NULL,          -- Historical snapshot of actor's full name
    changes JSONB,                             -- Field-level diff: { "fieldName": { "before": ..., "after": ... } } or division delta
    metadata JSONB,                            -- Additional operational metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast retrieval of historical timelines
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);

-- 4. Row Level Security for Audit Logs (Immutable to normal users)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with view permissions to read audit logs
DROP POLICY IF EXISTS "Allow authenticated read audit logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated read audit logs"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (true);

-- Deny normal user UPDATE and DELETE on audit logs (Immutability guarantee)
-- Only service_role can insert/manage audit logs
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
