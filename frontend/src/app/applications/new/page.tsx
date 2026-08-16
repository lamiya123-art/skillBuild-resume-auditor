'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, Sparkles, Building2, Briefcase, Globe, ArrowRight, RefreshCw, 
  Upload, AlertCircle, CheckCircle2, ChevronRight, ArrowLeft
} from 'lucide-react';
import { devLogin, createJobApplication } from '@/lib/api';

export default function NewApplicationPage() {
  const router = useRouter();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jdOption, setJdOption] = useState<'paste' | 'file' | 'url'>('paste');
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Drag & Drop / File Upload for JD Text
  const handleJdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJdText(content);
        setJdOption('paste');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      setErrorMsg('Company name and Role title are required.');
      return;
    }

    if (!jdText.trim() && !jdUrl.trim()) {
      setErrorMsg('Please paste a Job Description text or enter a URL.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const user = await devLogin();
      const newApp = await createJobApplication(user.id, {
        company: company.trim(),
        role: role.trim(),
        jd_text: jdText.trim() || `Job description for ${role} position at ${company}.`,
        jd_url: jdUrl.trim() || undefined,
        notes: notes.trim() || undefined
      });

      router.push(`/applications/${newApp.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to analyze Job Description.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, name: 'Job Details' },
    { num: 2, name: 'JD Analysis' },
    { num: 3, name: 'Match & Gaps' },
    { num: 4, name: 'Tailored Resume' },
    { num: 5, name: 'Review & Track' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link href="/" className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-all">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tracker</span>
      </Link>

      {/* Wizard Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-surface-border">
        <div className="flex items-center space-x-2 text-accent mb-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <span className="text-xs uppercase font-bold tracking-widest">Guided Application Creator</span>
        </div>
        <h1 className="text-3xl font-black text-white">Create New Job Application</h1>
        <p className="text-gray-400 text-sm mt-1">
          Paste the complete job description. SkillProof will parse requirements, evaluate verified skill evidence, and build a tailored resume grounded in your real profile.
        </p>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-surface-border">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center space-x-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s.num === 1 ? 'bg-accent text-white shadow-md' : 'bg-surface border border-surface-border text-gray-400'
              }`}>
                {s.num}
              </div>
              <span className={`hidden sm:inline text-xs font-semibold ${s.num === 1 ? 'text-white' : 'text-gray-400'}`}>
                {s.name}
              </span>
              {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-600 hidden sm:inline" />}
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step Form */}
      <div className="glass-card p-8 rounded-3xl border border-surface-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-400" /> Company Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-400" /> Role Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* JD Input Mode Switcher */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" /> Job Description Input
            </label>

            <div className="flex items-center space-x-2 bg-surface/60 p-1 rounded-xl border border-surface-border text-xs w-fit">
              <button
                type="button"
                onClick={() => setJdOption('paste')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  jdOption === 'paste' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Paste Complete JD Text
              </button>
              <button
                type="button"
                onClick={() => setJdOption('file')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  jdOption === 'file' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Upload JD Text File
              </button>
              <button
                type="button"
                onClick={() => setJdOption('url')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  jdOption === 'url' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Enter JD URL
              </button>
            </div>

            {jdOption === 'paste' && (
              <div>
                <textarea
                  rows={10}
                  placeholder="Paste the complete job description text here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-surface border border-surface-border text-xs text-white focus:outline-none focus:border-accent font-sans leading-relaxed"
                />
                <div className="text-right text-[11px] text-gray-500 mt-1 font-mono">
                  {jdText.length} characters
                </div>
              </div>
            )}

            {jdOption === 'file' && (
              <div className="border-2 border-dashed border-surface-border p-6 rounded-2xl text-center bg-surface/40">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-300 font-semibold mb-2">Upload Job Description text file (.txt)</p>
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleJdFileUpload}
                  className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-white cursor-pointer"
                />
              </div>
            )}

            {jdOption === 'url' && (
              <div>
                <input
                  type="url"
                  placeholder="https://company.com/careers/software-engineer"
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-xs text-white focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  SkillProof will fetch requirement text automatically. If page retrieval fails, you can paste the text directly.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Interview Notes & Reminders (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Highlight FastAPI microservice architecture; be honest if asked about AWS."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-xs text-white focus:outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm shadow-xl shadow-accent/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Parsing JD & Running Match Engine...</span>
              </>
            ) : (
              <>
                <span>Analyze Job Description & Generate Match Report</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
