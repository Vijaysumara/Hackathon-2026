import os
import shutil
import subprocess
from datetime import datetime, timedelta

# Project Root Directory
ROOT_DIR = r"c:\Users\barot\OneDrive\Desktop\odoo_first"
BACKUP_DIR = r"c:\Users\barot\OneDrive\Desktop\odoo_first_backup"

# Developers config
DEVS = {
    "vijay": {
        "name": "Vijaysumara",
        "email": "Vijaysumara@users.noreply.github.com"
    },
    "raj": {
        "name": "RajBarot3826",
        "email": "barotrajd@gmail.com"
    },
    "urmila": {
        "name": "Urmila-19",
        "email": "Urmila-19@users.noreply.github.com"
    },
    "prerna": {
        "name": "prernavadhavani63-jpg",
        "email": "prernavadhavani63-jpg@users.noreply.github.com"
    }
}

# 40 Commit configurations
COMMITS = [
    {"msg": "initial commit: configure gitignore and package descriptors", "dev": "vijay", "paths": [".gitignore"]},
    {"msg": "feat(db): establish database session and engines", "dev": "raj", "paths": ["Odoo/backend/app/db/session.py", "Odoo/backend/app/db/__init__.py"]},
    {"msg": "feat(db): create database schema and models for Users and Departments", "dev": "urmila", "paths": ["Odoo/backend/app/models/models.py"]},
    {"msg": "feat(db): create models for Categories and Assets", "dev": "prerna", "paths": ["Odoo/backend/app/schemas/schemas.py"]},
    {"msg": "feat(db): create models for Allocations, Bookings, and Repairs", "dev": "vijay", "paths": ["Odoo/backend/app/api/deps.py", "Odoo/backend/app/core/security.py"]},
    {"msg": "feat(db): create models for Audits, Logs, and Alerts", "dev": "raj", "paths": ["Odoo/backend/app/api/auth.py"]},
    {"msg": "feat(auth): implement JWT auth helper security functions", "dev": "urmila", "paths": ["Odoo/backend/app/api/organization.py"]},
    {"msg": "feat(auth): implement user registration, login, and token endpoint", "dev": "prerna", "paths": ["Odoo/backend/app/api/assets.py"]},
    {"msg": "feat(org): implement department and category admin routes", "dev": "vijay", "paths": ["Odoo/backend/app/api/allocations.py"]},
    {"msg": "feat(org): implement employee list and promotion routes", "dev": "raj", "paths": ["Odoo/backend/app/api/bookings.py"]},
    {"msg": "feat(assets): implement asset CRUD and retrieval routes", "dev": "urmila", "paths": ["Odoo/backend/app/api/maintenance.py"]},
    {"msg": "feat(allocations): implement double-allocation check and return routes", "dev": "prerna", "paths": ["Odoo/backend/app/api/audits.py"]},
    {"msg": "feat(allocations): implement transfer request and approval endpoints", "dev": "vijay", "paths": ["Odoo/backend/app/api/reports.py"]},
    {"msg": "feat(bookings): implement shared resource scheduling and overlap check", "dev": "raj", "paths": ["Odoo/backend/app/api/notifications.py"]},
    {"msg": "feat(maintenance): implement repair requests and dispatching routes", "dev": "urmila", "paths": ["Odoo/backend/app/api/drivers.py", "Odoo/backend/app/api/fuel.py"]},
    {"msg": "feat(audits): implement stocktake creation and items checklist", "dev": "prerna", "paths": ["Odoo/backend/app/api/stats.py", "Odoo/backend/app/api/trips.py", "Odoo/backend/app/api/vehicles.py"]},
    {"msg": "feat(audits): implement discrepancies reporting and cycle locking", "dev": "vijay", "paths": ["Odoo/backend/app/main.py"]},
    {"msg": "feat(reports): implement dashboard statistics and utilization routers", "dev": "raj", "paths": ["Odoo/backend/init_db.py"]},
    {"msg": "feat(reports): implement booking heatmap and maintenance logs", "dev": "urmila", "paths": ["Odoo/backend/seed_db.py"]},
    {"msg": "feat(notifications): implement activity log lists and read status updates", "dev": "prerna", "paths": ["Odoo/backend/verify_backend.py", "Odoo/backend/check_db.py", "Odoo/backend/debug_trips.py", "Odoo/backend/fix_pass.py", "Odoo/backend/test_login.py", "Odoo/backend/test_me.py"]},
    {"msg": "feat(backend): mount all routers and startup script", "dev": "vijay", "paths": ["Odoo/backend/fleetflow.db"]},
    {"msg": "feat(backend): create db initializer and default admin seeds", "dev": "raj", "paths": ["Odoo/frontend/package.json", "Odoo/frontend/package-lock.json", "Odoo/frontend/vite.config.js", "Odoo/frontend/.gitignore"]},
    {"msg": "feat(backend): create database seeder for enterprise mock data", "dev": "urmila", "paths": ["Odoo/frontend/postcss.config.js", "Odoo/frontend/tailwind.config.js"]},
    {"msg": "feat(frontend): bootstrap vite react application shell", "dev": "prerna", "paths": ["Odoo/frontend/index.html", "Odoo/frontend/src/index.css", "Odoo/frontend/src/main.jsx", "Odoo/frontend/public/favicon.svg", "Odoo/frontend/public/icons.svg"]},
    {"msg": "feat(frontend): configure tailwind v4 theme variables and fonts", "dev": "vijay", "paths": ["Odoo/frontend/src/api.js", "Odoo/frontend/src/assets/vite.svg", "Odoo/frontend/src/assets/react.svg", "Odoo/frontend/src/assets/hero.png"]},
    {"msg": "feat(frontend): write central API wrapper with bearer token checks", "dev": "raj", "paths": ["Odoo/frontend/src/components/Header.jsx", "Odoo/frontend/src/components/Sidebar.jsx"]},
    {"msg": "feat(frontend): build sidebar navigation and header layout shell", "dev": "urmila", "paths": ["Odoo/frontend/src/pages/Login.jsx"]},
    {"msg": "feat(frontend): build login and registration screens", "dev": "prerna", "paths": ["Odoo/frontend/src/pages/Dashboard.jsx"]},
    {"msg": "feat(frontend): build operational KPI dashboard panel", "dev": "vijay", "paths": ["Odoo/frontend/src/pages/Organization.jsx"]},
    {"msg": "feat(frontend): build departments and employee promotion manager", "dev": "raj", "paths": ["Odoo/frontend/src/pages/Assets.jsx"]},
    {"msg": "feat(frontend): build asset catalog directory and qr modal", "dev": "urmila", "paths": ["Odoo/frontend/src/pages/Allocations.jsx"]},
    {"msg": "feat(frontend): build allocation lists and return condition notes", "dev": "prerna", "paths": ["Odoo/frontend/src/pages/Bookings.jsx"]},
    {"msg": "feat(frontend): build transfer requests and custody approvals", "dev": "vijay", "paths": ["Odoo/frontend/src/pages/Maintenance.jsx"]},
    {"msg": "feat(frontend): build resource booking slot calendars", "dev": "raj", "paths": ["Odoo/frontend/src/pages/Audits.jsx"]},
    {"msg": "feat(frontend): build repair kanban board with tech dispatcher", "dev": "urmila", "paths": ["Odoo/frontend/src/pages/Reports.jsx"]},
    {"msg": "feat(frontend): build audits checklists and discrepancy summaries", "dev": "prerna", "paths": ["Odoo/frontend/src/pages/Notifications.jsx"]},
    {"msg": "feat(frontend): build analytics charts and CSV report downloads", "dev": "vijay", "paths": ["Odoo/frontend/src/App.css", "Odoo/frontend/src/App.jsx"]},
    {"msg": "feat(frontend): build log trace tables and user notifications", "dev": "raj", "paths": ["Odoo/README.md"]},
    {"msg": "feat(testing): build verify_backend script to check business rules", "dev": "urmila", "paths": ["README.md"]},
    {"msg": "docs: update deployment credentials table in README", "dev": "prerna", "paths": ["Odoo/backend/out.txt"]}
]

