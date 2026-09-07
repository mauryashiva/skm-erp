-- ==============================================================================
-- SKM ERP - SETUP_PINCODE_DATABASE.sql
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/bwxsjrfjagphwaabvasr/sql)
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Divisions (The 26 authoritative divisions)
CREATE TABLE IF NOT EXISTS public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    is_ho BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.divisions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Central Pincodes Table (Real production table)
CREATE TABLE IF NOT EXISTS public.pincodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pincode VARCHAR(20) NOT NULL,
    city VARCHAR(150) NOT NULL,
    district VARCHAR(150),
    state VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    country_code VARCHAR(10) NOT NULL DEFAULT 'IN',
    area VARCHAR(255),
    post_office VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactivated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pincode_location UNIQUE (pincode, city, state, country)
);

-- Ensure all columns exist if table was already created earlier
ALTER TABLE public.pincodes ADD COLUMN IF NOT EXISTS district VARCHAR(150);
ALTER TABLE public.pincodes ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT 'IN';
ALTER TABLE public.pincodes ADD COLUMN IF NOT EXISTS area VARCHAR(255);
ALTER TABLE public.pincodes ADD COLUMN IF NOT EXISTS post_office VARCHAR(255);

-- 4. Pincode Division Assignment Junction
CREATE TABLE IF NOT EXISTS public.pincode_divisions (
    pincode_id UUID NOT NULL REFERENCES public.pincodes(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (pincode_id, division_id)
);

-- 5. Postal Code Cache (Worldwide external lookup cache)
CREATE TABLE IF NOT EXISTS public.postal_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postal_code VARCHAR(30) NOT NULL,
    country_code VARCHAR(10) NOT NULL DEFAULT 'IN',
    city VARCHAR(150) NOT NULL,
    state VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_postal_code_country UNIQUE (postal_code, country_code)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_pincodes_pincode ON public.pincodes(pincode);
CREATE INDEX IF NOT EXISTS idx_pincodes_active ON public.pincodes(is_active);
CREATE INDEX IF NOT EXISTS idx_pincode_divisions_div ON public.pincode_divisions(division_id);
CREATE INDEX IF NOT EXISTS idx_pincode_divisions_pin ON public.pincode_divisions(pincode_id);

-- Enable Supabase Realtime for instant multi-client synchronization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'pincodes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pincodes;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'pincode_divisions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pincode_divisions;
    END IF;
END $$;

ALTER TABLE public.pincodes REPLICA IDENTITY FULL;
ALTER TABLE public.pincode_divisions REPLICA IDENTITY FULL;

-- Disable RLS for now so API access via Anon & Service Key works seamlessly without extra auth setup
ALTER TABLE public.divisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincode_divisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.postal_cache DISABLE ROW LEVEL SECURITY;

-- Seed All 26 Authoritative Divisions verbatim
INSERT INTO public.divisions (name, code, is_ho, is_active)
VALUES
    ('SKM STEELS LIMITED (HO)', 'DIV_HO', true, true),
    ('SKM Inox', 'DIV_INOX', false, true),
    ('Strandply OSB', 'DIV_STRANDPLY_OSB', false, true),
    ('SKM Global - Mumbai', 'DIV_GLOBAL_MUM', false, true),
    ('SKM Global - Ahmedabad', 'DIV_GLOBAL_AHM', false, true),
    ('SKM Metal Processors', 'DIV_METAL_PROC', false, true),
    ('SKM CRHR- MP', 'DIV_CRHR_MP', false, true),
    ('SKM TISCON - MP', 'DIV_TISCON_MP', false, true),
    ('SKM Constra', 'DIV_CONSTRA', false, true),
    ('SKM Alucom', 'DIV_ALUCOM', false, true),
    ('SKM Steels Ltd. (CRHR)', 'DIV_STEELS_CRHR', false, true),
    ('SKM Galva', 'DIV_GALVA', false, true),
    ('SKM Ispat', 'DIV_ISPAT', false, true),
    ('SKM Energy', 'DIV_ENERGY', false, true),
    ('Strandply OSB Trading', 'DIV_STRANDPLY_TRD', false, true),
    ('SKM COMMODITIES - Mumbai', 'DIV_COMM_MUM', false, true),
    ('SKM Commodities - Gujarat', 'DIV_COMM_GUJ', false, true),
    ('SKM Commodities - Rajsthan', 'DIV_COMM_RAJ', false, true),
    ('SKM Commodities - Indore', 'DIV_COMM_IND', false, true),
    ('SKM Impex - Mumbai', 'DIV_IMPEX_MUM', false, true),
    ('SKM Impex - Chennai', 'DIV_IMPEX_CHE', false, true),
    ('SKM Impex - Cuttack', 'DIV_IMPEX_CUT', false, true),
    ('SKM Impex - Ahmedabad', 'DIV_IMPEX_AHM', false, true),
    ('SKM Impex - Hyderabad', 'DIV_IMPEX_HYD', false, true),
    ('SKM Impex - UP', 'DIV_IMPEX_UP', false, true),
    ('SKM Stainless', 'DIV_STAINLESS', false, true)
ON CONFLICT (name) DO UPDATE SET is_ho = EXCLUDED.is_ho;
