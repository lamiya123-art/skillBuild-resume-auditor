from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.models import User
from app.schemas.match import MatchReportResponse
from app.schemas.jd import ParsedJDOutput, ParseJDRequest
from app.services.jd_parser import parse_job_description
from app.services.match_engine import generate_match_report

router = APIRouter(prefix="/match", tags=["Match & Gap Analysis"])

class RunMatchRequest(BaseModel):
    company: str
    role: str
    jd_request: ParseJDRequest
    application_id: Optional[int] = None

@router.post("/{user_id}", response_model=MatchReportResponse)
def run_match_analysis(user_id: int, request: RunMatchRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    parsed_jd = parse_job_description(request.jd_request)

    return generate_match_report(
        db=db,
        user=user,
        company=request.company,
        role=request.role,
        parsed_jd=parsed_jd,
        application_id=request.application_id
    )
