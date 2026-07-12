from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db.session import engine, Base
from .api import auth, organization, assets, allocations, bookings, maintenance, audits, reports, notifications

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AssetFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(auth.router)
app.include_router(organization.router)
app.include_router(assets.router)
app.include_router(allocations.router)
app.include_router(bookings.router)
app.include_router(maintenance.router)
app.include_router(audits.router)
app.include_router(reports.router)
app.include_router(notifications.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AssetFlow: Enterprise Asset & Resource Management System API"}

# Health Check
@app.get("/health")
def health_check():
    return {"status": "healthy"}
