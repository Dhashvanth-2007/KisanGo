export type UserRole = 'farmer' | 'officer';

export type LanguageCode = 'Tamil' | 'English' | 'Hindi' | 'Telugu' | 'Malayalam';

export interface Farmer {
  id: string;
  name: string;
  mobile: string;
  language: LanguageCode;
  village: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  created_at?: string;
  role: 'farmer';
}

export interface Officer {
  id: string;
  officer_id: string;
  name: string;
  designation: string;
  assigned_center_id: string;
  working_hours: string;
  official_contact: string;
  role: 'officer';
  center?: ProcurementCenter;
}

export interface Crop {
  id: string;
  name: string;
  center_id: string;
  msp_rate: number;
  unit: string;
  processing_rate_mins_per_ton: number;
  active: number;
}

export interface CenterPhoto {
  id: string;
  center_id: string;
  image_url: string;
  caption?: string;
}

export interface CenterRating {
  id: string;
  center_id: string;
  farmer_id: string;
  farmer_name: string;
  rating: number;
  waiting_rating: number;
  staff_rating: number;
  processing_rating: number;
  facility_rating: number;
  review: string;
  created_at: string;
}

export interface Slot {
  id: string;
  center_id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  remaining_capacity?: number;
  is_full?: boolean;
  status: 'Available' | 'Filling Fast' | 'Full';
  is_ai_recommended?: boolean;
  recommendation_reason?: string;
  recommended_departure?: string;
  estimated_processing_mins?: number;
  score?: number;
}

export interface ProcurementCenter {
  id: string;
  name: string;
  code: string;
  description: string;
  address: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  working_hours: string;
  daily_capacity: number;
  current_capacity: number;
  status: 'Operating Normally' | 'High Waiting Time' | 'Busy' | 'Temporarily Closed';
  facilities: string[];
  distance: string;
  distanceKm: number;
  travel_time: string;
  travelTimeMins: number;
  queue: number;
  waiting_time: string;
  waitingTimeMins: number;
  available_slots: number;
  photo: string;
  photos?: CenterPhoto[];
  rating: number;
  review_count: number;
  ratings_breakdown?: {
    waiting: number;
    staff: number;
    processing: number;
    facilities: number;
  };
  officer: string;
  officer_details?: Officer;
  crops?: Crop[];
  slots?: Slot[];
  reviews?: CenterRating[];
  ai_recommended: boolean;
  ai_recommendation_reason?: string;
  totalFarmerTimeMins?: number;
  processingTimeMins?: number;
  breakdown?: {
    travel_time: string;
    waiting_time: string;
    processing_time: string;
    total_time: string;
  };
}

export interface Booking {
  id: string;
  farmer_id: string;
  center_id: string;
  slot_id: string;
  crop_id: string;
  expected_quantity: number;
  priority_score: number;
  estimated_processing_mins: number;
  estimated_waiting_mins: number;
  travel_time_mins: number;
  status:
    | 'Slot Booked'
    | 'Traveling'
    | 'Arrived'
    | 'Waiting'
    | 'Called'
    | 'Processing'
    | 'Weight Recorded'
    | 'Quality Checked'
    | 'Procurement Completed'
    | 'Bill Generated'
    | 'Payment Processing'
    | 'Payment Completed'
    | 'Cancelled';
  created_at: string;
  token_number?: string;
  queue_position?: number;
  original_queue_pos?: number;
  recommended_departure_time?: string;
  slot_date?: string;
  slot_start?: string;
  slot_end?: string;
  center_name?: string;
  center_address?: string;
  center_latitude?: number;
  center_longitude?: number;
  working_hours?: string;
  crop_name?: string;
  msp_rate?: number;
  live_queue_position?: number;
  live_queue_status?: string;
  live_estimated_wait?: number;
  officer_name?: string;
  officer_designation?: string;
  officer_contact?: string;
  photos?: CenterPhoto[];
  photo?: string;
  farmers_before?: number;
  farmer_name?: string;
  farmer_mobile?: string;
  farmer_village?: string;
  actual_quantity?: number;
  moisture_percentage?: number;
  foreign_matter_percentage?: number;
  quality_grade?: string;
  quality_status?: string;
  bill_number?: string;
  net_amount?: number;
  payment_status?: string;
  utr_reference?: string;
}

export interface DigitalToken {
  id: string;
  booking_id: string;
  token_number: string;
  queue_position: number;
  status: 'Active' | 'Called' | 'Completed' | 'Cancelled';
  recommended_departure_time?: string;
  created_at: string;
}

export interface LiveQueueItem {
  id: string;
  center_id: string;
  booking_id: string;
  position: number;
  status: 'Waiting' | 'Called' | 'Processing' | 'Completed';
  estimated_wait: number;
  token_number: string;
  expected_quantity: number;
  booking_status: string;
  farmer_name: string;
  crop_name: string;
  slot_start: string;
  slot_end: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  farmer_id: string;
  center_id?: string;
  center_name?: string;
  farmer_name?: string;
  farmer_mobile?: string;
  category:
    | 'Weight Problem'
    | 'Quality Problem'
    | 'Payment Problem'
    | 'Slot / Queue Problem'
    | 'Center Problem'
    | 'Officer / Staff Problem'
    | 'Other';
  description: string;
  ai_summary?: string;
  status: 'Submitted' | 'Under Review' | 'More Information Required' | 'Resolved';
  resolution?: string;
  created_at: string;
  resolved_at?: string;
  evidence?: {
    id: string;
    complaint_id: string;
    type: 'photo' | 'video' | 'audio' | 'document';
    file_url: string;
    caption?: string;
  }[];
}

export interface FarmerPayment {
  id: string;
  bill_id: string;
  farmer_id: string;
  amount: number;
  status: 'Payment Processing' | 'Payment Completed' | 'Failed';
  payment_mode: string;
  utr_reference?: string;
  payment_date?: string;
  created_at: string;
  bill_number: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  rate_per_kg: number;
  bill_date: string;
  actual_quantity: number;
  quality_grade: string;
  moisture_percentage: number;
  quality_status: string;
  expected_quantity: number;
  center_name: string;
  crop_name: string;
  token_number: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  user_type: 'farmer' | 'officer';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'queue' | 'payment';
  read: number;
  created_at: string;
}
