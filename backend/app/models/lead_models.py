from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    website = Column(String(500), nullable=True)
    domain = Column(String(255), nullable=True, index=True)
    industry = Column(String(255), default="Image Editing & Photography")
    country = Column(String(100), nullable=True, index=True)
    city = Column(String(100), nullable=True, index=True)
    address = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    rating = Column(Float, nullable=True)
    reviews_count = Column(Integer, default=0)
    google_maps_url = Column(String(1000), nullable=True)
    lead_source = Column(String(100), default="Google Maps")
    lead_status = Column(String(50), default="New", index=True)  # New, Verified, Contacted, Sample Sent, Converted, Lost
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contacts = relationship("Contact", back_populates="company", cascade="all, delete-orphan")
    call_logs = relationship("CallLog", back_populates="company", cascade="all, delete-orphan")

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    designation = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    email_status = Column(String(50), default="UNVERIFIED")  # VERIFIED, CATCH_ALL, INVALID, UNVERIFIED
    phone = Column(String(50), nullable=True)
    phone_status = Column(String(50), default="UNVERIFIED")  # VALID, INVALID, UNVERIFIED
    whatsapp = Column(String(50), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="contacts")
    call_logs = relationship("CallLog", back_populates="contact")

class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    caller_name = Column(String(100), default="Sales Agent")
    call_status = Column(String(100), nullable=False)  # Interested, Sample Requested, Follow Up, Not Interested, No Answer, Wrong Number
    notes = Column(Text, nullable=True)
    next_followup_date = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="call_logs")
    contact = relationship("Contact", back_populates="call_logs")
