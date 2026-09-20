/**
 * Transport Domain Types (Spec 1.5, C1, C2, C3, C4, C9, C10, C15)
 */

export type FeeBasis = "stop" | "zone" | "distance";
export type DropOrder = "reverse" | "same";
export type PartialMonthRule = "full_month" | "from_next_month";

export interface TransportSettings {
  school_id: string;
  fee_basis: FeeBasis;
  billing_months: number[];
  run_days: number[];
  drop_order: DropOrder;
  require_pretrip_checklist: boolean;
  guardian_handover_stages: string[];
  block_expired_documents: boolean;
  expiry_alert_days: number[];
  tracking_enabled: boolean;
  notify_boarding: boolean;
  notify_approaching: boolean;
  approaching_meters: number;
  partial_month_rule: PartialMonthRule;
  created_at?: string;
  updated_at?: string;
}

export type VehicleType = "bus" | "mini_bus" | "van" | "auto" | "other";
export type VehicleOwnership = "owned" | "contract";
export type VehicleStatus = "active" | "maintenance" | "retired";

export interface VehicleSafetyItems {
  first_aid: boolean;
  fire_extinguisher: boolean;
  speed_governor: boolean;
  cctv: boolean;
  gps: boolean;
  attendant_seat: boolean;
}

export interface TransportVehicle {
  id: string;
  school_id: string;
  registration_no: string; // Uppercase, spaces removed
  vehicle_type: VehicleType;
  make_model: string;
  manufacture_year?: number | null;
  capacity: number; // student seats only
  fuel_type?: string | null;
  ownership: VehicleOwnership;
  vendor_name?: string | null;
  vendor_phone?: string | null;
  gps_device_id?: string | null;
  odometer_km?: number | null;
  safety_items: VehicleSafetyItems;
  status: VehicleStatus;
  notes?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type VehicleDocType =
  | "rc"
  | "insurance"
  | "fitness"
  | "puc"
  | "road_tax"
  | "permit"
  | "speed_governor"
  | "other";

export interface VehicleDocument {
  id: string;
  school_id: string;
  vehicle_id: string;
  doc_type: VehicleDocType;
  doc_number: string;
  issued_on?: string | null;
  expires_on: string; // YYYY-MM-DD
  file_path?: string | null;
  is_mandatory: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type StaffType = "driver" | "attendant";
export type StaffStatus = "active" | "inactive";

export interface TransportStaff {
  id: string;
  school_id: string;
  staff_type: StaffType;
  full_name: string;
  phone: string;
  photo_path?: string | null;
  license_no?: string | null;
  license_class?: string | null;
  license_expires_on?: string | null;
  badge_no?: string | null;
  police_verified_on?: string | null;
  medical_fit_on?: string | null;
  experience_years?: number | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  id_proof_type?: string | null;
  id_proof_last4?: string | null; // Masked ID proof (e.g. "•••• •••• 1234")
  joined_on: string;
  status: StaffStatus;
  user_id?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type StaffDocType =
  | "license"
  | "police_verification"
  | "id_proof"
  | "medical"
  | "other";

export interface StaffDocument {
  id: string;
  school_id: string;
  staff_id: string;
  doc_type: StaffDocType;
  expires_on?: string | null;
  file_path?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type RouteStatus = "draft" | "active" | "inactive";

export interface TransportRoute {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string | null;
  default_vehicle_id?: string | null;
  default_driver_id?: string | null;
  default_attendant_id?: string | null;
  pickup_start_time: string; // HH:MM:SS or HH:MM
  drop_start_time: string;   // HH:MM:SS or HH:MM
  est_duration_min: number;
  status: RouteStatus;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RouteStop {
  id: string;
  school_id: string;
  route_id: string;
  name: string;
  landmark?: string | null;
  lat?: number | null;
  lng?: number | null;
  sequence: number; // 1, 2, 3...
  pickup_time: string; // HH:MM
  drop_time: string;   // HH:MM
  distance_km?: number | null;
  fee_zone_id?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TransportFeeZone {
  id: string;
  school_id: string;
  name: string;
  distance_from_km?: number | null;
  distance_to_km?: number | null;
  monthly_fee_paise: number;
  pickup_only_monthly_paise: number;
  drop_only_monthly_paise: number;
  is_active: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Enriched Models & UI Views ─────────────────────────────────────────────

export type DocumentExpiryStatus = "valid" | "expiring_soon" | "expired" | "missing";

export interface DocumentStatusChip {
  status: DocumentExpiryStatus;
  daysRemaining?: number;
  label: string;
  color: "green" | "amber" | "red" | "gray";
}

export interface EnrichedVehicle extends TransportVehicle {
  assigned_routes_count: number;
  assigned_routes: { id: string; name: string; code: string }[];
  document_status: DocumentStatusChip;
  documents_count: number;
  missing_mandatory_docs: VehicleDocType[];
}

export interface EnrichedStaff extends TransportStaff {
  assigned_routes: { id: string; name: string; code: string }[];
  license_status?: DocumentStatusChip;
  documents_count: number;
}

export interface EnrichedRoute extends TransportRoute {
  vehicle?: TransportVehicle | null;
  driver?: TransportStaff | null;
  attendant?: TransportStaff | null;
  stops_count: number;
  riders_count: number;
  seat_capacity: number;
  seats_used: number;
  is_over_capacity: boolean;
  stops: RouteStop[];
}

export interface TransportDashboardData {
  needs_attention: {
    expired_documents_count: number;
    expiring_documents_count: number;
    routes_without_driver_count: number;
    routes_without_vehicle_count: number;
    over_capacity_routes_count: number;
    pending_requests_count: number;
    items: {
      id: string;
      kind: "doc_expired" | "doc_expiring" | "unassigned_route" | "overcapacity_route";
      title: string;
      subtitle: string;
      link: string;
      severity: "high" | "medium";
    }[];
  };
  fleet_snapshot: {
    vehicles_active: number;
    vehicles_total: number;
    routes_active: number;
    total_riders: number;
    total_capacity: number;
    utilization_percent: number;
    route_bars: {
      route_id: string;
      route_name: string;
      route_code: string;
      seats_used: number;
      capacity: number;
      is_over: boolean;
    }[];
  };
  today_trips: {
    pickup_trips_count: number;
    drop_trips_count: number;
    completed_trips_count: number;
    delayed_trips_count: number;
    empty_state_message: string;
  };
}

export interface ExpiryAlertItem {
  id: string;
  school_id: string;
  entity_type: "vehicle" | "staff";
  entity_id: string;
  entity_name: string;
  doc_type: string;
  doc_number?: string;
  expires_on: string;
  days_remaining: number;
  threshold_days: number;
  dedupe_key: string;
}
