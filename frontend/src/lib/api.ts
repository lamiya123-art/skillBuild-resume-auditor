const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface UserProfile {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider?: string;
  github_username?: string;
  linkedin_url?: string;
  master_resume_text?: string;
  master_profile_data?: any;
  created_at: string;
}


export interface RepoAudit {
  id: number;
  user_id: number;
  github_repo_id: string;
  name: string;
  readiness_score: number;
  flags: string[];
  languages: Record<string, number>;
  audit_details: {
    breakdown: {
      readme_exists_score: number;
      readme_quality_score: number;
      commit_spread_score: number;
      commit_messages_score: number;
      authorship_score: number;
    };
    metrics: {
      word_count: number;
      commit_count: number;
      spread_days: number;
      ownership_pct: number;
    };
    dependencies: string[];
  };
  last_audited_at: string;
}

export interface SkillClaim {
  id: number;
  user_id: number;
  skill_name: string;
  tier: number; // 0, 1, 2, 3
  evidence_repo_id?: number;
  rationale: string;
  created_at: string;
}

export interface JobApplication {
  id: number;
  user_id: number;
  company: string;
  role: string;
  jd_text: string;
  jd_url?: string;
  match_report?: any;
  stage: 'registered' | 'screening' | 'technical' | 'hr' | 'offer' | 'rejected';
  deadline?: string;
  notes?: string;
  created_at: string;
}

export interface ResumeVersion {
  id: number;
  job_application_id: number;
  content: any;
  latex_source: string;
  pdf_url?: string;
  generated_at: string;
}

export interface AntiFabricationAuditLog {
  id: number;
  job_application_id: number;
  rejected_claim: string;
  reason: string;
  attempted_at: string;
}

export interface InterviewQuestion {
  category: 'technical' | 'project' | 'behavioral' | 'gap_defense';
  question: string;
  context: string;
  suggested_talking_points: string[];
}

export interface InterviewPrepOutput {
  application_id: number;
  company: string;
  role: string;
  questions: InterviewQuestion[];
}

export const BACKEND_SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');

export function getAbsolutePdfUrl(urlPath?: string): string {
  if (!urlPath) return '';
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath;
  return `${BACKEND_SERVER_URL}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  const token = typeof window !== 'undefined' ? localStorage.getItem('skillproof_token') : null;
  
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'API request failed' }));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }

    return await response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error(`Unable to connect to SkillProof backend server at ${API_BASE_URL}. Ensure the backend process is running.`);
    }
    throw err;
  }
}

// Authentication API
export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export async function signUpUser(data: { full_name: string; email: string; password: string }): Promise<AuthTokenResponse> {
  return apiFetch<AuthTokenResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthTokenResponse> {
  return apiFetch<AuthTokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function googleAuthUser(data: { id_token: string; email: string; full_name?: string; avatar_url?: string }): Promise<AuthTokenResponse> {
  return apiFetch<AuthTokenResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCurrentUser(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/me');
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
  });
}



// Dev Auth Quick Login & Data Reset
export async function devLogin(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/dev-login', { method: 'POST' });
}

export async function resetDevData(): Promise<{ message: string; user_id: number }> {
  return apiFetch<{ message: string; user_id: number }>('/auth/reset-dev-data', { method: 'POST' });
}

// User Profile
export async function getUserProfile(userId: number): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/profile/${userId}`);
}

export async function uploadMasterProfile(userId: number, resumeText: string, githubUsername?: string, linkedinUrl?: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/profile/upload/${userId}`, {
    method: 'POST',
    body: JSON.stringify({
      resume_text: resumeText,
      github_username: githubUsername,
      linkedin_url: linkedinUrl,
    }),
  });
}

export async function uploadMasterProfileFile(userId: number, file: File, githubUsername?: string, linkedinUrl?: string): Promise<UserProfile> {
  const formData = new FormData();
  formData.append('file', file);
  if (githubUsername) formData.append('github_username', githubUsername);
  if (linkedinUrl) formData.append('linkedin_url', linkedinUrl);

  return apiFetch<UserProfile>(`/profile/upload-file/${userId}`, {
    method: 'POST',
    body: formData,
  });
}

export async function updateUserProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/profile/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Repos
export async function getUserRepos(userId: number): Promise<RepoAudit[]> {
  return apiFetch<RepoAudit[]>(`/repos/${userId}`);
}

export async function fetchGitHubRepos(username: string): Promise<Array<{ github_repo_id: string; name: string; description: string; language: string; stargazers_count: number; updated_at: string; html_url: string }>> {
  return apiFetch<any[]>(`/repos/github-fetch/${username}`);
}

export async function auditRepo(userId: number, repoData: { github_repo_id: string; name: string; readme_content?: string; commit_history?: any[]; dependencies?: string[] }): Promise<RepoAudit> {
  return apiFetch<RepoAudit>(`/repos/audit/${userId}`, {
    method: 'POST',
    body: JSON.stringify(repoData),
  });
}

// Skills
export async function getUserSkills(userId: number): Promise<SkillClaim[]> {
  return apiFetch<SkillClaim[]>(`/skills/${userId}`);
}

export async function classifyUserSkills(userId: number): Promise<SkillClaim[]> {
  return apiFetch<SkillClaim[]>(`/skills/classify/${userId}`, { method: 'POST' });
}

// Applications
export async function getUserApplications(userId: number): Promise<JobApplication[]> {
  return apiFetch<JobApplication[]>(`/applications/${userId}`);
}

export async function createJobApplication(userId: number, data: { company: string; role: string; jd_text: string; jd_url?: string; deadline?: string; notes?: string }): Promise<JobApplication> {
  return apiFetch<JobApplication>(`/applications/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateApplicationStage(applicationId: number, stage: string, notes?: string): Promise<JobApplication> {
  return apiFetch<JobApplication>(`/applications/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ stage, notes }),
  });
}

export async function deleteJobApplication(applicationId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/applications/${applicationId}`, {
    method: 'DELETE',
  });
}

// Resume
export async function generateResume(jobApplicationId: number): Promise<ResumeVersion> {
  return apiFetch<ResumeVersion>('/resume/generate', {
    method: 'POST',
    body: JSON.stringify({ job_application_id: jobApplicationId }),
  });
}

export async function getLatestResumeForApplication(jobApplicationId: number): Promise<ResumeVersion | null> {
  try {
    return await apiFetch<ResumeVersion>(`/resume/application/${jobApplicationId}`);
  } catch (err) {
    return null;
  }
}

export async function getAuditLogs(jobApplicationId: number): Promise<AntiFabricationAuditLog[]> {
  return apiFetch<AntiFabricationAuditLog[]>(`/resume/audit-logs/${jobApplicationId}`);
}


// Interview Prep
export async function getInterviewPrep(applicationId: number): Promise<InterviewPrepOutput> {
  return apiFetch<InterviewPrepOutput>(`/interview-prep/${applicationId}`, {
    method: 'POST',
  });
}

