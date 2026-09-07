-- ==============================================================================
-- SKM ERP - 001_seed_data.sql
-- Exact 26 Divisions, Roles, Permissions, and Initial Financial Years
-- ==============================================================================

-- 1. Seed Main Organization
INSERT INTO public.organizations (id, name, code, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'SKM STEELS LIMITED', 'SKM_STEELS', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Seed All 26 Authoritative Divisions verbatim
-- Division 1 is the MAIN HO / controlling division
INSERT INTO public.divisions (organization_id, name, code, is_ho, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'SKM STEELS LIMITED (HO)', 'DIV_HO', true, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Inox', 'DIV_INOX', false, true),
    ('11111111-1111-1111-1111-111111111111', 'Strandply OSB', 'DIV_STRANDPLY_OSB', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Global - Mumbai', 'DIV_GLOBAL_MUM', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Global - Ahmedabad', 'DIV_GLOBAL_AHM', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Metal Processors', 'DIV_METAL_PROC', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM CRHR- MP', 'DIV_CRHR_MP', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM TISCON - MP', 'DIV_TISCON_MP', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Constra', 'DIV_CONSTRA', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Alucom', 'DIV_ALUCOM', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Steels Ltd. (CRHR)', 'DIV_STEELS_CRHR', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Galva', 'DIV_GALVA', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Ispat', 'DIV_ISPAT', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Energy', 'DIV_ENERGY', false, true),
    ('11111111-1111-1111-1111-111111111111', 'Strandply OSB Trading', 'DIV_STRANDPLY_TRD', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM COMMODITIES - Mumbai', 'DIV_COMM_MUM', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Commodities - Gujarat', 'DIV_COMM_GUJ', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Commodities - Rajsthan', 'DIV_COMM_RAJ', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Commodities - Indore', 'DIV_COMM_IND', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Impex - Mumbai', 'DIV_IMPEX_MUM', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Impex - Chennai', 'DIV_IMPEX_CHE', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Impex - Cuttack', 'DIV_IMPEX_CUT', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Impex - Ahmedabad', 'DIV_IMPEX_AHM', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Impex - Hyderabad', 'DIV_IMPEX_HYD', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Impex - UP', 'DIV_IMPEX_UP', false, true),
    ('11111111-1111-1111-1111-111111111111', 'SKM Stainless', 'DIV_STAINLESS', false, true)
ON CONFLICT (name) DO UPDATE SET is_ho = EXCLUDED.is_ho;

-- 3. Seed Financial Years
INSERT INTO public.financial_years (code, start_date, end_date, is_active, is_current)
VALUES
    ('FY 2024-25', '2024-04-01', '2025-03-31', true, false),
    ('FY 2025-26', '2025-04-01', '2026-03-31', true, true),
    ('FY 2026-27', '2026-04-01', '2027-03-31', true, false),
    ('FY 2027-28', '2027-04-01', '2028-03-31', true, false),
    ('FY 2028-29', '2028-04-01', '2029-03-31', true, false),
    ('FY 2029-30', '2029-04-01', '2030-03-31', true, false)
ON CONFLICT (code) DO NOTHING;

-- 4. Seed Standard Roles
INSERT INTO public.roles (name, description, is_system)
VALUES
    ('Super Admin', 'Full unrestricted enterprise-wide access across all divisions and modules', true),
    ('HO Administrator', 'Head Office administrator with complete management of Parameters and Masters', true),
    ('HO Staff', 'Head Office staff with view, create, edit capabilities for assigned modules', false),
    ('Division Manager', 'Branch/Division level manager with operational oversight and view/use access', false),
    ('Division User', 'Standard divisional operator with view and use permissions for assigned records', false)
ON CONFLICT (name) DO NOTHING;

-- 5. Seed Granular Permissions
INSERT INTO public.permissions (code, module, entity, action, description)
VALUES
    -- Parameters: Pincode
    ('parameters.pincode.view', 'parameters', 'pincode', 'view', 'View Pincode records'),
    ('parameters.pincode.create', 'parameters', 'pincode', 'create', 'Create new Pincode records (HO only)'),
    ('parameters.pincode.edit', 'parameters', 'pincode', 'edit', 'Edit Pincode records (HO only)'),
    ('parameters.pincode.delete', 'parameters', 'pincode', 'delete', 'Deactivate Pincode records (HO only)'),
    ('parameters.pincode.assign', 'parameters', 'pincode', 'assign', 'Assign/Copy Pincode records to divisions (HO only)'),
    
    -- Masters (Foundation for next phase)
    ('masters.party.view', 'masters', 'party', 'view', 'View Party master records'),
    ('masters.party.create', 'masters', 'party', 'create', 'Create Party master records (HO only)'),
    ('masters.party.edit', 'masters', 'party', 'edit', 'Edit Party master records (HO only)'),
    ('masters.party.delete', 'masters', 'party', 'delete', 'Deactivate Party master records (HO only)'),

    -- Administration
    ('users.manage', 'admin', 'users', 'manage', 'Review, approve, assign roles and divisions to users'),
    ('roles.manage', 'admin', 'roles', 'manage', 'Manage enterprise roles and permission mappings')
ON CONFLICT (code) DO NOTHING;

-- 6. Link Permissions to Roles
-- Super Admin and HO Admin receive all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name IN ('Super Admin', 'HO Administrator')
ON CONFLICT DO NOTHING;

-- Division User receives view permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN ('parameters.pincode.view', 'masters.party.view')
WHERE r.name = 'Division User'
ON CONFLICT DO NOTHING;

-- Division Manager receives view permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN ('parameters.pincode.view', 'masters.party.view')
WHERE r.name = 'Division Manager'
ON CONFLICT DO NOTHING;

-- 7. Sample authoritative HO Pincode (Dewas, MP)
INSERT INTO public.pincodes (id, pincode, city, state, country, is_active)
VALUES 
    ('22222222-2222-2222-2222-222222222222', '452001', 'Dewas', 'Madhya Pradesh', 'India', true)
ON CONFLICT ON CONSTRAINT uq_pincode_location DO NOTHING;

-- Assign to sample divisions (SKM STEELS LIMITED (HO), SKM Inox, SKM CRHR- MP, SKM Galva)
INSERT INTO public.pincode_divisions (pincode_id, division_id)
SELECT '22222222-2222-2222-2222-222222222222', d.id
FROM public.divisions d
WHERE d.name IN ('SKM STEELS LIMITED (HO)', 'SKM Inox', 'SKM CRHR- MP', 'SKM Galva')
ON CONFLICT DO NOTHING;
