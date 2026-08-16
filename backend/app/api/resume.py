from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import ResumeVersion, AntiFabricationAuditLog
from app.schemas.resume import GenerateResumeRequest, ResumeVersionResponse, AuditLogResponse
from app.services.resume_generator import generate_tailored_resume

router = APIRouter(prefix="/resume", tags=["Resume Generator"])

@router.post("/generate", response_model=ResumeVersionResponse)
def generate_resume(request: GenerateResumeRequest, db: Session = Depends(get_db)):
    try:
        return generate_tailored_resume(db, request.job_application_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/audit-logs/{job_application_id}", response_model=List[AuditLogResponse])
def get_audit_logs(job_application_id: int, db: Session = Depends(get_db)):
    return db.query(AntiFabricationAuditLog).filter(
        AntiFabricationAuditLog.job_application_id == job_application_id
    ).all()

@router.get("/application/{job_application_id}", response_model=ResumeVersionResponse)
def get_latest_resume_for_application(job_application_id: int, db: Session = Depends(get_db)):
    resume = db.query(ResumeVersion).filter(
        ResumeVersion.job_application_id == job_application_id
    ).order_by(ResumeVersion.generated_at.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume generated for this application yet.")
    return resume

@router.get("/{resume_id}", response_model=ResumeVersionResponse)
def get_resume_version(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(ResumeVersion).filter(ResumeVersion.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume version not found")
    return resume

