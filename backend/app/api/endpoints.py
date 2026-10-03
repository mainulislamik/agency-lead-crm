from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.lead_models import Company, Contact, CallLog, ActivityLog
from app.schemas.lead_schemas import (
    CompanyResponse, CompanyCreate, CompanyUpdate,
    ContactResponse, ContactCreate,
    CallLogResponse, CallLogCreate,
    ScrapeRequest, VerifyEmailRequest, VerifyEmailResponse,
    BatchStageUpdateRequest, BatchDeleteRequest, BulkEmailVerifyRequest,
    EmailPermutationRequest, EmailPermutationResult,
    CsvImportRequest, ActivityLogResponse
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
            lead_score=s_lead.get("lead_score", 50),
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

@router.post("/leads/batch-verify")
def batch_verify_unverified_leads(db: Session = Depends(get_db)):
    """Verifies all unverified emails across all companies using DNS MX handshake"""
    unverified_contacts = db.query(Contact).filter(
        Contact.email.isnot(None),
        Contact.email_status == "UNVERIFIED"
    ).all()

    verified_count = 0
    invalid_count = 0

    for c in unverified_contacts:
        res = verify_email_address(c.email)
        c.email_status = res.get("status", "UNVERIFIED")
        if c.email_status == "VERIFIED":
            verified_count += 1
            # Boost company lead score
            if c.company and (c.company.lead_score or 0) < 100:
                c.company.lead_score = min(100, (c.company.lead_score or 50) + 25)
        else:
            invalid_count += 1

    db.commit()
    return {
        "total_checked": len(unverified_contacts),
        "verified": verified_count,
        "invalid_or_catchall": invalid_count
    }

@router.get("/outreach/templates")
def get_outreach_templates():
    return [
        {
            "id": "trial_sample",
            "title": "Free Sample Trial Offer (High-End Retouching)",
            "channel": "WhatsApp & Cold Email",
            "subject": "Quick question regarding {company_name} image editing workflow",
            "body": "Hi {contact_name},\n\nI came across {company_name} and was really impressed by your visual portfolio.\n\nWe are a specialized post-production facility (serving international studios from Bangladesh) offering high-end clipping path, ghost mannequin, and retouching with guaranteed overnight turnaround.\n\nCould we edit 3-5 of your most challenging RAW images completely free of charge so you can test our quality firsthand?\n\nLooking forward to hearing your thoughts,\nProduction Team\nwww.picasalimited.com | www.stencilbangladesh.com"
        },
        {
            "id": "overflow_support",
            "title": "Peak Season Overflow & 24/7 Production",
            "channel": "WhatsApp & Cold Call",
            "subject": "Overflow editing support for {company_name}",
            "body": "Hi {contact_name},\n\nI know how busy shoot schedules get. We act as a reliable overflow partner for studios like {company_name} when your in-house editors are swamped.\n\nWe provide 24/7 coverage with pricing starting from $0.39/image for clipping paths and $1.50 for commercial retouching.\n\nCan I send over our 2026 agency rate card and sample portfolio?"
        },
        {
            "id": "ecommerce_bulk",
            "title": "E-Commerce / Amazon Marketplace Compliance",
            "channel": "WhatsApp & Email",
            "subject": "E-commerce product image retouching for {company_name}",
            "body": "Hi {contact_name},\n\nAre you currently looking for ways to cut down your post-production costs without sacrificing pixel perfection?\n\nAt Picasa & Stencil, we process over 5,000+ e-commerce images daily with strict 100% pure white background, drop shadow, and color matching compliance.\n\nWould you be open to a 2-minute chat or a free trial batch?"
        }
    ]

@router.post("/companies/batch-update-stage")
def batch_update_stage(payload: BatchStageUpdateRequest, db: Session = Depends(get_db)):
    updated_count = db.query(Company).filter(Company.id.in_(payload.company_ids)).update(
        {Company.lead_status: payload.lead_status}, synchronize_session=False
    )
    db.commit()
    return {"message": f"Updated stage to {payload.lead_status}", "updated_count": updated_count}

@router.post("/companies/batch-delete")
def batch_delete_companies(payload: BatchDeleteRequest, db: Session = Depends(get_db)):
    db.query(CallLog).filter(CallLog.company_id.in_(payload.company_ids)).delete(synchronize_session=False)
    db.query(Contact).filter(Contact.company_id.in_(payload.company_ids)).delete(synchronize_session=False)
    deleted_count = db.query(Company).filter(Company.id.in_(payload.company_ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": "Deleted companies successfully", "deleted_count": deleted_count}

@router.post("/verify/bulk-emails")
def bulk_verify_emails(payload: BulkEmailVerifyRequest):
    results = []
    for email in payload.emails:
        cleaned = email.strip()
        if cleaned:
            res = verify_email_address(cleaned)
            results.append(res)
    return results

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    total = db.query(Company).count()
    if total == 0:
        return {
            "total_leads": 0,
            "avg_score": 0,
            "verified_percentage": 0,
            "by_country": {},
            "by_stage": {},
            "by_score_tier": {"high": 0, "medium": 0, "low": 0}
        }
    
    stages = {
        st: db.query(Company).filter(Company.lead_status == st).count()
        for st in ["New", "Verified", "Contacted", "Sample Sent", "Converted", "Lost"]
    }
    
    # Countries breakdown
    companies = db.query(Company).all()
    by_country = {}
    for c in companies:
        ctry = c.country or "Other"
        by_country[ctry] = by_country.get(ctry, 0) + 1
        
    verified_contacts = db.query(Contact).filter(Contact.email_status == "VERIFIED").count()
    total_contacts = db.query(Contact).count()
    verified_pct = round((verified_contacts / total_contacts * 100), 1) if total_contacts > 0 else 0
    
    scores = [c.lead_score or 50 for c in companies]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    
    tier_high = sum(1 for s in scores if s >= 80)
    tier_med = sum(1 for s in scores if 50 <= s < 80)
    tier_low = sum(1 for s in scores if s < 50)
    
    return {
        "total_leads": total,
        "avg_score": avg_score,
        "verified_percentage": verified_pct,
        "by_country": by_country,
        "by_stage": stages,
        "by_score_tier": {"high": tier_high, "medium": tier_med, "low": tier_low}
    }

@router.get("/cadence/templates")
def get_cadence_templates():
    return [
        {
            "step": 1,
            "day": "Day 1 (Initial Hook)",
            "title": "Observation & Free 5-Image Trial Offer",
            "subject": "Quick question regarding {company_name} RAW post-production",
            "body": "Hi {contact_name},\n\nI was reviewing {company_name}'s recent visual portfolio and was really impressed with your shoot style.\n\nWe run a dedicated 24/7 post-production facility (based in Dhaka, Bangladesh) that supports high-volume commercial photography studios across the US and UK.\n\nWe provide overnight clipping path, ghost mannequin, and high-end beauty retouching starting at $0.39/image.\n\nCould we process 3-5 of your most challenging RAW files completely free of charge so you can test our clipping accuracy and tone matching?\n\nBest regards,\nProduction Director\nwww.picasalimited.com | www.stencilbangladesh.com"
        },
        {
            "step": 2,
            "day": "Day 3 (Value & Speed)",
            "title": "Overnight Turnaround & Pricing Assurance",
            "subject": "Overflow support for {company_name} upcoming shoots",
            "body": "Hi {contact_name},\n\nFollowing up briefly on my previous note. One of the main reasons studio directors partner with us is our timezone advantage:\n\nYour team can shoot and upload files at 6:00 PM your time, and receive 100% completed, QC-verified files ready by 9:00 AM the next morning.\n\nHere is our standard agency rate:\n- Clipping Path & Cutouts: from $0.39\n- Ghost Mannequin / Apparel: from $0.85\n- High-End Skin / Jewelry Retouching: from $1.50\n- Turnaround: 12-24 hours guaranteed\n\nWould you like me to send over our complete 2026 agency rate card?"
        },
        {
            "step": 3,
            "day": "Day 7 (Case Proof)",
            "title": "Capacity & Quality Guarantee",
            "subject": "Case Study: Scaling post-production for commercial studios",
            "body": "Hi {contact_name},\n\nMost studios we work with faced the same challenge before starting with us: their in-house creative team was spending 60% of their day doing repetitive pen tool selections instead of shooting high-ticket campaigns.\n\nWith our 150+ dedicated retouchers, we handle the bulk heavy-lifting with 3-tier QA so your studio never misses a client deadline.\n\nIf you have a live batch today, send over just 2 test images—no contract or commitment needed.\n\nCan I send you our secure FTP/Dropbox upload link?"
        },
        {
            "step": 4,
            "day": "Day 14 (Breakup Note)",
            "title": "Polite Sign-Off & Reserve Contact",
            "subject": "Permission to close file for {company_name}",
            "body": "Hi {contact_name},\n\nI haven't heard back, so I assume you're either completely covered on editing or now isn't the right time. Totally understand!\n\nI'll keep our team in reserve for you. Feel free to keep my contact info handy for whenever you have a peak-season rush or sudden overflow emergency.\n\nWishing you and the {company_name} team continued success,\nProduction Lead\ncontact@picasalimited.com"
        }
    ]

@router.post("/enrich/email-permutations", response_model=List[EmailPermutationResult])
def generate_email_permutations(req: EmailPermutationRequest):
    first = req.first_name.lower().strip().replace(" ", "")
    last = req.last_name.lower().strip().replace(" ", "")
    domain = req.domain.lower().strip().replace("http://", "").replace("https://", "").replace("www.", "").split("/")[0]
    
    if not first or not domain:
        return []
        
    patterns = [
        {"pattern": "{first}.{last}@{domain}", "email": f"{first}.{last}@{domain}" if last else f"{first}@{domain}"},
        {"pattern": "{first}@{domain}", "email": f"{first}@{domain}"},
        {"pattern": "{first_initial}{last}@{domain}", "email": f"{first[0]}{last}@{domain}" if last else f"{first}@{domain}"},
        {"pattern": "{first}_{last}@{domain}", "email": f"{first}_{last}@{domain}" if last else f"{first}@{domain}"},
        {"pattern": "studio@{domain}", "email": f"studio@{domain}"},
        {"pattern": "production@{domain}", "email": f"production@{domain}"},
        {"pattern": "contact@{domain}", "email": f"contact@{domain}"},
        {"pattern": "info@{domain}", "email": f"info@{domain}"}
    ]
    
    # Check MX once for domain
    v_res = verify_email_address(f"test@{domain}")
    has_mx = v_res.get("has_mx", False)
    
    results = []
    seen = set()
    for p in patterns:
        em = p["email"]
        if em not in seen:
            seen.add(em)
            status = "VERIFIED" if has_mx and not v_res.get("is_disposable") else ("INVALID" if not has_mx else "UNVERIFIED")
            results.append(EmailPermutationResult(
                email=em,
                pattern=p["pattern"],
                status=status,
                has_mx=has_mx
            ))
    return results

@router.post("/leads/import-csv")
def import_csv_leads(req: CsvImportRequest, db: Session = Depends(get_db)):
    imported_count = 0
    for row in req.leads:
        if not row.name or not row.name.strip():
            continue
            
        domain = None
        if row.website:
            domain = row.website.lower().replace("http://", "").replace("https://", "").replace("www.", "").split("/")[0]
            
        company = Company(
            name=row.name.strip(),
            website=row.website,
            domain=domain,
            industry=row.industry or "Photography Studio",
            country=row.country or "USA",
            city=row.city or "New York",
            phone=row.phone,
            lead_score=75,
            lead_status="New",
            lead_source="CSV Import"
        )
        db.add(company)
        db.flush()
        
        # Add contact if provided
        c_name = row.contact_name or f"{row.name} Creative Director"
        c_email = row.contact_email or (f"studio@{domain}" if domain else None)
        contact = Contact(
            company_id=company.id,
            name=c_name,
            designation="Creative Director / Studio Owner",
            email=c_email,
            email_status="UNVERIFIED",
            phone=row.contact_phone or row.phone,
            phone_status="VALID" if (row.contact_phone or row.phone) else "UNVERIFIED",
            whatsapp=(row.contact_phone or row.phone or "").replace("+", "").replace("-", "").replace(" ", ""),
            is_primary=True
        )
        db.add(contact)
        imported_count += 1
        
    db.commit()
    
    # Log activity
    log = ActivityLog(
        action="CSV_IMPORTED",
        description=f"Imported {imported_count} leads via CSV batch upload.",
        entity_type="Company"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"Successfully imported {imported_count} leads", "count": imported_count}

@router.get("/activity-logs", response_model=List[ActivityLogResponse])
def get_activity_logs(limit: int = 20, db: Session = Depends(get_db)):
    return db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit).all()

@router.delete("/cleanup-demo-data")
def cleanup_all_demo_data(db: Session = Depends(get_db)):
    """Wipes all test/demo leads, contacts, and call logs to ensure 100% clean production state"""
    db.query(ActivityLog).delete()
    db.query(CallLog).delete()
    db.query(Contact).delete()
    db.query(Company).delete()
    db.commit()
    return {"message": "All demo and test data removed successfully. Database is clean."}
