import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ProcurementCenter, CenterRating } from '../../types';
import { RatingStars } from '../common/RatingStars';
import { Badge } from '../common/Badge';
import {
  MapPin,
  Clock,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  Phone,
  Navigation,
  CheckCircle2,
  Wheat,
  ThumbsUp,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

interface CenterProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
  center: ProcurementCenter | null;
  onBookSlot: (center: ProcurementCenter) => void;
}

export const CenterProfileView: React.FC<CenterProfileViewProps> = ({
  isOpen,
  onClose,
  center,
  onBookSlot
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'crops' | 'facilities' | 'reviews'>('overview');

  // Review submission state
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewInput, setReviewInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  if (!center) return null;

  const photos = center.photos && center.photos.length > 0 ? center.photos : [{ id: '1', image_url: center.photo, caption: center.name, center_id: center.id }];

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewInput.trim()) return;
    setIsSubmittingReview(true);
    try {
      await api.addCenterReview(center.id, {
        farmerName: 'Verified Farmer',
        rating: ratingInput,
        waitingRating: ratingInput,
        staffRating: 5,
        processingRating: ratingInput,
        facilityRating: 5,
        review: reviewInput
      });
      showToast('Thank you! Your review has been submitted.', 'success');
      setReviewInput('');
    } catch (e: any) {
      showToast(e.message || 'Failed to submit review', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{center.name}</span>
          {center.ai_recommended && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-amber-600" /> AI Recommended
            </span>
          )}
        </div>
      }
      subtitle={center.address}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Photo Gallery with Hero Preview & Thumbnails */}
        <div className="space-y-2">
          <div className="relative h-64 sm:h-72 w-full rounded-3xl overflow-hidden bg-gray-100 border border-gray-200">
            <img
              src={photos[selectedPhotoIndex]?.image_url || center.photo}
              alt={photos[selectedPhotoIndex]?.caption || center.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

            {/* Top Overlay Badge */}
            <div className="absolute top-3 left-3">
              <Badge
                variant={
                  center.status === 'Operating Normally'
                    ? 'success'
                    : center.status === 'High Waiting Time'
                    ? 'danger'
                    : 'warning'
                }
              >
                {center.status}
              </Badge>
            </div>

            {/* Caption */}
            {photos[selectedPhotoIndex]?.caption && (
              <div className="absolute bottom-3 left-3 right-3 text-white text-xs bg-black/50 backdrop-blur-md p-2 rounded-xl">
                {photos[selectedPhotoIndex]?.caption}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    selectedPhotoIndex === idx ? 'border-km-primary ring-2 ring-km-primary/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={p.image_url} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Live Stats' },
            { id: 'crops', label: 'Accepted Crops & MSP' },
            { id: 'facilities', label: 'Center Facilities' },
            { id: 'reviews', label: `Reviews (${center.review_count})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-km-primary text-km-primary bg-emerald-50/50 rounded-t-xl'
                  : 'border-transparent text-gray-500 hover:text-km-textPrimary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Live Metrics Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-km-textSecondary mb-1">
                  <Users className="w-3.5 h-3.5 text-km-primary" />
                  <span>Current Queue</span>
                </div>
                <span className="font-extrabold text-lg text-emerald-900">{center.queue}</span>
                <span className="text-[10px] text-gray-500 block">Vehicles in line</span>
              </div>

              <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-blue-800 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Wait Time</span>
                </div>
                <span className="font-extrabold text-lg text-blue-950">{center.waiting_time}</span>
                <span className="text-[10px] text-gray-500 block">Average processing</span>
              </div>

              <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-amber-900 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Available Slots</span>
                </div>
                <span className="font-extrabold text-lg text-amber-950">{center.available_slots}</span>
                <span className="text-[10px] text-gray-500 block">Open for booking today</span>
              </div>

              <div className="bg-purple-50/70 border border-purple-100 p-3 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-purple-900 mb-1">
                  <Navigation className="w-3.5 h-3.5 text-purple-600" />
                  <span>Distance</span>
                </div>
                <span className="font-extrabold text-lg text-purple-950">{center.distance}</span>
                <span className="text-[10px] text-gray-500 block">{center.travel_time} drive</span>
              </div>
            </div>

            {/* Description & Operating Hours */}
            <div className="bg-gray-50/70 border border-gray-100 p-4 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-km-textPrimary uppercase tracking-wider">
                About this Center
              </h4>
              <p className="text-xs text-km-textSecondary leading-relaxed">
                {center.description}
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs text-km-textPrimary font-semibold">
                <Clock className="w-4 h-4 text-km-primary shrink-0" />
                <span>Working Hours: {center.working_hours}</span>
              </div>
            </div>

            {/* Officer In-Charge Card */}
            {center.officer_details && (
              <div className="bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 p-4 rounded-2xl flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-km-primary text-white flex items-center justify-center font-bold text-sm shadow-md">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Authorized Officer
                    </span>
                    <h4 className="font-bold text-sm text-km-textPrimary mt-1">
                      {center.officer_details.name}
                    </h4>
                    <p className="text-xs text-km-textSecondary">
                      {center.officer_details.designation}
                    </p>
                    <p className="text-xs text-km-primary font-medium mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{center.officer_details.official_contact}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CROPS */}
        {activeTab === 'crops' && (
          <div className="space-y-3">
            <p className="text-xs text-km-textSecondary">
              Official Minimum Support Prices (MSP) guaranteed for certified grade deliveries at this center:
            </p>
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-50/70 border-b border-gray-200 text-km-textPrimary font-bold">
                  <tr>
                    <th className="p-3">Crop Name</th>
                    <th className="p-3">MSP Rate</th>
                    <th className="p-3">Avg Unloading Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(center.crops || [
                    { id: '1', name: 'Paddy (Common / நெல்)', msp_rate: 23.0, unit: 'Kg (₹/kg)', processing_rate_mins_per_ton: 12 },
                    { id: '2', name: 'Paddy (Grade A / முதல் தரம் நெல்)', msp_rate: 23.2, unit: 'Kg (₹/kg)', processing_rate_mins_per_ton: 10 },
                    { id: '3', name: 'Maize (மக்காச்சோளம்)', msp_rate: 20.9, unit: 'Kg (₹/kg)', processing_rate_mins_per_ton: 14 },
                    { id: '4', name: 'Groundnut (நிலக்கடலை)', msp_rate: 63.77, unit: 'Kg (₹/kg)', processing_rate_mins_per_ton: 18 }
                  ]).map((crop) => (
                    <tr key={crop.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-km-textPrimary flex items-center gap-2">
                        <Wheat className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{crop.name}</span>
                      </td>
                      <td className="p-3 font-extrabold text-km-primary">
                        ₹{crop.msp_rate.toFixed(2)} / kg
                      </td>
                      <td className="p-3 text-km-textSecondary">
                        ~{crop.processing_rate_mins_per_ton} mins / ton
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FACILITIES */}
        {activeTab === 'facilities' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(center.facilities || []).map((facility, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100 text-xs font-semibold text-km-textPrimary">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{facility}</span>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Breakdown Bars */}
            {center.ratings_breakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50/70 p-3 rounded-2xl border border-gray-100 text-center text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px]">Waiting Time</span>
                  <span className="font-bold text-km-primary">{center.ratings_breakdown.waiting} / 5.0</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Staff Helpfulness</span>
                  <span className="font-bold text-km-primary">{center.ratings_breakdown.staff} / 5.0</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Processing Speed</span>
                  <span className="font-bold text-km-primary">{center.ratings_breakdown.processing} / 5.0</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Facilities</span>
                  <span className="font-bold text-km-primary">{center.ratings_breakdown.facilities} / 5.0</span>
                </div>
              </div>
            )}

            {/* Submit Quick Review */}
            <form onSubmit={handleReviewSubmit} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
              <h5 className="text-xs font-bold text-km-textPrimary flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-km-primary" />
                <span>Leave Farmer Feedback</span>
              </h5>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRatingInput(star)}
                      className={`text-base ${star <= ratingInput ? 'text-amber-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reviewInput}
                  onChange={(e) => setReviewInput(e.target.value)}
                  placeholder="Share your experience at this center..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-km-primary"
                />
                <button
                  type="submit"
                  disabled={isSubmittingReview || !reviewInput.trim()}
                  className="px-4 py-2 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </form>

            {/* Reviews List */}
            <div className="space-y-3">
              {(center.reviews || []).map((rev) => (
                <div key={rev.id} className="p-3 rounded-2xl border border-gray-100 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-km-textPrimary">{rev.farmer_name}</span>
                    <RatingStars rating={rev.rating} size="sm" showNumber={false} />
                  </div>
                  <p className="text-xs text-km-textSecondary leading-relaxed">{rev.review}</p>
                  <span className="text-[10px] text-gray-400 block">{rev.created_at}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Bottom Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-km-textPrimary transition-colors"
          >
            <Navigation className="w-4 h-4 text-km-primary" />
            <span>{t('get_directions')}</span>
          </a>

          <button
            onClick={() => {
              onClose();
              onBookSlot(center);
            }}
            disabled={center.available_slots === 0}
            className={`flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
              center.available_slots > 0
                ? 'bg-km-primary hover:bg-km-primaryDark text-white shadow-emerald-800/20 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            <span>{t('book_slot')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
