import re
import dns.resolver
import phonenumbers
from phonenumbers import PhoneNumberFormat

DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
    "throwawaymail.com", "yopmail.com", "sharklasers.com", "getairmail.com"
}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def verify_email_address(email: str) -> dict:
    if not email or not isinstance(email, str):
        return {
            "email": email,
            "domain": "",
            "has_mx": False,
            "is_disposable": False,
            "status": "INVALID",
            "message": "Empty or malformed email string."
        }
    
    clean_email = email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        return {
            "email": clean_email,
            "domain": "",
            "has_mx": False,
            "is_disposable": False,
            "status": "INVALID",
            "message": "Syntax validation failed."
        }
    
    parts = clean_email.split("@")
    domain = parts[1]

    if domain in DISPOSABLE_DOMAINS:
        return {
            "email": clean_email,
            "domain": domain,
            "has_mx": False,
            "is_disposable": True,
            "status": "INVALID",
            "message": "Disposable temporary email service detected."
        }
    
    try:
        answers = dns.resolver.resolve(domain, 'MX', lifetime=4.0)
        mx_records = [str(r.exchange).rstrip('.') for r in answers]
        if mx_records:
            return {
                "email": clean_email,
                "domain": domain,
                "has_mx": True,
                "is_disposable": False,
                "status": "VERIFIED",
                "message": f"Valid MX records found: {mx_records[0]}"
            }
    except Exception as e:
        # Check A record fallback
        try:
            dns.resolver.resolve(domain, 'A', lifetime=3.0)
            return {
                "email": clean_email,
                "domain": domain,
                "has_mx": False,
                "is_disposable": False,
                "status": "CATCH_ALL",
                "message": "No MX record, but fallback A record exists."
            }
        except Exception:
            return {
                "email": clean_email,
                "domain": domain,
                "has_mx": False,
                "is_disposable": False,
                "status": "INVALID",
                "message": "Domain does not have valid mail exchange (MX) records."
            }

    return {
        "email": clean_email,
        "domain": domain,
        "has_mx": False,
        "is_disposable": False,
        "status": "INVALID",
        "message": "Could not verify mail server."
    }

def format_and_validate_phone(phone_str: str, default_region: str = "US") -> dict:
    if not phone_str:
        return {"original": "", "formatted": "", "status": "UNVERIFIED", "whatsapp": ""}
    
    clean = re.sub(r"[^\d+]", "", phone_str)
    try:
        parsed = phonenumbers.parse(phone_str, default_region)
        if phonenumbers.is_valid_number(parsed):
            e164 = phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
            int_fmt = phonenumbers.format_number(parsed, PhoneNumberFormat.INTERNATIONAL)
            # WhatsApp digits only (without '+')
            wa_digits = e164.replace("+", "")
            return {
                "original": phone_str,
                "formatted": int_fmt,
                "e164": e164,
                "whatsapp": wa_digits,
                "status": "VALID"
            }
    except Exception:
        pass
    
    return {
        "original": phone_str,
        "formatted": phone_str,
        "e164": clean if clean.startswith("+") else f"+{clean}",
        "whatsapp": clean.replace("+", ""),
        "status": "UNVERIFIED"
    }
