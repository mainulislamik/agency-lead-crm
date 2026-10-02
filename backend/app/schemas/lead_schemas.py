from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class ContactBase(BaseModel):
    name: str
    designation: Optional[str] = None
    email: Optional[str] = None
    email_status: Optional[str] = "UNVERIFIED"
    phone: Optional[str] = None
    phone_status: Optional[str] = "UNVERIFIED"
    whatsapp: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_primary: Optional[bool] = False

class ContactCreate(ContactBase):
    company_id: int

class ContactResponse(ContactBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CallLogBase(BaseModel):
    company_id: int
    contact_id: Optional[int] = None
    caller_name: Optional[str] = "Sales Agent"
    call_status: str
    notes: Optional[str] = None
    next_followup_date: Optional[str] = None

class CallLogCreate(CallLogBase):
    pass

class CallLogResponse(CallLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CompanyBase(BaseModel):
    name: str
    website: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = "Image Editing & Photography"
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = 0
    lead_score: Optional[int] = 50
    google_maps_url: Optional[str] = None
    lead_source: Optional[str] = "Google Maps"
    lead_status: Optional[str] = "New"
    notes: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    lead_status: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    contacts: List[ContactResponse] = []
    call_logs: List[CallLogResponse] = []

    class Config:
        from_attributes = True

class ScrapeRequest(BaseModel):
    keyword: str  # e.g., "Image Editing Agency", "Fashion Photographer", "Product Photography Studio"
    city: str     # e.g., "New York", "London", "Berlin"
    country: str  # e.g., "USA", "UK", "Germany"
    limit: Optional[int] = 10
    auto_verify: Optional[bool] = True

class VerifyEmailRequest(BaseModel):
    email: str

class VerifyEmailResponse(BaseModel):
    email: str
    domain: str
    has_mx: bool
    is_disposable: bool
    status: str  # VERIFIED, CATCH_ALL, INVALID
    message: str
