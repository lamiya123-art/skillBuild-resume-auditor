'use client';

import { AlertTriangle, CheckCircle2, FileCode, GitCommit, UserCheck, ShieldAlert } from 'lucide-react';
import { RepoAudit } from '@/lib/api';

interface ReadinessScoreGaugeProps {
  audit: RepoAudit;
}

export default function ReadinessScoreGauge({ audit }: ReadinessScoreGaugeProps) {
  const { readiness_score, flags, audit_details } = audit;
  const breakdown = audit_details?.breakdown || {
    readme_exists_score: 0,
    readme_quality_score: 0,
    commit_spread_score: 0,
    commit_messages_score: 0,
    authorship_score: 0
  };
  const metrics = audit_details?.metrics || { word_count: 0, commit_count: 0, spread_days: 0, ownership_pct: 0 };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    if (score >= 60) return 'text-indigo-400 border-indigo-500/30 bg-indigo-950/20';
    if (score >= 40) return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/30 bg-rose-950/20';
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-surface-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-surface-border">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{audit.name}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-border text-gray-300 font-mono">
              ID: {audit.github_repo_id}
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Last Audited: {new Date(audit.last_audited_at).toLocaleDateString()}
          </p>
        </div>

        {/* Readiness Score Badge */}
        <div className={`flex items-center space-x-3 px-5 py-3 rounded-xl border ${getScoreColor(readiness_score)} shadow-inner`}>
          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider block opacity-75">Interview Readiness</span>
            <span className="text-2xl font-black">{readiness_score} / 100</span>
          </div>
        </div>
      </div>

      {/* Breakdown Progress Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
          <div className="flex justify-between text-xs text-gray-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5 text-indigo-400" /> README Length</span>
            <span>{breakdown.readme_exists_score} / 25</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${(breakdown.readme_exists_score / 25) * 100}%` }} />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">{metrics.word_count} words (200+ recommended)</span>
        </div>

        <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
          <div className="flex justify-between text-xs text-gray-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-purple-400" /> Non-Boilerplate</span>
            <span>{breakdown.readme_quality_score} / 15</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${(breakdown.readme_quality_score / 15) * 100}%` }} />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">{breakdown.readme_quality_score === 15 ? 'Passed template check' : 'Starter template detected'}</span>
        </div>

        <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
          <div className="flex justify-between text-xs text-gray-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5"><GitCommit className="w-3.5 h-3.5 text-emerald-400" /> Commit Spread</span>
            <span>{breakdown.commit_spread_score} / 25</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(breakdown.commit_spread_score / 25) * 100}%` }} />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">{metrics.commit_count} commits across {metrics.spread_days} days</span>
        </div>

        <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
          <div className="flex justify-between text-xs text-gray-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5"><GitCommit className="w-3.5 h-3.5 text-amber-400" /> Commit Messages</span>
            <span>{breakdown.commit_messages_score} / 15</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(breakdown.commit_messages_score / 15) * 100}%` }} />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Meaningful commit message quality</span>
        </div>

        <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
          <div className="flex justify-between text-xs text-gray-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-cyan-400" /> Ownership Signal</span>
            <span>{breakdown.authorship_score} / 20</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${(breakdown.authorship_score / 20) * 100}%` }} />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">{metrics.ownership_pct}% user commit share (&gt;70% required)</span>
        </div>
      </div>

      {/* Flag warnings */}
      {flags && flags.length > 0 ? (
        <div className="mt-4 p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 space-y-2">
          <h4 className="font-semibold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Audit Warning Flags ({flags.length}):
          </h4>
          <ul className="list-disc pl-5 space-y-1">
            {flags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>This repository meets all readiness criteria and is interview-safe evidence.</span>
        </div>
      )}
    </div>
  );
}
