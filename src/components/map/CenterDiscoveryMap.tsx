import React, { useEffect, useRef } from 'react';
import { ProcurementCenter } from '../../types';
import { MapPin, Navigation, Sparkles, Clock, Users, ArrowRight } from 'lucide-react';
import L from 'leaflet';

interface CenterDiscoveryMapProps {
  centers: ProcurementCenter[];
  selectedCenter: ProcurementCenter | null;
  onSelectCenter: (center: ProcurementCenter) => void;
  onViewProfile: (center: ProcurementCenter) => void;
  onBookSlot: (center: ProcurementCenter) => void;
  farmerLat?: number;
  farmerLng?: number;
}

export const CenterDiscoveryMap: React.FC<CenterDiscoveryMapProps> = ({
  centers,
  selectedCenter,
  onSelectCenter,
  onViewProfile,
  onBookSlot,
  farmerLat = 12.2253,
  farmerLng = 79.0747
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map
      const map = L.map(mapContainerRef.current, {
        center: [farmerLat, farmerLng],
        zoom: 11,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Positron / OpenStreetMap modern clean tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // 1. Farmer Marker (Blue Pulse)
    const farmerIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
        <div class="relative w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
        </div>
      </div>
    `;

    const farmerIcon = L.divIcon({
      className: 'farmer-marker-pin',
      html: farmerIconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const farmerMarker = L.marker([farmerLat, farmerLng], { icon: farmerIcon })
      .bindPopup(`
        <div class="p-2 text-center">
          <p class="font-bold text-xs text-blue-900">Your Location</p>
          <p class="text-[10px] text-gray-500">Vengikkal, Tiruvannamalai</p>
        </div>
      `)
      .addTo(map);

    markersRef.current['farmer'] = farmerMarker;

    // 2. Center Markers (Color-coded: Green = Recommended/Low wait, Yellow = Normal/Busy, Red = High wait)
    centers.forEach((center) => {
      const isSelected = selectedCenter?.id === center.id;
      const isGreen = center.id === 'center-b' || (center.waitingTimeMins <= 20 && center.available_slots > 0);
      const isRed = center.id === 'center-c' || center.waitingTimeMins > 60 || center.available_slots === 0;

      const bgColor = isGreen ? 'bg-emerald-600' : isRed ? 'bg-rose-600' : 'bg-amber-500';
      const ringColor = isGreen ? 'ring-emerald-400' : isRed ? 'ring-rose-400' : 'ring-amber-400';

      const centerIconHtml = `
        <div class="relative group cursor-pointer transition-all transform ${isSelected ? 'scale-125 z-30' : 'hover:scale-110'}">
          ${
            center.ai_recommended
              ? '<span class="absolute -top-3 -right-2 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-emerald-600 text-[9px] font-extrabold text-white rounded-full shadow-md animate-bounce">AI</span>'
              : ''
          }
          <div class="w-10 h-10 rounded-2xl ${bgColor} text-white flex flex-col items-center justify-center shadow-xl border-2 border-white ring-2 ${ringColor}/40">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div class="absolute top-11 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-md border border-gray-100 whitespace-nowrap text-[10px] font-bold text-km-textPrimary flex items-center gap-1">
            <span>${center.waiting_time}</span>
          </div>
        </div>
      `;

      const centerIcon = L.divIcon({
        className: `center-marker-${center.id}`,
        html: centerIconHtml,
        iconSize: [40, 48],
        iconAnchor: [20, 24]
      });

      const marker = L.marker([center.latitude, center.longitude], { icon: centerIcon })
        .addTo(map)
        .on('click', () => {
          onSelectCenter(center);
        });

      markersRef.current[center.id] = marker;
    });

    // Auto-fit bounds
    const group = L.featureGroup(Object.values(markersRef.current));
    map.fitBounds(group.getBounds().pad(0.2));
  }, [centers, selectedCenter, farmerLat, farmerLng]);

  return (
    <div className="relative w-full h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-emerald-100 shadow-km-md bg-gray-100">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Legend Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-md border border-gray-100 text-[11px] font-medium text-km-textPrimary space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
          <span>Low Wait & High Slots</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
          <span>Moderate / Busy</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>
          <span>High Waiting / Full</span>
        </div>
      </div>

      {/* Quick Selected Center Pop-Up Card */}
      {selectedCenter && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-96 z-10 bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-emerald-200 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              {selectedCenter.ai_recommended && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-600" /> AI Optimal Choice
                </span>
              )}
              <h4 className="font-bold text-sm text-km-textPrimary leading-tight">{selectedCenter.name}</h4>
              <p className="text-[11px] text-km-textSecondary line-clamp-1 mt-0.5">{selectedCenter.address}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-km-primary">{selectedCenter.distance}</span>
              <span className="block text-[10px] text-gray-500">{selectedCenter.travel_time}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-center text-xs">
            <div className="bg-emerald-50/80 p-1.5 rounded-xl">
              <span className="text-[10px] text-gray-500 block">Queue</span>
              <span className="font-bold text-emerald-900">{selectedCenter.queue} Vehicles</span>
            </div>
            <div className="bg-blue-50/80 p-1.5 rounded-xl">
              <span className="text-[10px] text-gray-500 block">Wait Time</span>
              <span className="font-bold text-blue-900">{selectedCenter.waiting_time}</span>
            </div>
            <div className="bg-amber-50/80 p-1.5 rounded-xl">
              <span className="text-[10px] text-gray-500 block">Slots Open</span>
              <span className="font-bold text-amber-900">{selectedCenter.available_slots} Slots</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onViewProfile(selectedCenter)}
              className="flex-1 py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-km-textPrimary transition-colors"
            >
              Full Profile
            </button>
            <button
              onClick={() => onBookSlot(selectedCenter)}
              className="flex-1 py-2 px-3 rounded-xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-800/20 transition-colors"
            >
              <span>Book Slot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
