from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from ..models.models import UserRole, AssetStatus, ConditionType, BookingStatus, MaintenancePriority, MaintenanceStatus, AuditVerificationStatus, TransferStatus

# ----------------- TOKEN SCHEMAS -----------------
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None

# ----------------- USER SCHEMAS -----------------
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.EMPLOYEE
    department_id: Optional[int] = None
    status: str = "Active"

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    status: Optional[str] = None

class UserOut(UserBase):
    id: int
    class Config:
        from_attributes = True

# ----------------- DEPARTMENT SCHEMAS -----------------
class DepartmentBase(BaseModel):
    name: str
    head_id: Optional[int] = None
    parent_id: Optional[int] = None
    status: str = "Active"

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    head: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ----------------- CATEGORY SCHEMAS -----------------
class AssetCategoryBase(BaseModel):
    name: str
    custom_fields: Optional[str] = None  # JSON string or description

class AssetCategoryCreate(AssetCategoryBase):
    pass

class AssetCategoryOut(AssetCategoryBase):
    id: int
    class Config:
        from_attributes = True

# ----------------- ASSET SCHEMAS -----------------
class AssetBase(BaseModel):
    name: str
    category_id: int
    serial_number: str
    acquisition_date: date
    acquisition_cost: float
    condition: ConditionType = ConditionType.NEW
    location: str
    image_url: Optional[str] = None
    document_url: Optional[str] = None
    is_shared: bool = False
    status: AssetStatus = AssetStatus.AVAILABLE

class AssetCreate(AssetBase):
    asset_tag: Optional[str] = None # can be generated if not supplied

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    serial_number: Optional[str] = None
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[float] = None
    condition: Optional[ConditionType] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    document_url: Optional[str] = None
    is_shared: Optional[bool] = None
    status: Optional[AssetStatus] = None

class AssetOut(AssetBase):
    id: int
    asset_tag: str
    category: Optional[AssetCategoryOut] = None
    class Config:
        from_attributes = True

# ----------------- ALLOCATION SCHEMAS -----------------
class AssetAllocationBase(BaseModel):
    asset_id: int
    allocated_to_id: Optional[int] = None
    allocated_to_dept_id: Optional[int] = None
    expected_return_date: Optional[date] = None

class AssetAllocationCreate(AssetAllocationBase):
    pass

class AssetAllocationOut(BaseModel):
    id: int
    asset_id: int
    allocated_to_id: Optional[int] = None
    allocated_to_dept_id: Optional[int] = None
    allocated_by_id: int
    allocation_date: date
    expected_return_date: Optional[date] = None
    actual_return_date: Optional[date] = None
    return_condition_notes: Optional[str] = None
    status: str
    asset: Optional[AssetOut] = None
    allocated_to: Optional[UserOut] = None
    allocated_to_dept: Optional[DepartmentOut] = None
    class Config:
        from_attributes = True

# ----------------- TRANSFER SCHEMAS -----------------
class TransferRequestBase(BaseModel):
    asset_id: int
    target_employee_id: Optional[int] = None
    target_dept_id: Optional[int] = None

class TransferRequestCreate(TransferRequestBase):
    pass

class TransferRequestOut(TransferRequestBase):
    id: int
    requested_by_id: int
    status: TransferStatus
    created_at: datetime
    requested_by: Optional[UserOut] = None
    target_employee: Optional[UserOut] = None
    target_dept: Optional[DepartmentOut] = None
    asset: Optional[AssetOut] = None
    class Config:
        from_attributes = True

# ----------------- BOOKING SCHEMAS -----------------
class ResourceBookingBase(BaseModel):
    asset_id: int
    start_time: datetime
    end_time: datetime

class ResourceBookingCreate(ResourceBookingBase):
    pass

class ResourceBookingOut(ResourceBookingBase):
    id: int
    booked_by_id: int
    status: BookingStatus
    created_at: datetime
    booked_by: Optional[UserOut] = None
    asset: Optional[AssetOut] = None
    class Config:
        from_attributes = True

# ----------------- MAINTENANCE SCHEMAS -----------------
class MaintenanceRequestBase(BaseModel):
    asset_id: int
    description: str
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    photo_url: Optional[str] = None

class MaintenanceRequestCreate(MaintenanceRequestBase):
    pass

class MaintenanceRequestOut(MaintenanceRequestBase):
    id: int
    raised_by_id: int
    status: MaintenanceStatus
    assigned_technician: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    asset: Optional[AssetOut] = None
    raised_by: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ----------------- AUDIT SCHEMAS -----------------
class AuditCycleBase(BaseModel):
    name: str
    scope_type: str  # Department, Location
    scope_department_id: Optional[int] = None
    scope_location: Optional[str] = None
    start_date: date
    end_date: date

class AuditCycleCreate(AuditCycleBase):
    auditor_ids: List[int]

class AuditAssignmentOut(BaseModel):
    id: int
    auditor_id: int
    auditor: Optional[UserOut] = None
    class Config:
        from_attributes = True

class AuditItemOut(BaseModel):
    id: int
    audit_cycle_id: int
    asset_id: int
    auditor_id: Optional[int] = None
    verification_status: AuditVerificationStatus
    notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    asset: Optional[AssetOut] = None
    auditor: Optional[UserOut] = None
    class Config:
        from_attributes = True

class AuditCycleOut(AuditCycleBase):
    id: int
    status: str
    created_by_id: int
    created_at: datetime
    assignments: List[AuditAssignmentOut] = []
    items: List[AuditItemOut] = []
    class Config:
        from_attributes = True

class AuditItemUpdate(BaseModel):
    verification_status: AuditVerificationStatus
    notes: Optional[str] = None

# ----------------- LOG & NOTIFICATION SCHEMAS -----------------
class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    details: Optional[str] = None
    timestamp: datetime
    user: Optional[UserOut] = None
    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True
