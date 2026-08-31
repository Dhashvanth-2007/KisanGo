import { ProcurementCenter, Slot, Booking, Complaint, FarmerPayment } from '../types';

const BASE_URL = '/api';

async function handleResponse(res: Response) {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}: ${text.slice(0, 120)}`);
    }
    return { success: false, message: text || 'Invalid response from server' };
  }
}

export const api = {
  // Authentication
  async sendFarmerOTP(mobile: string) {
    const res = await fetch(`${BASE_URL}/auth/farmer/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile })
    });
    return handleResponse(res);
  },

  async verifyFarmerOTP(payload: {
    mobile: string;
    otp: string;
    name?: string;
    language?: string;
    village?: string;
    district?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const res = await fetch(`${BASE_URL}/auth/farmer/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async officerLogin(officerId: string, password: string) {
    const res = await fetch(`${BASE_URL}/auth/officer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officerId, password })
    });
    return handleResponse(res);
  },

  async updateFarmerProfile(payload: {
    id: string;
    name?: string;
    mobile?: string;
    language?: string;
    village?: string;
    district?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const res = await fetch(`${BASE_URL}/farmers/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async updateOfficerProfile(payload: {
    id: string;
    name?: string;
    designation?: string;
    official_contact?: string;
    working_hours?: string;
    password?: string;
  }) {
    const res = await fetch(`${BASE_URL}/officers/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Centers & Discovery
  async getCenters(lat: number = 12.2253, lng: number = 79.0747): Promise<{ success: boolean; data: ProcurementCenter[] }> {
    const res = await fetch(`${BASE_URL}/centers?lat=${lat}&lng=${lng}`);
    return handleResponse(res);
  },

  async getCenterById(id: string, lat: number = 12.2253, lng: number = 79.0747): Promise<{ success: boolean; data: ProcurementCenter }> {
    const res = await fetch(`${BASE_URL}/centers/${id}?lat=${lat}&lng=${lng}`);
    return handleResponse(res);
  },

  async addCenterReview(centerId: string, reviewData: any) {
    const res = await fetch(`${BASE_URL}/centers/${centerId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    return handleResponse(res);
  },

  // AI Recommendation
  async getAiRecommendations(lat: number = 12.2253, lng: number = 79.0747, quantity: number = 2500) {
    const res = await fetch(`${BASE_URL}/ai/recommend-center`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, quantity })
    });
    return handleResponse(res);
  },

  async queryVoiceAI(query: string, language: string, farmerId?: string) {
    const res = await fetch(`${BASE_URL}/ai/voice-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, language, farmerId })
    });
    return handleResponse(res);
  },

  // Slots & Booking
  async getCenterSlots(centerId: string, date?: string, quantity?: number, lat?: number, lng?: number) {
    const query = new URLSearchParams();
    if (date) query.append('date', date);
    if (quantity) query.append('quantity', quantity.toString());
    if (lat) query.append('lat', lat.toString());
    if (lng) query.append('lng', lng.toString());

    const res = await fetch(`${BASE_URL}/centers/${centerId}/slots?${query.toString()}`);
    return handleResponse(res);
  },

  async bookSlot(payload: {
    farmerId: string;
    centerId: string;
    slotId: string;
    cropId: string;
    expectedQuantity: number;
    lat?: number;
    lng?: number;
  }) {
    const res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getFarmerActiveBooking(farmerId: string): Promise<{ success: boolean; data: Booking | null }> {
    const res = await fetch(`${BASE_URL}/bookings/active/${farmerId}`);
    return handleResponse(res);
  },

  async cancelBooking(bookingId: string) {
    const res = await fetch(`${BASE_URL}/bookings/${bookingId}/cancel`, {
      method: 'POST'
    });
    return handleResponse(res);
  },

  // Live Queue
  async getLiveQueue(centerId: string, bookingId?: string) {
    const query = bookingId ? `?bookingId=${bookingId}` : '';
    const res = await fetch(`${BASE_URL}/centers/${centerId}/queue${query}`);
    return handleResponse(res);
  },

  async updateQueueStatus(queueId: string, status: string) {
    const res = await fetch(`${BASE_URL}/queue/${queueId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  // Officer Dashboard & Procurement
  async getOfficerDashboard(centerId: string) {
    const res = await fetch(`${BASE_URL}/officer/dashboard/${centerId}`);
    return handleResponse(res);
  },

  async verifyFarmer(bookingId: string) {
    const res = await fetch(`${BASE_URL}/procurement/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId })
    });
    return handleResponse(res);
  },

  async recordProcurement(payload: {
    bookingId: string;
    officerId: string;
    actualQuantity: number;
    moisturePercentage: number;
    foreignMatterPercentage: number;
    qualityGrade: string;
    remarks?: string;
  }) {
    const res = await fetch(`${BASE_URL}/procurement/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async markPaymentComplete(billId: string) {
    const res = await fetch(`${BASE_URL}/procurement/payment/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId })
    });
    return handleResponse(res);
  },

  async updateCenterSettings(centerId: string, settings: any) {
    const res = await fetch(`${BASE_URL}/officer/center/${centerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return handleResponse(res);
  },

  // Farmer Payments & DBT
  async getFarmerPayments(farmerId: string): Promise<{ success: boolean; data: FarmerPayment[] }> {
    const res = await fetch(`${BASE_URL}/payments/farmer/${farmerId}`);
    return handleResponse(res);
  },

  // Complaints
  async submitComplaint(payload: {
    farmerId: string;
    centerId?: string;
    category: string;
    description: string;
    evidence?: any[];
  }) {
    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getFarmerComplaints(farmerId: string): Promise<{ success: boolean; data: Complaint[] }> {
    const res = await fetch(`${BASE_URL}/complaints/farmer/${farmerId}`);
    return handleResponse(res);
  },

  async getAllComplaints(centerId?: string): Promise<{ success: boolean; data: Complaint[] }> {
    const query = centerId ? `?centerId=${centerId}` : '';
    const res = await fetch(`${BASE_URL}/complaints${query}`);
    return handleResponse(res);
  },

  async resolveComplaint(id: string, status: string, resolution: string) {
    const res = await fetch(`${BASE_URL}/complaints/${id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resolution })
    });
    return handleResponse(res);
  }
};
