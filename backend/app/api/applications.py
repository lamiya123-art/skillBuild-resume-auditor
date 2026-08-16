from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import User, JobApplication
from app.schemas.application import JobApplicationCreate, JobApplicationUpdate, JobApplicationResponse
from app.schemas.jd import ParseJDRequest
from app.services.jd_parser import parse_job_description
from app.services.match_engine import generate_match_report

router = APIRouter(prefix="/applications", tags=["Applications Tracker"])

@router.get("/{user_id}", response_model=List[JobApplicationResponse])
def get_user_applications(user_id: int, db: Session = Depends(get_db)):
    return db.query(JobApplication).order_by(JobApplication.created_at.desc()).filter(JobApplication.user_id == user_id).all()

@router.post("/{user_id}", response_model=JobApplicationResponse)
def create_application(user_id: int, request: JobApplicationCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate initial JD match report
    jd_req = ParseJDRequest(jd_text=request.jd_text, jd_url=request.jd_url, role_title=request.role, company_name=request.company)
    parsed_jd = parse_job_description(jd_req)

    match_report_res = generate_match_report(
        db=db,
        user=user,
        company=request.company,
        role=request.role,
        parsed_jd=parsed_jd
    )

    app_entry = JobApplication(
        user_id=user_id,
        company=request.company,
        role=request.role,
        jd_text=request.jd_text,
        jd_url=request.jd_url,
        match_report=match_report_res.model_dump(),
        deadline=request.deadline,
        notes=request.notes
    )

    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)
    return app_entry

@router.patch("/{application_id}", response_model=JobApplicationResponse)
def update_application_status(application_id: int, request: JobApplicationUpdate, db: Session = Depends(get_db)):
    app_entry = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app_entry:
        raise HTTPException(status_code=404, detail="Job application not found")

    if request.stage is not None:
        app_entry.stage = request.stage
    if request.deadline is not None:
        app_entry.deadline = request.deadline
    if request.notes is not None:
        app_entry.notes = request.notes

    db.commit()
    db.refresh(app_entry)
    return app_entry

@router.delete("/{application_id}")
def delete_application(application_id: int, db: Session = Depends(get_db)):
    app_entry = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app_entry:
        raise HTTPException(status_code=404, detail="Job application not found")
    db.delete(app_entry)
    db.commit()
    return {"message": "Job application deleted successfully"}
