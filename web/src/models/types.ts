// Typed mappings of the Section 4 Supabase tables, plus display helpers.

export type DocStatus = "valid" | "expiring_soon" | "expired" | "needs_renewal";

export type DocCategory =
  | "identity"
  | "travel"
  | "vehicle"
  | "education"
  | "financial"
  | "health";

export interface DocTypeMeta {
  wire: string;
  label: string;
  category: DocCategory;
  icon: string;
}

// Supported document types (Section 4.2 + 5.2).
export const DOC_TYPES: DocTypeMeta[] = [
  { wire: "aadhaar", label: "Aadhaar Card", category: "identity", icon: "🪪" },
  { wire: "pan", label: "PAN Card", category: "identity", icon: "💳" },
  { wire: "passport", label: "Passport", category: "travel", icon: "🛂" },
  { wire: "driving_license", label: "Driving License", category: "vehicle", icon: "🚗" },
  { wire: "voter_id", label: "Voter ID", category: "identity", icon: "🗳️" },
  { wire: "birth_cert", label: "Birth Certificate", category: "identity", icon: "📜" },
  { wire: "marriage_cert", label: "Marriage Certificate", category: "identity", icon: "💍" },
  { wire: "class10_cert", label: "Class 10 Certificate", category: "education", icon: "🎓" },
  { wire: "class12_cert", label: "Class 12 Certificate", category: "education", icon: "🎓" },
  { wire: "vehicle_rc", label: "Vehicle RC", category: "vehicle", icon: "📋" },
  { wire: "bank_passbook", label: "Bank Passbook", category: "financial", icon: "🏦" },
  { wire: "ration_card", label: "Ration Card", category: "identity", icon: "🍚" },
  { wire: "pension_card", label: "Pension Card", category: "financial", icon: "👵" },
  { wire: "health_card", label: "Health Card", category: "health", icon: "🏥" },
  { wire: "other", label: "Document", category: "identity", icon: "📄" },
];

export const docTypeMeta = (wire: string): DocTypeMeta =>
  DOC_TYPES.find((d) => d.wire === wire) ?? DOC_TYPES[DOC_TYPES.length - 1];

export interface AppUser {
  user_id: string;
  phone: string;
  full_name: string;
  dob: string;
  city: string;
  email: string | null;
  profile_photo_url: string | null;
  language: string;
  referral_code: string;
  doc_health_score: number;
  subscription_status: "free" | "member";
  subscription_expiry: string | null;
  doccash_balance: number; // paise
  is_agent: boolean;
  agent_certified: boolean;
}

export interface DocVaultDocument {
  doc_id: string;
  user_id: string;
  member_id: string | null;
  doc_type: string;
  doc_number: string | null;
  full_name_on_doc: string;
  dob_on_doc: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  doc_image_url: string | null;
  thumbnail_url: string | null;
  source: string;
  ocr_confidence: number | null;
  is_verified: boolean;
  status: DocStatus;
}

export type AlertSeverity = "critical" | "urgent" | "warning" | "info";

export interface Alert {
  alert_id: string;
  user_id: string;
  doc_id: string | null;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  related_service_id: string | null;
  fires_at: string;
}

export interface Service {
  service_id: string;
  category: string;
  name: string;
  description: string;
  what_we_do: string;
  docs_required: string[];
  govt_fee: number;
  service_fee: number;
  total_price: number;
  estimated_days: number;
  is_active: boolean;
  sort_order: number;
}

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "agent_assigned"
  | "en_route"
  | "collected"
  | "processing"
  | "completed"
  | "cancelled";

export interface Order {
  order_id: string;
  user_id: string;
  service_id: string;
  agent_id: string | null;
  status: OrderStatus;
  booking_date: string;
  booking_slot: string;
  address_city: string;
  address_pincode: string;
  total_amount: number;
  payment_status: string;
  rating: number | null;
  review_text: string | null;
}

export const ORDER_TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "confirmed", label: "Confirmed" },
  { status: "agent_assigned", label: "Agent Assigned" },
  { status: "en_route", label: "Agent En Route" },
  { status: "collected", label: "Documents Collected" },
  { status: "processing", label: "Processing" },
  { status: "completed", label: "Completed" },
];

export interface HealthBreakdown {
  completeness: number;
  validity: number;
  linkage: number;
  accuracy: number;
  total: number;
  detail: {
    core_docs_present: number;
    expired: number;
    expiring_30: number;
    expiring_90: number;
    links_verified: number;
  };
}

export type ReferralStatus = "pending" | "registered" | "first_service_completed" | "rewarded";

export interface Referral {
  referral_id: string;
  referrer_user_id: string;
  referred_user_id: string | null;
  referral_code: string;
  status: ReferralStatus;
  reward_amount: number; // paise
  created_at: string;
}

export interface DocCashTxn {
  txn_id: string;
  user_id: string;
  amount: number; // paise; + credit / - debit
  type: string;
  description: string;
  created_at: string;
}

export interface NotificationPrefs {
  expiry_alerts: boolean;
  order_updates: boolean;
  referral_updates: boolean;
  promotional: boolean;
  alert_timings: number[];
}

export interface AgentProfile {
  agent_id: string;
  certification_date: string | null;
  rating: number;
  total_orders: number;
  areas_served: string[];
  bio: string | null;
  total_earnings: number; // paise
  pending_payout: number; // paise
}
