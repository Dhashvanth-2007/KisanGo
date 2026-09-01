import React, { useState, useEffect } from 'react';

interface AdminOTPPanelProps {
  onFillOTP: (otp: string) => void;
}

export const AdminOTPPanel: React.FC<AdminOTPPanelProps> = ({ onFillOTP }) => {
  const [otp, setOtp] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOTP = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/current-otp');
      const data = await res.json();
      if (data.success && data.otp) {
        setOtp(data.otp);
        setExpiresIn(data.expiresIn);
      } else {
        setOtp('');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOTP();
    const interval = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!otp) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-6 border-2 border-green-500 bg-green-50 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-green-800 flex items-center gap-2 text-lg">
          <span>🧪</span> HACKATHON ADMIN OTP
        </h3>
        {loading && <span className="text-xs text-green-600 font-semibold animate-pulse">Refreshing...</span>}
      </div>
      
      <div className="flex flex-col items-center justify-center bg-white rounded-lg p-5 border border-green-200 text-center mb-4 shadow-sm">
        <p className="text-sm text-green-700 font-bold mb-2 uppercase tracking-wide">Generated OTP</p>
        <p className="text-5xl font-mono font-black text-green-900 tracking-widest">{otp}</p>
        <div className="mt-4 flex items-center gap-2">
          <p className="text-sm text-green-700 font-semibold">Expires in:</p>
          <p className="text-lg font-mono font-bold text-red-600">{formatTime(expiresIn)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="py-3 px-2 bg-white border-2 border-green-300 text-green-800 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors uppercase tracking-wider"
        >
          {copied ? 'COPIED!' : 'COPY OTP'}
        </button>
        <button
          type="button"
          onClick={() => onFillOTP(otp)}
          className="py-3 px-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm uppercase tracking-wider"
        >
          AUTO FILL
        </button>
      </div>
      <button
        type="button"
        onClick={fetchOTP}
        className="w-full mt-3 py-2 text-green-700 text-xs font-semibold hover:underline"
      >
        Refresh OTP manually
      </button>
    </div>
  );
};
