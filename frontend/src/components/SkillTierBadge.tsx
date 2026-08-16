'use client';

import { Shield, ExternalLink, HelpCircle } from 'lucide-react';

interface SkillTierBadgeProps {
  skillName: string;
  tier: number; // 0, 1, 2, 3
  rationale?: string;
  evidenceRepoId?: number;
}

export default function SkillTierBadge({ skillName, tier, rationale, evidenceRepoId }: SkillTierBadgeProps) {
  const tierConfig: Record<number, { label: string; badgeClass: string; desc: string }> = {
    0: {
      label: 'Tier 0: Mentioned',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      desc: 'Mentioned only in resume (no project, no coursework link)'
    },
    1: {
      label: 'Tier 1: Coursework',
      badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
      desc: 'Self-taught or academic coursework (user-declared, no repo evidence)'
    },
    2: {
      label: 'Tier 2: Used in Project',
      badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
      desc: 'Appears in repo dependency file or secondary codebase feature'
    },
    3: {
      label: 'Tier 3: Dedicated Project',
      badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 shadow-sm shadow-emerald-900/30',
      desc: 'Primary technology of a dedicated project with healthy readiness score'
    }
  };

  const currentTier = tierConfig[tier] || tierConfig[0];

  return (
    <div className="group relative inline-flex items-center">
      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${currentTier.badgeClass} transition-all`}>
        <Shield className="w-3.5 h-3.5 opacity-80" />
        <span>{skillName}</span>
        <span className="opacity-60 text-[10px] uppercase font-bold tracking-wider">({currentTier.label.split(':')[0]})</span>
      </div>

      {/* Tooltip on hover */}
      {rationale && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 rounded-xl glass-panel text-xs text-gray-200 z-50 shadow-xl border border-surface-border">
          <p className="font-semibold text-white mb-1">{currentTier.label}</p>
          <p className="text-gray-300 mb-2">{rationale}</p>
          <p className="text-[10px] text-gray-400 border-t border-white/10 pt-1.5">{currentTier.desc}</p>
        </div>
      )}
    </div>
  );
}
