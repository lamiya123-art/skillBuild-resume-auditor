'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
      setSubmitted(true);
    } catch (err: any) {
      setMessage('An error occurred. Please try again.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">SkillProof</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-200 mt-2">Forgot your password?</h1>
        <p className="text-xs text-gray-400 mt-1">Enter your email and we'll send you a password reset link.</p>
      </div>

      <div className="w-full max-w-[420px] glass-card p-8 rounded-2xl border border-surface-border shadow-2xl space-y-6">
        {submitted ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{message}</p>
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-border text-white text-xs font-semibold border border-surface-border inline-flex items-center space-x-2 transition-all mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to sign in</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              <Mail className="w-4 h-4" />
              <span>{loading ? 'Sending link...' : 'Send reset link'}</span>
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-gray-400 hover:text-white inline-flex items-center space-x-1.5 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
