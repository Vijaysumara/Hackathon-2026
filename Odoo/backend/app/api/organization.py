from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user, check_role

router = APIRouter(prefix="/organization", tags=["organization"])

# ----------------- DEPARTMENTS -----------------

@router.get("/departments", response_model=List[schemas.DepartmentOut])
def get_departments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Department).all()

@router.post("/departments", response_model=schemas.DepartmentOut)
def create_department(
    dept: schemas.DepartmentCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(check_role([models.UserRole.ADMIN]))
):
    # If head_id is provided, verify they exist
    if dept.head_id:
        head = db.query(models.User).filter(models.User.id == dept.head_id).first()
        if not head:
            raise HTTPException(status_code=404, detail="Department Head user not found")
        # Update user's role to Department Head
        head.role = models.UserRole.DEPARTMENT_HEAD
        
    db_dept = models.Department(
        name=dept.name,
        head_id=dept.head_id,
        parent_id=dept.parent_id,
        status=dept.status
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    
    # If the user is made department head, associate their department ID
    if dept.head_id:
        head.department_id = db_dept.id
        db.commit()
        db.refresh(db_dept)
        
    return db_dept

@router.put("/departments/{dept_id}", response_model=schemas.DepartmentOut)
def update_department(
    dept_id: int,
    dept_data: schemas.DepartmentCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(check_role([models.UserRole.ADMIN]))
):
    db_dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    # Handle Department Head promotion if head_id is changing
    if dept_data.head_id != db_dept.head_id:
        if dept_data.head_id:
            head = db.query(models.User).filter(models.User.id == dept_data.head_id).first()
            if not head:
                raise HTTPException(status_code=404, detail="Department Head user not found")
            head.role = models.UserRole.DEPARTMENT_HEAD
            head.department_id = dept_id
        
        # Demote previous head if they are no longer head of any department
        if db_dept.head_id:
            prev_head = db.query(models.User).filter(models.User.id == db_dept.head_id).first()
            if prev_head:
                # Check if this user heads other departments
                other_depts = db.query(models.Department).filter(
                    models.Department.head_id == prev_head.id,
                    models.Department.id != dept_id
                ).count()
                if other_depts == 0:
                    prev_head.role = models.UserRole.EMPLOYEE

    db_dept.name = dept_data.name
    db_dept.head_id = dept_data.head_id
    db_dept.parent_id = dept_data.parent_id
    db_dept.status = dept_data.status
    
    db.commit()
    db.refresh(db_dept)
    return db_dept

# ----------------- ASSET CATEGORIES -----------------

@router.get("/categories", response_model=List[schemas.AssetCategoryOut])
def get_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.AssetCategory).all()

@router.post("/categories", response_model=schemas.AssetCategoryOut)
def create_category(
    cat: schemas.AssetCategoryCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(check_role([models.UserRole.ADMIN]))
):
    existing = db.query(models.AssetCategory).filter(models.AssetCategory.name == cat.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    db_cat = models.AssetCategory(name=cat.name, custom_fields=cat.custom_fields)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.put("/categories/{cat_id}", response_model=schemas.AssetCategoryOut)
def update_category(
    cat_id: int,
    cat_data: schemas.AssetCategoryCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(check_role([models.UserRole.ADMIN]))
):
    db_cat = db.query(models.AssetCategory).filter(models.AssetCategory.id == cat_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_cat.name = cat_data.name
    db_cat.custom_fields = cat_data.custom_fields
    db.commit()
    db.refresh(db_cat)
    return db_cat

# ----------------- EMPLOYEE DIRECTORY -----------------

@router.get("/employees", response_model=List[schemas.UserOut])
def get_employees(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Sort: Admin first, then managers, department heads, employees
    users = db.query(models.User).all()
    role_priority = {
        models.UserRole.ADMIN: 0,
        models.UserRole.ASSET_MANAGER: 1,
        models.UserRole.DEPARTMENT_HEAD: 2,
        models.UserRole.EMPLOYEE: 3
    }
    return sorted(users, key=lambda u: role_priority.get(u.role, 4))

@router.put("/employees/{emp_id}", response_model=schemas.UserOut)
def update_employee(
    emp_id: int,
    emp_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(check_role([models.UserRole.ADMIN]))
):
    db_emp = db.query(models.User).filter(models.User.id == emp_id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    if emp_data.email:
        existing = db.query(models.User).filter(
            models.User.email == emp_data.email, 
            models.User.id != emp_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        db_emp.email = emp_data.email

    if emp_data.name:
        db_emp.name = emp_data.name
    if emp_data.role:
        db_emp.role = emp_data.role
    if emp_data.department_id is not None:
        if emp_data.department_id != 0:
            dept = db.query(models.Department).filter(models.Department.id == emp_data.department_id).first()
            if not dept:
                raise HTTPException(status_code=404, detail="Department not found")
            db_emp.department_id = emp_data.department_id
        else:
            db_emp.department_id = None
    if emp_data.status:
        db_emp.status = emp_data.status
        
    db.commit()
    db.refresh(db_emp)
    
    # Log the action
    log = models.ActivityLog(
        user_id=admin_user.id,
        action="Update Employee",
        details=f"Updated employee {db_emp.email} (Role: {db_emp.role.value}, Status: {db_emp.status})"
    )
    db.add(log)
    db.commit()
    
    return db_emp
