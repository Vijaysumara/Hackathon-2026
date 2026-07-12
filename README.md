# AssetFlow: Enterprise Asset & Resource Management System

AssetFlow is a centralized, rule-based digital ERP hub designed to simplify and digitize how organizations register, track, allocate, and maintain physical assets and shared resources (like conference rooms, vehicles, and projectors).

---

## 👥 Development Team & Contributions

This project was built collaboratively by a team of 4 developers. Contributions are partitioned as follows across the Git commit history:

*   **Vijaysumara (`@Vijaysumara`):**
    *   Designed the initial database layouts and categories.
    *   Implemented organization routing structures and asset registration.
    *   Bootstrap configs and core layouts.
*   **RajBarot3826 (`@RajBarot3826`):**
    *   Implemented database engines, sessions, and credentials.
    *   Authored the JWT token verification routers and authentication controllers.
    *   Developed the central React API wrapper.
*   **Urmila-19 (`@Urmila-19`):**
    *   Implemented the User/Department relational models and department head scopes.
    *   Created the kanban repair boards and status tracking.
    *   Developed the programmatic backend verification tests.
*   **prernavadhavani63-jpg (`@prernavadhavani63-jpg`):**
    *   Built the frontend Vite-React client shell and Tailwind configuration.
    *   Implemented the double-allocation warnings and transfer-request models.
    *   Designed resource booking overlap validations.

---

## ⚙️ Project Architecture & Stack

The repository is organized into a modular monorepo:
*   `/Odoo/backend`: **FastAPI (Python 3)** REST API endpoints utilizing an ORM over a relational SQLite database.
*   `/Odoo/frontend`: **React.js 18 (Vite)** single-page application styled using a customized **Tailwind CSS v4** design system.

---

## 🔑 Seeding & Default Credentials

The database comes pre-seeded with a comprehensive test suite of 12 users across 4 roles, 4 departments, 16 physical assets (including 5 shared bookable assets), active allocations (with overdue samples), repair tickets, and audits.

You can log in immediately using the following accounts:

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@assetflow.com` | `admin123` | Master organization controls (Departments, Categories, Promotions, Audits) |
| **Asset Manager** | `manager@assetflow.com` | `password123` | Registering assets, approving allocations, returns, transfers, and repairs |
| **Department Head (IT)** | `ithead@assetflow.com` | `password123` | View department assets, book resources, approve internal transfers |
| **Employee 1 (IT)** | `emp1@assetflow.com` | `password123` | View personal allocations, raise repair tickets, book shared rooms |

---

## 🚀 Getting Started

### 1. Run Backend Server
Navigate to the `backend` directory:
```bash
cd Odoo/backend
```
*(Optional) If you want to re-initialize and re-seed the SQLite database:*
```bash
python init_db.py
python seed_db.py
```
Start the FastAPI server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
The interactive Swagger API documentation is available at: [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Run Frontend Web Client
Navigate to the `frontend` directory:
```bash
cd Odoo/frontend
```
Install the package dependencies:
```bash
npm install
```
Start the local development web server:
```bash
npm run dev
```
Open the printed local URL (usually **[http://localhost:5173](http://localhost:5173)**) in your browser.

---

## 🧪 Programmatic Business Rule Verification
We verified our core logic using python check scripts. You can run it manually to check double-allocations, transfers, and booking overlaps:
```bash
cd Odoo/backend
python verify_backend.py
```
