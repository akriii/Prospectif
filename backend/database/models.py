from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from .session import Base

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    
    # SRID 4326 is the standard WGS84 coordinate system used by GPS and Leaflet/Mapbox
    geom = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326), nullable=False)

    # Relationships to access the stats easily (e.g., district.employment_data)
    employment_data = relationship("EmploymentStat", back_populates="district", cascade="all, delete")
    overhang_data = relationship("PropertyOverhang", back_populates="district", cascade="all, delete")

class EmploymentStat(Base):
    __tablename__ = "employment_stats"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    
    year = Column(Integer, nullable=False)
    population = Column(Integer, nullable=False)
    new_jobs_created = Column(Integer, nullable=False) # Extracted from DOSM
    median_income = Column(Float, nullable=True)
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    district = relationship("District", back_populates="employment_data")

class PropertyOverhang(Base):
    __tablename__ = "property_overhangs"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    
    year = Column(Integer, nullable=False)
    property_type = Column(String, nullable=False) # e.g., 'Residential', 'Commercial'
    unsold_units = Column(Integer, nullable=False) # Extracted from NAPIC
    total_value_rm = Column(Float, nullable=True) # The RM value of unsold units
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    district = relationship("District", back_populates="overhang_data")