from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/assets", tags=["assets"])

# ----------------- ASSETS -----------------

@router.get("", response_model=List[schemas.AssetOut])
def get_assets(
    query: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[models.AssetStatus] = None,
    is_shared: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.Asset)
    
    if category_id:
        q = q.filter(models.Asset.category_id == category_id)
    if status:
        q = q.filter(models.Asset.status == status)
    if is_shared is not None:
        q = q.filter(models.Asset.is_shared == is_shared)
        
    if query:
        # Search in name, asset_tag, serial_number, location
        search_filter = (
            models.Asset.name.ilike(f"%{query}%") |
            models.Asset.asset_tag.ilike(f"%{query}%") |
            models.Asset.serial_number.ilike(f"%{query}%") |
            models.Asset.location.ilike(f"%{query}%")
        )
        q = q.filter(search_filter)
        
    return q.all()

@router.get("/{asset_id}", response_model=schemas.AssetOut)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.post("", response_model=schemas.AssetOut)
def register_asset(
    asset_data: schemas.AssetCreate,
    db: Session = Depends(get_db),
    manager_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    # Verify category
    cat = db.query(models.AssetCategory).filter(models.AssetCategory.id == asset_data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Asset category not found")
        
    # Check if serial number already exists
    existing = db.query(models.Asset).filter(models.Asset.serial_number == asset_data.serial_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset with this serial number already exists")
        
    # Generate asset tag if not provided
    tag = asset_data.asset_tag
    if not tag:
        # Simple auto-increment tag e.g. AF-0001
        last_asset = db.query(models.Asset).order_by(models.Asset.id.desc()).first()
        next_id = (last_asset.id + 1) if last_asset else 1
        tag = f"AF-{next_id:04d}"
        
    db_asset = models.Asset(
        name=asset_data.name,
        category_id=asset_data.category_id,
        asset_tag=tag,
        serial_number=asset_data.serial_number,
        acquisition_date=asset_data.acquisition_date,
        acquisition_cost=asset_data.acquisition_cost,
        condition=asset_data.condition,
        location=asset_data.location,
        image_url=asset_data.image_url,
        document_url=asset_data.document_url,
        is_shared=asset_data.is_shared,
        status=models.AssetStatus.AVAILABLE # Enforced Available status initially
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    # Log action
    log = models.ActivityLog(
        user_id=manager_user.id,
        action="Register Asset",
        details=f"Registered asset {db_asset.name} ({db_asset.asset_tag})"
    )
    db.add(log)
    db.commit()
    
    return db_asset

@router.put("/{asset_id}", response_model=schemas.AssetOut)
def update_asset(
    asset_id: int,
    asset_data: schemas.AssetUpdate,
    db: Session = Depends(get_db),
    manager_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    if asset_data.category_id:
        cat = db.query(models.AssetCategory).filter(models.AssetCategory.id == asset_data.category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Asset category not found")
        db_asset.category_id = asset_data.category_id
        
    # Update fields if provided
    if asset_data.name:
        db_asset.name = asset_data.name
    if asset_data.serial_number:
        existing = db.query(models.Asset).filter(
            models.Asset.serial_number == asset_data.serial_number,
            models.Asset.id != asset_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Serial number already in use")
        db_asset.serial_number = asset_data.serial_number
    if asset_data.acquisition_date:
        db_asset.acquisition_date = asset_data.acquisition_date
    if asset_data.acquisition_cost is not None:
        db_asset.acquisition_cost = asset_data.acquisition_cost
    if asset_data.condition:
        db_asset.condition = asset_data.condition
    if asset_data.location:
        db_asset.location = asset_data.location
    if asset_data.image_url:
        db_asset.image_url = asset_data.image_url
    if asset_data.document_url:
        db_asset.document_url = asset_data.document_url
    if asset_data.is_shared is not None:
        db_asset.is_shared = asset_data.is_shared
    if asset_data.status:
        db_asset.status = asset_data.status
        
    db.commit()
    db.refresh(db_asset)
    
    # Log action
    log = models.ActivityLog(
        user_id=manager_user.id,
        action="Update Asset",
        details=f"Updated asset {db_asset.asset_tag} details/status ({db_asset.status.value})"
    )
    db.add(log)
    db.commit()
    
    return db_asset

# ----------------- ASSET HISTORY -----------------

@router.get("/{asset_id}/history")
def get_asset_history(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Get allocation history
    allocations = db.query(models.AssetAllocation).filter(models.AssetAllocation.asset_id == asset_id).order_by(models.AssetAllocation.allocation_date.desc()).all()
    alloc_history = []
    for a in allocations:
        target = f"Dept: {a.allocated_to_dept.name}" if a.allocated_to_dept_id else f"Employee: {a.allocated_to.name}"
        alloc_history.append({
            "id": a.id,
            "type": "Allocation",
            "target": target,
            "allocated_by": a.allocated_by_id,
            "allocation_date": a.allocation_date,
            "expected_return_date": a.expected_return_date,
            "actual_return_date": a.actual_return_date,
            "return_notes": a.return_condition_notes,
            "status": a.status
        })
        
    # Get maintenance history
    maintenance = db.query(models.MaintenanceRequest).filter(models.MaintenanceRequest.asset_id == asset_id).order_by(models.MaintenanceRequest.created_at.desc()).all()
    maint_history = []
    for m in maintenance:
        maint_history.append({
            "id": m.id,
            "type": "Maintenance",
            "description": m.description,
            "priority": m.priority.value,
            "status": m.status.value,
            "technician": m.assigned_technician,
            "created_at": m.created_at,
            "resolved_at": m.resolved_at
        })
        
    return {
        "asset_id": asset_id,
        "name": asset.name,
        "tag": asset.asset_tag,
        "status": asset.status.value,
        "allocations": alloc_history,
        "maintenance": maint_history
    }
