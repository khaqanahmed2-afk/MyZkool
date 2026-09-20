-- Migration 014: Transport Core Tables and RLS Policies (Spec 1.5, C1, C2, C3, C10)
-- Creates only the 8 requested core tables from C3 with school_has_feature('transport') RLS.

-- 1. transport_settings
CREATE TABLE IF NOT EXISTS public.transport_settings (
  school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_basis TEXT NOT NULL DEFAULT 'zone' CHECK (fee_basis IN ('stop', 'zone', 'distance')),
  billing_months INT[] NOT NULL DEFAULT '{4,5,6,7,8,9,10,11,12,1,2,3}',
  run_days INT[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  drop_order TEXT NOT NULL DEFAULT 'reverse' CHECK (drop_order IN ('reverse', 'same')),
  require_pretrip_checklist BOOLEAN NOT NULL DEFAULT false,
  guardian_handover_stages TEXT[] NOT NULL DEFAULT '{pre_primary}',
  block_expired_documents BOOLEAN NOT NULL DEFAULT true,
  expiry_alert_days INT[] NOT NULL DEFAULT '{30,15,7,1}',
  tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_boarding BOOLEAN NOT NULL DEFAULT false,
  notify_approaching BOOLEAN NOT NULL DEFAULT true,
  approaching_meters INT NOT NULL DEFAULT 800,
  partial_month_rule TEXT NOT NULL DEFAULT 'full_month' CHECK (partial_month_rule IN ('full_month', 'from_next_month')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. transport_vehicles
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  registration_no TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bus', 'mini_bus', 'van', 'auto', 'other')),
  make_model TEXT NOT NULL,
  manufacture_year INT,
  capacity INT NOT NULL CHECK (capacity > 0),
  fuel_type TEXT,
  ownership TEXT NOT NULL DEFAULT 'owned' CHECK (ownership IN ('owned', 'contract')),
  vendor_name TEXT,
  vendor_phone TEXT,
  gps_device_id TEXT,
  odometer_km INT,
  safety_items JSONB NOT NULL DEFAULT '{"first_aid": false, "fire_extinguisher": false, "speed_governor": false, "cctv": false, "gps": false, "attendant_seat": false}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_vehicles_reg_school
  ON public.transport_vehicles (school_id, UPPER(REPLACE(registration_no, ' ', '')))
  WHERE deleted_at IS NULL;

-- 3. vehicle_documents
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('rc', 'insurance', 'fitness', 'puc', 'road_tax', 'permit', 'speed_governor', 'other')),
  doc_number TEXT NOT NULL,
  issued_on DATE,
  expires_on DATE NOT NULL,
  file_path TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_expires ON public.vehicle_documents(expires_on);

-- 4. transport_staff
CREATE TABLE IF NOT EXISTS public.transport_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_type TEXT NOT NULL CHECK (staff_type IN ('driver', 'attendant')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  photo_path TEXT,
  license_no TEXT,
  license_class TEXT,
  license_expires_on DATE,
  badge_no TEXT,
  police_verified_on DATE,
  medical_fit_on DATE,
  experience_years INT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  id_proof_type TEXT,
  id_proof_last4 TEXT,
  joined_on DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_staff_phone_school
  ON public.transport_staff (school_id, phone)
  WHERE deleted_at IS NULL;

-- 5. staff_documents
CREATE TABLE IF NOT EXISTS public.staff_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.transport_staff(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('license', 'police_verification', 'id_proof', 'medical', 'other')),
  expires_on DATE,
  file_path TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_docs_staff ON public.staff_documents(staff_id);

-- 6. transport_routes
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  default_vehicle_id UUID REFERENCES public.transport_vehicles(id) ON DELETE SET NULL,
  default_driver_id UUID REFERENCES public.transport_staff(id) ON DELETE SET NULL,
  default_attendant_id UUID REFERENCES public.transport_staff(id) ON DELETE SET NULL,
  pickup_start_time TIME NOT NULL,
  drop_start_time TIME NOT NULL,
  est_duration_min INT NOT NULL DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_routes_code_school
  ON public.transport_routes (school_id, UPPER(code))
  WHERE deleted_at IS NULL;

-- 7. route_stops
CREATE TABLE IF NOT EXISTS public.route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  landmark TEXT,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  sequence INT NOT NULL CHECK (sequence > 0),
  pickup_time TIME NOT NULL,
  drop_time TIME NOT NULL,
  distance_km NUMERIC(6, 2),
  fee_zone_id UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_route_stops_sequence
  ON public.route_stops (route_id, sequence)
  WHERE deleted_at IS NULL;

-- 8. transport_fee_zones
CREATE TABLE IF NOT EXISTS public.transport_fee_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  distance_from_km NUMERIC(6, 2),
  distance_to_km NUMERIC(6, 2),
  monthly_fee_paise BIGINT NOT NULL DEFAULT 0 CHECK (monthly_fee_paise >= 0),
  pickup_only_monthly_paise BIGINT NOT NULL DEFAULT 0 CHECK (pickup_only_monthly_paise >= 0),
  drop_only_monthly_paise BIGINT NOT NULL DEFAULT 0 CHECK (drop_only_monthly_paise >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key for fee_zone_id on route_stops
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_route_stops_fee_zone'
  ) THEN
    ALTER TABLE public.route_stops
      ADD CONSTRAINT fk_route_stops_fee_zone
      FOREIGN KEY (fee_zone_id) REFERENCES public.transport_fee_zones(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Row Level Security with school_has_feature('transport') ─────────────────

ALTER TABLE public.transport_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_fee_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transport_settings_isolation" ON public.transport_settings;
CREATE POLICY "transport_settings_isolation" ON public.transport_settings
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "transport_vehicles_isolation" ON public.transport_vehicles;
CREATE POLICY "transport_vehicles_isolation" ON public.transport_vehicles
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "vehicle_documents_isolation" ON public.vehicle_documents;
CREATE POLICY "vehicle_documents_isolation" ON public.vehicle_documents
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "transport_staff_isolation" ON public.transport_staff;
CREATE POLICY "transport_staff_isolation" ON public.transport_staff
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "staff_documents_isolation" ON public.staff_documents;
CREATE POLICY "staff_documents_isolation" ON public.staff_documents
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "transport_routes_isolation" ON public.transport_routes;
CREATE POLICY "transport_routes_isolation" ON public.transport_routes
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "route_stops_isolation" ON public.route_stops;
CREATE POLICY "route_stops_isolation" ON public.route_stops
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "transport_fee_zones_isolation" ON public.transport_fee_zones;
CREATE POLICY "transport_fee_zones_isolation" ON public.transport_fee_zones
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );
