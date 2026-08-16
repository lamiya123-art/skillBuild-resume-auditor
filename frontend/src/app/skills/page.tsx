'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layers, ShieldCheck, RefreshCw, Info, ExternalLink, Search, Filter, 
  Upload, X, CheckCircle2, AlertTriangle, Shield, ChevronRight
} from 'lucide-react';
import { devLogin, getUserProfile, getUserSkills, classifyUserSkills, SkillClaim } from '@/lib/api';
import SkillTierBadge from '@/components/SkillTierBadge';

export default function SkillsPage() {
  const [user, setUser] = useState<any>(null);
  const [skills, setSkills] = useState<SkillClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);

  // Drawer / Modal State for Skill Evidence Inspection
  const [selectedSkill, setSelectedSkill] = useState<SkillClaim | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | '3' | '2' | '1' | '0'>('all');

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const u = await devLogin();
      const profile = await getUserProfile(u.id);
      setUser(profile);

      let data = await getUserSkills(u.id);
      if ((!data || data.length === 0) && profile.master_profile_data) {
        data = await classifyUserSkills(u.id);
      }
      setSkills(data);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunClassification = async () => {
    if (!user) return;
    setClassifying(true);
    try {
      const updated = await classifyUserSkills(user.id);
      setSkills(updated);
    } catch (err) {
      console.error('Failed to classify skills:', err);
    } finally {
      setClassifying(false);
    }
  };

  const strongCount = skills.filter(s => s.tier >= 2).length;
  const learningCount = skills.filter(s => s.tier === 1).length;
  const unevidencedCount = skills.filter(s => s.tier === 0).length;

  const filteredSkills = skills.filter(s => {
    const matchesSearch = s.skill_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.rationale.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (tierFilter !== 'all' && s.tier !== parseInt(tierFilter, 10)) return false;
    return true;
  });

  const getConfidenceLevel = (tier: number) => {
    if (tier === 3) return { label: 'High', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' };
    if (tier === 2) return { label: 'High', color: 'text-purple-400 bg-purple-950/40 border-purple-800' };
    if (tier === 1) return { label: 'Medium', color: 'text-blue-400 bg-blue-950/40 border-blue-800' };
    return { label: 'Low', color: 'text-slate-400 bg-slate-800 border-slate-700' };
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <Layers className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-widest">Skill Evidence Matrix</span>
          </div>
          <h1 className="text-3xl font-black text-white">Skill Evidence Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1 max-w-3xl">
            See how strongly each technology is supported by your actual experience. Tiered classification guarantees your resumes only feature defensible claims in real technical interviews.
          </p>
        </div>

        <button
          onClick={handleRunClassification}
          disabled={classifying}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${classifying ? 'animate-spin' : ''}`} />
          <span>{classifying ? 'Classifying Skills...' : 'Re-Run Classifier'}</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-surface-border">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Total Skills</span>
          <span className="text-2xl font-black text-white">{skills.length}</span>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-surface-border">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Strong Project Evidence</span>
          <span className="text-2xl font-black text-emerald-400">{strongCount}</span>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-surface-border">
          <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1">Coursework / Learning</span>
          <span className="text-2xl font-black text-blue-400">{learningCount}</span>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-surface-border">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mentioned Only</span>
          <span className="text-2xl font-black text-slate-400">{unevidencedCount}</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-surface/60 p-1.5 rounded-2xl border border-surface-border text-xs">
          {[
            { key: 'all', label: 'All Tiers' },
            { key: '3', label: 'Tier 3 (Dedicated)' },
            { key: '2', label: 'Tier 2 (Used)' },
            { key: '1', label: 'Tier 1 (Coursework)' },
            { key: '0', label: 'Tier 0 (Mentioned)' },
          ].map((item) => {
            const isSelected = tierFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTierFilter(item.key as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  isSelected ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-surface'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Main Table or Empty State */}
      {loading ? (
        <div className="glass-card p-12 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
          <p>Loading classified skill claims...</p>
        </div>
      ) : skills.length === 0 ? (
        /* Pure Empty State */
        <div className="glass-card p-12 text-center text-gray-400 border border-dashed border-surface-border space-y-4">
          <Layers className="w-12 h-12 mx-auto text-gray-600" />
          <div>
            <h3 className="text-lg font-bold text-white">Your skill evidence will appear after your resume is parsed</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
              Upload your master resume to extract technologies and run automated tiered classification.
            </p>
          </div>
          <Link
            href="/profile"
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md inline-flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Resume</span>
          </Link>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/80 text-gray-400 uppercase font-bold text-[10px] border-b border-surface-border">
                <tr>
                  <th className="px-6 py-4">Skill</th>
                  <th className="px-6 py-4">Evidence Tier</th>
                  <th className="px-6 py-4">Ground-Truth Evidence Rationale</th>
                  <th className="px-6 py-4">Interview Confidence</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-gray-200">
                {filteredSkills.map((skill) => {
                  const conf = getConfidenceLevel(skill.tier);

                  return (
                    <tr key={skill.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-white text-sm">
                        {skill.skill_name}
                      </td>
                      <td className="px-6 py-4">
                        <SkillTierBadge skillName={skill.skill_name} tier={skill.tier} />
                      </td>
                      <td className="px-6 py-4 text-gray-300 max-w-xs truncate">
                        {skill.rationale}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] uppercase ${conf.color}`}>
                          {conf.label} Confidence
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedSkill(skill)}
                          className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-border text-purple-300 border border-surface-border text-xs font-semibold inline-flex items-center space-x-1"
                        >
                          <span>View Evidence</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-out Evidence Modal / Drawer */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full rounded-3xl p-6 border border-surface-border space-y-6 animate-in fade-in zoom-in duration-200 relative">
            <button
              onClick={() => setSelectedSkill(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-surface"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl font-black text-white">{selectedSkill.skill_name}</span>
                <SkillTierBadge skillName={selectedSkill.skill_name} tier={selectedSkill.tier} />
              </div>
              <p className="text-xs text-gray-400">Skill Evidence Detail & Interview Confidence Audit</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1">
                <span className="font-semibold text-gray-400 block">Why this Tier?</span>
                <p className="text-gray-200 leading-relaxed font-medium">{selectedSkill.rationale}</p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1">
                <span className="font-semibold text-gray-400 block">Evidence Source</span>
                <p className="text-gray-200">
                  {selectedSkill.tier >= 2 
                    ? 'Verified project dependencies & repository codebase structure.' 
                    : selectedSkill.tier === 1 
                    ? 'User-declared coursework / self-taught learning in profile.' 
                    : 'Mentioned only in resume text without project repository link.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-400 block">Interview Durability Confidence</span>
                  <span className="text-gray-300">
                    {selectedSkill.tier >= 2 ? 'High — Defensible with working project codebase.' : 'Needs project evidence before claiming in technical round.'}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-lg border font-bold text-xs ${getConfidenceLevel(selectedSkill.tier).color}`}>
                  {getConfidenceLevel(selectedSkill.tier).label}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedSkill(null)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md"
              >
                Close Evidence Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
