# 🌾 Kisan Go 2.0 (Smart Agricultural Procurement Platform)

> **Kisan Go** is an AI-powered smart agricultural procurement center management and slot booking platform built to eliminate long farmer queues, reduce transit time, and streamline grain procurement at Government Direct Purchase Centers (DPCs) and Regulated Markets.

---

## 🌟 Key Features

### 👨‍🌾 For Farmers:
- **AI Smart Center Discovery:** Computes optimal centers based on total farmer time:  
  $$\text{Total Time} = \text{Travel Time} + \text{Live Queue Waiting Time} + \text{Grain Processing Time}$$
- **Concurrency-Safe Slot Booking:** High-concurrency slot allocation preventing duplicate tokens or overbooked bays.
- **Live Digital Token & Queue Tracker:** Live updates on vehicles ahead, queue status, and GPS-based departure advisories.
- **Multilingual AI Voice Assistant:** Instant voice queries supported across **Tamil, English, Hindi, Telugu, and Malayalam**.
- **Farmer Profile & Billing History:** Direct access to computerized procurement bills, moisture analysis breakdown, and DBT transaction UTR references.
- **Evidence-Based Complaint Reporting:** Upload voice recordings or photo evidence for rapid grievance redressal.

### 🛡️ For Procurement Officers:
- **Live Weighbridge & Bay Operations:** 1-click farmer calling, moisture & foreign matter recording, MSP calculation, and automatic bill generation.
- **Direct Benefit Transfer (DBT) Simulation:** Automated generation of bank DBT credits and UTR numbers.
- **Officer Profile & Station Management:** Dedicated profile page for managing station capacity, working hours, and contact details.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Leaflet Maps
- **Backend:** Node.js, Express, WebAssembly SQLite (`sql.js`), Web Speech API
- **Build Tool:** Vite, TSX, Concurrently

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Run both Frontend & Backend concurrently
npm run dev
```

- **Frontend Web App:** [http://localhost:5173/](http://localhost:5173/)
- **Backend API Server:** [http://localhost:3001/](http://localhost:3001/)

---

## 🔐 Demo Credentials

- **Farmer Fast Login:** Enter any 10-digit mobile number or click `1-Click Fast Login as Ravi Kumar` (Demo OTP: `123456`).
- **Procurement Officer:**
  - `OFFICER-A` (Thiruvannamalai Regulated Market) / `password123`
  - `OFFICER-B` (Kilpennathur DPC) / `password123`
  - `OFFICER-C` (Polur Regulated Market) / `password123`
