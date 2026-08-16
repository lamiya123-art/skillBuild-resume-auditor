# SkillProof — Skill Depth Auditor

> A resume and job-application tool that tells you the truth about your own skills before an interviewer does.

SkillProof is differentiated from generic resume matchers by three core features:
1. **Tiered Honesty (Skill Depth Classification)**: Classifies every skill into evidence depth tiers (Tier 0: Mentioned, Tier 1: Coursework, Tier 2: Used in project, Tier 3: Dedicated project) using structured LLM function calling.
2. **Repo Readiness Audit Engine**: Audits linked GitHub repositories for interview durability (Interview Readiness Score 0–100) based on non-boilerplate README quality, commit spread over time, author contribution %, and tech stack verification *before* a repo is used as resume evidence.
3. **Multi-Company Application Tracker & Anti-Fabrication Guardrail**: Tracks simultaneous job applications across interview stages with ground-truth match scores, ATS-safe LaTeX resumes, and a 2nd-pass anti-fabrication validator that logs and rejects unsubstantiated claims.

---

## Deliverable Structure

```
Skill-depth-auditor/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py            # FastAPI main entrypoint & routes
│   │   ├── core/              # Config, DB, & LLM Provider (Gemini + Groq + Mock)
│   │   ├── models/            # SQLAlchemy DB models (User, Repo, SkillClaim, JobApp, Resume)
│   │   ├── schemas/           # Pydantic schemas & LLM function-call definitions
│   │   ├── services/          # Repo audit, Skill classifier, JD parser, Anti-Fabrication generator
│   │   └── api/               # FastAPI routers (auth, profile, repos, skills, jd, match, resume, apps)
│   └── tests/                 # Pytest test suite (Repo audit, classifier, anti-fabrication)
└── frontend/                  # Next.js 14 App Router application
    ├── src/
    │   ├── app/               # Dashboard, Repos, Skills, Profile, & Application details pages
    │   ├── components/        # Readiness Score Gauge, Skill Tier Badges, Navbar
    │   └── lib/               # FastAPI Client Service Layer
    └── tailwind.config.ts     # Sleek dark theme configuration
```

---

## Getting Started & Local Setup

### Option 1: Running with Docker Compose (Recommended)
```bash
# Clone the repository
git clone https://github.com/your-username/Skill-depth-auditor.git
cd Skill-depth-auditor

# Set environment variables in .env (Optional: Gemini / Groq API Keys)
# GEMINI_API_KEY=your_key
# GROQ_API_KEY=your_key

# Launch Backend & PostgreSQL database
docker-compose up --build
```
The FastAPI backend will be available at `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs`.

### Option 2: Local Development Setup

#### Backend (Python FastAPI):
```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

#### Frontend (Next.js):
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Running the Pytest Suite

The backend includes a comprehensive pytest suite covering the repository readiness heuristics, function-calling schema validation, anti-fabrication claim rejection, and match engine logic:

```bash
cd backend
python -m pytest tests/ -v
```

### Test Coverage Highlights:
- `test_repo_audit.py`: Tests 5 distinct repo fixtures (well-documented project, unmodified boilerplate template, bulk single commit, low ownership % fork, and generic commit messages).
- `test_skill_classifier.py`: Validates Pydantic schema enforcement on LLM function calls.
- `test_anti_fabrication.py`: Asserts that unevidenced Tier 0/1 skills or hallucinated 10x metrics claimed as production experience are intercepted and logged to `AntiFabricationAuditLog`.
- `test_match_engine.py`: Verifies JD requirement cross-referencing into strong matches, weak matches, and gaps.

---

## Key API Endpoints

- `POST /api/auth/dev-login`: Quick developer authentication.
- `POST /api/profile/upload/{user_id}`: Parse master resume text into structured profile JSON.
- `POST /api/repos/audit/{user_id}`: Run readiness score audit on a GitHub repository.
- `POST /api/skills/classify/{user_id}`: Classify skills into Tiers 0–3 using LLM function calling.
- `POST /api/jd/parse`: Extract required, preferred, and nice-to-have skills from JD text or URL.
- `POST /api/match/{user_id}`: Generate ground-truth match & gap report with honest coaching summary.
- `POST /api/resume/generate`: Generate tailored ATS LaTeX resume with 2nd-pass anti-fabrication verification.
- `GET /api/resume/audit-logs/{job_application_id}`: Inspect intercepted hallucination attempts.
