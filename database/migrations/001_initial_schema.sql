-- ==============================================================================
-- SKM ERP - 001_initial_schema.sql
-- Enterprise Schema for SKM STEELS LIMITED
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations (Central Parent Company)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Divisions (The 26 authoritative business units/divisions)
CREATE TABLE IF NOT EXISTS public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    is_ho BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactivated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Financial Years
CREATE TABLE IF NOT EXISTS public.financial_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE, -- e.g. "FY 2025-26"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. User Profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    mobile_number VARCHAR(25) NOT NULL,
    primary_division_id UUID REFERENCES public.divisions(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Permissions (Granular: module.entity.action)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g. "parameters.pincode.view"
    module VARCHAR(50) NOT NULL,       -- e.g. "parameters"
    entity VARCHAR(50) NOT NULL,       -- e.g. "pincode"
    action VARCHAR(50) NOT NULL,       -- e.g. "view", "create", "edit", "delete", "assign"
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Role Permissions Junction
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

-- 8. User Roles Junction
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

-- 9. User Authorized Divisions Junction
CREATE TABLE IF NOT EXISTS public.user_divisions (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, division_id)
);

-- 10. Pincodes (Central Authoritative Master Record - HO Controlled)
CREATE TABLE IF NOT EXISTS public.pincodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pincode VARCHAR(20) NOT NULL,
    city VARCHAR(150) NOT NULL,
    state VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactivated_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pincode_location UNIQUE (pincode, city, state, country)
);

-- 11. Pincode Division Assignments (HO Assigns to Divisions)
CREATE TABLE IF NOT EXISTS public.pincode_divisions (
    pincode_id UUID NOT NULL REFERENCES public.pincodes(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    PRIMARY KEY (pincode_id, division_id)
);

-- 12. Postal Code Cache (Worldwide external lookup cache)
CREATE TABLE IF NOT EXISTS public.postal_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postal_code VARCHAR(30) NOT NULL,
    country_code VARCHAR(10) NOT NULL DEFAULT 'IN',
    city VARCHAR(150) NOT NULL,
    state VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_postal_code_country UNIQUE (postal_code, country_code)
);

-- Create Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_divisions_is_ho ON public.divisions(is_ho);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_divisions_user ON public.user_divisions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_divisions_division ON public.user_divisions(division_id);
CREATE INDEX IF NOT EXISTS idx_pincodes_pincode ON public.pincodes(pincode);
CREATE INDEX IF NOT EXISTS idx_pincodes_active ON public.pincodes(is_active);
CREATE INDEX IF NOT EXISTS idx_pincode_divisions_div ON public.pincode_divisions(division_id);
CREATE INDEX IF NOT EXISTS idx_pincode_divisions_pin ON public.pincode_divisions(pincode_id);
CREATE INDEX IF NOT EXISTS idx_postal_cache_lookup ON public.postal_cache(postal_code, country_code);

-- ==============================================================================
-- Realtime Replication
-- Enable Supabase Realtime for instant updates across child divisions
-- ==============================================================================
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

-- Set replica identity full to ensure full record updates are received by realtime subscribers
ALTER TABLE public.pincodes REPLICA IDENTITY FULL;
ALTER TABLE public.pincode_divisions REPLICA IDENTITY FULL;

-- ==============================================================================
-- Database Helper Functions for RLS & Access
-- ==============================================================================

-- Check if user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT is_super_admin FROM public.profiles WHERE id = check_user_id AND status = 'APPROVED'),
        false
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user belongs to or is authorized for HO division
CREATE OR REPLACE FUNCTION public.is_ho_authorized(check_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_divisions ud
        JOIN public.divisions d ON d.id = ud.division_id
        WHERE ud.user_id = check_user_id
          AND d.is_ho = true
          AND d.is_active = true
    ) OR public.is_super_admin(check_user_id);
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has specific permission code
CREATE OR REPLACE FUNCTION public.user_has_permission(check_user_id UUID, perm_code VARCHAR)
RETURNS BOOLEAN AS $$
    SELECT public.is_super_admin(check_user_id) OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = check_user_id
          AND p.code = perm_code
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincode_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postal_cache ENABLE ROW LEVEL SECURITY;

-- 1. Organizations: Everyone authenticated can read
CREATE POLICY "Allow authenticated read organizations"
    ON public.organizations FOR SELECT TO authenticated
    USING (true);

-- 2. Divisions: Authenticated users can read active divisions
CREATE POLICY "Allow authenticated read divisions"
    ON public.divisions FOR SELECT TO authenticated
    USING (is_active = true OR public.is_super_admin(auth.uid()));

-- 3. Financial Years: Authenticated read
CREATE POLICY "Allow authenticated read financial years"
    ON public.financial_years FOR SELECT TO authenticated
    USING (is_active = true OR public.is_super_admin(auth.uid()));

-- 4. Profiles: User can read their own profile; Super Admin / User Managers can read all
CREATE POLICY "Allow self read profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Allow self update profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_super_admin(auth.uid()));

-- 5. Pincodes:
-- HO users or Super Admins can see all records
-- Child division users can only see pincodes assigned to their authorized divisions
CREATE POLICY "Read pincodes based on division access"
    ON public.pincodes FOR SELECT TO authenticated
    USING (
        public.is_ho_authorized(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.pincode_divisions pd
            JOIN public.user_divisions ud ON ud.division_id = pd.division_id
            WHERE pd.pincode_id = public.pincodes.id
              AND ud.user_id = auth.uid()
        )
    );

-- Write pincodes: Only HO authorized users with 'parameters.pincode.create' / 'parameters.pincode.edit'
CREATE POLICY "HO write pincodes"
    ON public.pincodes FOR INSERT TO authenticated
    WITH CHECK (
        public.is_ho_authorized(auth.uid()) 
        AND public.user_has_permission(auth.uid(), 'parameters.pincode.create')
    );

CREATE POLICY "HO update pincodes"
    ON public.pincodes FOR UPDATE TO authenticated
    USING (
        public.is_ho_authorized(auth.uid()) 
        AND (public.user_has_permission(auth.uid(), 'parameters.pincode.edit') OR public.user_has_permission(auth.uid(), 'parameters.pincode.delete'))
    );

-- 6. Pincode Divisions Junction:
CREATE POLICY "Read pincode divisions"
    ON public.pincode_divisions FOR SELECT TO authenticated
    USING (
        public.is_ho_authorized(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.user_divisions ud
            WHERE ud.division_id = public.pincode_divisions.division_id
              AND ud.user_id = auth.uid()
        )
    );

CREATE POLICY "HO manage pincode divisions"
    ON public.pincode_divisions FOR ALL TO authenticated
    USING (
        public.is_ho_authorized(auth.uid())
        AND public.user_has_permission(auth.uid(), 'parameters.pincode.assign')
    );

-- 7. Postal Cache: Authenticated read & write
CREATE POLICY "Allow authenticated read/write postal cache"
    ON public.postal_cache FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
