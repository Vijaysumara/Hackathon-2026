from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/trips", tags=["trips"])

@router.get("/", response_model=List[schemas.TripOut])
def get_trips(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Trip).all()

@router.post("/", response_model=schemas.TripOut)
def create_trip(
    trip: schemas.TripCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.MANAGER, models.UserRole.DISPATCHER]))
):
    # 1. Validate Vehicle
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if vehicle.status != models.VehicleStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail=f"Vehicle is currently {vehicle.status}")
    
    # 2. Validate Driver
    driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if driver.status != models.DriverStatus.ON_DUTY:
        raise HTTPException(status_code=400, detail=f"Driver level status is {driver.status}")
    if driver.license_expiry < date.today():
        raise HTTPException(status_code=400, detail="Driver license has expired")
    
    # 3. Validate Capacity
    if trip.cargo_weight > vehicle.capacity:
        raise HTTPException(status_code=400, detail=f"Load ({trip.cargo_weight}kg) exceeds vehicle capacity ({vehicle.capacity}kg)")

    # 4. Create Trip
    new_trip = models.Trip(
        **trip.dict(),
        status=models.TripStatus.DISPATCHED # Auto-dispatch for now as per "Successful Dispatch" workflow
    )
    
    # 5. Update Statuses
    vehicle.status = models.VehicleStatus.ON_TRIP
    driver.status = models.DriverStatus.ON_TRIP
    
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip

@router.patch("/{trip_id}/complete", response_model=schemas.TripOut)
def complete_trip(
    trip_id: int,
    final_odometer: float,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status != models.TripStatus.DISPATCHED:
        raise HTTPException(status_code=400, detail="Only dispatched trips can be completed")

    # Update Trip
    trip.status = models.TripStatus.COMPLETED
    trip.completed_at = datetime.utcnow()
    
    # Update Vehicle
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first()
    vehicle.status = models.VehicleStatus.AVAILABLE
    vehicle.odometer = final_odometer
    
    # Update Driver
    driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first()
    driver.status = models.DriverStatus.ON_DUTY # Returns to available pool
    
    db.commit()
    db.refresh(trip)
    return trip

@router.delete("/{trip_id}")
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.MANAGER, models.UserRole.DISPATCHER]))
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if trip.status == models.TripStatus.DISPATCHED:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first()
        driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first()
        if vehicle: vehicle.status = models.VehicleStatus.AVAILABLE
        if driver: driver.status = models.DriverStatus.ON_DUTY
        
    db.delete(trip)
    db.commit()
    return {"detail": "Trip deleted successfully"}


