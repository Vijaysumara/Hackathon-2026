from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[schemas.NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Only return notifications for the logged in user
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()

@router.put("/{notif_id}/read", response_model=schemas.NotificationOut)
def mark_as_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    unread = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).all()
    for n in unread:
        n.is_read = True
    db.commit()
    return {"message": "All notifications marked as read."}

@router.get("/logs", response_model=List[schemas.ActivityLogOut])
def get_activity_logs(
    db: Session = Depends(get_db),
    # Only Admins and Asset Managers can view the full audit logs
    current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    return db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc()).all()
