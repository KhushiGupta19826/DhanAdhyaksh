import React, { useState } from 'react';
import { Wallet, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic client-side validation
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailError = emailTouched && !email.trim() ? 'Email is required' : null;
  const passwordError = passwordTouched && !password ? 'Password is required' : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await login(email.trim(), password);
      // On success, AuthContext sets isAuthenticated = true → App re-renders
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/40 flex flex-col items-center justify-center px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shadow-sm mb-4">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">DhanAdhyaksh</h1>
          <p className="text-sm text-slate-500 mt-0.5">Physical Cash Tracker</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2.5 mb-5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200/70 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              disabled={isSubmitting}
              placeholder="owner@example.com"
              className={`
                w-full px-3.5 py-2.5 rounded-xl border text-sm
                bg-white text-slate-900 placeholder:text-slate-400
                outline-none transition-all duration-150
                focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                disabled:opacity-50 disabled:cursor-not-allowed
                ${emailError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            />
            {emailError && (
              <p className="text-xs text-red-600 mt-1">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                disabled={isSubmitting}
                placeholder="••••••••"
                className={`
                  w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm
                  bg-white text-slate-900 placeholder:text-slate-400
                  outline-none transition-all duration-150
                  focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${passwordError
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-600 mt-1">{passwordError}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="
              w-full flex items-center justify-center gap-2
              mt-2 px-4 py-2.5 rounded-xl
              bg-teal-600 hover:bg-teal-700 active:bg-teal-800
              text-white text-sm font-semibold
              transition-colors duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
              shadow-sm
            "
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign in
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-xs text-slate-400 text-center">
        Personal cash tracker · Owner access only
      </p>
    </div>
  );
};
