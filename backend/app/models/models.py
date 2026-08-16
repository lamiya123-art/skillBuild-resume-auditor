import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class ApplicationStage(str, enum.Enum):
    REGISTERED = "registered"
    SCREENING = "screening"
    TECHNICAL = "technical"
    HR = "hr"
    OFFER = "offer"
    REJECTED = "rejected"

class SkillTier(int, enum.Enum):
    MENTIONED = 0        # Tier 0: Mentioned only (no project, no coursework link)
    COURSEWORK = 1       # Tier 1: Coursework / self-taught (user-declared)
    USED_IN_PROJECT = 2  # Tier 2: Used within a larger project
    DEDICATED = 3        # Tier 3: Dedicated project / production

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    auth_provider = Column(String, default="email") # "email", "google", "github"
    provider_user_id = Column(String, nullable=True)
    github_username = Column(String, index=True, nullable=True)
    linkedin_url = Column(String, nullable=True)
    master_resume_text = Column(Text, nullable=True)
    master_profile_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


    repos = relationship("Repo", back_populates="user", cascade="all, delete-orphan")
    skills = relationship("SkillClaim", back_populates="user", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")

class Repo(Base):
    __tablename__ = "repos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    github_repo_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    readiness_score = Column(Integer, default=0) # 0 to 100
    flags = Column(JSON, default=list) # List of warning strings
    languages = Column(JSON, default=dict)
    audit_details = Column(JSON, default=dict) # Detailed Breakdown
    last_audited_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="repos")
    skill_claims = relationship("SkillClaim", back_populates="evidence_repo")

class SkillClaim(Base):
    __tablename__ = "skill_claims"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_name = Column(String, index=True, nullable=False)
    tier = Column(Integer, nullable=False, default=0) # 0, 1, 2, 3
    evidence_repo_id = Column(Integer, ForeignKey("repos.id"), nullable=True)
    rationale = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="skills")
    evidence_repo = relationship("Repo", back_populates="skill_claims")

class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company = Column(String, nullable=False)
    role = Column(String, nullable=False)
    jd_text = Column(Text, nullable=False)
    jd_url = Column(String, nullable=True)
    match_report = Column(JSON, nullable=True) # JSON store of requirement match breakdown
    stage = Column(SQLEnum(ApplicationStage), default=ApplicationStage.REGISTERED)
    deadline = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="job_applications")
    resume_versions = relationship("ResumeVersion", back_populates="job_application", cascade="all, delete-orphan")
    audit_logs = relationship("AntiFabricationAuditLog", back_populates="job_application", cascade="all, delete-orphan")

class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id = Column(Integer, primary_key=True, index=True)
    job_application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=False)
    content = Column(JSON, nullable=False) # Structured resume JSON
    latex_source = Column(Text, nullable=False)
    pdf_url = Column(String, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    job_application = relationship("JobApplication", back_populates="resume_versions")

class AntiFabricationAuditLog(Base):
    __tablename__ = "anti_fabrication_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    job_application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=False)
    rejected_claim = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    attempted_at = Column(DateTime, default=datetime.utcnow)

    job_application = relationship("JobApplication", back_populates="audit_logs")
