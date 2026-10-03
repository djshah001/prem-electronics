import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect immediately if no token in URL
  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset link. Please request a new one.');
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  const mutation = useMutation({
    mutationFn: () => api.post('/auth/reset-password', { token, password }),
    onSuccess: () => {
      setSuccess(true);
      toast.success('Password reset successfully! You can now sign in.');
      setTimeout(() => navigate('/login'), 3000);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'This reset link is invalid or has expired. Please request a new one.');
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    mutation.mutate();
  };

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-black font-['Outfit'] text-foreground">Reset your password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter a new password for your account.</p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-green-600 dark:text-green-400">Password reset successfully!</p>
              <p className="text-sm text-muted-foreground">Redirecting to login…</p>
              <Link to="/login" className="text-primary font-medium text-sm hover:underline">
                Go to login now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="new-password">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={inputClass}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Must be at least 8 characters
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="confirm-password">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={128}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className={inputClass}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm.length > 0 && confirm !== password && (
                  <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending || password.length < 8 || password !== confirm}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? 'Resetting…' : 'Reset password'}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
