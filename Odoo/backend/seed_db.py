from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.models import models
from app.core.security import get_password_hash
from datetime import datetime, timedelta, date
import json
import random

def seed_db():
    db = SessionLocal()
    
    # Clear existing tables (except User, we will clean and rebuild all to keep relations clear)
    print("Clearing old tables...")
    db.query(models.Notification).delete()
    db.query(models.ActivityLog).delete()
    db.query(models.AuditItem).delete()
    db.query(models.AuditAssignment).delete()
    db.query(models.AuditCycle).delete()
    db.query(models.MaintenanceRequest).delete()
    db.query(models.ResourceBooking).delete()
    db.query(models.TransferRequest).delete()
    db.query(models.AssetAllocation).delete()
    db.query(models.Asset).delete()
    db.query(models.AssetCategory).delete()
    db.query(models.User).delete()
    db.query(models.Department).delete()
    db.commit()

    # 1. Seed Users (12 total)
    print("Seeding Users...")
    pw_hash = get_password_hash("password123")
    
    admin = models.User(email="admin@assetflow.com", name="System Admin", hashed_password=get_password_hash("admin123"), role=models.UserRole.ADMIN, status="Active")
    manager = models.User(email="manager@assetflow.com", name="Alice Manager", hashed_password=pw_hash, role=models.UserRole.ASSET_MANAGER, status="Active")
    
    it_head = models.User(email="ithead@assetflow.com", name="Bob IT Head", hashed_password=pw_hash, role=models.UserRole.DEPARTMENT_HEAD, status="Active")
    hr_head = models.User(email="hrhead@assetflow.com", name="Charlie HR Head", hashed_password=pw_hash, role=models.UserRole.DEPARTMENT_HEAD, status="Active")
    
    employees = [
        models.User(email="emp1@assetflow.com", name="David Employee", hashed_password=pw_hash, role=models.UserRole.EMPLOYEE, status="Active"),
        models.User(email="emp2@assetflow.com", name="Emma Employee", hashed_password=pw_hash, role=models.UserRole.EMPLOYEE, status="Active"),
        models.User(email="emp3@assetflow.com", name="Frank Employee", hashed_password=pw_hash, role=models.UserRole.EMPLOYEE, status="Active"),
        models.User(email="emp4@assetflow.com", name="Grace Employee", hashed_password=pw_hash, role=models.UserRole.EMPLOYEE, status="Active"),
        models.User(email="emp5@assetflow.com", name="Henry Employee", hashed_password=pw_hash, role=models.UserRole.EMPLOYEE, status="Active"),
        models.User(email="emp6@assetflow.com", name="Ivy Employee", hashed_password=pw_hash, role=models.UserRole.EMPLOYEE, status="Active"),
        models.User(email="emp7@assetflow.com", name="Jack Employee", hashed_password=pw_hash, role=models.UserRole.EMPLOYEE, status="Active"),
        models.User(email="emp8@assetflow.com", name="Kate Employee", hashed_password=pw_hash, role=models.UserRole.EMPLOYEE, status="Active")
    ]
    
    db.add(admin)
    db.add(manager)
    db.add(it_head)
    db.add(hr_head)
    for emp in employees:
        db.add(emp)
    db.commit()

    # 2. Seed Departments
    print("Seeding Departments...")
    dept_it = models.Department(name="Information Technology", head_id=it_head.id, status="Active")
    dept_hr = models.Department(name="Human Resources", head_id=hr_head.id, status="Active")
    dept_ops = models.Department(name="Operations", status="Active")
    dept_facilities = models.Department(name="Facilities", status="Active")
    
    db.add(dept_it)
    db.add(dept_hr)
    db.add(dept_ops)
    db.add(dept_facilities)
    db.commit()

    # Assign parent departments and assign users to departments
    dept_it.parent_id = dept_ops.id # Ops is parent of IT
    it_head.department_id = dept_it.id
    hr_head.department_id = dept_hr.id
    manager.department_id = dept_ops.id
    
    employees[0].department_id = dept_it.id
    employees[1].department_id = dept_it.id
    employees[2].department_id = dept_it.id
    employees[3].department_id = dept_hr.id
    employees[4].department_id = dept_hr.id
    employees[5].department_id = dept_ops.id
    employees[6].department_id = dept_facilities.id
    employees[7].department_id = dept_facilities.id
    db.commit()

    # 3. Seed Asset Categories
    print("Seeding Asset Categories...")
    cat_elec = models.AssetCategory(
        name="Electronics",
        custom_fields=json.dumps({"warranty_months": 24, "manufacturer": "String"})
    )
    cat_furn = models.AssetCategory(
        name="Furniture",
        custom_fields=json.dumps({"material": "String", "dimensions": "String"})
    )
    cat_veh = models.AssetCategory(
        name="Vehicles",
        custom_fields=json.dumps({"fuel_type": "String", "engine_cc": 1500})
    )
    cat_rooms = models.AssetCategory(
        name="Conference Rooms",
        custom_fields=json.dumps({"capacity": 10, "has_projector": "Boolean"})
    )
    
    db.add(cat_elec)
    db.add(cat_furn)
    db.add(cat_veh)
    db.add(cat_rooms)
    db.commit()

    # 4. Seed Assets (16 total)
    print("Seeding Assets...")
    today = date.today()
    assets = [
        # Electronics
        models.Asset(name="MacBook Pro 16\"", category_id=cat_elec.id, asset_tag="AF-0001", serial_number="SN-MBP1601", acquisition_date=today - timedelta(days=365), acquisition_cost=2499.00, condition=models.ConditionType.GOOD, location="HQ 4th Floor", is_shared=False, status=models.AssetStatus.ALLOCATED),
        models.Asset(name="Dell XPS 15", category_id=cat_elec.id, asset_tag="AF-0002", serial_number="SN-DXPS1502", acquisition_date=today - timedelta(days=200), acquisition_cost=1899.00, condition=models.ConditionType.GOOD, location="HQ 4th Floor", is_shared=False, status=models.AssetStatus.ALLOCATED),
        models.Asset(name="iPad Pro 12.9\"", category_id=cat_elec.id, asset_tag="AF-0003", serial_number="SN-IPAD03", acquisition_date=today - timedelta(days=150), acquisition_cost=1099.00, condition=models.ConditionType.NEW, location="HQ 3rd Floor", is_shared=False, status=models.AssetStatus.AVAILABLE),
        models.Asset(name="ThinkPad T14", category_id=cat_elec.id, asset_tag="AF-0004", serial_number="SN-TPAD04", acquisition_date=today - timedelta(days=400), acquisition_cost=1200.00, condition=models.ConditionType.FAIR, location="HQ 4th Floor", is_shared=False, status=models.AssetStatus.UNDER_MAINTENANCE),
        models.Asset(name="iPhone 15 Pro", category_id=cat_elec.id, asset_tag="AF-0005", serial_number="SN-IPH1505", acquisition_date=today - timedelta(days=50), acquisition_cost=999.00, condition=models.ConditionType.NEW, location="HQ 3rd Floor", is_shared=False, status=models.AssetStatus.AVAILABLE),
        
        # Furniture
        models.Asset(name="Ergonomic Desk Chair", category_id=cat_furn.id, asset_tag="AF-0006", serial_number="SN-CHAIR06", acquisition_date=today - timedelta(days=300), acquisition_cost=350.00, condition=models.ConditionType.GOOD, location="HQ 4th Floor", is_shared=False, status=models.AssetStatus.ALLOCATED),
        models.Asset(name="Standing Desk 140x80", category_id=cat_furn.id, asset_tag="AF-0007", serial_number="SN-DESK07", acquisition_date=today - timedelta(days=300), acquisition_cost=450.00, condition=models.ConditionType.GOOD, location="HQ 4th Floor", is_shared=False, status=models.AssetStatus.ALLOCATED),
        models.Asset(name="Modular Sofa Unit", category_id=cat_furn.id, asset_tag="AF-0008", serial_number="SN-SOFA08", acquisition_date=today - timedelta(days=600), acquisition_cost=1200.00, condition=models.ConditionType.FAIR, location="HQ Lobby", is_shared=False, status=models.AssetStatus.AVAILABLE),
        
        # Vehicles
        models.Asset(name="Toyota HiAce Delivery Van", category_id=cat_veh.id, asset_tag="AF-0009", serial_number="SN-VAN09", acquisition_date=today - timedelta(days=730), acquisition_cost=32000.00, condition=models.ConditionType.GOOD, location="Warehouse Garage", is_shared=True, status=models.AssetStatus.AVAILABLE),
        models.Asset(name="Tesla Model 3 Executive", category_id=cat_veh.id, asset_tag="AF-0010", serial_number="SN-TESLA10", acquisition_date=today - timedelta(days=180), acquisition_cost=45000.00, condition=models.ConditionType.GOOD, location="HQ Garage", is_shared=True, status=models.AssetStatus.AVAILABLE),
        
        # Rooms (Shared bookable resources)
        models.Asset(name="Boardroom Alpha", category_id=cat_rooms.id, asset_tag="AF-0011", serial_number="SN-ROOM11", acquisition_date=today - timedelta(days=1000), acquisition_cost=15000.00, condition=models.ConditionType.GOOD, location="HQ 5th Floor", is_shared=True, status=models.AssetStatus.AVAILABLE),
        models.Asset(name="Huddle Room Beta", category_id=cat_rooms.id, asset_tag="AF-0012", serial_number="SN-ROOM12", acquisition_date=today - timedelta(days=1000), acquisition_cost=8000.00, condition=models.ConditionType.GOOD, location="HQ 4th Floor", is_shared=True, status=models.AssetStatus.AVAILABLE),
        models.Asset(name="Training Hall Gamma", category_id=cat_rooms.id, asset_tag="AF-0013", serial_number="SN-ROOM13", acquisition_date=today - timedelta(days=1000), acquisition_cost=25000.00, condition=models.ConditionType.GOOD, location="HQ 1st Floor", is_shared=True, status=models.AssetStatus.AVAILABLE),
        
        # Other assets
        models.Asset(name="Epson 4K Projector", category_id=cat_elec.id, asset_tag="AF-0014", serial_number="SN-PROJ14", acquisition_date=today - timedelta(days=250), acquisition_cost=899.00, condition=models.ConditionType.GOOD, location="IT Storage", is_shared=True, status=models.AssetStatus.AVAILABLE),
        models.Asset(name="Mobile Whiteboard", category_id=cat_furn.id, asset_tag="AF-0015", serial_number="SN-BOARD15", acquisition_date=today - timedelta(days=120), acquisition_cost=150.00, condition=models.ConditionType.NEW, location="HQ 4th Floor", is_shared=True, status=models.AssetStatus.AVAILABLE),
        models.Asset(name="Dev Server Rack Unit", category_id=cat_elec.id, asset_tag="AF-0016", serial_number="SN-SERVR16", acquisition_date=today - timedelta(days=500), acquisition_cost=6500.00, condition=models.ConditionType.GOOD, location="HQ Server Room", is_shared=False, status=models.AssetStatus.ALLOCATED)
    ]
    for asset in assets:
        db.add(asset)
    db.commit()

    # 5. Seed Asset Allocations
    print("Seeding Asset Allocations...")
    allocations = [
        # MBP 16 allocated to IT Head, active
        models.AssetAllocation(asset_id=assets[0].id, allocated_to_id=it_head.id, allocated_by_id=manager.id, allocation_date=today - timedelta(days=180), expected_return_date=today + timedelta(days=180), status="Active"),
        # Dell XPS 15 allocated to David (employee 0 in IT), active
        models.AssetAllocation(asset_id=assets[1].id, allocated_to_id=employees[0].id, allocated_by_id=manager.id, allocation_date=today - timedelta(days=100), expected_return_date=today + timedelta(days=100), status="Active"),
        # Chair allocated to Emma (employee 1 in IT), active, overdue return!
        models.AssetAllocation(asset_id=assets[5].id, allocated_to_id=employees[1].id, allocated_by_id=manager.id, allocation_date=today - timedelta(days=30), expected_return_date=today - timedelta(days=5), status="Active"),
        # Desk allocated to Frank (employee 2 in IT), active
        models.AssetAllocation(asset_id=assets[6].id, allocated_to_id=employees[2].id, allocated_by_id=manager.id, allocation_date=today - timedelta(days=20), expected_return_date=today + timedelta(days=60), status="Active"),
        # Server Rack allocated to IT Department directly, active
        models.AssetAllocation(asset_id=assets[15].id, allocated_to_dept_id=dept_it.id, allocated_by_id=manager.id, allocation_date=today - timedelta(days=120), status="Active"),
        
        # Historical returned allocation
        models.AssetAllocation(asset_id=assets[2].id, allocated_to_id=employees[3].id, allocated_by_id=manager.id, allocation_date=today - timedelta(days=100), expected_return_date=today - timedelta(days=20), actual_return_date=today - timedelta(days=20), return_condition_notes="Returned in excellent condition.", status="Returned")
    ]
    for alloc in allocations:
        db.add(alloc)
    db.commit()

    # 6. Seed Transfer Requests
    print("Seeding Transfer Requests...")
    # Frank requests to transfer the Dell XPS 15 (currently held by David) to himself
    tr1 = models.TransferRequest(asset_id=assets[1].id, requested_by_id=employees[2].id, target_employee_id=employees[2].id, status=models.TransferStatus.PENDING)
    # Charlie requests to transfer Sofa from Lobby to HR
    tr2 = models.TransferRequest(asset_id=assets[7].id, requested_by_id=hr_head.id, target_dept_id=dept_hr.id, status=models.TransferStatus.PENDING)
    # A resolved request
    tr3 = models.TransferRequest(asset_id=assets[0].id, requested_by_id=employees[0].id, target_employee_id=employees[0].id, status=models.TransferStatus.APPROVED)
    
    db.add(tr1)
    db.add(tr2)
    db.add(tr3)
    db.commit()

    # 7. Seed Resource Bookings (for shared bookable resources)
    print("Seeding Resource Bookings...")
    now_dt = datetime.now()
    bookings = [
        # Upcoming booking for Boardroom Alpha
        models.ResourceBooking(asset_id=assets[10].id, booked_by_id=employees[0].id, start_time=now_dt + timedelta(days=1, hours=2), end_time=now_dt + timedelta(days=1, hours=4), status=models.BookingStatus.UPCOMING),
        # Ongoing booking for Boardroom Alpha
        models.ResourceBooking(asset_id=assets[10].id, booked_by_id=employees[3].id, start_time=now_dt - timedelta(minutes=30), end_time=now_dt + timedelta(hours=1), status=models.BookingStatus.ONGOING),
        # Completed booking
        models.ResourceBooking(asset_id=assets[11].id, booked_by_id=hr_head.id, start_time=now_dt - timedelta(days=1, hours=2), end_time=now_dt - timedelta(days=1), status=models.BookingStatus.COMPLETED),
        # Cancelled booking
        models.ResourceBooking(asset_id=assets[12].id, booked_by_id=employees[4].id, start_time=now_dt + timedelta(days=2), end_time=now_dt + timedelta(days=2, hours=3), status=models.BookingStatus.CANCELLED),
        # Another booking for Huddle Room Beta tomorrow
        models.ResourceBooking(asset_id=assets[11].id, booked_by_id=employees[1].id, start_time=now_dt + timedelta(days=1, hours=5), end_time=now_dt + timedelta(days=1, hours=6), status=models.BookingStatus.UPCOMING)
    ]
    for b in bookings:
        db.add(b)
    db.commit()

    # 8. Seed Maintenance Requests
    print("Seeding Maintenance Requests...")
    # ThinkPad under maintenance
    mr1 = models.MaintenanceRequest(asset_id=assets[3].id, raised_by_id=employees[1].id, description="Screen has flickering lines and battery dies within 15 minutes.", priority=models.MaintenancePriority.HIGH, status=models.MaintenanceStatus.IN_PROGRESS, assigned_technician="Tech Repair Solutions Inc.")
    # Delivery Van needs oil change
    mr2 = models.MaintenanceRequest(asset_id=assets[8].id, raised_by_id=employees[5].id, description="Periodic oil change and engine noise check.", priority=models.MaintenancePriority.LOW, status=models.MaintenanceStatus.PENDING)
    # A resolved maintenance request for MacBook
    mr3 = models.MaintenanceRequest(asset_id=assets[0].id, raised_by_id=it_head.id, description="Keyboard spacebar stuck.", priority=models.MaintenancePriority.MEDIUM, status=models.MaintenanceStatus.RESOLVED, resolved_at=now_dt - timedelta(days=10))
    
    db.add(mr1)
    db.add(mr2)
    db.add(mr3)
    db.commit()

    # 9. Seed Audit Cycles & Items
    print("Seeding Audit Cycles...")
    audit_cycle = models.AuditCycle(
        name="Q3 IT Equipment Verification",
        scope_type="Department",
        scope_department_id=dept_it.id,
        start_date=today - timedelta(days=5),
        end_date=today + timedelta(days=10),
        status="Active",
        created_by_id=admin.id
    )
    db.add(audit_cycle)
    db.commit()

    # Assign manager as auditor
    assignment = models.AuditAssignment(audit_cycle_id=audit_cycle.id, auditor_id=manager.id)
    db.add(assignment)
    db.commit()

    # Add audit items (assets in IT scope: MacBook AF-0001, Dell AF-0002, ThinkPad AF-0004, Dev Server AF-0016)
    ai1 = models.AuditItem(audit_cycle_id=audit_cycle.id, asset_id=assets[0].id, auditor_id=manager.id, verification_status=models.AuditVerificationStatus.VERIFIED, notes="Verified in person, clean.", verified_at=now_dt - timedelta(days=1))
    ai2 = models.AuditItem(audit_cycle_id=audit_cycle.id, asset_id=assets[1].id, auditor_id=manager.id, verification_status=models.AuditVerificationStatus.VERIFIED, notes="Verified, good shape.", verified_at=now_dt - timedelta(days=1))
    ai3 = models.AuditItem(audit_cycle_id=audit_cycle.id, asset_id=assets[3].id, auditor_id=manager.id, verification_status=models.AuditVerificationStatus.DAMAGED, notes="Hardware issue found: faulty battery. Maintenance request open.", verified_at=now_dt - timedelta(days=1))
    ai4 = models.AuditItem(audit_cycle_id=audit_cycle.id, asset_id=assets[15].id, verification_status=models.AuditVerificationStatus.PENDING)
    
    db.add(ai1)
    db.add(ai2)
    db.add(ai3)
    db.add(ai4)
    db.commit()

    # 10. Seed Activity Logs & Notifications
    print("Seeding Logs & Notifications...")
    logs = [
        models.ActivityLog(user_id=admin.id, action="Create Audit Cycle", details="Created audit cycle 'Q3 IT Equipment Verification'"),
        models.ActivityLog(user_id=manager.id, action="Register Asset", details="Registered Tesla Model 3 (AF-0010)"),
        models.ActivityLog(user_id=manager.id, action="Allocate Asset", details="Allocated Dell XPS 15 (AF-0002) to David Employee"),
        models.ActivityLog(user_id=employees[0].id, action="Book Resource", details="Booked Boardroom Alpha for tomorrow"),
        models.ActivityLog(user_id=manager.id, action="Verify Audit Item", details="Marked ThinkPad T14 (AF-0004) as Damaged in Q3 IT Audit")
    ]
    for log in logs:
        db.add(log)
        
    notifications = [
        models.Notification(user_id=it_head.id, title="Asset Assigned", message="MacBook Pro 16\" has been allocated to you."),
        models.Notification(user_id=employees[0].id, title="Asset Assigned", message="Dell XPS 15 has been allocated to you."),
        models.Notification(user_id=employees[1].id, title="Overdue Return Alert", message="Your allocation for Ergonomic Desk Chair is past its return date (expected return: 5 days ago)."),
        models.Notification(user_id=manager.id, title="Transfer Requested", message="Frank Employee requested a transfer for Dell XPS 15 (held by David)."),
        models.Notification(user_id=manager.id, title="Audit Discrepancy Flagged", message="ThinkPad T14 was marked as Damaged during the verification cycle.")
    ]
    for n in notifications:
        db.add(n)
        
    db.commit()
    print("Database seeded successfully with all tables populated!")
    db.close()

if __name__ == "__main__":
    seed_db()
