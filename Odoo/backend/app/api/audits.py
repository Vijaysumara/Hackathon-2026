from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/audits", tags=["audits"])

# ----------------- AUDIT CYCLES -----------------

@router.get("", response_model=List[schemas.AuditCycleOut])
def get_audit_cycles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Retrieve audit cycles. All authenticated users can see cycles, but only assigned auditors see their tasks.
    return db.query(models.AuditCycle).all()

@router.get("/{cycle_id}", response_model=schemas.AuditCycleOut)
def get_audit_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    cycle = db.query(models.AuditCycle).filter(models.AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
    return cycle

@router.post("", response_model=schemas.AuditCycleOut)
def create_audit_cycle(
    req: schemas.AuditCycleCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(check_role([models.UserRole.ADMIN]))
):
    # Create cycle
    cycle = models.AuditCycle(
        name=req.name,
        scope_type=req.scope_type,
        scope_department_id=req.scope_department_id,
        scope_location=req.scope_location,
        start_date=req.start_date,
        end_date=req.end_date,
        status="Active",
        created_by_id=admin_user.id,
        created_at=datetime.utcnow()
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    
    # Create Assignments
    for auditor_id in req.auditor_ids:
        # Verify user exists
        auditor = db.query(models.User).filter(models.User.id == auditor_id).first()
        if not auditor:
            raise HTTPException(status_code=404, detail=f"Auditor user with ID {auditor_id} not found")
        assignment = models.AuditAssignment(
            audit_cycle_id=cycle.id,
            auditor_id=auditor_id
        )
        db.add(assignment)
        
        # Notify Auditor
        notif = models.Notification(
            user_id=auditor_id,
            title="Assigned to Audit",
            message=f"You have been assigned as an auditor to cycle '{cycle.name}'."
        )
        db.add(notif)
        
    # Find matching assets in scope to populate AuditItems
    matching_assets = []
    if req.scope_type == "Department":
        # Assets allocated to this department or to employees in this department
        dept_id = req.scope_department_id
        if not dept_id:
            raise HTTPException(status_code=400, detail="scope_department_id is required for scope_type=Department")
            
        # Join allocations to find active ones
        active_allocations_subq = db.query(models.AssetAllocation.asset_id).filter(
            models.AssetAllocation.status.in_(["Active", "Overdue"]),
            (models.AssetAllocation.allocated_to_dept_id == dept_id) |
            (models.AssetAllocation.allocated_to_id.in_(
                db.query(models.User.id).filter(models.User.department_id == dept_id)
            ))
        ).subquery()
        
        matching_assets = db.query(models.Asset).filter(models.Asset.id.in_(active_allocations_subq)).all()
    else:
        # Assets located at the specified location
        location = req.scope_location
        if not location:
            raise HTTPException(status_code=400, detail="scope_location is required for scope_type=Location")
        matching_assets = db.query(models.Asset).filter(models.Asset.location == location).all()
        
    for asset in matching_assets:
        item = models.AuditItem(
            audit_cycle_id=cycle.id,
            asset_id=asset.id,
            verification_status=models.AuditVerificationStatus.PENDING
        )
        db.add(item)
        
    # Log Action
    log = models.ActivityLog(
        user_id=admin_user.id,
        action="Create Audit Cycle",
        details=f"Created audit cycle '{cycle.name}' (Scope: {cycle.scope_type}, Items: {len(matching_assets)})"
    )
    db.add(log)
    
    db.commit()
    db.refresh(cycle)
    return cycle

@router.put("/items/{item_id}", response_model=schemas.AuditItemOut)
def update_audit_item(
    item_id: int,
    req: schemas.AuditItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    item = db.query(models.AuditItem).filter(models.AuditItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Audit item not found")
        
    # Verify cycle is active
    if item.audit_cycle.status != "Active":
        raise HTTPException(status_code=400, detail="Cannot verify items on a closed audit cycle")
        
    # Verify user is assigned auditor or admin
    is_assigned = db.query(models.AuditAssignment).filter(
        models.AuditAssignment.audit_cycle_id == item.audit_cycle_id,
        models.AuditAssignment.auditor_id == current_user.id
    ).first()
    
    if not is_assigned and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You are not an assigned auditor for this cycle")
        
    item.verification_status = req.verification_status
    item.notes = req.notes
    item.auditor_id = current_user.id
    item.verified_at = datetime.utcnow()
    
    # Notify managers if flagged as missing or damaged
    if req.verification_status in [models.AuditVerificationStatus.MISSING, models.AuditVerificationStatus.DAMAGED]:
        managers = db.query(models.User).filter(models.User.role.in_([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER])).all()
        for mgr in managers:
            notif = models.Notification(
                user_id=mgr.id,
                title="Audit Discrepancy Flagged",
                message=f"Asset {item.asset.name} ({item.asset.asset_tag}) marked as {req.verification_status.value} in audit '{item.audit_cycle.name}'."
            )
            db.add(notif)
            
    db.commit()
    db.refresh(item)
    return item

@router.put("/{cycle_id}/close", response_model=schemas.AuditCycleOut)
def close_audit_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(check_role([models.UserRole.ADMIN]))
):
    cycle = db.query(models.AuditCycle).filter(models.AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
    if cycle.status == "Closed":
        raise HTTPException(status_code=400, detail="Audit cycle is already closed")
        
    # Lock cycle
    cycle.status = "Closed"
    
    # Update affected asset statuses
    for item in cycle.items:
        if item.verification_status == models.AuditVerificationStatus.MISSING:
            item.asset.status = models.AssetStatus.LOST
        elif item.verification_status == models.AuditVerificationStatus.DAMAGED:
            # Mark asset as Under Maintenance (needs repair)
            item.asset.status = models.AssetStatus.UNDER_MAINTENANCE
            
            # Automatically create a maintenance request if not already present
            existing_req = db.query(models.MaintenanceRequest).filter(
                models.MaintenanceRequest.asset_id == item.asset_id,
                models.MaintenanceRequest.status.in_([
                    models.MaintenanceStatus.PENDING, 
                    models.MaintenanceStatus.APPROVED, 
                    models.MaintenanceStatus.IN_PROGRESS
                ])
            ).first()
            if not existing_req:
                m_req = models.MaintenanceRequest(
                    asset_id=item.asset_id,
                    raised_by_id=admin_user.id,
                    description=f"Auto-generated from audit '{cycle.name}'. Notes: {item.notes}",
                    priority=models.MaintenancePriority.HIGH,
                    status=models.MaintenanceStatus.APPROVED, # Already approved since audit confirmed it
                    created_at=datetime.utcnow()
                )
                db.add(m_req)
                
    # Log Action
    log = models.ActivityLog(
        user_id=admin_user.id,
        action="Close Audit Cycle",
        details=f"Closed audit cycle '{cycle.name}' and locked verification details."
    )
    db.add(log)
    
    db.commit()
    db.refresh(cycle)
    return cycle

# ----------------- DISCREPANCY REPORT -----------------

@router.get("/{cycle_id}/discrepancies", response_model=List[schemas.AuditItemOut])
def get_audit_discrepancies(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    cycle = db.query(models.AuditCycle).filter(models.AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
        
    # Return flagged items (Missing or Damaged)
    return db.query(models.AuditItem).filter(
        models.AuditItem.audit_cycle_id == cycle_id,
        models.AuditItem.verification_status.in_([
            models.AuditVerificationStatus.MISSING,
            models.AuditVerificationStatus.DAMAGED
        ])
    ).all()
