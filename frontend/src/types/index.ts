/**
 * Shared TypeScript types for the OSCA frontend.
 * Mirror Pydantic schemas from the FastAPI backend.
 */

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "coach" | "pe_instructor" | "student" | "director";

export interface User {
  id: string;
  email: string;
  student_id: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  full_name: string;
  role: UserRole;
  course: string | null;
  year_level: string | null;
  sport_or_art: string | null;
  is_active: boolean;
  is_face_enrolled: boolean;
  biometric_consent: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  student_id: string | null;
  is_active: boolean;
  is_face_enrolled: boolean;
}

export interface UserCreate {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: UserRole;
  student_id?: string;
  course?: string;
  year_level?: string;
  sport_or_art?: string;
  medical_info?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  biometric_consent?: boolean;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  role?: UserRole;
  course?: string;
  year_level?: string;
  sport_or_art?: string;
  is_active?: boolean;
}

// ── Attendance ────────────────────────────────────────────────────────────────

export type ActivityType = "practice" | "competition" | "training" | "event" | "other";
export type ScanResult =
  | "success"
  | "failed_recognition"
  | "failed_liveness"
  | "failed_threshold"
  | "no_face_detected"
  | "timeout";

export interface Session {
  id: string;
  name: string;
  activity_type: ActivityType;
  sport_or_art: string | null;
  venue: string | null;
  scheduled_start: string;
  scheduled_end: string;
  is_active: boolean;
  attendance_count: number;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  student_name: string;
  student_number: string | null;
  time_in: string | null;
  time_out: string | null;
  duration_minutes: number | null;
  time_in_confidence: number | null;
  time_out_confidence: number | null;
  is_complete: boolean;
}

export interface FaceScanResponse {
  result: ScanResult;
  matched_user_id: string | null;
  matched_user_name: string | null;
  confidence_score: number | null;
  liveness_score: number | null;
  attendance_record_id: string | null;
  processing_time_ms: number;
  message: string;
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export type EquipmentCategory =
  | "balls" | "rackets" | "nets" | "protective_gear" | "uniforms"
  | "training_aids" | "electronic" | "cultural" | "storage_unit" | "other";

export type EquipmentCondition = "new" | "good" | "fair" | "poor" | "for_repair" | "condemned";

export type TransactionStatus = "active" | "returned" | "overdue" | "partial_return";

export interface Equipment {
  id: string;
  name: string;
  description: string | null;
  category: EquipmentCategory;
  condition: EquipmentCondition;
  barcode: string;
  barcode_image_key: string | null;
  total_quantity: number;
  available_quantity: number;
  storage_location: string | null;
  sport_or_art: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BorrowTransactionItem {
  id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_barcode: string;
  quantity: number;
  is_returned: boolean;
  returned_at: string | null;
}

export interface BorrowTransaction {
  id: string;
  instructor_id: string;
  instructor_name: string;
  status: TransactionStatus;
  borrowed_at: string;
  expected_return: string;
  returned_at: string | null;
  overdue_notified: boolean;
  items: BorrowTransactionItem[];
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  students: {
    total: number;
    face_enrolled: number;
    enrollment_rate: number;
  };
  attendance: {
    today: number;
  };
  equipment: {
    total: number;
    borrowed: number;
    available: number;
  };
  transactions: {
    overdue: number;
  };
  generated_at: string;
}
