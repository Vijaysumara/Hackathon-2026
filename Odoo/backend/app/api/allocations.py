from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Optional
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/allocations", tags=["allocations"])

# Helper to check and flag overdue returns
def update_overdue_allocations(db: Session):
    today = date.today()
    overdue_list = db.query(models.AssetAllocation).filter(
        models.AssetAllocation.status == "Active",
        models.AssetAllocation.expected_return_date < today,
        models.AssetAllocation.actual_return_date.is_(None)
    ).all()
    for alloc in overdue_list:
        alloc.status = "Overdue"
        
        # Create notification for user if not already done
        if alloc.allocated_to_id:
            existing = db.query(models.Notification).filter(
                models.Notification.user_id == alloc.allocated_to_id,
                models.Notification.title == "Overdue Return Alert"
            ).first()
            if not existing:
                notif = models.Notification(
                    user_id=alloc.allocated_to_id,
                    title="Overdue Return Alert",
                    message=f"Your allocation for asset {alloc.asset.name} was due on {alloc.expected_return_date}."
                )
                db.add(notif)
    db.commit()

@router.get("", response_model=List[schemas.AssetAllocationOut])
def get_allocations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    update_overdue_allocations(db)
    # If employee, only show their allocations. If manager/head/admin, show all
    if current_user.role == models.UserRole.EMPLOYEE:
        return db.query(models.AssetAllocation).filter(models.AssetAllocation.allocated_to_id == current_user.id).all()
    elif current_user.role == models.UserRole.DEPARTMENT_HEAD:
        # Show department allocations
        return db.query(models.AssetAllocation).filter(
            (models.AssetAllocation.allocated_to_id == current_user.id) |
            (models.AssetAllocation.allocated_to_dept_id == current_user.department_id) |
            (models.AssetAllocation.allocated_to_id.in_(
                db.query(models.User.id).filter(models.User.department_id == current_user.department_id)
            ))
        ).all()
    return db.query(models.AssetAllocation).all()

@router.post("", response_model=schemas.AssetAllocationOut)
def allocate_asset(
    alloc_data: schemas.AssetAllocationCreate,
    db: Session = Depends(get_db),
    manager_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    # Check if asset exists
    asset = db.query(models.Asset).filter(models.Asset.id == alloc_data.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Check if asset is retired or disposed
    if asset.status in [models.AssetStatus.RETIRED, models.AssetStatus.DISPOSED]:
        raise HTTPException(status_code=400, detail="Cannot allocate a retired or disposed asset")
        
    # Check conflict: Double Allocation Rule
    # Check if there is an active allocation for this asset
    active_alloc = db.query(models.AssetAllocation).filter(
        models.AssetAllocation.asset_id == alloc_data.asset_id,
        models.AssetAllocation.status.in_(["Active", "Overdue"])
    ).first()
    
    if active_alloc:
        # Asset is already allocated. Return conflict details.
        holder_name = "Department: " + active_alloc.allocated_to_dept.name if active_alloc.allocated_to_dept_id else active_alloc.allocated_to.name
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": f"Asset is already allocated. Currently held by {holder_name}.",
                "current_holder": holder_name,
                "asset_id": asset.id,
                "allow_transfer": True
            }
        )
        
    # Proceed with allocation
    new_alloc = models.AssetAllocation(
        asset_id=alloc_data.asset_id,
        allocated_to_id=alloc_data.allocated_to_id,
        allocated_to_dept_id=alloc_data.allocated_to_dept_id,
        allocated_by_id=manager_user.id,
        allocation_date=date.today(),
        expected_return_date=alloc_data.expected_return_date,
        status="Active"
    )
    
    # Update asset status
    asset.status = models.AssetStatus.ALLOCATED
    db.add(new_alloc)
    db.commit()
    db.refresh(new_alloc)
    
    # Send notification to target employee
    if alloc_data.allocated_to_id:
        notif = models.Notification(
            user_id=alloc_data.allocated_to_id,
            title="Asset Assigned",
            message=f"Asset {asset.name} ({asset.asset_tag}) has been allocated to you."
        )
        db.add(notif)
        
    # Log Action
    log = models.ActivityLog(
        user_id=manager_user.id,
        action="Allocate Asset",
        details=f"Allocated asset {asset.asset_tag} to user ID {alloc_data.allocated_to_id} / Dept ID {alloc_data.allocated_to_dept_id}"
    )
    db.add(log)
    db.commit()
    
    return new_alloc

