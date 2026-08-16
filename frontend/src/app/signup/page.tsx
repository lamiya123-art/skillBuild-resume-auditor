'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Eye, EyeOff, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const { signup, googleLogin } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
      setError('Password does not meet all security requirements.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signup(fullName, email, password);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const mockGoogleToken = "google_oauth_token_" + Date.now();
      const userEmail = email.trim() ? email : "candidate.google@skillproof.io";
      await googleLogin(mockGoogleToken, userEmail, fullName || "Google Candidate");
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">SkillProof</span>
          <span className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent-light text-[10px] uppercase font-bold tracking-wider">
            DEPTH AUDITOR
          </span>
        </div>
        <h1 className="text-xl font-semibold text-gray-200 mt-2">Create your SkillProof account</h1>
        <p className="text-xs text-gray-400 mt-1">Build your evidence-backed job application profile.</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-[440px] glass-card p-8 rounded-2xl border border-surface-border shadow-2xl space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Developer"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-white placeholder-gray-500 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-white placeholder-gray-500 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-white placeholder-gray-500 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Compact Password Strength Meter */}
            {password && (
              <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                <div className={`flex items-center space-x-1 ${hasMinLength ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <Check className="w-3 h-3" />
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center space-x-1 ${hasUpper ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <Check className="w-3 h-3" />
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center space-x-1 ${hasLower ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <Check className="w-3 h-3" />
                  <span>Lowercase letter</span>
                </div>
                <div className={`flex items-center space-x-1 ${hasNumber ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <Check className="w-3 h-3" />
                  <span>Number (0-9)</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-white placeholder-gray-500 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Creating account...' : 'Create account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-surface-border w-full"></div>
          <span className="bg-surface-card px-3 text-[11px] text-gray-500 uppercase font-bold tracking-wider absolute">OR</span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-surface-border text-gray-200 text-xs font-semibold border border-surface-border transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-xs text-gray-400 pt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:text-accent-light font-semibold transition-colors">
            Sign in
          </Link>
        </p>

        <p className="text-[11px] text-gray-500 text-center leading-relaxed">
          By creating an account, you agree to SkillProof's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
