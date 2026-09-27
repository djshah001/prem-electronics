import { useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api/axiosClient';
import { toast } from 'sonner';

export default function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyOTP } = useAuth();
  const [resending, setResending] = useState(false);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
    verifyOTP.mutate({ email, otp: otpString });
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New OTP sent to your email!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-2xl font-['Outfit']"><span className="gradient-text">Prem</span> Electronics</span>
          </Link>
        </div>

        <div className="glass rounded-3xl border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h1 className="text-2xl font-black font-['Outfit'] mb-2">Verify your email</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We sent a 6-digit OTP to <strong className="text-foreground">{email}</strong>
          </p>

          <form onSubmit={handleSubmit} id="otp-form">
            <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  id={`otp-input-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            <button id="verify-otp-btn" type="submit" disabled={verifyOTP.isPending || otp.join('').length !== 6}
              className="w-full py-3 gradient-primary text-white rounded-xl font-bold disabled:opacity-60 hover:opacity-90 transition-all">
              {verifyOTP.isPending ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <button onClick={handleResend} disabled={resending}
            className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mx-auto disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
