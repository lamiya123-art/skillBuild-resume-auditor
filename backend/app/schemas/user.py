from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class ExperienceItem(BaseModel):
    title: str
    company: str
    dates: str
    description: List[str]
    technologies: List[str]

class ProjectItem(BaseModel):
    name: str
    description: str
    technologies: List[str]
    repo_url: Optional[str] = None

class ProfileData(BaseModel):
    name: str
    email: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = []
    experience: List[ExperienceItem] = []
    projects: List[ProjectItem] = []
    education: List[Dict[str, Any]] = []

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    auth_provider: Optional[str] = "email"
    github_username: Optional[str] = None
    linkedin_url: Optional[str] = None

class UserCreate(UserBase):
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    master_resume_text: Optional[str] = None
    master_profile_data: Optional[ProfileData] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SignUpRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class GoogleAuthRequest(BaseModel):
    id_token: str
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProfileUploadRequest(BaseModel):
    resume_text: str
    linkedin_url: Optional[str] = None
    github_username: Optional[str] = None

