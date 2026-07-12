from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/drivers", tags=["drivers"])

@router.get("/", response_model=List[schemas.DriverOut])
def get_drivers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Driver).all()

@router.post("/", response_model=schemas.DriverOut)
def create_driver(
    driver: schemas.DriverCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.MANAGER, models.UserRole.ANALYST]))
):
    db_driver = db.query(models.Driver).filter(models.Driver.license_number == driver.license_number).first()
    if db_driver:
        raise HTTPException(status_code=400, detail="Driver with this license number already exists")
    
    new_driver = models.Driver(**driver.dict())
    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)
    return new_driver

@router.get("/{driver_id}", response_model=schemas.DriverOut)
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@router.delete("/{driver_id}")
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_role([models.UserRole.ADMIN]))
):
    db_driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    db.delete(db_driver)
    db.commit()
    return {"detail": "Driver deleted successfully"}
