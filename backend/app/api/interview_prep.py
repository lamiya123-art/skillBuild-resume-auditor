from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.interview_prep_service import generate_interview_prep, InterviewPrepOutput

router = APIRouter(prefix="/interview-prep", tags=["Interview Prep"])

@router.post("/{application_id}", response_model=InterviewPrepOutput)
def get_interview_prep(application_id: int, db: Session = Depends(get_db)):
    try:
        return generate_interview_prep(db, application_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate interview prep: {str(e)}")
