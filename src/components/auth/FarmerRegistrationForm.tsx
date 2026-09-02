import React, { useState } from 'react';
import { ArrowRight, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface CropSelection {
  crop_name: string;
  crop_category: string;
  land_acres: number;
  estimated_quantity_quintals: number;
  variety: string;
}

export const CROP_CATEGORIES = [
  {
    category: "Cereals",
    crops: ["Rice", "Wheat", "Maize", "Sorghum", "Pearl Millet", "Finger Millet", "Barley"]
  },
  {
    category: "Pulses",
    crops: ["Red Gram", "Black Gram", "Green Gram", "Bengal Gram", "Cowpea", "Lentil", "Horse Gram"]
  },
  {
    category: "Oilseeds",
    crops: ["Groundnut", "Soybean", "Sunflower", "Sesame", "Mustard", "Castor", "Safflower"]
  },
  {
    category: "Commercial Crops",
    crops: ["Cotton", "Sugarcane", "Tobacco", "Jute"]
  },
  {
    category: "Vegetables",
    crops: ["Tomato", "Onion", "Potato", "Brinjal", "Chilli", "Cabbage", "Cauliflower", "Carrot", "Beetroot", "Okra", "Drumstick", "Beans"]
  },
  {
    category: "Fruits",
    crops: ["Banana", "Mango", "Papaya", "Guava", "Watermelon", "Muskmelon", "Pomegranate", "Grapes", "Orange", "Lemon"]
  },
  {
    category: "Spices",
    crops: ["Turmeric", "Ginger", "Coriander", "Cumin", "Black Pepper", "Cardamom"]
  },
  {
    category: "Other",
    crops: ["Coconut", "Arecanut", "Tea", "Coffee", "Other"]
  }
];

interface FarmerRegistrationFormProps {
  initialMobile: string;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const FarmerRegistrationForm: React.FC<FarmerRegistrationFormProps> = ({ initialMobile, onSubmit, isLoading = false }) => {
  const { t } = useLanguage();

  // Personal Details
  const [title, setTitle] = useState('Mr');
  const [farmerName, setFarmerName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [category, setCategory] = useState('General');
  const [mobile, setMobile] = useState(initialMobile);
  const [address, setAddress] = useState('');

  // Land Details
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [village, setVillage] = useState('');
  const [market, setMarket] = useState('');
  const [farmerType, setFarmerType] = useState('OWNER FARMER');
  
  const [landParcels, setLandParcels] = useState([{ pattaNo: '', surveyNo: '' }]);
  const [measureType, setMeasureType] = useState('Acres');
  const [totalLand, setTotalLand] = useState<number | ''>('');

  // Crop Details
  const [selectedCrops, setSelectedCrops] = useState<CropSelection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Crops');

  // Documents
  const [photo, setPhoto] = useState<File | null>(null);
  const [landDoc, setLandDoc] = useState<File | null>(null);

  const [error, setError] = useState('');

  const addLandParcel = () => setLandParcels([...landParcels, { pattaNo: '', surveyNo: '' }]);
  const removeLandParcel = (index: number) => {
    if (landParcels.length > 1) {
      setLandParcels(landParcels.filter((_, i) => i !== index));
    }
  };

  const handleCropToggle = (cropName: string, categoryName: string) => {
    if (selectedCrops.some(c => c.crop_name === cropName)) {
      setSelectedCrops(selectedCrops.filter(c => c.crop_name !== cropName));
    } else {
      setSelectedCrops([...selectedCrops, { crop_name: cropName, crop_category: categoryName, land_acres: 0, estimated_quantity_quintals: 0, variety: '' }]);
    }
  };

  const updateCropDetail = (index: number, field: keyof CropSelection, value: any) => {
    const updated = [...selectedCrops];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedCrops(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!farmerName || !fatherName || !regNumber || !mobile || !address || !state || !district || !block || !village || !market || !totalLand) {
      setError('Please fill all required fields.');
      return;
    }

    if (selectedCrops.length === 0) {
      setError('At least one crop must be selected.');
      return;
    }

    let totalCropLand = 0;
    for (const crop of selectedCrops) {
      if (crop.land_acres <= 0) {
        setError(`Crop land for ${crop.crop_name} must be greater than zero.`);
        return;
      }
      if (crop.estimated_quantity_quintals <= 0) {
        setError(`Estimated quantity for ${crop.crop_name} must be greater than zero.`);
        return;
      }
      totalCropLand += Number(crop.land_acres);
    }

    if (totalCropLand > Number(totalLand)) {
      setError('Total crop land cannot exceed total registered land.');
      return;
    }

    const payload = {
      farmer: {
        personal_details: {
          title,
          farmer_name: farmerName,
          father_name: fatherName,
          registration_number: regNumber,
          gender,
          date_of_birth: dob,
          category,
          mobile_number: mobile,
          residential_address: address
        },
        land_details: {
          state,
          district,
          block,
          village,
          market,
          farmer_type: farmerType,
          parcels: landParcels,
          measure_type: measureType
        },
        total_land: Number(totalLand),
        crops: selectedCrops,
        documents: {
          aadhaar_farmer_photo: photo ? photo.name : "",
          land_document: landDoc ? landDoc.name : ""
        }
      }
    };

    onSubmit(payload);
  };

  const filteredCategories = CROP_CATEGORIES.map(cat => ({
    ...cat,
    crops: cat.crops.filter(c => 
      c.toLowerCase().includes(searchQuery.toLowerCase()) && 
      (selectedCategory === 'All Crops' || cat.category === selectedCategory)
    )
  })).filter(cat => cat.crops.length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      <div className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-km-md space-y-6 text-left">
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-200">
            {error}
          </div>
        )}

        {/* SECTION: Personal Details */}
        <div>
          <h3 className="font-black text-lg text-km-textPrimary mb-4 border-b pb-2">1. Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Title</label>
              <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none">
                <option>Mr</option><option>Mrs</option><option>Ms</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Farmer Name as Per Aadhaar *</label>
              <input type="text" value={farmerName} onChange={(e) => setFarmerName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Father/Guardian Name as Per Aadhaar *</label>
              <input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Registration Number *</label>
              <input type="text" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none">
                <option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Mobile Number *</label>
              <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1">Residential Address *</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" rows={2} required />
            </div>
          </div>
        </div>

        {/* SECTION: Land Details */}
        <div>
          <h3 className="font-black text-lg text-km-textPrimary mb-4 border-b pb-2">2. Land Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">State *</label>
              <select value={state} onChange={(e) => setState(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required>
                <option value="">Select State</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Karnataka">Karnataka</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">District *</label>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required>
                <option value="">Select District</option>
                <option value="Tiruvannamalai">Tiruvannamalai</option>
                <option value="Vellore">Vellore</option>
                <option value="Chennai">Chennai</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Mandal/Block *</label>
              <select value={block} onChange={(e) => setBlock(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required>
                <option value="">Select Block</option>
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Village *</label>
              <select value={village} onChange={(e) => setVillage(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required>
                <option value="">Select Village</option>
                <option value="Village X">Village X</option>
                <option value="Village Y">Village Y</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Market *</label>
              <select value={market} onChange={(e) => setMarket(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required>
                <option value="">Select Market</option>
                <option value="Market 1">Market 1</option>
                <option value="Market 2">Market 2</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Farmer Type *</label>
              <select value={farmerType} onChange={(e) => setFarmerType(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required>
                <option>OWNER FARMER</option>
                <option>TENANT FARMER</option>
                <option>SHARECROPPER</option>
              </select>
            </div>

            <div className="sm:col-span-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <label className="text-xs font-bold text-gray-700 block">Land Parcels</label>
              {landParcels.map((parcel, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" placeholder="Patta No" value={parcel.pattaNo} onChange={(e) => { const newP = [...landParcels]; newP[idx].pattaNo = e.target.value; setLandParcels(newP); }} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none" />
                  <input type="text" placeholder="Survey No" value={parcel.surveyNo} onChange={(e) => { const newP = [...landParcels]; newP[idx].surveyNo = e.target.value; setLandParcels(newP); }} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none" />
                  {landParcels.length > 1 && (
                    <button type="button" onClick={() => removeLandParcel(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addLandParcel} className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-100">
                <Plus className="w-3 h-3" /> Add More
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Select Measure Type</label>
              <select value={measureType} onChange={(e) => setMeasureType(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none">
                <option>Acres</option>
                <option>Hectares</option>
                <option>Cents</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Total Land ({measureType}) *</label>
              <input type="number" step="0.01" value={totalLand} onChange={(e) => setTotalLand(Number(e.target.value))} placeholder={`Total Land (${measureType})`} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-km-primary outline-none" required />
            </div>
          </div>
        </div>

        {/* SECTION: Crop Details */}
        <div>
          <h3 className="font-black text-lg text-km-textPrimary mb-4 border-b pb-2">3. Crop Details</h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Select Crop Type * (Multi-select)</label>
              <div className="flex gap-2 mb-3">
                <input type="text" placeholder="Search crop..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none" />
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-1/3 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none bg-white">
                  <option>All Crops</option>
                  {CROP_CATEGORIES.map(c => <option key={c.category}>{c.category}</option>)}
                </select>
              </div>
              
              <div className="max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredCategories.map(cat => (
                  <React.Fragment key={cat.category}>
                    <div className="col-span-full text-[10px] font-bold text-gray-400 uppercase mt-2 mb-1 px-1">{cat.category}</div>
                    {cat.crops.map(crop => (
                      <label key={crop} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" checked={selectedCrops.some(c => c.crop_name === crop)} onChange={() => handleCropToggle(crop, cat.category)} className="w-4 h-4 text-km-primary rounded border-gray-300 focus:ring-km-primary" />
                        <span className="text-sm text-gray-700">{crop}</span>
                      </label>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {selectedCrops.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <label className="text-xs font-bold text-gray-700 block">Selected Crops Details</label>
                {selectedCrops.map((crop, idx) => (
                  <div key={crop.crop_name} className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-emerald-800 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {crop.crop_name}</span>
                      <button type="button" onClick={() => handleCropToggle(crop.crop_name, crop.crop_category)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-1">Crop Land ({measureType})</label>
                        <input type="number" step="0.01" value={crop.land_acres || ''} onChange={(e) => updateCropDetail(idx, 'land_acres', Number(e.target.value))} placeholder={`Crop Land (${measureType})`} className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-1 focus:ring-km-primary" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-1">Estimated Quantity (Quintals)</label>
                        <input type="number" step="0.01" value={crop.estimated_quantity_quintals || ''} onChange={(e) => updateCropDetail(idx, 'estimated_quantity_quintals', Number(e.target.value))} placeholder="Estimated Quantity" className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-1 focus:ring-km-primary" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-1">Crop Variety</label>
                        <input type="text" value={crop.variety} onChange={(e) => updateCropDetail(idx, 'variety', e.target.value)} placeholder="Enter Crop Variety" className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-1 focus:ring-km-primary" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION: Document Upload */}
        <div>
          <h3 className="font-black text-lg text-km-textPrimary mb-4 border-b pb-2">4. Document Upload</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Upload Aadhaar and Farmer Photo</label>
              <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
              <p className="text-[10px] text-gray-400 mt-1">Image Only - Max 1 MB</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Upload Land Documents</label>
              <input type="file" accept=".pdf" onChange={(e) => setLandDoc(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              <p className="text-[10px] text-gray-400 mt-1">PDF Only - Max 1 MB</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-km-primary hover:bg-km-primaryDark text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all text-base disabled:opacity-50"
        >
          <span>{isLoading ? 'Registering...' : 'Submit Registration'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </div>
    </form>
  );
};
