import { Router } from 'express';
import {
  sendFarmerOTP,
  verifyFarmerOTP,
  officerLogin,
  registerOfficer,
  updateFarmerProfile,
  updateOfficerProfile
} from '../controllers/authController.js';
import {
  getAllCenters,
  getCenterById,
  addCenterReview
} from '../controllers/centerController.js';
import {
  getCenterSlots,
  bookSlot,
  getFarmerActiveBooking,
  cancelBooking
} from '../controllers/slotController.js';
import {
  getLiveQueue,
  updateQueueItemStatus
} from '../controllers/queueController.js';
import {
  getOfficerDashboardData,
  verifyFarmer,
  recordWeightAndQuality,
  markPaymentCompleted,
  getFarmerPayments,
  updateCenterSettings
} from '../controllers/procurementController.js';
import {
  submitComplaint,
  getFarmerComplaints,
  getAllComplaints,
  resolveComplaint
} from '../controllers/complaintController.js';
import {
  getCenterRecommendations,
  processVoiceQuery
} from '../controllers/aiController.js';

const router = Router();

// Auth routes
router.post('/auth/farmer/send-otp', sendFarmerOTP);
router.post('/auth/farmer/verify-otp', verifyFarmerOTP);
router.post('/auth/officer/login', officerLogin);
router.post('/auth/officer/register', registerOfficer);
router.put('/farmers/profile', updateFarmerProfile);
router.put('/officers/profile', updateOfficerProfile);

// Centers routes
router.get('/centers', getAllCenters);
router.get('/centers/:id', getCenterById);
router.post('/centers/:id/reviews', addCenterReview);

// AI Recommendation routes
router.post('/ai/recommend-center', getCenterRecommendations);
router.post('/ai/voice-query', processVoiceQuery);

// Slot & Booking routes
router.get('/centers/:centerId/slots', getCenterSlots);
router.post('/bookings', bookSlot);
router.get('/bookings/active/:farmerId', getFarmerActiveBooking);
router.post('/bookings/:id/cancel', cancelBooking);

// Queue routes
router.get('/centers/:centerId/queue', getLiveQueue);
router.put('/queue/:id/status', updateQueueItemStatus);

// Procurement & Officer routes
router.get('/officer/dashboard/:centerId', getOfficerDashboardData);
router.post('/procurement/verify', verifyFarmer);
router.post('/procurement/record', recordWeightAndQuality);
router.post('/procurement/payment/complete', markPaymentCompleted);
router.put('/officer/center/:centerId', updateCenterSettings);

// Payments & Bill routes
router.get('/payments/farmer/:farmerId', getFarmerPayments);

// Complaint routes
router.post('/complaints', submitComplaint);
router.get('/complaints/farmer/:farmerId', getFarmerComplaints);
router.get('/complaints', getAllComplaints);
router.put('/complaints/:id/resolve', resolveComplaint);

export default router;