@router.post("/{alloc_id}/return", response_model=schemas.AssetAllocationOut)
def return_asset(
    alloc_id: int,
    return_notes: dict,
    db: Session = Depends(get_db),
    manager_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER]))
):
    alloc = db.query(models.AssetAllocation).filter(models.AssetAllocation.id == alloc_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if alloc.status == "Returned":
        raise HTTPException(status_code=400, detail="Asset is already returned")
        
    alloc.status = "Returned"
    alloc.actual_return_date = date.today()
    alloc.return_condition_notes = return_notes.get("notes", "")
    
    # Revert asset status to Available
    alloc.asset.status = models.AssetStatus.AVAILABLE
    
    # Log action
    log = models.ActivityLog(
        user_id=manager_user.id,
        action="Return Asset",
        details=f"Asset {alloc.asset.asset_tag} returned. Notes: {alloc.return_condition_notes}"
    )
    db.add(log)
    db.commit()
    db.refresh(alloc)
    return alloc

# ----------------- TRANSFER REQUESTS -----------------

@router.get("/transfers", response_model=List[schemas.TransferRequestOut])
def get_transfers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Employee: requests they raised or target them
    if current_user.role == models.UserRole.EMPLOYEE:
        return db.query(models.TransferRequest).filter(
            (models.TransferRequest.requested_by_id == current_user.id) |
            (models.TransferRequest.target_employee_id == current_user.id)
        ).all()
    # Department Head: requests involving their department
    elif current_user.role == models.UserRole.DEPARTMENT_HEAD:
        return db.query(models.TransferRequest).filter(
            (models.TransferRequest.requested_by_id == current_user.id) |
            (models.TransferRequest.target_dept_id == current_user.department_id) |
            (models.TransferRequest.target_employee_id.in_(
                db.query(models.User.id).filter(models.User.department_id == current_user.department_id)
            ))
        ).all()
    # Asset Manager / Admin: show all
    return db.query(models.TransferRequest).all()

@router.post("/transfers", response_model=schemas.TransferRequestOut)
def request_transfer(
    req: schemas.TransferRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if asset exists
    asset = db.query(models.Asset).filter(models.Asset.id == req.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Raise a transfer request
    db_req = models.TransferRequest(
        asset_id=req.asset_id,
        requested_by_id=current_user.id,
        target_employee_id=req.target_employee_id,
        target_dept_id=req.target_dept_id,
        status=models.TransferStatus.PENDING,
        created_at=datetime.utcnow()
    )
    db.add(db_req)
    
    # Notify Asset Managers
    managers = db.query(models.User).filter(models.User.role.in_([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER])).all()
    for mgr in managers:
        notif = models.Notification(
            user_id=mgr.id,
            title="Transfer Requested",
            message=f"User {current_user.name} has requested a transfer for asset {asset.name} ({asset.asset_tag})."
        )
        db.add(notif)
        
    db.commit()
    db.refresh(db_req)
    return db_req

@router.put("/transfers/{transfer_id}/approve", response_model=schemas.TransferRequestOut)
def approve_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    # Managers & Department Heads can approve transfers within their department or generally
    approver: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER, models.UserRole.DEPARTMENT_HEAD]))
):
    transfer = db.query(models.TransferRequest).filter(models.TransferRequest.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    if transfer.status != models.TransferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transfer request is already resolved")
        
    # If Department Head is approving, verify they have authority
    if approver.role == models.UserRole.DEPARTMENT_HEAD:
        # Department Head can only approve if they head the target department or the department of the target employee
        has_auth = False
        if transfer.target_dept_id == approver.department_id:
            has_auth = True
        elif transfer.target_employee_id:
            emp = db.query(models.User).filter(models.User.id == transfer.target_employee_id).first()
            if emp and emp.department_id == approver.department_id:
                has_auth = True
        if not has_auth:
            raise HTTPException(status_code=403, detail="You do not have permission to approve this transfer request")

    # Perform transfer:
    # 1. Close current active allocation
    active_alloc = db.query(models.AssetAllocation).filter(
        models.AssetAllocation.asset_id == transfer.asset_id,
        models.AssetAllocation.status.in_(["Active", "Overdue"])
    ).first()
    
    if active_alloc:
        active_alloc.status = "Returned"
        active_alloc.actual_return_date = date.today()
        active_alloc.return_condition_notes = f"Transferred via Request #{transfer_id}."
        
    # 2. Create new allocation
    new_alloc = models.AssetAllocation(
        asset_id=transfer.asset_id,
        allocated_to_id=transfer.target_employee_id,
        allocated_to_dept_id=transfer.target_dept_id,
        allocated_by_id=approver.id,
        allocation_date=date.today(),
        status="Active"
    )
    db.add(new_alloc)
    
    # 3. Mark transfer as approved
    transfer.status = models.TransferStatus.APPROVED
    
    # Update asset status
    transfer.asset.status = models.AssetStatus.ALLOCATED
    
    # Send notifications
    if transfer.target_employee_id:
        notif = models.Notification(
            user_id=transfer.target_employee_id,
            title="Transfer Approved",
            message=f"Transfer request approved. Asset {transfer.asset.name} is now allocated to you."
        )
        db.add(notif)
        
    # Notify requestor
    if transfer.requested_by_id != transfer.target_employee_id:
        notif = models.Notification(
            user_id=transfer.requested_by_id,
            title="Transfer Approved",
            message=f"Your transfer request for {transfer.asset.name} has been approved."
        )
        db.add(notif)

    # Log action
    log = models.ActivityLog(
        user_id=approver.id,
        action="Approve Transfer",
        details=f"Approved transfer of asset {transfer.asset.asset_tag} to User ID {transfer.target_employee_id} / Dept ID {transfer.target_dept_id}"
    )
    db.add(log)
    db.commit()
    db.refresh(transfer)
    return transfer

@router.put("/transfers/{transfer_id}/reject", response_model=schemas.TransferRequestOut)
def reject_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    approver: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.ASSET_MANAGER, models.UserRole.DEPARTMENT_HEAD]))
):
    transfer = db.query(models.TransferRequest).filter(models.TransferRequest.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    if transfer.status != models.TransferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transfer request is already resolved")

    # If Department Head, check authority
    if approver.role == models.UserRole.DEPARTMENT_HEAD:
        has_auth = False
        if transfer.target_dept_id == approver.department_id:
            has_auth = True
        elif transfer.target_employee_id:
            emp = db.query(models.User).filter(models.User.id == transfer.target_employee_id).first()
            if emp and emp.department_id == approver.department_id:
                has_auth = True
        if not has_auth:
            raise HTTPException(status_code=403, detail="You do not have permission to reject this transfer request")

    transfer.status = models.TransferStatus.REJECTED
    
    # Notify requestor
    notif = models.Notification(
        user_id=transfer.requested_by_id,
        title="Transfer Rejected",
        message=f"Your transfer request for {transfer.asset.name} was rejected by {approver.name}."
    )
    db.add(notif)
    
    # Log action
    log = models.ActivityLog(
        user_id=approver.id,
        action="Reject Transfer",
        details=f"Rejected transfer of asset {transfer.asset.asset_tag}"
    )
    db.add(log)
    
    db.commit()
    db.refresh(transfer)
    return transfer
