from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/fuel", tags=["fuel"])

@router.get("/", response_model=List[schemas.FuelLogOut])
def get_fuel_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.FuelLog).all()

@router.post("/", response_model=schemas.FuelLogOut)
def create_fuel_log(
    log: schemas.FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Validate Vehicle
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == log.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # 2. Create Log
    new_log = models.FuelLog(**log.dict())
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

@router.delete("/{log_id}")
def delete_fuel_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.MANAGER]))
):
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Fuel log not found")
    
    db.delete(log)
    db.commit()
    return {"detail": "Fuel log deleted successfully"}

