from fastapi import APIRouter, HTTPException
from app.schemas.jd import ParseJDRequest, ParsedJDOutput
from app.services.jd_parser import parse_job_description

router = APIRouter(prefix="/jd", tags=["Job Description"])

@router.post("/parse", response_model=ParsedJDOutput)
def parse_jd(request: ParseJDRequest):
    try:
        return parse_job_description(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