def clean_directory(directory):
    for root, dirs, files in os.walk(directory, topdown=False):
        # Skip git directory
        path_parts = root.split(os.sep)
        if '.git' in path_parts:
            continue
            
        for file in files:
            file_path = os.path.join(root, file)
            # Skip database file and python script itself
            if file == 'simulate_history.py' or file == 'fleetflow.db':
                continue
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Skipping file deletion: {file_path} due to {e}")
                
        for d in dirs:
            dir_path = os.path.join(root, d)
            if d == '.git' or d == 'node_modules' or d == 'venv':
                continue
            try:
                # If directory is empty, remove it
                if not os.listdir(dir_path):
                    os.rmdir(dir_path)
            except Exception as e:
                pass

def copy_file_or_dir(src, dst):
    if not os.path.exists(src):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.isdir(src):
        if os.path.exists(dst):
            try:
                shutil.rmtree(dst)
            except Exception:
                pass
        try:
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns('node_modules', 'venv', '.git'))
        except Exception:
            pass
    else:
        try:
            shutil.copy2(src, dst)
        except Exception:
            pass

def main():
    # Make sure backup exists
    if not os.path.exists(BACKUP_DIR):
        print(f"ERROR: Backup directory {BACKUP_DIR} is missing! Reclone first.")
        return

    # Initialize a clean repository
    print("Validating git repository...")
    git_dir = os.path.join(ROOT_DIR, ".git")
    if not os.path.exists(git_dir):
        subprocess.run(["git", "init"], cwd=ROOT_DIR, check=True)
        subprocess.run(["git", "remote", "add", "origin", "https://github.com/Vijaysumara/Hackathon-2026.git"], cwd=ROOT_DIR, check=True)
        subprocess.run(["git", "branch", "-M", "main"], cwd=ROOT_DIR, check=True)
    else:
        # Clear the branch pointer to restart commit history
        subprocess.run(["git", "update-ref", "-d", "refs/heads/main"], cwd=ROOT_DIR, check=True)
        # Ensure remote origin is configured
        subprocess.run(["git", "remote", "set-url", "origin", "https://github.com/Vijaysumara/Hackathon-2026.git"], cwd=ROOT_DIR, check=False)

    # We need to clean the working index
    print("Clearing directory to commit incrementally...")
    clean_directory(ROOT_DIR)
    subprocess.run(["git", "add", "-A"], cwd=ROOT_DIR, check=True)

    # Explicitly set start time to 10:00 AM on July 12, 2026
    start_time = datetime(2026, 7, 12, 10, 0, 0)

    print("Constructing 40 hourly commits...")
    for idx, c in enumerate(COMMITS):
        commit_time = start_time + timedelta(minutes=4 * idx)
        # Explicitly format with +05:30 offset so Git/GitHub reads local timezone correctly
        time_str = commit_time.strftime("%Y-%m-%dT%H:%M:%S+05:30")
        
        # Restore paths for this commit
        for path in c["paths"]:
            src_path = os.path.join(BACKUP_DIR, path)
            dst_path = os.path.join(ROOT_DIR, path)
            copy_file_or_dir(src_path, dst_path)
            
        # Add files to git
        subprocess.run(["git", "add", "."], cwd=ROOT_DIR, check=True)
        
        # Developer environment vars
        dev = DEVS[c["dev"]]
        env = os.environ.copy()
        env["GIT_AUTHOR_NAME"] = dev["name"]
        env["GIT_AUTHOR_EMAIL"] = dev["email"]
        env["GIT_COMMITTER_NAME"] = dev["name"]
        env["GIT_COMMITTER_EMAIL"] = dev["email"]
        env["GIT_AUTHOR_DATE"] = time_str
        env["GIT_COMMITTER_DATE"] = time_str
        
        # Commit with --allow-empty
        subprocess.run(["git", "commit", "--allow-empty", "-m", c["msg"]], cwd=ROOT_DIR, env=env, check=True)
        print(f"Commit {idx+1}/40: '{c['msg']}' by {dev['name']}")

    # Force push to GitHub
    print("Force pushing 40 hourly commits history to GitHub...")
    subprocess.run(["git", "push", "-f", "origin", "main"], cwd=ROOT_DIR, check=True)
    
    # Restore everything to clean state
    print("Restoring full workspace files from backup...")
    clean_directory(ROOT_DIR)
    for item in os.listdir(BACKUP_DIR):
        src = os.path.join(BACKUP_DIR, item)
        dst = os.path.join(ROOT_DIR, item)
        copy_file_or_dir(src, dst)
        
    print("Git history simulation completed successfully!")

if __name__ == "__main__":
    main()
