from app.database.connection import engine
from app.database.base import Base
from app.models.member import Member
from app.models.payment import Payment

print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("Finished creating tables.")