from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/bookings", tags=["bookings"])

# Helper to automatically update booking statuses based on current time
def update_booking_statuses(db: Session):
    now = datetime.now()
    # Update Upcoming -> Ongoing
    upcoming = db.query(models.ResourceBooking).filter(
        models.ResourceBooking.status == models.BookingStatus.UPCOMING,
        models.ResourceBooking.start_time <= now,
        models.ResourceBooking.end_time > now
    ).all()
    for b in upcoming:
        b.status = models.BookingStatus.ONGOING
        
    # Update Ongoing -> Completed
    ongoing = db.query(models.ResourceBooking).filter(
        models.ResourceBooking.status.in_([models.BookingStatus.UPCOMING, models.BookingStatus.ONGOING]),
        models.ResourceBooking.end_time <= now
    ).all()
    for b in ongoing:
        b.status = models.BookingStatus.COMPLETED
        
    db.commit()

@router.get("", response_model=List[schemas.ResourceBookingOut])
def get_bookings(
    asset_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    update_booking_statuses(db)
    q = db.query(models.ResourceBooking)
    if asset_id:
        q = q.filter(models.ResourceBooking.asset_id == asset_id)
        
    # Employee: see all resource bookings (since it's a calendar), but highlight their own in UI.
    return q.all()

@router.post("", response_model=schemas.ResourceBookingOut)
def create_booking(
    req: schemas.ResourceBookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    update_booking_statuses(db)
    
    # Verify asset exists and is shared
    asset = db.query(models.Asset).filter(models.Asset.id == req.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Resource not found")
    if not asset.is_shared:
        raise HTTPException(status_code=400, detail="This asset is not marked as a shared bookable resource")
        
    # Check if user is Employee and is booking on behalf of dept
    # Department Head can book on behalf of department (we can just log booking)
    
    # Overlap Validation
    # Check if there is an overlapping active booking
    # Overlap formula: start1 < end2 AND end1 > start2
    overlapping = db.query(models.ResourceBooking).filter(
        models.ResourceBooking.asset_id == req.asset_id,
        models.ResourceBooking.status != models.BookingStatus.CANCELLED,
        models.ResourceBooking.start_time < req.end_time,
        models.ResourceBooking.end_time > req.start_time
    ).first()
    
    if overlapping:
        formatted_start = overlapping.start_time.strftime("%Y-%m-%d %H:%M")
        formatted_end = overlapping.end_time.strftime("%Y-%m-%d %H:%M")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Time slot overlaps with an existing booking by {overlapping.booked_by.name} from {formatted_start} to {formatted_end}."
        )
        
    new_booking = models.ResourceBooking(
        asset_id=req.asset_id,
        booked_by_id=current_user.id,
        start_time=req.start_time,
        end_time=req.end_time,
        status=models.BookingStatus.UPCOMING,
        created_at=datetime.utcnow()
    )
    
    db.add(new_booking)
    
    # Notification
    notif = models.Notification(
        user_id=current_user.id,
        title="Booking Confirmed",
        message=f"Booking confirmed for {asset.name} on {req.start_time.strftime('%Y-%m-%d %H:%M')}."
    )
    db.add(notif)
    
    # Log Action
    log = models.ActivityLog(
        user_id=current_user.id,
        action="Book Resource",
        details=f"Booked shared resource {asset.asset_tag} from {req.start_time} to {req.end_time}"
    )
    db.add(log)
    
    db.commit()
    db.refresh(new_booking)
    return new_booking

@router.put("/{booking_id}/cancel", response_model=schemas.ResourceBookingOut)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    booking = db.query(models.ResourceBooking).filter(models.ResourceBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Check permissions: owner, asset manager, or admin
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER] and booking.booked_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot cancel another user's booking")
        
    if booking.status in [models.BookingStatus.CANCELLED, models.BookingStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled in its current state")
        
    booking.status = models.BookingStatus.CANCELLED
    
    # Notification
    notif = models.Notification(
        user_id=booking.booked_by_id,
        title="Booking Cancelled",
        message=f"Your booking for {booking.asset.name} has been cancelled."
    )
    db.add(notif)
    
    # Log Action
    log = models.ActivityLog(
        user_id=current_user.id,
        action="Cancel Booking",
        details=f"Cancelled booking #{booking.id} for {booking.asset.asset_tag}"
    )
    db.add(log)
    
    db.commit()
    db.refresh(booking)
    return booking

@router.put("/{booking_id}/reschedule", response_model=schemas.ResourceBookingOut)
def reschedule_booking(
    booking_id: int,
    req: schemas.ResourceBookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    booking = db.query(models.ResourceBooking).filter(models.ResourceBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER] and booking.booked_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot reschedule another user's booking")
        
    if booking.status in [models.BookingStatus.CANCELLED, models.BookingStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="Cannot reschedule a cancelled or completed booking")
        
    # Check overlap (excluding this booking itself)
    overlapping = db.query(models.ResourceBooking).filter(
        models.ResourceBooking.asset_id == req.asset_id,
        models.ResourceBooking.id != booking_id,
        models.ResourceBooking.status != models.BookingStatus.CANCELLED,
        models.ResourceBooking.start_time < req.end_time,
        models.ResourceBooking.end_time > req.start_time
    ).first()
    
    if overlapping:
        formatted_start = overlapping.start_time.strftime("%Y-%m-%d %H:%M")
        formatted_end = overlapping.end_time.strftime("%Y-%m-%d %H:%M")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"New time slot overlaps with an existing booking by {overlapping.booked_by.name} from {formatted_start} to {formatted_end}."
        )
        
    booking.start_time = req.start_time
    booking.end_time = req.end_time
    booking.status = models.BookingStatus.UPCOMING # Reverts to upcoming if rescheduled
    
    # Notification
    notif = models.Notification(
        user_id=booking.booked_by_id,
        title="Booking Rescheduled",
        message=f"Your booking for {booking.asset.name} has been rescheduled to {req.start_time.strftime('%Y-%m-%d %H:%M')}."
    )
    db.add(notif)
    
    # Log Action
    log = models.ActivityLog(
        user_id=current_user.id,
        action="Reschedule Booking",
        details=f"Rescheduled booking #{booking.id} for {booking.asset.asset_tag} to {req.start_time} - {req.end_time}"
    )
    db.add(log)
    
    db.commit()
    db.refresh(booking)
    return booking
