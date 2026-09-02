export const CREATE_TABLES_SQL = `
-- Farmers Table
CREATE TABLE IF NOT EXISTS farmers (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT UNIQUE,
  phone_number TEXT,
  phone_verified INTEGER DEFAULT 1,
  name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  language TEXT DEFAULT 'Tamil',
  village TEXT,
  district TEXT,
  state TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Officers Table
CREATE TABLE IF NOT EXISTS officers (
  id TEXT PRIMARY KEY,
  officer_id TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  assigned_center_id TEXT NOT NULL,
  working_hours TEXT DEFAULT '09:00 AM - 05:00 PM',
  official_contact TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Procurement Centers Table
CREATE TABLE IF NOT EXISTS procurement_centers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  working_hours TEXT NOT NULL DEFAULT '08:30 AM - 05:30 PM',
  daily_capacity INTEGER NOT NULL DEFAULT 60,
  current_capacity INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'Operating Normally', -- 'Operating Normally', 'High Waiting Time', 'Busy', 'Temporarily Closed'
  facilities TEXT, -- JSON array of facilities
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Center Photos Table
CREATE TABLE IF NOT EXISTS center_photos (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  FOREIGN KEY (center_id) REFERENCES procurement_centers(id) ON DELETE CASCADE
);

-- Crops Table
CREATE TABLE IF NOT EXISTS crops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  center_id TEXT NOT NULL,
  msp_rate REAL NOT NULL, -- Minimum Support Price per Quintal / kg
  unit TEXT DEFAULT 'Quintal (100 kg)',
  processing_rate_mins_per_ton INTEGER DEFAULT 15,
  active INTEGER DEFAULT 1,
  FOREIGN KEY (center_id) REFERENCES procurement_centers(id) ON DELETE CASCADE
);

-- Center Ratings & Reviews Table
CREATE TABLE IF NOT EXISTS center_ratings (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  rating REAL NOT NULL,
  waiting_rating REAL NOT NULL,
  staff_rating REAL NOT NULL,
  processing_rating REAL NOT NULL,
  facility_rating REAL NOT NULL,
  review TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (center_id) REFERENCES procurement_centers(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);

-- Slots Table (Master 1-Hour Windows with 15-Minute Sub-Slots)
CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  date TEXT NOT NULL,
  master_window TEXT, -- e.g. '09:00 AM - 10:00 AM'
  start_time TEXT NOT NULL, -- e.g. '09:00 AM'
  end_time TEXT NOT NULL, -- e.g. '09:15 AM'
  duration_mins INTEGER DEFAULT 15,
  capacity INTEGER NOT NULL DEFAULT 2,
  booked_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Available', -- 'Available', 'Booked', 'Reserved', 'Closed', 'Completed'
  reserved_reason TEXT, -- 'Centre Maintenance', 'Official Requirement', 'Emergency', 'Break', 'Staff Requirement', 'Capacity Control', 'Other'
  reserved_by TEXT,
  reserved_at TEXT,
  FOREIGN KEY (center_id) REFERENCES procurement_centers(id) ON DELETE CASCADE
);

-- Center Schedules & Configuration Table
CREATE TABLE IF NOT EXISTS center_schedules (
  center_id TEXT PRIMARY KEY,
  opening_time TEXT NOT NULL DEFAULT '09:00 AM',
  closing_time TEXT NOT NULL DEFAULT '05:00 PM',
  break_start TEXT DEFAULT '01:00 PM',
  break_end TEXT DEFAULT '02:00 PM',
  farmers_per_sub_slot INTEGER NOT NULL DEFAULT 2,
  master_slot_duration INTEGER NOT NULL DEFAULT 60,
  sub_slot_duration INTEGER NOT NULL DEFAULT 15,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (center_id) REFERENCES procurement_centers(id) ON DELETE CASCADE
);

-- Bookings Table (with Dynamic Queue & Real-time Delay tracking)
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL,
  center_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  crop_id TEXT NOT NULL,
  expected_quantity REAL NOT NULL, -- in kg
  priority_score REAL DEFAULT 0,
  estimated_processing_mins INTEGER DEFAULT 15,
  estimated_waiting_mins INTEGER DEFAULT 15,
  travel_time_mins INTEGER DEFAULT 20,
  planned_start_time TEXT, -- e.g. '10:00 AM'
  planned_end_time TEXT, -- e.g. '10:15 AM'
  actual_start_time TEXT, -- recorded when processing begins
  actual_end_time TEXT, -- recorded when completed
  estimated_start_time TEXT, -- dynamically recalculated with delay propagation
  delay_minutes INTEGER DEFAULT 0, -- propagated delay in minutes
  expected_completion_time TEXT, -- officer-adjusted expected completion
  status TEXT NOT NULL DEFAULT 'Slot Booked', -- 'Slot Booked', 'Traveling', 'Arrived', 'Waiting', 'Called', 'Processing', 'Delayed', 'Weight Recorded', 'Quality Checked', 'Procurement Completed', 'Bill Generated', 'Payment Processing', 'Payment Completed', 'Cancelled', 'Skipped'
  crops_breakdown TEXT, -- JSON array of selected crops and quantities
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id),
  FOREIGN KEY (center_id) REFERENCES procurement_centers(id),
  FOREIGN KEY (slot_id) REFERENCES slots(id),
  FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- Digital Tokens Table
CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,
  token_number TEXT UNIQUE NOT NULL, -- e.g. KM-0421
  queue_position INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Called', 'Completed', 'Cancelled'
  recommended_departure_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Live Queue Table
CREATE TABLE IF NOT EXISTS queue (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  booking_id TEXT UNIQUE NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Waiting', -- 'Waiting', 'Called', 'Processing', 'Completed'
  estimated_wait INTEGER NOT NULL DEFAULT 15, -- minutes
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (center_id) REFERENCES procurement_centers(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Procurement Records Table
CREATE TABLE IF NOT EXISTS procurement_records (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,
  officer_id TEXT NOT NULL,
  actual_quantity REAL NOT NULL, -- in kg
  moisture_percentage REAL,
  foreign_matter_percentage REAL,
  quality_grade TEXT NOT NULL DEFAULT 'Grade A', -- 'Grade A', 'Grade B', 'Grade C', 'Rejected'
  quality_status TEXT NOT NULL DEFAULT 'Accepted', -- 'Accepted', 'Deduction Applied', 'Rejected'
  remarks TEXT,
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (officer_id) REFERENCES officers(id)
);

-- Bills Table
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  bill_number TEXT UNIQUE NOT NULL,
  procurement_id TEXT UNIQUE NOT NULL,
  rate_per_kg REAL NOT NULL,
  gross_amount REAL NOT NULL,
  deductions REAL DEFAULT 0,
  net_amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (procurement_id) REFERENCES procurement_records(id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  bill_id TEXT UNIQUE NOT NULL,
  farmer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Payment Processing', -- 'Payment Processing', 'Payment Completed', 'Failed'
  payment_mode TEXT DEFAULT 'Direct Benefit Transfer (DBT)',
  utr_reference TEXT,
  payment_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id),
  FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);

-- Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  complaint_number TEXT UNIQUE NOT NULL, -- e.g. CMP-2026-001
  farmer_id TEXT NOT NULL,
  center_id TEXT,
  category TEXT NOT NULL, -- 'Weight Problem', 'Quality Problem', 'Payment Problem', 'Slot / Queue Problem', 'Center Problem', 'Officer / Staff Problem', 'Other'
  description TEXT NOT NULL,
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted', -- 'Submitted', 'Under Review', 'More Information Required', 'Resolved'
  resolution TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id),
  FOREIGN KEY (center_id) REFERENCES procurement_centers(id)
);

-- Complaint Evidence Table
CREATE TABLE IF NOT EXISTS complaint_evidence (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'photo', 'video', 'audio', 'document'
  file_url TEXT NOT NULL,
  caption TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- farmer_id or officer_id
  user_type TEXT NOT NULL, -- 'farmer' or 'officer'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'queue', 'payment'
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_slots_center_date ON slots(center_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_farmer ON bookings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_center ON bookings(center_id);
CREATE INDEX IF NOT EXISTS idx_queue_center_status ON queue(center_id, status);
CREATE INDEX IF NOT EXISTS idx_tokens_booking ON tokens(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_farmer ON payments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_farmer ON complaints(farmer_id);
`;
