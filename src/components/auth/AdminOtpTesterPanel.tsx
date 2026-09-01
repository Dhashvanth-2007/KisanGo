import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  ShieldAlert,
  Clock,
  Copy,
  Check,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AdminOtpTesterPanelProps {
  onAutoFillOtp?: (otp: string) => void;
  onOtpGenerated?: () => void;
}

export const AdminOtpTesterPanel: React.FC<AdminOtpTesterPanelProps> = ({
  onAutoFillOtp,
  onOtpGenerated
}) => {
  const isHackathonMode =
    import.meta.env.VITE_HACKATHON_OTP_MODE === 'true' ||
    import.meta.env.MODE === 'development';

  if (!isHackathonMode) {
    return null;
  }

  const [otpData, setOtpData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminOtpStatus();
      if (res.success) {
        setOtpData(res);
        if (res.remainingSeconds) {
          setRemainingTime(res.remainingSeconds);
        }
      }
    } catch (e) {
      console.warn('Admin OTP status fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Expiry countdown clock
  useEffect(() => {
    let timer: any = null;
    if (remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [remainingTime]);

  const handleCopy = (code: string) => {
    if (!code || code === 'EXPIRED' || code === 'NO_OTP') return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!otpData) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto mt-4 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white rounded-3xl border-2 border-amber-500/50 shadow-2xl p-4 transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black tracking-wide text-amber-300 uppercase">
                Hackathon Admin OTP Console
              </h4>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-400 text-amber-950">
                DEV ONLY
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Protected live testing console for Admin Phone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={fetchStatus}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
            title="Refresh OTP status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2.5 text-xs">
          {/* Target Phone & Status */}
          <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl border border-white/5">
            <span className="text-[11px] text-gray-400">Admin Phone:</span>
            <span className="font-mono font-bold text-amber-300">
              {otpData.maskedPhone || '+91 ******3210'}
            </span>
          </div>

          {/* Active OTP Card */}
          {otpData.hasActiveOtp && otpData.otp && otpData.otp !== 'EXPIRED' ? (
            <div className="bg-amber-500/10 border border-amber-400/40 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400">
                  Current Backend OTP:
                </span>
                <div className="flex items-center gap-1 text-[10px] font-mono text-amber-300">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Expires in {formatCountdown(remainingTime)}</span>
                </div>
              </div>

              {/* Big OTP Display */}
              <div className="flex items-center justify-between bg-black/60 px-4 py-2.5 rounded-xl border border-amber-400/30">
                <span className="text-2xl font-black tracking-widest font-mono text-amber-300">
                  {otpData.otp}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy(otpData.otp)}
                    className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold text-[11px] flex items-center gap-1 transition-colors border border-amber-400/30"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  {onAutoFillOtp && (
                    <button
                      type="button"
                      onClick={() => onAutoFillOtp(otpData.otp)}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[11px] flex items-center gap-1 transition-all shadow-md active:scale-95"
                    >
                      <Zap className="w-3 h-3 fill-amber-950" />
                      <span>Auto-Fill</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Meta details */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                <span>
                  Generated: {new Date(otpData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span>Attempts: {otpData.attemptsRemaining}/5 left</span>
              </div>
            </div>
          ) : (
            <div className="bg-black/30 border border-white/5 p-3 rounded-2xl text-center space-y-1">
              <span className="text-amber-400/90 font-bold block text-xs">
                {otpData.isExpired ? 'OTP Expired' : 'No Active Admin OTP'}
              </span>
              <p className="text-[11px] text-gray-400">
                Enter the Admin Phone number above and click <strong>"Send OTP"</strong> to generate a cryptographically secure 6-digit code on the server.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
