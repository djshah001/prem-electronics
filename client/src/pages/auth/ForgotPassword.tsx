import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await forgotPassword.mutateAsync({ email });
    setSent(true);
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

        <div className="glass rounded-3xl border border-border p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h1 className="text-2xl font-black font-['Outfit'] mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm mb-6">
                If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black font-['Outfit'] mb-1">Forgot Password?</h1>
              <p className="text-muted-foreground text-sm mb-6">No worries! Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4" id="forgot-password-form">
                <div>
                  <label htmlFor="fp-email" className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                  <input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
                <button id="reset-link-btn" type="submit" disabled={forgotPassword.isPending}
                  className="w-full py-3 gradient-primary text-white rounded-xl font-bold disabled:opacity-60 hover:opacity-90 transition-all">
                  {forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <div className="mt-6 pt-6 border-t border-border text-center">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
