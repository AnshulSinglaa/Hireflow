from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.limiter import rate_limit

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
@rate_limit("30/minute")
def get_notifications(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(50).all()
    return notifications


@router.patch("/{notification_id}/read")
@rate_limit("30/minute")
def mark_as_read(
    request: Request,
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.patch("/read-all")
@rate_limit("10/minute")
def mark_all_read(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/unread-count")
@rate_limit("60/minute")
def get_unread_count(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()
    return {"unread_count": count}
