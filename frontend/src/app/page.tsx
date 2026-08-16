'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, Briefcase, Calendar, FileText, ChevronRight, 
  CheckCircle2, Clock, XCircle, ArrowUpRight, AlertCircle, Plus, RefreshCw, 
  Search, Filter, Trash2, ArrowUpDown, Layers, GitBranch, UserCheck
} from 'lucide-react';
import { 
  devLogin, getUserProfile, getUserApplications, updateApplicationStage, deleteJobApplication, 
  getUserRepos, getUserSkills, JobApplication 
} from '@/lib/api';

const STAGES = [
  { key: 'registered', label: 'Registered', color: 'bg-slate-800 text-slate-300' },
  { key: 'screening', label: 'Screening', color: 'bg-blue-950 text-blue-300 border-blue-800' },
  { key: 'technical', label: 'Technical Interview', color: 'bg-purple-950 text-purple-300 border-purple-800' },
  { key: 'hr', label: 'HR / Final Round', color: 'bg-amber-950 text-amber-300 border-amber-800' },
  { key: 'offer', label: 'Offer Received 🎉', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  { key: 'rejected', label: 'Rejected', color: 'bg-rose-950 text-rose-300 border-rose-800' }
];

export default function Dashboard() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [repoCount, setRepoCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);

  // Filters & Sorting
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'match' | 'company'>('recent');

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    setLoading(true);
    try {
      const user = await devLogin();
      const profile = await getUserProfile(user.id);
      setUserProfile(profile);

      const apps = await getUserApplications(user.id);
      setApplications(apps);

      const repos = await getUserRepos(user.id);
      setRepoCount(repos.length);

      const skills = await getUserSkills(user.id);
      setSkillCount(skills.length);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (appId: number, newStage: string) => {
    try {
      const updated = await updateApplicationStage(appId, newStage);
      setApplications(prev => prev.map(a => a.id === appId ? updated : a));
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleDeleteApp = async (appId: number) => {
    if (confirm('Delete this job application record?')) {
      try {
        await deleteJobApplication(appId);
        setApplications(prev => prev.filter(a => a.id !== appId));
      } catch (err) {
        console.error('Failed to delete application:', err);
      }
    }
  };

  // Metrics
  const activeCount = applications.filter(a => a.stage !== 'rejected' && a.stage !== 'offer').length;
  const interviewCount = applications.filter(a => a.stage === 'technical' || a.stage === 'hr').length;
  const offerCount = applications.filter(a => a.stage === 'offer').length;
  const rejectedCount = applications.filter(a => a.stage === 'rejected').length;

  // Filter & Sort Logic
  const filteredApps = applications.filter(app => {
    const matchesSearch = app.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.role.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterStage === 'active') return app.stage !== 'rejected' && app.stage !== 'offer';
    if (filterStage !== 'all' && app.stage !== filterStage) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'match') {
      const scoreA = (a.match_report || {}).match_score_percentage || 0;
      const scoreB = (b.match_report || {}).match_score_percentage || 0;
      return scoreB - scoreA;
    }
    if (sortBy === 'company') {
      return a.company.localeCompare(b.company);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Overview Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-surface-border relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Application Tracker Dashboard
            </h1>
            <p className="text-gray-400 mt-1 max-w-2xl text-xs sm:text-sm">
              Live job search pipeline. Track ground-truth match scores, tailored ATS resumes, interview stages, and anti-fabrication evidence across all applications.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={initDashboard}
              className="p-2.5 rounded-xl glass-card text-gray-300 hover:text-white transition-all border border-surface-border"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/applications/new"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-md shadow-accent/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Create Application</span>
            </Link>
          </div>
        </div>

        {/* Top Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-border">
          <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Master Profile</span>
            <span className="text-sm font-bold text-white">
              {userProfile?.master_resume_text ? 'Resume Active' : 'No Resume'}
            </span>
          </div>

          <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-indigo-400 block">Audited Repos</span>
            <span className="text-sm font-bold text-indigo-300">{repoCount} Repositories</span>
          </div>

          <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-purple-400 block">Classified Skills</span>
            <span className="text-sm font-bold text-purple-300">{skillCount} Skills</span>
          </div>

          <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Active Pipeline</span>
            <span className="text-sm font-bold text-emerald-400">{activeCount} Applications</span>
          </div>
        </div>
      </div>

      {/* Stage Stats Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'all', label: 'All Applications', count: applications.length },
          { key: 'active', label: 'Active Pipeline', count: activeCount },
          { key: 'screening', label: 'Screening', count: applications.filter(a => a.stage === 'screening').length },
          { key: 'technical', label: 'Technical', count: applications.filter(a => a.stage === 'technical').length },
          { key: 'offer', label: 'Offers 🎉', count: offerCount },
          { key: 'rejected', label: 'Rejected', count: rejectedCount }
        ].map((s) => {
          const isSelected = filterStage === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setFilterStage(s.key)}
              className={`p-4 rounded-2xl text-left border transition-all ${
                isSelected 
                  ? 'bg-accent/20 border-accent text-white shadow-md' 
                  : 'glass-card hover:bg-surface/80 text-gray-300'
              }`}
            >
              <div className="text-2xl font-black mb-1">{s.count}</div>
              <div className="text-xs font-semibold truncate opacity-80">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Search & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search company or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white focus:outline-none focus:border-accent"
          >
            <option value="recent">Recently Created</option>
            <option value="match">Match Score (High to Low)</option>
            <option value="company">Company Name</option>
          </select>
        </div>
      </div>

      {/* Main Application List / Empty State */}
      {loading ? (
        <div className="glass-card p-12 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
          <p>Loading job application pipeline...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        /* Pure Empty State */
        <div className="glass-card p-12 text-center text-gray-400 border border-dashed border-surface-border space-y-4">
          <Briefcase className="w-12 h-12 mx-auto text-gray-600" />
          <div>
            <h3 className="text-lg font-bold text-white">Your application pipeline is empty</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
              Create your first application to start tracking job-specific matches, tailored resumes, stages, and interview prep.
            </p>
          </div>
          <Link
            href="/applications/new"
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Application</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApps.map((app) => {
            const matchReport = app.match_report || {};
            const matchScore = matchReport.match_score_percentage || 0;

            return (
              <div key={app.id} className="glass-card p-6 rounded-2xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-white">{app.company}</h3>
                      <p className="text-xs font-semibold text-gray-300">{app.role}</p>
                    </div>
                  </div>

                  {/* Interview Note */}
                  {app.notes && (
                    <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-200 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate"><strong>Note:</strong> {app.notes}</span>
                    </div>
                  )}
                </div>

                {/* Stage Selector & Score */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {/* Match Score Badge */}
                  <div className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Match Score</span>
                    <span className="text-lg font-black text-emerald-400">{matchScore}%</span>
                  </div>

                  {/* Stage Dropdown */}
                  <select
                    value={app.stage}
                    onChange={(e) => handleStageChange(app.id, e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-xs font-semibold text-gray-200 focus:outline-none focus:border-accent"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>

                  {/* Details Button */}
                  <Link
                    href={`/applications/${app.id}`}
                    className="px-4 py-2.5 rounded-xl bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 text-xs font-semibold transition-all flex items-center space-x-1"
                  >
                    <span>View Matches & Resume</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteApp(app.id)}
                    title="Delete Application"
                    className="p-2.5 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
