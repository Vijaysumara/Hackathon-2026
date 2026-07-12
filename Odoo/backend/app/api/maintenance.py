from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

@router.get("", response_model=List[schemas.MaintenanceRequestOut])
def get_maintenance_requests(
    status: Optional[models.MaintenanceStatus] = None,
    priority: Optional[models.MaintenancePriority] = None,
    asset_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.MaintenanceRequest)
    if status:
        q = q.filter(models.MaintenanceRequest.status == status)
    if priority:
        q = q.filter(models.MaintenanceRequest.priority == priority)
    if asset_id:
        q = q.filter(models.MaintenanceRequest.asset_id == asset_id)
        
    # Employee: only show requests they raised, unless they are admin/manager
    if current_user.role == models.UserRole.EMPLOYEE:
        q = q.filter(models.MaintenanceRequest.raised_by_id == current_user.id)
    elif current_user.role == models.UserRole.DEPARTMENT_HEAD:
        # Show requests from their department
        q = q.filter(
            (models.MaintenanceRequest.raised_by_id == current_user.id) |
            (models.MaintenanceRequest.raised_by_id.in_(
                db.query(models.User.id).filter(models.User.department_id == current_user.department_id)
            ))
        )
        
    return q.all()

@router.post("", response_model=schemas.MaintenanceRequestOut)
def raise_maintenance_request(
    req: schemas.MaintenanceRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(models.Asset).filter(models.Asset.id == req.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    db_req = models.MaintenanceRequest(
        asset_id=req.asset_id,
        raised_by_id=current_user.id,
        description=req.description,
        priority=req.priority,
        photo_url=req.photo_url,
        status=models.MaintenanceStatus.PENDING,
        created_at=datetime.utcnow()
    )
    db.add(db_req)
    
    # Notify managers
    managers = db.query(models.User).filter(models.User.role.in_([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER])).all()
    for mgr in managers:
        notif = models.Notification(
            user_id=mgr.id,
            title="Maintenance Raised",
            message=f"Maintenance request raised for asset {asset.name} ({asset.asset_tag}) by {current_user.name}."
        )
        db.add(notif)
        
    # Log Action
    log = models.ActivityLog(
        user_id=current_user.id,
        action="Raise Maintenance Request",
        details=f"Raised maintenance request for asset {asset.asset_tag} (Priority: {req.priority.value})"
    )
    db.add(log)
    
    db.commit()
    db.refresh(db_req)
    return db_req

@router.put("/{request_id}/approve", response_model=schemas.MaintenanceRequestOut)
def approve_maintenance_request(
    request_id: int,
    db: Session = Depends(get_db),
    manager_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    db_req = db.query(models.MaintenanceRequest).filter(models.MaintenanceRequest.id == request_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    if db_req.status != models.MaintenanceStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is already approved or rejected")
        
    db_req.status = models.MaintenanceStatus.APPROVED
    
    # Flip asset status to Under Maintenance
    db_req.asset.status = models.AssetStatus.UNDER_MAINTENANCE
    
    # Notify requesting user
    notif = models.Notification(
        user_id=db_req.raised_by_id,
        title="Maintenance Approved",
        message=f"Your maintenance request for asset {db_req.asset.name} has been approved. The asset status is now Under Maintenance."
    )
    db.add(notif)
    
    # Log Action
    log = models.ActivityLog(
        user_id=manager_user.id,
        action="Approve Maintenance Request",
        details=f"Approved maintenance for asset {db_req.asset.asset_tag}. Status set to Under Maintenance."
    )
    db.add(log)
    
    db.commit()
    db.refresh(db_req)
    return db_req

@router.put("/{request_id}/reject", response_model=schemas.MaintenanceRequestOut)
def reject_maintenance_request(
    request_id: int,
    db: Session = Depends(get_db),
    manager_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    db_req = db.query(models.MaintenanceRequest).filter(models.MaintenanceRequest.id == request_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    if db_req.status != models.MaintenanceStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is already resolved")
        
    db_req.status = models.MaintenanceStatus.REJECTED
    
    # Notify requesting user
    notif = models.Notification(
        user_id=db_req.raised_by_id,
        title="Maintenance Rejected",
        message=f"Your maintenance request for asset {db_req.asset.name} was rejected."
    )
    db.add(notif)
    
    # Log Action
    log = models.ActivityLog(
        user_id=manager_user.id,
        action="Reject Maintenance Request",
        details=f"Rejected maintenance for asset {db_req.asset.asset_tag}"
    )
    db.add(log)
    
    db.commit()
    db.refresh(db_req)
    return db_req

@router.put("/{request_id}/assign", response_model=schemas.MaintenanceRequestOut)
def assign_technician(
    request_id: int,
    data: dict,
    db: Session = Depends(get_db),
    manager_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    db_req = db.query(models.MaintenanceRequest).filter(models.MaintenanceRequest.id == request_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    if db_req.status not in [models.MaintenanceStatus.APPROVED, models.MaintenanceStatus.TECHNICIAN_ASSIGNED, models.MaintenanceStatus.IN_PROGRESS]:
        raise HTTPException(status_code=400, detail="Cannot assign technician in this state")
        
    technician = data.get("technician")
    if not technician:
        raise HTTPException(status_code=400, detail="Technician name is required")
        
    db_req.assigned_technician = technician
    db_req.status = models.MaintenanceStatus.IN_PROGRESS
    
    # Log Action
    log = models.ActivityLog(
        user_id=manager_user.id,
        action="Assign Technician",
        details=f"Assigned technician '{technician}' to maintenance request #{db_req.id} for asset {db_req.asset.asset_tag}"
    )
    db.add(log)
    
    db.commit()
    db.refresh(db_req)
    return db_req

@router.put("/{request_id}/resolve", response_model=schemas.MaintenanceRequestOut)
def resolve_maintenance_request(
    request_id: int,
    db: Session = Depends(get_db),
    manager_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    db_req = db.query(models.MaintenanceRequest).filter(models.MaintenanceRequest.id == request_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    if db_req.status == models.MaintenanceStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Request is already resolved")
        
    db_req.status = models.MaintenanceStatus.RESOLVED
    db_req.resolved_at = datetime.utcnow()
    
    # Revert asset status back to Available
    db_req.asset.status = models.AssetStatus.AVAILABLE
    
    # Notify requesting user
    notif = models.Notification(
        user_id=db_req.raised_by_id,
        title="Maintenance Resolved",
        message=f"The maintenance request for asset {db_req.asset.name} has been resolved. The asset is now Available."
    )
    db.add(notif)
    
    # Log Action
    log = models.ActivityLog(
        user_id=manager_user.id,
        action="Resolve Maintenance Request",
        details=f"Resolved maintenance for asset {db_req.asset.asset_tag}. Asset status reverted to Available."
    )
    db.add(log)
    
    db.commit()
    db.refresh(db_req)
    return db_req
