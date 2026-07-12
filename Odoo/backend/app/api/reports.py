from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any
from ..db.session import get_db
from ..models import models
from .deps import get_current_user, check_role

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Total counts for KPI Cards
    assets_avail = db.query(models.Asset).filter(models.Asset.status == models.AssetStatus.AVAILABLE).count()
    assets_allocated = db.query(models.Asset).filter(models.Asset.status == models.AssetStatus.ALLOCATED).count()
    
    # Maintenance today (active repair jobs)
    maint_today = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.status.in_([
            models.MaintenanceStatus.PENDING,
            models.MaintenanceStatus.APPROVED,
            models.MaintenanceStatus.IN_PROGRESS
        ])
    ).count()
    
    # Active bookings (resource bookings ongoing right now)
    now = datetime.now()
    active_bookings = db.query(models.ResourceBooking).filter(
        models.ResourceBooking.status == models.BookingStatus.ONGOING
    ).count()
    
    # Pending transfer requests
    pending_transfers = db.query(models.TransferRequest).filter(
        models.TransferRequest.status == models.TransferStatus.PENDING
    ).count()
    
    # Overdue return allocations
    overdue_returns = db.query(models.AssetAllocation).filter(
        models.AssetAllocation.status == "Overdue"
    ).count()
    
    # Total assets
    total_assets = db.query(models.Asset).count()
    
    return {
        "assets_available": assets_avail,
        "assets_allocated": assets_allocated,
        "maintenance_today": maint_today,
        "active_bookings": active_bookings,
        "pending_transfers": pending_transfers,
        "overdue_returns": overdue_returns,
        "total_assets": total_assets
    }

@router.get("/utilization")
def get_utilization_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Group assets by status
    status_counts = db.query(models.Asset.status, func.count(models.Asset.id)).group_by(models.Asset.status).all()
    status_distribution = {status.value: count for status, count in status_counts}
    
    # Get most utilized assets (based on allocation count)
    most_allocated = db.query(
        models.Asset.name,
        models.Asset.asset_tag,
        func.count(models.AssetAllocation.id).label("alloc_count")
    ).join(models.AssetAllocation, isouter=True).group_by(models.Asset.id).order_by(func.count(models.AssetAllocation.id).desc()).limit(5).all()
    
    most_allocated_list = [{"name": name, "tag": tag, "allocations": count} for name, tag, count in most_allocated]

    return {
        "status_distribution": status_distribution,
        "most_utilized_assets": most_allocated_list
    }

@router.get("/maintenance-frequency")
def get_maintenance_frequency(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Group maintenance by category
    maint_by_cat = db.query(
        models.AssetCategory.name,
        func.count(models.MaintenanceRequest.id)
    ).select_from(models.MaintenanceRequest)\
     .join(models.Asset)\
     .join(models.AssetCategory)\
     .group_by(models.AssetCategory.id).all()
     
    cat_maint = [{"category": cat_name, "requests": count} for cat_name, count in maint_by_cat]
    
    # Group maintenance by asset condition
    maint_by_condition = db.query(
        models.Asset.condition,
        func.count(models.MaintenanceRequest.id)
    ).select_from(models.MaintenanceRequest)\
     .join(models.Asset)\
     .group_by(models.Asset.condition).all()
     
    condition_maint = {condition.value: count for condition, count in maint_by_condition}
    
    return {
        "by_category": cat_maint,
        "by_condition": condition_maint
    }

@router.get("/department-summary")
def get_department_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Count of active allocations per department
    dept_allocs = db.query(
        models.Department.name,
        func.count(models.AssetAllocation.id)
    ).select_from(models.AssetAllocation)\
     .join(models.Department, models.AssetAllocation.allocated_to_dept_id == models.Department.id)\
     .filter(models.AssetAllocation.status.in_(["Active", "Overdue"]))\
     .group_by(models.Department.id).all()
     
    dept_alloc_list = [{"department": name, "allocated_assets": count} for name, count in dept_allocs]
    
    # Also get counts where individual employees of departments hold assets
    employee_allocs = db.query(
        models.Department.name,
        func.count(models.AssetAllocation.id)
    ).select_from(models.AssetAllocation)\
     .join(models.User, models.AssetAllocation.allocated_to_id == models.User.id)\
     .join(models.Department, models.User.department_id == models.Department.id)\
     .filter(models.AssetAllocation.status.in_(["Active", "Overdue"]))\
     .group_by(models.Department.id).all()
     
    emp_alloc_dict = {name: count for name, count in employee_allocs}
    
    # Combine results
    combined = {}
    for item in dept_alloc_list:
        combined[item["department"]] = item["allocated_assets"]
    for dept_name, count in emp_alloc_dict.items():
        combined[dept_name] = combined.get(dept_name, 0) + count
        
    final_list = [{"department": name, "allocated_assets": count} for name, count in combined.items()]
    return final_list

@router.get("/booking-heatmap")
def get_booking_heatmap(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Calculate booking hour distribution to find peak windows
    # Since SQLite handles dates/times as strings, we parse them in python or use strftime
    # We can fetch booking start times and count by hour of the day
    bookings = db.query(models.ResourceBooking.start_time).filter(
        models.ResourceBooking.status != models.BookingStatus.CANCELLED
    ).all()
    
    hour_counts = {hour: 0 for hour in range(8, 19)} # Business hours 8:00 to 18:00
    for (start_time,) in bookings:
        hour = start_time.hour
        if hour in hour_counts:
            hour_counts[hour] += 1
            
    heatmap = [{"hour": f"{hour}:00", "bookings": count} for hour, count in hour_counts.items()]
    return heatmap
