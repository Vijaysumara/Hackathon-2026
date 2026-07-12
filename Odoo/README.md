# AssetFlow: Enterprise Asset & Resource Management System

AssetFlow is a centralized, rule-based ERP digital hub designed to simplify and digitize how organizations register, track, allocate, and maintain physical assets and shared resources (like conference rooms, vehicles, and projectors).

## ⚙️ Tech Stack & Tools

### Frontend
- **Framework:** React.js 18 (Vite JS bundler)
- **Styling:** Tailwind CSS (utility-first corporate SaaS design system)
- **Icons:** Lucide React (clean, consistent enterprise iconography)
- **Visualizations:** Recharts (composable charting for analytics and heatmaps)

### Backend
- **Framework:** FastAPI (High-performance Python 3 web framework)
- **Database:** SQLite (Relational Data persistence)
- **ORM:** SQLAlchemy (Object Relational Mapping)
- **Authentication:** JWT (JSON Web Tokens) with Passlib bcrypt hashing

---

## 🔑 Seeding & Default Credentials

The database has been seeded with a comprehensive test suite of 10+ employees, departments, categorized assets, active allocations (with overdue samples), resource booking schedules, maintenance tickets, and audit cycles.

You can log in immediately using the following roles and credentials:

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@assetflow.com` | `admin123` | Master organization controls (Departments, Categories, Promotions, Audits) |
| **Asset Manager** | `manager@assetflow.com` | `password123` | Registering assets, approving allocations, returns, transfers, and repairs |
| **Department Head (IT)** | `ithead@assetflow.com` | `password123` | View department assets, book resources on behalf of team, approve internal transfers |
| **Department Head (HR)** | `hrhead@assetflow.com` | `password123` | Same as IT Head (scoped to HR department) |
| **Employee 1 (IT)** | `emp1@assetflow.com` | `password123` | View personal allocations, raise repair tickets, book shared rooms |
| **Employee 2 (IT)** | `emp2@assetflow.com` | `password123` | Same as Employee 1 |

*All employees default to password: `password123`*

---

## Getting Started

### 1. Backend Setup & Start
Navigate to the `backend` directory:
```bash
cd backend
```
*(Optional) If you want to re-initialize and re-seed the SQLite database:*
```bash
python init_db.py
python seed_db.py
```
Start the FastAPI server:
```bash
python -m uvicorn app.main:app --reload
```
The interactive Swagger API documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend Setup & Start
Navigate to the `frontend` directory:
```bash
cd ../frontend
```
The node packages are already installed. Start the local development web server:
```bash
npm run dev
```
Open the printed URL (usually [http://localhost:5173](http://localhost:5173)) in your browser to interact with the AssetFlow system.
