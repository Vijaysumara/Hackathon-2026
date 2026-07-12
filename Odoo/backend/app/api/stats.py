from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db.session import get_db
from ..models import models
from .deps import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/dashboard-kpis")
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    total_vehicles = db.query(models.Vehicle).count()
    active_fleet = db.query(models.Vehicle).filter(models.Vehicle.status == models.VehicleStatus.ON_TRIP).count()
    maintenance_alerts = db.query(models.Vehicle).filter(models.Vehicle.status == models.VehicleStatus.IN_SHOP).count()
    
    # Utilization Rate (percentage of fleet assigned vs total)
    utilization_rate = (active_fleet / total_vehicles * 100) if total_vehicles > 0 else 0
    
    # Pending Cargo (e.g., Draft trips)
    pending_cargo = db.query(models.Trip).filter(models.Trip.status == models.TripStatus.DRAFT).count()
    
    return {
        "active_fleet": active_fleet,
        "maintenance_alerts": maintenance_alerts,
        "utilization_rate": round(utilization_rate, 1),
        "pending_cargo": pending_cargo,
        "total_vehicles": total_vehicles
    }

@router.get("/analytics-data")
def get_analytics_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Sector density could be count of vehicles by type
    sectors = db.query(models.Vehicle.vehicle_type, func.count(models.Vehicle.id)).group_by(models.Vehicle.vehicle_type).all()
    sector_data = [{"name": str(s[0].value), "value": s[1]} for s in sectors]
    
    # Efficiency data can still be mock since we don't have time series telemetry, but let's pass it from backend
    efficiency_data = [
        { "name": 'Mon', "efficiency": 82, "load": 45 },
        { "name": 'Tue', "efficiency": 88, "load": 52 },
        { "name": 'Wed', "efficiency": 94, "load": 61 },
        { "name": 'Thu', "efficiency": 91, "load": 58 },
        { "name": 'Fri', "efficiency": 96, "load": 72 },
        { "name": 'Sat', "efficiency": 89, "load": 48 },
        { "name": 'Sun', "efficiency": 85, "load": 40 },
    ]
    
    return {
        "sectorData": sector_data,
        "efficiencyData": efficiency_data
    }

