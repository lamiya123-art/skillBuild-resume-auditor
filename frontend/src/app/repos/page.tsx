'use client';

import { useState, useEffect } from 'react';
import { 
  GitBranch, ShieldCheck, RefreshCw, Plus, Search, Filter, 
  ExternalLink, CheckCircle2, AlertTriangle, Github, Code, ArrowRight
} from 'lucide-react';
import { devLogin, getUserProfile, getUserRepos, fetchGitHubRepos, auditRepo, RepoAudit } from '@/lib/api';
import ReadinessScoreGauge from '@/components/ReadinessScoreGauge';

interface GitHubRepoItem {
  github_repo_id: string;
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
}

export default function ReposPage() {
  const [user, setUser] = useState<any>(null);
  const [auditedRepos, setAuditedRepos] = useState<RepoAudit[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepoItem[]>([]);
  const [githubUsername, setGithubUsername] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [fetchingGh, setFetchingGh] = useState(false);
  const [auditingId, setAuditingId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'audited' | 'not_audited' | 'needs_attention' | 'ready'>('all');

  // Manual README Audit Drawer State
  const [manualName, setManualName] = useState('');
  const [manualReadme, setManualReadme] = useState('');

  useEffect(() => {
    initReposPage();
  }, []);

  const initReposPage = async () => {
    setLoading(true);
    try {
      const u = await devLogin();
      const profile = await getUserProfile(u.id);
      setUser(profile);
      
      const userAudits = await getUserRepos(u.id);
      setAuditedRepos(userAudits);

      if (profile.github_username) {
        setGithubUsername(profile.github_username);
        loadGitHubUserRepos(profile.github_username);
      }
    } catch (err) {
      console.error('Failed to initialize repos page:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGitHubUserRepos = async (username: string) => {
    if (!username) return;
    setFetchingGh(true);
    try {
      const repos = await fetchGitHubRepos(username);
      setGithubRepos(repos);
    } catch (err) {
      console.error('Failed to fetch GitHub repos:', err);
    } finally {
      setFetchingGh(false);
    }
  };

  const handleAuditRepoItem = async (repoItem: GitHubRepoItem, readmeText?: string) => {
    if (!user) return;
    setAuditingId(repoItem.github_repo_id);

    try {
      const audited = await auditRepo(user.id, {
        github_repo_id: repoItem.github_repo_id,
        name: repoItem.name,
        readme_content: readmeText || `# ${repoItem.name}\n\n${repoItem.description || 'Repository codebase implementation.'}\n\n## Getting Started\nInstall dependencies and run standard dev script.\n`,
        commit_history: [],
        dependencies: [repoItem.language || 'Python']
      });

      setAuditedRepos(prev => {
        const idx = prev.findIndex(r => r.github_repo_id === audited.github_repo_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = audited;
          return updated;
        }
        return [audited, ...prev];
      });
    } catch (err) {
      console.error('Failed to audit repository:', err);
    } finally {
      setAuditingId(null);
    }
  };

  // Combine fetched GitHub repos with audit scores
  const combinedList = githubRepos.map(gh => {
    const auditMatch = auditedRepos.find(a => a.github_repo_id.toLowerCase() === gh.github_repo_id.toLowerCase() || a.name.toLowerCase() === gh.name.toLowerCase());
    return {
      ...gh,
      audit: auditMatch || null
    };
  });

  // Filter list
  const filteredRepos = combinedList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeFilter === 'audited') return item.audit !== null;
    if (activeFilter === 'not_audited') return item.audit === null;
    if (activeFilter === 'ready') return item.audit && item.audit.readiness_score >= 60;
    if (activeFilter === 'needs_attention') return item.audit && item.audit.readiness_score < 60;

    return true;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-accent mb-2">
            <GitBranch className="w-5 h-5 text-accent" />
            <span className="text-xs uppercase font-bold tracking-widest">Interview Durability Check</span>
          </div>
          <h1 className="text-3xl font-black text-white">GitHub Repository Audit</h1>
          <p className="text-gray-400 text-sm mt-1 max-w-3xl">
            Verify whether your repositories are strong enough to defend in an interview before using them as resume evidence. Evaluates non-boilerplate README quality, commit spread, tech stack verification, and ownership.
          </p>
        </div>

        {/* GitHub Username Input */}
        <div className="p-4 rounded-2xl bg-surface/80 border border-surface-border space-y-2 shrink-0 w-full md:w-80">
          <label className="text-xs font-bold text-gray-300 block flex items-center gap-1.5">
            <Github className="w-4 h-4 text-white" /> Connect GitHub Account
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g. username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white focus:outline-none focus:border-accent flex-1"
            />
            <button
              onClick={() => loadGitHubUserRepos(githubUsername)}
              disabled={fetchingGh || !githubUsername}
              className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 shrink-0 flex items-center space-x-1"
            >
              {fetchingGh ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Fetch Repos</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-surface/60 p-1.5 rounded-2xl border border-surface-border text-xs">
          {(['all', 'audited', 'not_audited', 'ready', 'needs_attention'] as const).map((filterKey) => {
            const labels = {
              all: 'All',
              audited: 'Audited',
              not_audited: 'Not Audited',
              ready: 'Interview Ready',
              needs_attention: 'Needs Attention'
            };
            const isSelected = activeFilter === filterKey;
            return (
              <button
                key={filterKey}
                onClick={() => setActiveFilter(filterKey)}
                className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                  isSelected 
                    ? 'bg-accent text-white shadow-md' 
                    : 'text-gray-400 hover:text-white hover:bg-surface'
                }`}
              >
                {labels[filterKey]}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-card p-12 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
          <p>Loading candidate repositories & readiness audits...</p>
        </div>
      ) : combinedList.length === 0 ? (
        /* Global Empty State */
        <div className="glass-card p-12 text-center text-gray-400 border border-dashed border-surface-border space-y-4">
          <GitBranch className="w-12 h-12 mx-auto text-gray-600" />
          <div>
            <h3 className="text-lg font-bold text-white">Connect a repository to verify your project evidence</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
              Enter your GitHub username above or submit a project repository to evaluate its interview durability score.
            </p>
          </div>
          <button
            onClick={() => loadGitHubUserRepos(githubUsername || 'octocat')}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md inline-flex items-center space-x-2"
          >
            <Github className="w-4 h-4" />
            <span>Connect GitHub</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center justify-between">
            <span>Repositories ({filteredRepos.length})</span>
            <span className="text-xs font-normal text-gray-400">{auditedRepos.length} Audited</span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {filteredRepos.map((item) => {
              const audit = item.audit;
              const isAuditing = auditingId === item.github_repo_id;

              return (
                <div key={item.github_repo_id} className="glass-card p-6 rounded-2xl border border-surface-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-white text-lg">{item.name}</span>
                        {item.language && (
                          <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-surface border border-surface-border text-indigo-300">
                            {item.language}
                          </span>
                        )}
                        {audit && audit.readiness_score >= 60 && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Interview Ready
                          </span>
                        )}
                        {audit && audit.readiness_score < 60 && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Needs Attention
                          </span>
                        )}
                      </div>

                      {item.description && <p className="text-xs text-gray-300">{item.description}</p>}
                      <div className="text-[11px] text-gray-500 font-mono">Path: {item.github_repo_id}</div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center space-x-3 shrink-0">
                      {audit && (
                        <div className="text-right px-4 py-2 rounded-xl bg-surface border border-surface-border">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Readiness</span>
                          <span className={`text-lg font-black ${audit.readiness_score >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {audit.readiness_score} / 100
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => handleAuditRepoItem(item)}
                        disabled={isAuditing}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 ${
                          audit
                            ? 'bg-surface hover:bg-surface-border text-gray-200 border border-surface-border'
                            : 'bg-accent hover:bg-accent-hover text-white shadow-accent/20'
                        }`}
                      >
                        {isAuditing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Auditing...</span>
                          </>
                        ) : (
                          <>
                            <span>{audit ? 'Re-Audit Repo' : 'Run Audit'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Detailed Readiness Gauge if Audited */}
                  {audit && <ReadinessScoreGauge audit={audit} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
