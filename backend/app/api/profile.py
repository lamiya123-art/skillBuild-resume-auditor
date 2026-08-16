import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.schemas.user import UserResponse, ProfileUploadRequest, ProfileData
from app.core.llm_provider import llm_provider

from app.services.resume_parser import extract_and_validate_resume, validate_llm_profile_output, parse_resume_text_to_profile

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/{user_id}", response_model=UserResponse)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.master_resume_text:
        parsed = parse_resume_text_to_profile(user.master_resume_text)

        # Auto-fill user github_username and linkedin_url if extracted from resume
        if parsed.get("github_username") and not user.github_username:
            user.github_username = parsed["github_username"]
        if parsed.get("linkedin_url") and not user.linkedin_url:
            user.linkedin_url = parsed["linkedin_url"]

        if user.github_username:
            parsed["github_username"] = user.github_username
        if user.linkedin_url:
            parsed["linkedin_url"] = user.linkedin_url

        user.master_profile_data = parsed
        db.commit()
        db.refresh(user)

    return user

@router.post("/upload-file/{user_id}", response_model=UserResponse)
async def upload_resume_file(
    user_id: int,
    file: UploadFile = File(...),
    github_username: Optional[str] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    original_filename = file.filename or "resume.pdf"
    filename_lower = original_filename.lower()
    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".docx") or filename_lower.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, DOCX, and TXT files are supported.")

    contents = await file.read()
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"UPLOAD RECEIVE | USER: {user_id} | FILENAME: {original_filename} | CONTENT_TYPE: {file.content_type} | BYTES: {len(contents)}")

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")

    # 1. Run multi-stage extraction and text quality validation asynchronously in threadpool
    import asyncio
    extraction = await asyncio.to_thread(extract_and_validate_resume, contents, original_filename)

    if extraction.quality.status != "PASS":
        warning_msg = extraction.quality.warnings[0] if extraction.quality.warnings else "Text extraction quality failed."
        raise HTTPException(
            status_code=400,
            detail=f"Resume extraction failed ({extraction.quality.status}): {warning_msg}"
        )

    # 2. Parse Profile from text
    parsed_auto = parse_resume_text_to_profile(extraction.normalized_text)

    # 3. Post-LLM Anti-Hallucination Verification
    verified_dict, confidence_score = validate_llm_profile_output(parsed_auto, extraction.normalized_text)

    # Auto-fill Github and Linkedin
    final_github = github_username or parsed_auto.get("github_username") or user.github_username
    final_linkedin = linkedin_url or parsed_auto.get("linkedin_url") or user.linkedin_url

    if final_github:
        verified_dict["github_username"] = final_github
    if final_linkedin:
        verified_dict["linkedin_url"] = final_linkedin

    # Attach diagnostics for frontend debugging view
    verified_dict["_extraction_diagnostics"] = {
        "filename": original_filename,
        "extraction_method": extraction.extraction_method,
        "character_count": extraction.character_count,
        "quality_score": extraction.quality.score,
        "quality_status": extraction.quality.status,
        "quality_warnings": extraction.quality.warnings,
        "parse_confidence_score": confidence_score,
        "normalized_text": extraction.normalized_text
    }

    # 4. Transaction Safety: Only persist if all steps succeed
    try:
        user.master_resume_text = extraction.normalized_text
        user.master_profile_data = verified_dict
        if final_github:
            user.github_username = final_github
        if final_linkedin:
            user.linkedin_url = final_linkedin

        db.commit()
        db.refresh(user)
        return user
    except Exception as save_err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {str(save_err)}")


@router.post("/upload/{user_id}", response_model=UserResponse)
def upload_master_profile(user_id: int, request: ProfileUploadRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    parsed_auto = parse_resume_text_to_profile(request.resume_text)
    final_github = request.github_username or parsed_auto.get("github_username") or user.github_username
    final_linkedin = request.linkedin_url or parsed_auto.get("linkedin_url") or user.linkedin_url

    if final_github:
        parsed_auto["github_username"] = final_github
    if final_linkedin:
        parsed_auto["linkedin_url"] = final_linkedin

    try:
        user.master_resume_text = request.resume_text
        user.master_profile_data = parsed_auto
        if final_github:
            user.github_username = final_github
        if final_linkedin:
            user.linkedin_url = final_linkedin

        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse master profile: {str(e)}")

@router.patch("/{user_id}", response_model=UserResponse)
def update_user_profile(user_id: int, profile_data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "github_username" in profile_data:
        user.github_username = profile_data["github_username"]
    if "linkedin_url" in profile_data:
        user.linkedin_url = profile_data["linkedin_url"]
    if "master_profile_data" in profile_data:
        user.master_profile_data = profile_data["master_profile_data"]

    db.commit()
    db.refresh(user)
    return user

