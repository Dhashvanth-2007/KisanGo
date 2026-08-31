import { db, initDatabase } from './database.js';

export async function seedData() {
  await initDatabase();

  const count = db.prepare('SELECT count(*) as cnt FROM procurement_centers').get() as { cnt: number };
  if (count && count.cnt > 0) {
    console.log('⚡ Database already contains data. Clearing and re-seeding...');
    db.exec(`
      DELETE FROM notifications;
      DELETE FROM complaint_evidence;
      DELETE FROM complaints;
      DELETE FROM payments;
      DELETE FROM bills;
      DELETE FROM procurement_records;
      DELETE FROM queue;
      DELETE FROM tokens;
      DELETE FROM bookings;
      DELETE FROM slots;
      DELETE FROM center_ratings;
      DELETE FROM crops;
      DELETE FROM center_photos;
      DELETE FROM procurement_centers;
      DELETE FROM officers;
      DELETE FROM farmers;
    `);
  }

  // 1. Insert Farmers
  const insertFarmer = db.prepare(`
    INSERT INTO farmers (id, name, mobile, language, village, district, state, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFarmer.run(
    'farmer-1',
    'Ravi Kumar',
    '9876543210',
    'Tamil',
    'Vengikkal Village',
    'Tiruvannamalai',
    'Tamil Nadu',
    12.2253,
    79.0747
  );

  insertFarmer.run(
    'farmer-2',
    'K. Anbalagan',
    '9812345678',
    'Tamil',
    'Kalasapakkam',
    'Tiruvannamalai',
    'Tamil Nadu',
    12.3500,
    79.1100
  );

  insertFarmer.run(
    'farmer-3',
    'Ramesh Patel',
    '9898989898',
    'Hindi',
    'Sevoor Village',
    'Tiruvannamalai',
    'Tamil Nadu',
    12.2100,
    79.0400
  );

  // 2. Insert Procurement Centers
  const insertCenter = db.prepare(`
    INSERT INTO procurement_centers (id, name, code, description, address, district, state, latitude, longitude, working_hours, daily_capacity, current_capacity, status, facilities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Center A
  insertCenter.run(
    'center-a',
    'Thiruvannamalai Regulated Market (Center A)',
    'TN-TVM-01',
    'Central primary agricultural marketing center with digital weighbridge and 4 moisture testing counters.',
    'Market Committee Complex, Vellore Road, Tiruvannamalai, Tamil Nadu 606604',
    'Tiruvannamalai',
    'Tamil Nadu',
    12.2412,
    79.0685,
    '08:30 AM - 05:30 PM',
    60,
    18,
    'Operating Normally',
    JSON.stringify([
      '50MT Electronic Weighbridge',
      'Instant Moisture Meter Lab',
      'Covered Farmer Rest Shed with Fans',
      'Free RO Drinking Water',
      'Subsidized Canteen',
      'CCTV Monitored Queue Area'
    ])
  );

  // Center B (AI Recommended - farther distance, but very low queue and high throughput)
  insertCenter.run(
    'center-b',
    'Kilpennathur Direct Purchase Center (Center B)',
    'TN-KLP-02',
    'Modern automated direct procurement depot with dual unloading bays and express slot processing.',
    'DPC Yard, Tindivanam Main Road, Kilpennathur, Tamil Nadu 604601',
    'Tiruvannamalai',
    'Tamil Nadu',
    12.2605,
    79.2241,
    '08:00 AM - 06:00 PM',
    80,
    64,
    'Operating Normally',
    JSON.stringify([
      'Dual 60MT Digital Weighbridges',
      '3 Certified Grain Quality Testing Stations',
      'Express Unloading Conveyors',
      'Air-Conditioned Farmer Waiting Lounge',
      'Free Clean Drinking Water & Tea',
      'Priority Unloading for Pre-booked Slots',
      'Direct Banking & DBT Helpdesk'
    ])
  );

  // Center C (Congested - close to town, but long queue and heavy backlog)
  insertCenter.run(
    'center-c',
    'Polur Farmers Cooperative Center (Center C)',
    'TN-PLR-03',
    'High-traffic cooperative society procurement point undergoing capacity expansion.',
    'Near Old Bus Stand, Polur Main Road, Tiruvannamalai, Tamil Nadu 606803',
    'Tiruvannamalai',
    'Tamil Nadu',
    12.2010,
    79.0320,
    '09:00 AM - 04:30 PM',
    40,
    0,
    'High Waiting Time',
    JSON.stringify([
      'Single 30MT Weighbridge',
      'Manual Moisture Analyzer',
      'Covered Parking',
      'Drinking Water Dispenser'
    ])
  );

  // 3. Insert Officers
  const insertOfficer = db.prepare(`
    INSERT INTO officers (id, officer_id, password, name, designation, assigned_center_id, working_hours, official_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertOfficer.run(
    'officer-1',
    'OFFICER-A',
    'password123',
    'Demo Officer A (S. Selvam)',
    'Senior Procurement Officer',
    'center-a',
    '08:30 AM - 05:30 PM',
    'helpdesk-tvm01@kisango.gov.in / Ext 104'
  );

  insertOfficer.run(
    'officer-2',
    'OFFICER-B',
    'password123',
    'Demo Officer B (M. Rajeshwari)',
    'District Procurement Superintendent',
    'center-b',
    '08:00 AM - 06:00 PM',
    'helpdesk-klp02@kisango.gov.in / Ext 201'
  );

  insertOfficer.run(
    'officer-3',
    'OFFICER-C',
    'password123',
    'Demo Officer C (K. Murugan)',
    'Assistant Procurement Officer',
    'center-c',
    '09:00 AM - 04:30 PM',
    'helpdesk-plr03@kisango.gov.in / Ext 309'
  );

  // 4. Insert Center Photos
  const insertPhoto = db.prepare(`
    INSERT INTO center_photos (id, center_id, image_url, caption)
    VALUES (?, ?, ?, ?)
  `);

  // Center A Photos
  insertPhoto.run('photo-a1', 'center-a', 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1200&q=80', 'Entrance gate and regulated market administrative building');
  insertPhoto.run('photo-a2', 'center-a', 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80', 'Electronic 50MT weighbridge and truck queue area');
  insertPhoto.run('photo-a3', 'center-a', 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80', 'Grain sample inspection and moisture testing counter');

  // Center B Photos
  insertPhoto.run('photo-b1', 'center-b', 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80', 'Modern open procurement yard and express unloading bays');
  insertPhoto.run('photo-b2', 'center-b', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80', 'High-speed automated grain bag weighing and stacking');
  insertPhoto.run('photo-b3', 'center-b', 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1200&q=80', 'Farmer rest lounge and digital token display board');

  // Center C Photos
  insertPhoto.run('photo-c1', 'center-c', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1200&q=80', 'Old warehouse entrance and tractor unloading bay');

  // 5. Insert Crops
  const insertCrop = db.prepare(`
    INSERT INTO crops (id, name, center_id, msp_rate, unit, processing_rate_mins_per_ton, active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const cropsList = [
    { name: 'Paddy (Common / நெல்)', msp: 23.00, rate: 12 },
    { name: 'Paddy (Grade A / முதல் தரம் நெல்)', msp: 23.20, rate: 10 },
    { name: 'Maize (மக்காச்சோளம்)', msp: 20.90, rate: 14 },
    { name: 'Groundnut (நிலக்கடலை)', msp: 63.77, rate: 18 },
    { name: 'Ragi (கேழ்வரகு)', msp: 42.90, rate: 15 },
    { name: 'Black Gram / Urad (உளுந்து)', msp: 74.00, rate: 16 }
  ];

  ['center-a', 'center-b', 'center-c'].forEach((centerId) => {
    cropsList.forEach((crop, idx) => {
      insertCrop.run(
        `crop-${centerId}-${idx + 1}`,
        crop.name,
        centerId,
        crop.msp,
        'Kg (₹/kg)',
        crop.rate,
        1
      );
    });
  });

  // 6. Insert Center Ratings & Reviews
  const insertRating = db.prepare(`
    INSERT INTO center_ratings (id, center_id, farmer_id, farmer_name, rating, waiting_rating, staff_rating, processing_rating, facility_rating, review, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Center A reviews
  insertRating.run('rev-a1', 'center-a', 'farmer-2', 'K. Anbalagan', 4.5, 4.0, 5.0, 4.5, 4.5, 'Quick weighbridge operation and courteous staff. Fair sample grading.', '2026-08-28 10:15:00');
  insertRating.run('rev-a2', 'center-a', 'farmer-3', 'Ramesh Patel', 4.1, 3.8, 4.5, 4.0, 4.2, 'Well-organized parking and good drinking water shed. Took 40 minutes.', '2026-08-27 14:30:00');

  // Center B reviews (Highly praised for zero waiting time and modern setup)
  insertRating.run('rev-b1', 'center-b', 'farmer-1', 'Ravi Kumar', 4.8, 5.0, 4.8, 5.0, 4.5, 'Traveled 20 km here because the app showed 15 min wait time. Was out in 30 mins! Saved 2 hours compared to local mandi.', '2026-08-29 11:20:00');
  insertRating.run('rev-b2', 'center-b', 'farmer-2', 'K. Anbalagan', 4.6, 4.7, 4.8, 4.5, 4.6, 'Dual weighbridge is super fast. DBT payment SMS came within 24 hours.', '2026-08-26 09:40:00');
  insertRating.run('rev-b3', 'center-b', 'farmer-3', 'M. Velu', 4.7, 4.9, 4.6, 4.8, 4.6, 'Very clean waiting area with real-time screen showing token numbers.', '2026-08-25 15:10:00');

  // Center C reviews
  insertRating.run('rev-c1', 'center-c', 'farmer-3', 'Ramesh Patel', 3.2, 2.0, 4.0, 3.0, 3.5, 'Huge queue of tractors on the main road. Had to wait 3 hours because single weighbridge broke down.', '2026-08-29 16:45:00');

  // 7. Insert Slots for Today
  const insertSlot = db.prepare(`
    INSERT INTO slots (id, center_id, date, start_time, end_time, capacity, booked_count, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const todayStr = new Date().toISOString().split('T')[0];
  const timeSlots = [
    { start: '09:00 AM', end: '09:30 AM' },
    { start: '09:30 AM', end: '10:00 AM' },
    { start: '10:00 AM', end: '10:30 AM' },
    { start: '10:30 AM', end: '11:00 AM' },
    { start: '11:00 AM', end: '11:30 AM' },
    { start: '11:30 AM', end: '12:00 PM' },
    { start: '02:00 PM', end: '02:30 PM' },
    { start: '02:30 PM', end: '03:00 PM' },
    { start: '03:00 PM', end: '03:30 PM' },
    { start: '03:30 PM', end: '04:00 PM' }
  ];

  // Center A Slots: Moderately booked
  timeSlots.forEach((slot, i) => {
    const booked = i === 0 ? 10 : i === 1 ? 8 : i === 2 ? 6 : 4;
    const status = booked >= 10 ? 'Full' : booked >= 7 ? 'Filling Fast' : 'Available';
    insertSlot.run(`slot-a-${i + 1}`, 'center-a', todayStr, slot.start, slot.end, 10, booked, status);
  });

  // Center B Slots: Ample capacity & high availability (8 slots available)
  timeSlots.forEach((slot, i) => {
    const booked = i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 2 : 1;
    const status = 'Available';
    insertSlot.run(`slot-b-${i + 1}`, 'center-b', todayStr, slot.start, slot.end, 10, booked, status);
  });

  // Center C Slots: Fully booked / Overloaded
  timeSlots.forEach((slot, i) => {
    insertSlot.run(`slot-c-${i + 1}`, 'center-c', todayStr, slot.start, slot.end, 6, 6, 'Full');
  });

  // 8. Insert Demo Existing Bookings & Live Queue Items for Center B and Center A
  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, farmer_id, center_id, slot_id, crop_id, expected_quantity, priority_score, estimated_processing_mins, estimated_waiting_mins, travel_time_mins, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertToken = db.prepare(`
    INSERT INTO tokens (id, booking_id, token_number, queue_position, status, recommended_departure_time, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQueue = db.prepare(`
    INSERT INTO queue (id, center_id, booking_id, position, status, estimated_wait, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Existing booking for Farmer 2 at Center B
  insertBooking.run(
    'book-demo-1',
    'farmer-2',
    'center-b',
    'slot-b-2',
    'crop-center-b-1',
    3000,
    88.5,
    25,
    10,
    35,
    'Processing',
    `${todayStr} 08:45:00`
  );

  insertToken.run(
    'token-demo-1',
    'book-demo-1',
    'KM-0418',
    1,
    'Called',
    '08:50 AM',
    `${todayStr} 08:45:00`
  );

  insertQueue.run(
    'queue-demo-1',
    'center-b',
    'book-demo-1',
    1,
    'Processing',
    5,
    `${todayStr} 09:35:00`
  );

  // Existing booking for Farmer 3 at Center B
  insertBooking.run(
    'book-demo-2',
    'farmer-3',
    'center-b',
    'slot-b-3',
    'crop-center-b-2',
    2000,
    82.0,
    18,
    15,
    40,
    'Waiting',
    `${todayStr} 09:00:00`
  );

  insertToken.run(
    'token-demo-2',
    'book-demo-2',
    'KM-0419',
    2,
    'Active',
    '09:15 AM',
    `${todayStr} 09:00:00`
  );

  insertQueue.run(
    'queue-demo-2',
    'center-b',
    'book-demo-2',
    2,
    'Waiting',
    15,
    `${todayStr} 09:35:00`
  );

  // 9. Insert a Completed Past Procurement Record & DBT Bill for Farmer 1
  const insertProcurement = db.prepare(`
    INSERT INTO procurement_records (id, booking_id, officer_id, actual_quantity, moisture_percentage, foreign_matter_percentage, quality_grade, quality_status, remarks, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBill = db.prepare(`
    INSERT INTO bills (id, bill_number, procurement_id, rate_per_kg, gross_amount, deductions, net_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, bill_id, farmer_id, amount, status, payment_mode, utr_reference, payment_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Past booking
  insertBooking.run(
    'book-past-1',
    'farmer-1',
    'center-b',
    'slot-b-1',
    'crop-center-b-1',
    2500,
    95.0,
    20,
    10,
    40,
    'Payment Completed',
    '2026-08-25 09:00:00'
  );

  insertToken.run(
    'token-past-1',
    'book-past-1',
    'KM-0390',
    0,
    'Completed',
    '08:20 AM',
    '2026-08-25 09:00:00'
  );

  insertProcurement.run(
    'proc-past-1',
    'book-past-1',
    'officer-2',
    2500,
    11.8,
    0.4,
    'Grade A',
    'Accepted',
    'Optimal moisture and clean grain quality. Passed standard calibration.',
    '2026-08-25 10:15:00'
  );

  insertBill.run(
    'bill-past-1',
    'KM-BILL-2026-8941',
    'proc-past-1',
    23.20,
    58000.00,
    0.00,
    58000.00,
    '2026-08-25 10:20:00'
  );

  insertPayment.run(
    'pay-past-1',
    'bill-past-1',
    'farmer-1',
    58000.00,
    'Payment Completed',
    'Direct Benefit Transfer (DBT)',
    'RBI-DBT-20260826901844',
    '2026-08-26 11:30:00',
    '2026-08-25 10:25:00'
  );

  // 10. Insert Demo Complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (id, complaint_number, farmer_id, center_id, category, description, ai_summary, status, resolution, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEvidence = db.prepare(`
    INSERT INTO complaint_evidence (id, complaint_id, type, file_url, caption, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertComplaint.run(
    'cmp-1',
    'CMP-2026-0821',
    'farmer-1',
    'center-a',
    'Slot / Queue Problem',
    'Single weighbridge queue was moving very slowly because manual entry took too long.',
    'Farmer reported slow weighbridge processing causing a 50-minute queue delay.',
    'Resolved',
    'District Marketing Committee added 2 dedicated data entry staff to the weighbridge counter.',
    '2026-08-24 14:00:00',
    '2026-08-25 16:00:00'
  );

  insertEvidence.run(
    'ev-1',
    'cmp-1',
    'photo',
    'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=600&q=80',
    'Photo of weighbridge line',
    '2026-08-24 14:02:00'
  );

  // 11. Insert Demo Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, user_type, title, message, type, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    'notif-1',
    'farmer-1',
    'farmer',
    'DBT Payment Credited ₹58,000',
    'Payment for Bill KM-BILL-2026-8941 has been credited to your Aadhaar-linked bank account (UTR: RBI-DBT-20260826901844).',
    'payment',
    1,
    '2026-08-26 11:35:00'
  );

  insertNotif.run(
    'notif-2',
    'officer-2',
    'officer',
    'New AI Slot Allocation',
    'Center B has high capacity today. 8 slots open for express booking.',
    'info',
    0,
    '2026-08-30 08:00:00'
  );

  console.log('✅ Demo data seeded successfully with realistic centers, officers, slots, crops, reviews, and tokens.');
}

// If run directly
if (process.argv[1]?.includes('seed.ts')) {
  seedData().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
