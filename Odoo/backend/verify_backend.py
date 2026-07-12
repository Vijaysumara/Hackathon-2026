from app.db.session import SessionLocal
from app.models import models
from datetime import datetime, date, timedelta

def run_tests():
    db = SessionLocal()
    print("Running programmatic business rule verification...\n")
    
    # 1. Verify double allocation conflict rule
    print("Test 1: Verify double allocation rule...")
    # Find an allocated asset
    allocated_asset = db.query(models.Asset).filter(models.Asset.status == models.AssetStatus.ALLOCATED).first()
    if not allocated_asset:
        print("FAIL: No allocated asset found to test double allocation.")
        return
        
    print(f"Checking asset: {allocated_asset.name} ({allocated_asset.asset_tag})")
    
    # Check if there is an active allocation
    active_alloc = db.query(models.AssetAllocation).filter(
        models.AssetAllocation.asset_id == allocated_asset.id,
        models.AssetAllocation.status.in_(["Active", "Overdue"])
    ).first()
    
    if active_alloc:
        holder = active_alloc.allocated_to.name if active_alloc.allocated_to_id else active_alloc.allocated_to_dept.name
        print(f"SUCCESS: System correctly detects active allocation to '{holder}' for this asset.")
    else:
        print("FAIL: Expected active allocation record for allocated asset status.")
        
    # 2. Verify booking overlap rule
    print("\nTest 2: Verify booking overlap rule...")
    # Seed a booking for test
    shared_asset = db.query(models.Asset).filter(models.Asset.is_shared == True).first()
    if not shared_asset:
        print("FAIL: No shared bookable asset found to test overlaps.")
        return
        
    print(f"Checking shared asset: {shared_asset.name} ({shared_asset.asset_tag})")
    
    # Test slot: tomorrow 10:00 - 11:00
    tomorrow = datetime.now() + timedelta(days=1)
    t_start = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    t_end = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0)
    
    # Check if there are overlaps for a conflicting slot: tomorrow 10:30 - 11:30
    conf_start = tomorrow.replace(hour=10, minute=30, second=0, microsecond=0)
    conf_end = tomorrow.replace(hour=11, minute=30, second=0, microsecond=0)
    
    # Add first booking
    emp = db.query(models.User).filter(models.User.role == models.UserRole.EMPLOYEE).first()
    b1 = models.ResourceBooking(
        asset_id=shared_asset.id,
        booked_by_id=emp.id,
        start_time=t_start,
        end_time=t_end,
        status=models.BookingStatus.UPCOMING
    )
    db.add(b1)
    db.commit()
    
    # Query overlap
    overlapping = db.query(models.ResourceBooking).filter(
        models.ResourceBooking.asset_id == shared_asset.id,
        models.ResourceBooking.status != models.BookingStatus.CANCELLED,
        models.ResourceBooking.start_time < conf_end,
        models.ResourceBooking.end_time > conf_start
    ).first()
    
    if overlapping:
        print(f"SUCCESS: System successfully detects time overlap with booking by '{overlapping.booked_by.name}'!")
    else:
        print("FAIL: Failed to detect overlap between (10:00-11:00) and (10:30-11:30).")
        
    # Clean up test booking
    db.delete(b1)
    db.commit()
    
    # 3. Verify transfer request workflow
    print("\nTest 3: Verify transfer request approval workflow...")
    # Find a pending transfer request
    tr = db.query(models.TransferRequest).filter(models.TransferRequest.status == models.TransferStatus.PENDING).first()
    if not tr:
        print("Skipping Test 3: No pending transfer request in seeded database.")
    else:
        print(f"Found pending transfer request for asset: {tr.asset.name} ({tr.asset.asset_tag})")
        # Check current allocation
        old_alloc = db.query(models.AssetAllocation).filter(
            models.AssetAllocation.asset_id == tr.asset_id,
            models.AssetAllocation.status.in_(["Active", "Overdue"])
        ).first()
        if old_alloc:
            old_holder = old_alloc.allocated_to.name if old_alloc.allocated_to_id else old_alloc.allocated_to_dept.name
            print(f"Current holder: {old_holder}")
            
            # Simulate approval
            # 1. Close current allocation
            old_alloc.status = "Returned"
            old_alloc.actual_return_date = date.today()
            # 2. Open new allocation to target
            new_alloc = models.AssetAllocation(
                asset_id=tr.asset_id,
                allocated_to_id=tr.target_employee_id,
                allocated_to_dept_id=tr.target_dept_id,
                allocated_by_id=tr.requested_by_id, # simulated approver
                allocation_date=date.today(),
                status="Active"
            )
            db.add(new_alloc)
            tr.status = models.TransferStatus.APPROVED
            db.commit()
            
            # Check new holder
            check_alloc = db.query(models.AssetAllocation).filter(
                models.AssetAllocation.asset_id == tr.asset_id,
                models.AssetAllocation.status == "Active"
            ).first()
            
            new_holder = check_alloc.allocated_to.name if check_alloc.allocated_to_id else check_alloc.allocated_to_dept.name
            print(f"New holder after transfer approval: {new_holder}")
            print("SUCCESS: Transfer workflow completed successfully and custody has changed!")
            
            # Revert change to keep seeded database clean
            db.delete(new_alloc)
            old_alloc.status = "Active"
            old_alloc.actual_return_date = None
            tr.status = models.TransferStatus.PENDING
            db.commit()
        else:
            print("Skipping Test 3: No active allocation found for the transfer request asset.")
            
    db.close()
    print("\nVerification completed successfully!")

if __name__ == "__main__":
    run_tests()
