'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, AlertCircle, CheckCircle2, FileText, Download, 
  ExternalLink, Sparkles, RefreshCw, ShieldAlert, BookOpen, Layers, ArrowLeft,
  MessageSquare, HelpCircle, ChevronRight, Copy, Check
} from 'lucide-react';
import { 
  devLogin, getUserApplications, generateResume, getLatestResumeForApplication, getAuditLogs, getInterviewPrep, getAbsolutePdfUrl,
  JobApplication, ResumeVersion, AntiFabricationAuditLog, InterviewPrepOutput 
} from '@/lib/api';
import SkillTierBadge from '@/components/SkillTierBadge';


export default function ApplicationDetailPage() {
  const params = useParams();
  const appId = parseInt(params.id as string, 10);

  const [app, setApp] = useState<JobApplication | null>(null);
  const [resume, setResume] = useState<ResumeVersion | null>(null);
  const [auditLogs, setAuditLogs] = useState<AntiFabricationAuditLog[]>([]);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrepOutput | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState<string>('');
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);

  const [activeTab, setActiveTab] = useState<'matches' | 'actions' | 'resume' | 'audit' | 'prep'>('matches');

  useEffect(() => {
    loadData();
  }, [appId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await devLogin();
      const apps = await getUserApplications(user.id);
      const target = apps.find(a => a.id === appId);
      if (target) {
        setApp(target);
        const logs = await getAuditLogs(appId);
        setAuditLogs(logs);

        const existingResume = await getLatestResumeForApplication(appId);
        if (existingResume) {
          setResume(existingResume);
        }
      }
    } catch (err) {
      console.error('Failed to load application details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResume = async () => {
    setGenerating(true);
    setResumeError(null);
    setGenStep('Validating claims against ground-truth profile...');

    try {
      setTimeout(() => setGenStep('Checking repository readiness evidence...'), 800);
      setTimeout(() => setGenStep('Compiling ATS LaTeX template & rendering PDF...'), 1600);

      const result = await generateResume(appId);
      setResume(result);
      const logs = await getAuditLogs(appId);
      setAuditLogs(logs);
      setActiveTab('resume');
    } catch (err: any) {
      setResumeError(err.message || 'Failed to generate resume.');
      setActiveTab('resume');
    } finally {
      setGenerating(false);
      setGenStep('');
    }
  };


  const handleFetchInterviewPrep = async () => {
    if (interviewPrep) return;
    setLoadingPrep(true);
    try {
      const prep = await getInterviewPrep(appId);
      setInterviewPrep(prep);
    } catch (err) {
      console.error('Failed to load interview prep:', err);
    } finally {
      setLoadingPrep(false);
    }
  };

  const handleCopyLatex = () => {
    if (!resume?.latex_source) return;
    navigator.clipboard.writeText(resume.latex_source);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  if (loading || !app) {
    return (
      <div className="glass-card p-12 text-center text-gray-400 my-12">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
        <p>Loading application workspace & ground-truth matches...</p>
      </div>
    );
  }

  const matchReport = app.match_report || {};
  const matches = matchReport.matches || [];
  const gapActions = matchReport.gap_actions || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/" className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-all">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Application Tracker</span>
      </Link>

      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 text-accent mb-2">
            <Building2 className="w-5 h-5 text-accent" />
            <span className="text-sm font-bold text-gray-300">{app.company}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase font-bold border border-accent/20">
              {app.stage}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white">{app.role}</h1>
          <p className="text-xs text-gray-400 mt-1">Created on {new Date(app.created_at).toLocaleDateString()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="text-right px-4 py-2 rounded-2xl bg-surface border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Ground Truth Match</span>
            <span className="text-2xl font-black text-emerald-400">{matchReport.match_score_percentage || 0}%</span>
          </div>

          <button
            onClick={handleGenerateResume}
            disabled={generating}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-accent/25 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Validating & Tailoring...' : 'Generate Tailored Resume'}</span>
          </button>
        </div>
      </div>

      {/* Generation Status Indicator */}
      {generating && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800 text-indigo-200 text-xs flex items-center space-x-3 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
          <span>{genStep}</span>
        </div>
      )}

      {/* Honest Coaching Match Summary */}
      {matchReport.honest_summary && (
        <div className="p-6 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 space-y-2">
          <h3 className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Honest Coaching Match Assessment (Ground-Truth Evidence Only)
          </h3>
          <p className="text-indigo-100/90 leading-relaxed">{matchReport.honest_summary}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-2">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'matches' ? 'bg-accent/20 text-white border border-accent/40' : 'text-gray-400 hover:text-white'
          }`}
        >
          Match & Gap Breakdown ({matches.length})
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'actions' ? 'bg-accent/20 text-white border border-accent/40' : 'text-gray-400 hover:text-white'
          }`}
        >
          Gap-to-Action Plan ({gapActions.length})
        </button>

        <button
          onClick={() => setActiveTab('resume')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'resume' ? 'bg-accent/20 text-white border border-accent/40' : 'text-gray-400 hover:text-white'
          }`}
        >
          Tailored Resume & ATS LaTeX
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60' : 'text-gray-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Anti-Fabrication Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('prep'); handleFetchInterviewPrep(); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'prep' ? 'bg-purple-950/50 text-purple-200 border border-purple-800' : 'text-gray-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
          <span>Interview Preparation</span>
        </button>
      </div>

      {/* Tab 1: Match & Gap Breakdown */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-center">
              <span className="text-2xl font-black text-emerald-400">{matchReport.strong_matches_count || 0}</span>
              <span className="text-emerald-300 block font-semibold mt-0.5">Strong Matches (Tier 2–3)</span>
            </div>
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-center">
              <span className="text-2xl font-black text-blue-400">{matchReport.weak_matches_count || 0}</span>
              <span className="text-blue-300 block font-semibold mt-0.5">Weak Matches (Tier 1)</span>
            </div>
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 text-center">
              <span className="text-2xl font-black text-rose-400">{matchReport.gaps_count || 0}</span>
              <span className="text-rose-300 block font-semibold mt-0.5">Unevidenced Gaps (Tier 0 / Absent)</span>
            </div>
          </div>

          <div className="space-y-3">
            {matches.map((m: any, idx: number) => {
              const statusColors: Record<string, string> = {
                strong_match: 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300',
                weak_match: 'bg-blue-950/30 border-blue-800/60 text-blue-300',
                gap: 'bg-rose-950/30 border-rose-800/60 text-rose-300'
              };

              return (
                <div key={idx} className={`p-4 rounded-2xl border ${statusColors[m.status]} flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs`}>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white">{m.requirement}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface border border-surface-border opacity-80">
                        {m.importance}
                      </span>
                    </div>
                    <p className="text-gray-300 italic">"{m.raw_phrase}"</p>
                    <p className="font-medium pt-1">{m.rationale}</p>
                  </div>

                  <div>
                    <SkillTierBadge skillName={m.requirement} tier={m.matched_tier || 0} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Gap-to-Action Plan */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Actionable Skill Gap Remediation Plan</h3>
          {gapActions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-800 text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero skill gaps identified for this role! Your profile features ground-truth project evidence for all core requirements.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gapActions.map((action: any, idx: number) => (
                <div key={idx} className="glass-card p-5 rounded-2xl border border-surface-border space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent font-semibold">
                      {action.type === 'learning_resource' ? 'Verified Resource' : 'Micro-Project Idea'}
                    </span>
                    <span className="text-gray-400 font-mono">{action.estimated_hours}</span>
                  </div>

                  <h4 className="font-bold text-white text-sm">{action.title}</h4>
                  <p className="text-gray-300 leading-relaxed">{action.description}</p>

                  {action.url && (
                    <a
                      href={action.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-accent hover:underline font-semibold pt-1"
                    >
                      <span>Open Official Resource</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Tailored Resume & ATS LaTeX */}
      {activeTab === 'resume' && (
        <div className="glass-card p-6 rounded-2xl border border-surface-border space-y-6">
          {resumeError ? (
            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/40 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Master Profile Required</h3>
                <p className="text-xs text-rose-300 leading-relaxed">{resumeError}</p>
              </div>
              <Link
                href="/profile"
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md inline-flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Upload Master Resume</span>
              </Link>
            </div>
          ) : !resume ? (
            <div className="text-center py-12 space-y-4">
              <FileText className="w-12 h-12 mx-auto text-gray-500" />
              <h3 className="text-lg font-semibold text-white">No resume generated yet</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Click "Generate Tailored Resume" above to build an ATS-compliant resume grounded strictly in your verified profile and repository claims.
              </p>
            </div>
          ) : (

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">Tailored Resume (ATS LaTeX Format)</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 text-[10px] uppercase font-bold border border-emerald-800">
                      ✓ Verified Grounded
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Generated on {new Date(resume.generated_at).toLocaleString()}</p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCopyLatex}
                    className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-border text-gray-200 text-xs font-semibold border border-surface-border inline-flex items-center space-x-1.5"
                  >
                    {copiedLatex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLatex ? 'Copied LaTeX' : 'Copy LaTeX'}</span>
                  </button>

                  {resume.pdf_url && (
                    <a
                      href={getAbsolutePdfUrl(resume.pdf_url)}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md inline-flex items-center space-x-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </a>
                  )}

                </div>
              </div>

              {/* What Changed Summary */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-1.5">
                <span className="font-bold text-indigo-300 block">Resume Tailoring & Optimization Summary:</span>
                <ul className="list-disc pl-5 space-y-1 text-indigo-100">
                  <li>Prioritized Tier 2–3 verified project skills at the top of the technical skills section.</li>
                  <li>Formatted ATS-safe single-column LaTeX output compatible with automated job portals.</li>
                  <li>Verified all bullet point claims against 2nd-pass Anti-Fabrication guardrails.</li>
                </ul>
              </div>

              {/* Compiled LaTeX Source Box */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 mb-2">Compiled LaTeX Source:</h4>
                <pre className="p-4 rounded-xl bg-surface border border-surface-border text-xs text-emerald-300 font-mono overflow-x-auto max-h-96">
                  {resume.latex_source}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Anti-Fabrication Audit Logs */}
      {activeTab === 'audit' && (
        <div className="glass-card p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Anti-Fabrication Guardrail Audit Logs</span>
            </h3>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero unverified claims or hallucinations were attempted for this resume! 100% ground-truth compliant.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 space-y-1">
                  <div className="font-semibold text-rose-300">Rejected Claim Attempted:</div>
                  <p className="italic bg-black/40 p-2 rounded text-rose-100 font-mono text-[11px]">"{log.rejected_claim}"</p>
                  <div className="text-rose-400 font-medium pt-1">Reason: {log.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Interview Preparation */}
      {activeTab === 'prep' && (
        <div className="glass-card p-6 rounded-2xl border border-surface-border space-y-6">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <span>Interview Defense Preparation</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Questions generated strictly from your verified skill evidence, audited repos, and identified job gaps.
              </p>
            </div>

            <button
              onClick={handleFetchInterviewPrep}
              disabled={loadingPrep}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md inline-flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPrep ? 'animate-spin' : ''}`} />
              <span>{loadingPrep ? 'Generating Questions...' : 'Regenerate Questions'}</span>
            </button>
          </div>

          {loadingPrep ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400" />
              <p className="text-xs">Generating grounded technical & gap defense questions...</p>
            </div>
          ) : !interviewPrep || interviewPrep.questions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xs">Click "Regenerate Questions" to build your custom interview defense prep.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviewPrep.questions.map((q, qIdx) => {
                const categoryBadge: Record<string, string> = {
                  technical: 'bg-purple-950/60 text-purple-300 border-purple-800',
                  project: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
                  behavioral: 'bg-blue-950/60 text-blue-300 border-blue-800',
                  gap_defense: 'bg-amber-950/60 text-amber-300 border-amber-800'
                };

                return (
                  <div key={qIdx} className="p-5 rounded-2xl bg-surface/60 border border-surface-border space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] uppercase ${categoryBadge[q.category] || 'bg-surface'}`}>
                        {q.category.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono">Question #{qIdx + 1}</span>
                    </div>

                    <h4 className="font-bold text-white text-sm leading-snug">{q.question}</h4>

                    <div className="p-3 rounded-xl bg-black/30 border border-surface-border text-gray-300">
                      <span className="font-semibold text-gray-400 block text-[11px] mb-0.5">Why Interviewer Asks This:</span>
                      <span>{q.context}</span>
                    </div>

                    {q.suggested_talking_points && q.suggested_talking_points.length > 0 && (
                      <div className="space-y-1">
                        <span className="font-semibold text-purple-300 block text-[11px]">Recommended Defensible Talking Points:</span>
                        <ul className="list-disc pl-5 space-y-0.5 text-gray-300">
                          {q.suggested_talking_points.map((tp, tpIdx) => (
                            <li key={tpIdx}>{tp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
