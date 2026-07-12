from app.db.session import SessionLocal
from app.api.trips import get_trips
from app.models.models import User
from app.schemas.schemas import TripOut

db = SessionLocal()
trips = get_trips(db=db, current_user=User())
for trip in trips:
    try:
        TripOut.from_orm(trip)
    except Exception as e:
        print(f"Error for trip {trip.id}: {e}")
