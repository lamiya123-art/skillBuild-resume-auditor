from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import User, SkillClaim
from app.schemas.skill import SkillClaimResponse, ClassifySkillsResponse
from app.services.skill_classifier import classify_user_skills

router = APIRouter(prefix="/skills", tags=["Skills"])

@router.get("/{user_id}", response_model=List[SkillClaimResponse])
def get_user_skill_claims(user_id: int, db: Session = Depends(get_db)):
    claims = db.query(SkillClaim).filter(SkillClaim.user_id == user_id).all()
    if not claims or len(claims) == 0:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.master_profile_data:
            claims = classify_user_skills(db, user)
    return claims

@router.post("/classify/{user_id}", response_model=List[SkillClaimResponse])
def classify_skills(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return classify_user_skills(db, user)
