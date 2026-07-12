from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from ..db.session import Base

class UserRole(str, enum.Enum):
    ADMIN = "Admin"
    ASSET_MANAGER = "Asset Manager"
    DEPARTMENT_HEAD = "Department Head"
    EMPLOYEE = "Employee"

class AssetStatus(str, enum.Enum):
    AVAILABLE = "Available"
    ALLOCATED = "Allocated"
    RESERVED = "Reserved"
    UNDER_MAINTENANCE = "Under Maintenance"
    LOST = "Lost"
    RETIRED = "Retired"
    DISPOSED = "Disposed"

class ConditionType(str, enum.Enum):
    NEW = "New"
    GOOD = "Good"
    FAIR = "Fair"
    POOR = "Poor"

class BookingStatus(str, enum.Enum):
    UPCOMING = "Upcoming"
    ONGOING = "Ongoing"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class MaintenancePriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class MaintenanceStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    TECHNICIAN_ASSIGNED = "Technician Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"

class AuditVerificationStatus(str, enum.Enum):
    PENDING = "Pending"
    VERIFIED = "Verified"
    MISSING = "Missing"
    DAMAGED = "Damaged"

class TransferStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", use_alter=True, name="fk_user_department"), nullable=True)
    status = Column(String, default="Active")  # Active, Inactive

    department = relationship("Department", foreign_keys=[department_id], post_update=True)
    managed_departments = relationship("Department", back_populates="head", foreign_keys="[Department.head_id]")
    allocations = relationship("AssetAllocation", back_populates="allocated_to", foreign_keys="[AssetAllocation.allocated_to_id]")
    bookings = relationship("ResourceBooking", back_populates="booked_by")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="raised_by")
    audit_assignments = relationship("AuditAssignment", back_populates="auditor")

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    head_id = Column(Integer, ForeignKey("users.id", use_alter=True, name="fk_department_head"), nullable=True)
    parent_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    status = Column(String, default="Active")  # Active, Inactive

    head = relationship("User", foreign_keys=[head_id], post_update=True, back_populates="managed_departments")
    parent = relationship("Department", remote_side=[id])
    allocations = relationship("AssetAllocation", back_populates="allocated_to_dept")

class AssetCategory(Base):
    __tablename__ = "asset_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    custom_fields = Column(String, nullable=True)  # Store JSON schema or properties as string

    assets = relationship("Asset", back_populates="category")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("asset_categories.id"), nullable=False)
    asset_tag = Column(String, unique=True, index=True, nullable=False)  # AF-0001
    serial_number = Column(String, unique=True, index=True, nullable=False)
    acquisition_date = Column(Date, nullable=False)
    acquisition_cost = Column(Float, nullable=False)
    condition = Column(Enum(ConditionType), default=ConditionType.NEW, nullable=False)
    location = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    document_url = Column(String, nullable=True)
    is_shared = Column(Boolean, default=False, nullable=False)  # shared/bookable flag
    status = Column(Enum(AssetStatus), default=AssetStatus.AVAILABLE, nullable=False)

    category = relationship("AssetCategory", back_populates="assets")
    allocations = relationship("AssetAllocation", back_populates="asset")
    bookings = relationship("ResourceBooking", back_populates="asset")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="asset")
    audit_items = relationship("AuditItem", back_populates="asset")
    transfer_requests = relationship("TransferRequest", back_populates="asset")

class AssetAllocation(Base):
    __tablename__ = "asset_allocations"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    allocated_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    allocated_to_dept_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    allocated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    allocation_date = Column(Date, default=datetime.utcnow, nullable=False)
    expected_return_date = Column(Date, nullable=True)
    actual_return_date = Column(Date, nullable=True)
    return_condition_notes = Column(String, nullable=True)
    status = Column(String, default="Active")  # Active, Returned, Overdue

    asset = relationship("Asset", back_populates="allocations")
    allocated_to = relationship("User", foreign_keys=[allocated_to_id], back_populates="allocations")
    allocated_to_dept = relationship("Department", foreign_keys=[allocated_to_dept_id], back_populates="allocations")

class TransferRequest(Base):
    __tablename__ = "transfer_requests"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_employee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_dept_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    status = Column(Enum(TransferStatus), default=TransferStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    asset = relationship("Asset", back_populates="transfer_requests")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    target_employee = relationship("User", foreign_keys=[target_employee_id])
    target_dept = relationship("Department", foreign_keys=[target_dept_id])

class ResourceBooking(Base):
    __tablename__ = "resource_bookings"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    booked_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.UPCOMING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    asset = relationship("Asset", back_populates="bookings")
    booked_by = relationship("User", back_populates="bookings")

class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    raised_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(String, nullable=False)
    priority = Column(Enum(MaintenancePriority), default=MaintenancePriority.MEDIUM, nullable=False)
    photo_url = Column(String, nullable=True)
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.PENDING, nullable=False)
    assigned_technician = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    asset = relationship("Asset", back_populates="maintenance_requests")
    raised_by = relationship("User", back_populates="maintenance_requests")

class AuditCycle(Base):
    __tablename__ = "audit_cycles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    scope_type = Column(String, nullable=False)  # Department, Location
    scope_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    scope_location = Column(String, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, default="Active")  # Active, Closed
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    scope_department = relationship("Department")
    created_by = relationship("User")
    assignments = relationship("AuditAssignment", back_populates="audit_cycle", cascade="all, delete-orphan")
    items = relationship("AuditItem", back_populates="audit_cycle", cascade="all, delete-orphan")

class AuditAssignment(Base):
    __tablename__ = "audit_assignments"
    id = Column(Integer, primary_key=True, index=True)
    audit_cycle_id = Column(Integer, ForeignKey("audit_cycles.id"), nullable=False)
    auditor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    audit_cycle = relationship("AuditCycle", back_populates="assignments")
    auditor = relationship("User", back_populates="audit_assignments")

class AuditItem(Base):
    __tablename__ = "audit_items"
    id = Column(Integer, primary_key=True, index=True)
    audit_cycle_id = Column(Integer, ForeignKey("audit_cycles.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    auditor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_status = Column(Enum(AuditVerificationStatus), default=AuditVerificationStatus.PENDING, nullable=False)
    notes = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)

    audit_cycle = relationship("AuditCycle", back_populates="items")
    asset = relationship("Asset", back_populates="audit_items")
    auditor = relationship("User")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g., Register Asset, Approve Transfer
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
