from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.lead_models import Company, Contact, CallLog
from app.schemas.lead_schemas import (
    CompanyResponse, CompanyCreate, CompanyUpdate,
    ContactResponse, ContactCreate,
    CallLogResponse, CallLogCreate,
    ScrapeRequest, VerifyEmailRequest, VerifyEmailResponse
)
from app.scrapers.lead_scraper import search_and_generate_leads
from app.verifiers.lead_verifier import verify_email_address

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_companies = db.query(Company).count()
    total_contacts = db.query(Contact).count()
    verified_emails = db.query(Contact).filter(Contact.email_status == "VERIFIED").count()
    total_calls = db.query(CallLog).count()
    
    stages = {
        "New": db.query(Company).filter(Company.lead_status == "New").count(),
        "Verified": db.query(Company).filter(Company.lead_status == "Verified").count(),
        "Contacted": db.query(Company).filter(Company.lead_status == "Contacted").count(),
        "Sample Sent": db.query(Company).filter(Company.lead_status == "Sample Sent").count(),
        "Converted": db.query(Company).filter(Company.lead_status == "Converted").count(),
        "Lost": db.query(Company).filter(Company.lead_status == "Lost").count(),
    }

    return {
        "total_companies": total_companies,
        "total_contacts": total_contacts,
        "verified_emails": verified_emails,
        "total_calls": total_calls,
        "stages": stages
    }

@router.post("/leads/generate", response_model=List[CompanyResponse])
async def generate_and_save_leads(request: ScrapeRequest, db: Session = Depends(get_db)):
    scraped_leads = await search_and_generate_leads(
        keyword=request.keyword,
        city=request.city,
        country=request.country,
        limit=request.limit or 10,
        auto_verify=bool(request.auto_verify)
    )

    saved_companies = []
    for s_lead in scraped_leads:
        # Check if already exists by domain or name
        existing = None
        if s_lead.get("domain"):
            existing = db.query(Company).filter(Company.domain == s_lead["domain"]).first()
        if not existing:
            existing = db.query(Company).filter(Company.name == s_lead["name"]).first()

        if existing:
            saved_companies.append(existing)
            continue

        company = Company(
            name=s_lead["name"],
            website=s_lead.get("website"),
            domain=s_lead.get("domain"),
            industry=s_lead.get("industry"),
            country=s_lead.get("country"),
            city=s_lead.get("city"),
            address=s_lead.get("address"),
            phone=s_lead.get("phone"),
            rating=s_lead.get("rating"),
            reviews_count=s_lead.get("reviews_count", 0),
            google_maps_url=s_lead.get("google_maps_url"),
            lead_source=s_lead.get("lead_source", "Google Maps"),
            lead_status="New"
        )
        db.add(company)
        db.flush()

        for c_data in s_lead.get("contacts", []):
            contact = Contact(
                company_id=company.id,
                name=c_data.get("name", "Decision Maker"),
                designation=c_data.get("designation"),
                email=c_data.get("email"),
                email_status=c_data.get("email_status", "UNVERIFIED"),
                phone=c_data.get("phone"),
                phone_status=c_data.get("phone_status", "UNVERIFIED"),
                whatsapp=c_data.get("whatsapp"),
                linkedin_url=c_data.get("linkedin_url"),
                is_primary=c_data.get("is_primary", False)
            )
            db.add(contact)
        
        db.commit()
        db.refresh(company)
        saved_companies.append(company)

    return saved_companies

@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(
    status: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Company)
    if status and status != "All":
        query = query.filter(Company.lead_status == status)
    if country:
        query = query.filter(Company.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Company.city.ilike(f"%{city}%"))
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Company.name.ilike(search_fmt)) |
            (Company.website.ilike(search_fmt)) |
            (Company.address.ilike(search_fmt))
        )
    return query.order_by(Company.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company_detail(company_id: int, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    return comp

@router.put("/companies/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, update_data: CompanyUpdate, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(comp, key, value)
    
    db.commit()
    db.refresh(comp)
    return comp

@router.delete("/companies/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(comp)
    db.commit()
    return {"message": "Company deleted successfully", "id": company_id}

@router.post("/companies/{company_id}/contacts", response_model=ContactResponse)
def add_contact(company_id: int, contact_data: ContactCreate, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    
    contact = Contact(
        company_id=company_id,
        name=contact_data.name,
        designation=contact_data.designation,
        email=contact_data.email,
        email_status=contact_data.email_status or "UNVERIFIED",
        phone=contact_data.phone,
        phone_status=contact_data.phone_status or "UNVERIFIED",
        whatsapp=contact_data.whatsapp,
        linkedin_url=contact_data.linkedin_url,
        is_primary=contact_data.is_primary or False
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.post("/companies/{company_id}/calls", response_model=CallLogResponse)
def log_call(company_id: int, call_data: CallLogCreate, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    
    log = CallLog(
        company_id=company_id,
        contact_id=call_data.contact_id,
        caller_name=call_data.caller_name or "Sales Agent",
        call_status=call_data.call_status,
        notes=call_data.notes,
        next_followup_date=call_data.next_followup_date
    )
    db.add(log)
    
    # Optionally update company status based on call outcome
    if call_data.call_status in ["Sample Requested", "Interested"]:
        comp.lead_status = "Sample Sent" if call_data.call_status == "Sample Requested" else "Contacted"
    elif comp.lead_status == "New":
        comp.lead_status = "Contacted"
        
    db.commit()
    db.refresh(log)
    return log

@router.post("/verify/email", response_model=VerifyEmailResponse)
def verify_email(req: VerifyEmailRequest):
    return verify_email_address(req.email)

@router.delete("/cleanup-demo-data")
def cleanup_all_demo_data(db: Session = Depends(get_db)):
    """Wipes all test/demo leads, contacts, and call logs to ensure 100% clean production state"""
    db.query(CallLog).delete()
    db.query(Contact).delete()
    db.query(Company).delete()
    db.commit()
    return {"message": "All demo and test data removed successfully. Database is clean."}
