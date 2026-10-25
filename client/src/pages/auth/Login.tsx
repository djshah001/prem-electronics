import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';
import { useAuth } from '../../hooks/useAuth';
import type { AuthResponse, OtpChallengeResponse, OtpVerifyResponse } from '../../types';

type Step = 'phone' | 'otp' | 'onboarding';
type SavedChallenge = OtpChallengeResponse & { phone: string };

const normalizeInput = (value: string) => value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(0, 10);
const secondsUntil = (value?: string) => value ? Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000)) : 0;

export default function Login() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const admin = location.pathname.startsWith('/admin/');
  const storageKey = admin ? 'prem_otp_admin' : 'prem_otp_customer';
  const endpoints = admin ? '/auth/admin/otp' : '/auth/otp';
  const reduceMotion = useReducedMotion();
  const { completeAuthentication } = useAuth();
  const requestGeneration = useRef(0);

  const restored = useMemo<SavedChallenge | null>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as SavedChallenge | null;
      return value && new Date(value.expiresAt) > new Date() ? value : null;
    } catch { return null; }
  }, [storageKey]);

  const [step, setStep] = useState<Step>(restored ? 'otp' : 'phone');
  const [phone, setPhone] = useState(restored?.phone ?? '');
  const [challenge, setChallenge] = useState<OtpChallengeResponse | null>(restored);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(secondsUntil(restored?.resendAvailableAt));
  const [onboardingToken, setOnboardingToken] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);

  useEffect(() => {
    if (!challenge) return;
    const tick = () => setCountdown(secondsUntil(challenge.resendAvailableAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const persistChallenge = (next: OtpChallengeResponse, rawPhone: string) => {
    const saved = { ...next, phone: rawPhone };
    sessionStorage.setItem(storageKey, JSON.stringify(saved));
    setChallenge(next);
    setCountdown(secondsUntil(next.resendAvailableAt));
  };

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (phone.length !== 10) return toast.error('Enter a valid 10-digit Indian mobile number.');
    const generation = ++requestGeneration.current;
    setBusy(true);
    try {
      const response = await api.post<OtpChallengeResponse>(`${endpoints}/request`, { phone: `+91${phone}` });
      if (generation !== requestGeneration.current) return;
      persistChallenge(response.data, phone);
      setCode('');
      setStep('otp');
      toast.success('If this number is eligible, an OTP has been sent.');
    } catch (error: any) {
      if (generation === requestGeneration.current) toast.error(error?.message ?? 'Could not request OTP.');
    } finally { if (generation === requestGeneration.current) setBusy(false); }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge || code.length !== 6) return toast.error('Enter the 6-digit OTP.');
    const generation = ++requestGeneration.current;
    setBusy(true);
    try {
      const response = await api.post<OtpVerifyResponse>(`${endpoints}/verify`, { challengeId: challenge.challengeId, code });
      if (generation !== requestGeneration.current) return;
      sessionStorage.removeItem(storageKey);
      if (response.data.onboardingRequired) {
        if (admin) return toast.error('This number is not provisioned for administrator access.');
        setOnboardingToken(response.data.onboardingToken);
        setStep('onboarding');
        setCode('');
      } else {
        toast.success(`Welcome back, ${response.data.user.name}.`);
        await completeAuthentication(response.data.user, searchParams.get('returnTo'));
      }
    } catch (error: any) {
      if (generation === requestGeneration.current) toast.error(error?.message ?? 'OTP verification failed.');
    } finally { if (generation === requestGeneration.current) setBusy(false); }
  };

  const resend = async () => {
    if (!challenge || countdown > 0 || busy) return;
    const generation = ++requestGeneration.current;
    setBusy(true);
    try {
      const response = await api.post<OtpChallengeResponse>(`${endpoints}/resend`, { challengeId: challenge.challengeId });
      if (generation !== requestGeneration.current) return;
      persistChallenge(response.data, phone);
      toast.success('OTP resend requested.');
    } catch (error: any) { if (generation === requestGeneration.current) toast.error(error?.message ?? 'Could not resend OTP.'); }
    finally { if (generation === requestGeneration.current) setBusy(false); }
  };

  const changeNumber = () => {
    requestGeneration.current += 1;
    if (challenge) void api.post(`${endpoints}/cancel`, { challengeId: challenge.challengeId }).catch(() => undefined);
    sessionStorage.removeItem(storageKey);
    setChallenge(null);
    setCode('');
    setStep('phone');
    setBusy(false);
  };

  const completeOnboarding = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onboardingToken) return toast.error('Verification expired. Request a new OTP.');
    setBusy(true);
    try {
      const response = await api.patch<AuthResponse>('/auth/onboarding', {
        onboardingToken,
        name: name.trim(),
        email: email.trim() || undefined,
        marketingConsent,
        whatsappConsent,
      });
      if (gstin.trim()) sessionStorage.setItem('pending_business_gstin', gstin.replace(/\s+/g, '').toUpperCase());
      toast.success('Your account is ready.');
      await completeAuthentication(response.data.user, gstin.trim() ? `/account/businesses?setup=1&gstin=${encodeURIComponent(gstin.trim().toUpperCase())}` : searchParams.get('returnTo'));
    } catch (error: any) { toast.error(error?.message ?? 'Could not complete your profile.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_25%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_34%),radial-gradient(circle_at_75%_75%,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_30%)]" />
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2"><span className="w-10 h-10 rounded-xl gradient-primary grid place-items-center"><Zap className="w-5 h-5 text-white" /></span><span className="font-black text-2xl font-['Outfit']"><span className="gradient-text">Prem</span> Electronics</span></Link>
        </div>
        <div className="glass rounded-3xl border border-border p-6 sm:p-8" aria-live="polite">
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">{admin ? <ShieldCheck /> : <Smartphone />}</div>
            <h1 className="text-2xl font-black font-['Outfit']">{step === 'onboarding' ? 'Complete your profile' : admin ? 'Administrator sign in' : 'Continue with mobile'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{step === 'phone' ? 'We’ll send a one-time code by SMS.' : step === 'otp' ? `Enter the code sent to ${challenge?.maskedDestination}.` : 'Your number is verified. Tell us what to call you.'}</p>
          </div>

          {step === 'phone' && <form onSubmit={requestOtp} className="space-y-5">
            <label className="block text-sm font-medium" htmlFor="auth-phone">Mobile number</label>
            <div className="flex rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-primary/40"><span className="px-4 py-3 border-r border-border text-sm font-semibold">+91</span><input id="auth-phone" autoFocus autoComplete="tel-national" inputMode="numeric" value={phone} onChange={(event) => setPhone(normalizeInput(event.target.value))} placeholder="98765 43210" className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none" /></div>
            <button disabled={busy || phone.length !== 10} className="w-full flex items-center justify-center gap-2 py-3 gradient-primary text-white rounded-xl font-bold disabled:opacity-50">{busy ? 'Requesting…' : <>Continue <ArrowRight className="w-4 h-4" /></>}</button>
          </form>}

          {step === 'otp' && <form onSubmit={verifyOtp} className="space-y-5">
            <label className="block text-sm font-medium" htmlFor="otp-code">6-digit OTP</label>
            <input id="otp-code" autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-2xl font-bold tracking-[0.45em] outline-none focus:ring-2 focus:ring-primary/40" />
            <button disabled={busy || code.length !== 6} className="w-full py-3 gradient-primary text-white rounded-xl font-bold disabled:opacity-50">{busy ? 'Verifying…' : 'Verify and continue'}</button>
            <div className="flex items-center justify-between gap-3 text-sm"><button type="button" onClick={changeNumber} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><ArrowLeft className="w-4 h-4" /> Change number</button><button type="button" onClick={resend} disabled={busy || countdown > 0} className="inline-flex items-center gap-1 text-primary disabled:text-muted-foreground"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />{countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}</button></div>
          </form>}

          {step === 'onboarding' && <form onSubmit={completeOnboarding} className="space-y-4">
            <label className="block text-sm font-medium">Full name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" /></label>
            <label className="block text-sm font-medium">Email <span className="text-muted-foreground font-normal">(optional, for receipts)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" /></label>
            <label className="block text-sm font-medium">GSTIN <span className="text-muted-foreground font-normal">(optional)</span><input value={gstin} onChange={(event) => setGstin(event.target.value.toUpperCase())} maxLength={15} placeholder="Set up company purchasing after sign-in" className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-primary/40" /></label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-1" /><span><strong className="block">Send me offers by email</strong><span className="text-muted-foreground">Optional. You can change this later.</span></span></label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={whatsappConsent} onChange={(event) => setWhatsappConsent(event.target.checked)} className="mt-1" /><span><strong className="block">Send me updates and offers on WhatsApp</strong><span className="text-muted-foreground">Optional. Includes a welcome message and approved promotional templates. You can withdraw consent later.</span></span></label>
            <button disabled={busy || name.trim().length < 2} className="w-full flex items-center justify-center gap-2 py-3 gradient-primary text-white rounded-xl font-bold disabled:opacity-50">{busy ? 'Creating account…' : <><CheckCircle2 className="w-4 h-4" /> Finish setup</>}</button>
          </form>}

          {!admin && step !== 'onboarding' && <p className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground">No password needed. Your verified mobile number is your sign-in identity.</p>}
          {admin && <p className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground">Only pre-provisioned, enabled administrator numbers can sign in. <Link to="/login" className="text-primary hover:underline">Customer sign in</Link></p>}
        </div>
      </motion.div>
    </div>
  );
}
