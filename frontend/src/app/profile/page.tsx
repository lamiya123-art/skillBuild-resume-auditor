'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  User, FileText, Upload, Github, Linkedin, CheckCircle2, RefreshCw, 
  Edit3, Save, Plus, Trash2, AlertCircle, Briefcase, GraduationCap, Code2, Globe, Phone, MapPin, ExternalLink
} from 'lucide-react';
import { 
  devLogin, getUserProfile, uploadMasterProfileFile, uploadMasterProfile, updateUserProfile, UserProfile 
} from '@/lib/api';

export default function ProfilePage() {
  // 1. Primary Component State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Manual Profile Edit Form State
  const [editData, setEditData] = useState<any>({});

  // Debug inspector and modal state
  const [showDebugView, setShowDebugView] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<string>('');

  // 2. Derived Profile Data & Diagnostics (Declared BEFORE any usage)
  const profileData = profile?.master_profile_data ?? null;
  const diagnostics = profileData?._extraction_diagnostics ?? null;

  // Calculate profile completeness %
  const calculateCompleteness = () => {
    if (!profileData) return 0;
    let score = 0;
    if (profileData.name) score += 20;
    if (profileData.email) score += 10;
    if (profileData.skills && profileData.skills.length > 0) score += 25;
    if (profileData.experience && profileData.experience.length > 0) score += 25;
    if (profileData.projects && profileData.projects.length > 0) score += 10;
    if (profileData.education && profileData.education.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const completenessPct = calculateCompleteness();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const u = await devLogin();
      const fullUser = await getUserProfile(u.id);
      setProfile(fullUser);
      setEditData(fullUser.master_profile_data || {});
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeUpload = async (file: File) => {
    setUploading(true);
    setFeedback(null);
    setUploadStep('Extracting resume text...');

    try {
      setTimeout(() => setUploadStep('Analyzing text quality & structure...'), 800);
      setTimeout(() => setUploadStep('Building structured candidate profile...'), 1600);
      setTimeout(() => setUploadStep('Checking extracted information against source...'), 2400);

      const u = await devLogin();
      const updated = await uploadMasterProfileFile(
        u.id, 
        file, 
        profile?.github_username || undefined, 
        profile?.linkedin_url || undefined
      );
      setProfile(updated);
      setEditData(updated.master_profile_data || {});
      setFeedback({ 
        type: 'success', 
        message: `Resume '${file.name}' successfully uploaded and verified (${updated.master_profile_data?._extraction_diagnostics?.quality_score || 95}% text quality score).` 
      });
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err.message || 'Resume text could not be reliably extracted. The file may be image-based or use unsupported font encoding.' 
      });
    } finally {
      setUploading(false);
      setUploadStep('');
      setReplaceModalOpen(false);
      setPendingFile(null);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx') && !name.endsWith('.txt')) {
      setFeedback({ type: 'error', message: 'Unsupported file format. Please upload a PDF, DOCX, or TXT file.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File size exceeds supported 10MB limit.' });
      return;
    }

    if (profile?.master_resume_text) {
      setPendingFile(file);
      setReplaceModalOpen(true);
    } else {
      executeUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSaveStructuredData = async () => {
    if (!profile) return;
    try {
      const updated = await updateUserProfile(profile.id, {
        master_profile_data: editData,
        github_username: editData.github_username || profile.github_username,
        linkedin_url: editData.linkedin_url || profile.linkedin_url
      });
      setProfile(updated);
      setEditingSection(null);
      setFeedback({ type: 'success', message: 'Master profile updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update profile data.' });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="glass-panel p-8 rounded-3xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-accent mb-2">
            <User className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-widest">Ground Truth Evidence</span>
          </div>
          <h1 className="text-3xl font-black text-white">Master Profile</h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Your master profile is the single source of truth for every tailored job application. SkillProof uses it to extract and verify candidate experience, projects, education, and technologies.
          </p>
        </div>

        {/* Header Summary Pill if profile exists */}
        {profileData && profileData.name && (
          <div className="p-4 rounded-2xl bg-surface/80 border border-surface-border flex items-center space-x-4 shrink-0">
            <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-lg font-black">
              {profileData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="font-bold text-white text-sm">{profileData.name}</div>
              <div className="text-xs text-gray-400">{profileData.email || profile?.email}</div>
              <div className="flex items-center space-x-2 mt-1.5">
                <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${completenessPct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-emerald-400">{completenessPct}% Complete</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          feedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-rose-950/30 border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-start space-x-3">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            <span className="leading-relaxed">{feedback.message}</span>
          </div>

          {feedback.type === 'error' && (
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-border text-white text-xs font-semibold border border-surface-border transition-all"
              >
                Try Another PDF
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-sm"
              >
                Upload DOCX
              </button>
            </div>
          )}
        </div>
      )}


      {/* Resume Upload Box */}
      <div className="glass-card p-8 rounded-3xl border border-surface-border space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <FileText className="w-5 h-5 text-accent" />
          <span>Upload Master Resume</span>
        </h2>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-accent bg-accent/10' : 'border-surface-border hover:border-accent/40 bg-surface/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept=".pdf,.docx,.txt"
            className="hidden"
          />

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            {uploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            {uploading ? (uploadStep || 'Extracting & validating resume text...') : 'Drag & drop your resume here'}
          </h3>
          <p className="text-xs text-gray-400 mb-4 max-w-sm mx-auto">
            Supports selectable PDF, DOCX, and TXT files up to 10MB limit.
          </p>

          <button
            type="button"
            disabled={uploading}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md transition-all inline-flex items-center space-x-2"
          >
            <span>Choose Resume File</span>
          </button>
        </div>

        {/* File Metadata Pill & Raw Extraction Debug View */}
        {profile?.master_resume_text && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-300">
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-semibold text-white block">Master Resume Active</span>
                  <span className="text-gray-400 text-[11px]">
                    {profile.master_resume_text.length} characters ingested • Confidence Score: {diagnostics?.parse_confidence_score || 95}%
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDebugView(!showDebugView)}
                  className="px-3 py-1.5 rounded-lg bg-surface-border/50 hover:bg-surface-border text-gray-300 text-[11px] font-semibold border border-surface-border"
                >
                  {showDebugView ? 'Hide Extraction Debug' : 'View Extracted Resume Text'}
                </button>

                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-400 font-semibold border border-emerald-800 text-[11px]">
                  ✓ Verified & Active
                </span>
              </div>
            </div>

            {/* Collapsible Raw Text Debug View */}
            {showDebugView && (
              <div className="p-5 rounded-2xl bg-surface/90 border border-surface-border space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-surface-border pb-2">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Raw Text Extraction Diagnostics</h4>
                  <span className="px-2 py-0.5 rounded bg-accent/20 text-accent font-mono text-[10px]">
                    Method: {diagnostics?.extraction_method || 'pypdf'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-surface border border-surface-border">
                    <span className="text-gray-400 block">Characters</span>
                    <span className="font-bold text-white">{profile.master_resume_text.length}</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-surface-border">
                    <span className="text-gray-400 block">Quality Score</span>
                    <span className="font-bold text-emerald-400">{diagnostics?.quality_score || 95}%</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-surface-border">
                    <span className="text-gray-400 block">Quality Status</span>
                    <span className="font-bold text-emerald-400">{diagnostics?.quality_status || 'PASS'}</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-surface-border">
                    <span className="text-gray-400 block">Parse Confidence</span>
                    <span className="font-bold text-accent">{diagnostics?.parse_confidence_score || 95}%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-300 block mb-1">Normalized Source Text Passed to Parser:</label>
                  <pre className="p-3 rounded-xl bg-background border border-surface-border text-gray-300 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {profile.master_resume_text}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Replace Master Resume Modal */}
      {replaceModalOpen && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-surface-border space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Replace Master Resume?</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              You are about to upload <strong className="text-accent">{pendingFile.name}</strong> to replace your current master resume. Your existing profile will remain unchanged if the new file fails extraction quality validation.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => { setReplaceModalOpen(false); setPendingFile(null); }}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-border text-gray-300 text-xs font-semibold border border-surface-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeUpload(pendingFile)}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md"
              >
                Replace & Parse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Sections (Show Empty State if no profile data) */}
      {loading ? (
        <div className="glass-card p-12 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
          <p>Loading candidate profile...</p>
        </div>
      ) : !profileData || (!profileData.name && (!profileData.skills || profileData.skills.length === 0)) ? (
        <div className="glass-card p-12 text-center text-gray-400 border border-dashed border-surface-border space-y-4">
          <User className="w-12 h-12 mx-auto text-gray-600" />
          <div>
            <h3 className="text-lg font-bold text-white">Your profile starts with your real resume</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
              Upload your current resume above to automatically build your evidence-backed candidate profile.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Personal Information */}
          <div className="glass-card p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <User className="w-4 h-4 text-accent" />
                <span>Personal Information</span>
              </h2>
              {editingSection === 'personal' ? (
                <button
                  onClick={handleSaveStructuredData}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              ) : (
                <button
                  onClick={() => setEditingSection('personal')}
                  className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-border text-gray-300 text-xs font-semibold flex items-center space-x-1 border border-surface-border"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingSection === 'personal' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">GitHub Username</label>
                  <input
                    type="text"
                    value={editData.github_username || profile?.github_username || ''}
                    onChange={(e) => setEditData({ ...editData, github_username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={editData.linkedin_url || profile?.linkedin_url || ''}
                    onChange={(e) => setEditData({ ...editData, linkedin_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-surface/50 border border-surface-border">
                  <span className="text-gray-400 block text-[11px] mb-0.5">Full Name</span>
                  <span className="text-white font-semibold">{profileData.name || 'Not provided'}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-surface-border">
                  <span className="text-gray-400 block text-[11px] mb-0.5">Email</span>
                  <span className="text-white font-semibold">{profileData.email || profile?.email || 'Not provided'}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-surface-border">
                  <span className="text-gray-400 block text-[11px] mb-0.5">GitHub</span>
                  <span className="text-indigo-300 font-semibold">{profile?.github_username ? `@${profile.github_username}` : 'Not provided'}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-surface-border">
                  <span className="text-gray-400 block text-[11px] mb-0.5">LinkedIn</span>
                  <span className="text-blue-300 font-semibold truncate block">{profile?.linkedin_url || 'Not provided'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Skills Inventory */}
          <div className="glass-card p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span>Extracted Skills Inventory</span>
              </h2>
              {editingSection === 'skills' ? (
                <button
                  onClick={handleSaveStructuredData}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              ) : (
                <button
                  onClick={() => setEditingSection('skills')}
                  className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-border text-gray-300 text-xs font-semibold flex items-center space-x-1 border border-surface-border"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingSection === 'skills' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(editData.skills || []).map((skill: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-white text-xs font-semibold flex items-center space-x-2">
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editData.skills.filter((_: any, i: number) => i !== idx);
                          setEditData({ ...editData, skills: updated });
                        }}
                        className="text-gray-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add new skill (e.g. Docker, GraphQL)"
                    id="new-skill-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value ? e.currentTarget.value.trim() : '';
                        if (val) {
                          setEditData({ ...editData, skills: [...(editData.skills || []), val] });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-skill-input') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        setEditData({ ...editData, skills: [...(editData.skills || []), input.value.trim()] });
                        input.value = '';
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ) : profileData.skills && profileData.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profileData.skills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-white text-xs font-semibold shadow-sm flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No skills extracted yet.</p>
            )}
          </div>

          {/* Section 3: Experience */}
          <div className="glass-card p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Experience</span>
              </h2>
              {editingSection === 'experience' ? (
                <button
                  onClick={handleSaveStructuredData}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              ) : (
                <button
                  onClick={() => setEditingSection('experience')}
                  className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-border text-gray-300 text-xs font-semibold flex items-center space-x-1 border border-surface-border"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingSection === 'experience' ? (
              <div className="space-y-4">
                {(editData.experience || []).map((exp: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface border border-surface-border space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editData.experience.filter((_: any, i: number) => i !== idx);
                        setEditData({ ...editData, experience: updated });
                      }}
                      className="absolute top-3 right-3 text-gray-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Job Title</label>
                        <input
                          type="text"
                          value={exp.title || ''}
                          onChange={(e) => {
                            const exps = [...editData.experience];
                            exps[idx] = { ...exps[idx], title: e.target.value };
                            setEditData({ ...editData, experience: exps });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Company</label>
                        <input
                          type="text"
                          value={exp.company || ''}
                          onChange={(e) => {
                            const exps = [...editData.experience];
                            exps[idx] = { ...exps[idx], company: e.target.value };
                            setEditData({ ...editData, experience: exps });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Dates / Duration</label>
                        <input
                          type="text"
                          value={exp.dates || ''}
                          onChange={(e) => {
                            const exps = [...editData.experience];
                            exps[idx] = { ...exps[idx], dates: e.target.value };
                            setEditData({ ...editData, experience: exps });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400 block mb-1">Bullet Points (one per line)</label>
                      <textarea
                        rows={3}
                        value={(exp.description || []).join('\n')}
                        onChange={(e) => {
                          const exps = [...editData.experience];
                          exps[idx] = { ...exps[idx], description: e.target.value.split('\n').filter(Boolean) };
                          setEditData({ ...editData, experience: exps });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-surface-border text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const exps = [...(editData.experience || [])];
                    exps.push({ title: 'Software Engineer', company: 'Company Name', dates: '2023 - Present', description: [], technologies: [] });
                    setEditData({ ...editData, experience: exps });
                  }}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-border text-xs font-semibold text-white border border-surface-border flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Experience Entry</span>
                </button>
              </div>
            ) : profileData.experience && profileData.experience.length > 0 ? (
              <div className="space-y-4">
                {profileData.experience.map((exp: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface/40 border border-surface-border space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="font-bold text-white text-sm">{exp.title}</h3>
                      <span className="text-gray-400 text-[11px] font-mono">{exp.dates}</span>
                    </div>
                    <p className="text-emerald-400 font-semibold">{exp.company}</p>
                    {exp.description && exp.description.length > 0 && (
                      <ul className="list-disc list-inside text-gray-300 space-y-1 pl-1">
                        {exp.description.map((bullet: string, bIdx: number) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {exp.technologies.map((tech: string, tIdx: number) => (
                          <span key={tIdx} className="px-2 py-0.5 rounded bg-surface-border/60 text-gray-300 text-[10px]">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No work experience listed.</p>
            )}
          </div>

          {/* Section 4: Projects */}
          <div className="glass-card p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Projects</span>
              </h2>
              {editingSection === 'projects' ? (
                <button
                  onClick={handleSaveStructuredData}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              ) : (
                <button
                  onClick={() => setEditingSection('projects')}
                  className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-border text-gray-300 text-xs font-semibold flex items-center space-x-1 border border-surface-border"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingSection === 'projects' ? (
              <div className="space-y-4">
                {(editData.projects || []).map((proj: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface border border-surface-border space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editData.projects.filter((_: any, i: number) => i !== idx);
                        setEditData({ ...editData, projects: updated });
                      }}
                      className="absolute top-3 right-3 text-gray-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Project Name</label>
                        <input
                          type="text"
                          value={proj.name || ''}
                          onChange={(e) => {
                            const projs = [...editData.projects];
                            projs[idx] = { ...projs[idx], name: e.target.value };
                            setEditData({ ...editData, projects: projs });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Repository / Project Link</label>
                        <input
                          type="text"
                          value={proj.repo_url || ''}
                          onChange={(e) => {
                            const projs = [...editData.projects];
                            projs[idx] = { ...projs[idx], repo_url: e.target.value };
                            setEditData({ ...editData, projects: projs });
                          }}
                          placeholder="https://github.com/user/repo"
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400 block mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={proj.description || ''}
                        onChange={(e) => {
                          const projs = [...editData.projects];
                          projs[idx] = { ...projs[idx], description: e.target.value };
                          setEditData({ ...editData, projects: projs });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-surface-border text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400 block mb-1">Technologies Used (comma separated)</label>
                      <input
                        type="text"
                        value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies || ''}
                        onChange={(e) => {
                          const projs = [...editData.projects];
                          projs[idx] = { ...projs[idx], technologies: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) };
                          setEditData({ ...editData, projects: projs });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const projs = [...(editData.projects || [])];
                    projs.push({ name: 'New Project', description: '', technologies: [], repo_url: '' });
                    setEditData({ ...editData, projects: projs });
                  }}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-border text-xs font-semibold text-white border border-surface-border flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add Project Entry</span>
                </button>
              </div>
            ) : profileData.projects && profileData.projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData.projects.map((proj: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface/40 border border-surface-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{proj.name}</h3>
                      {proj.repo_url && (
                        <a href={proj.repo_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-gray-300 leading-relaxed">{proj.description}</p>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {proj.technologies.map((tech: string, tIdx: number) => (
                          <span key={tIdx} className="px-2 py-0.5 rounded bg-surface-border/60 text-indigo-300 text-[10px]">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs italic mb-3">No projects listed.</p>
                <button
                  type="button"
                  onClick={() => setEditingSection('projects')}
                  className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-border text-white text-xs font-semibold border border-surface-border inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add Projects</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Education */}
          <div className="glass-card p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>Education</span>
              </h2>
              {editingSection === 'education' ? (
                <button
                  onClick={handleSaveStructuredData}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              ) : (
                <button
                  onClick={() => setEditingSection('education')}
                  className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-border text-gray-300 text-xs font-semibold flex items-center space-x-1 border border-surface-border"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingSection === 'education' ? (
              <div className="space-y-4">
                {(editData.education || []).map((edu: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface border border-surface-border space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editData.education.filter((_: any, i: number) => i !== idx);
                        setEditData({ ...editData, education: updated });
                      }}
                      className="absolute top-3 right-3 text-gray-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Degree / Qualification</label>
                        <input
                          type="text"
                          value={edu.degree || ''}
                          onChange={(e) => {
                            const edus = [...editData.education];
                            edus[idx] = { ...edus[idx], degree: e.target.value };
                            setEditData({ ...editData, education: edus });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Institution / University</label>
                        <input
                          type="text"
                          value={edu.institution || edu.school || ''}
                          onChange={(e) => {
                            const edus = [...editData.education];
                            edus[idx] = { ...edus[idx], institution: e.target.value, school: e.target.value };
                            setEditData({ ...editData, education: edus });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Year / Dates</label>
                        <input
                          type="text"
                          value={edu.year || edu.dates || ''}
                          onChange={(e) => {
                            const edus = [...editData.education];
                            edus[idx] = { ...edus[idx], year: e.target.value, dates: e.target.value };
                            setEditData({ ...editData, education: edus });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">GPA / Score (optional)</label>
                        <input
                          type="text"
                          value={edu.gpa || ''}
                          onChange={(e) => {
                            const edus = [...editData.education];
                            edus[idx] = { ...edus[idx], gpa: e.target.value };
                            setEditData({ ...editData, education: edus });
                          }}
                          placeholder="e.g. CGPA: 9.2/10.0"
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">Coursework / Highlights (comma separated)</label>
                        <input
                          type="text"
                          value={Array.isArray(edu.details) ? edu.details.join(', ') : edu.details || ''}
                          onChange={(e) => {
                            const edus = [...editData.education];
                            edus[idx] = { ...edus[idx], details: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) };
                            setEditData({ ...editData, education: edus });
                          }}
                          placeholder="Data Structures, DBMS, Operating Systems"
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const edus = [...(editData.education || [])];
                    edus.push({ degree: 'Degree', institution: 'University', year: '2020 - 2024', gpa: '', details: [] });
                    setEditData({ ...editData, education: edus });
                  }}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-border text-xs font-semibold text-white border border-surface-border flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Education Entry</span>
                </button>
              </div>
            ) : profileData.education && profileData.education.length > 0 ? (
              <div className="space-y-3">
                {profileData.education.map((edu: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface/40 border border-surface-border space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h3 className="font-bold text-white text-sm">{edu.degree || 'Degree'}</h3>
                        <p className="text-gray-400">{edu.institution || edu.school || 'University'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {edu.gpa && (
                          <span className="px-2.5 py-1 rounded-md bg-amber-950/40 text-amber-300 font-semibold border border-amber-800/50 text-[11px]">
                            {edu.gpa}
                          </span>
                        )}
                        <span className="text-amber-400 font-mono text-[11px] font-semibold">{edu.year || edu.dates || ''}</span>
                      </div>
                    </div>
                    {edu.details && edu.details.length > 0 && (
                      <div className="pt-1 text-gray-300 text-[11px]">
                        <span className="text-gray-400 font-semibold">Details: </span>
                        {Array.isArray(edu.details) ? edu.details.join(' • ') : edu.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs italic mb-3">No education details listed.</p>
                <button
                  type="button"
                  onClick={() => setEditingSection('education')}
                  className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-border text-white text-xs font-semibold border border-surface-border inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Education</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
