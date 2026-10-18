import re
import socket
import smtplib
import dns.resolver
from typing import Dict, Any, List, Optional
import phonenumbers
from phonenumbers import PhoneNumberFormat, PhoneNumberType

DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
    "throwawaymail.com", "yopmail.com", "sharklasers.com", "getairmail.com",
    "dispostable.com", "trashmail.com"
}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

PHONE_TYPE_LABELS = {
    PhoneNumberType.FIXED_LINE: "LANDLINE",
    PhoneNumberType.MOBILE: "MOBILE",
    PhoneNumberType.FIXED_LINE_OR_MOBILE: "MOBILE / LANDLINE",
    PhoneNumberType.TOLL_FREE: "TOLL FREE",
    PhoneNumberType.VOIP: "VOIP",
    PhoneNumberType.PERSONAL_NUMBER: "PERSONAL",
    PhoneNumberType.PAGER: "PAGER",
    PhoneNumberType.UAN: "UAN",
    PhoneNumberType.VOICEMAIL: "VOICEMAIL",
    PhoneNumberType.UNKNOWN: "UNKNOWN"
}


def get_mx_hosts(domain: str) -> List[str]:
    """Retrieve sorted list of mail exchanger hosts for a domain."""
    try:
        answers = dns.resolver.resolve(domain, 'MX', lifetime=4.0)
        sorted_answers = sorted(answers, key=lambda r: r.preference)
        return [str(r.exchange).rstrip('.') for r in sorted_answers]
    except Exception:
        # Fallback check A record
        try:
            dns.resolver.resolve(domain, 'A', lifetime=3.0)
            return [domain]
        except Exception:
            return []


def verify_email_address(email: str) -> dict:
    """Fast DNS MX-based email verification."""
    if not email or not isinstance(email, str):
        return {
            "email": email,
            "domain": "",
            "has_mx": False,
            "is_disposable": False,
            "status": "INVALID",
            "confidence": 0,
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
            "confidence": 0,
            "message": "Syntax validation failed."
        }
    
    domain = clean_email.split("@")[1]
    if domain in DISPOSABLE_DOMAINS:
        return {
            "email": clean_email,
            "domain": domain,
            "has_mx": False,
            "is_disposable": True,
            "status": "INVALID",
            "confidence": 0,
            "message": "Disposable temporary email service detected."
        }
    
    mx_hosts = get_mx_hosts(domain)
    if mx_hosts:
        return {
            "email": clean_email,
            "domain": domain,
            "has_mx": True,
            "is_disposable": False,
            "status": "VERIFIED",
            "confidence": 85,
            "message": f"Valid MX records found: {mx_hosts[0]}"
        }
    
    return {
        "email": clean_email,
        "domain": domain,
        "has_mx": False,
        "is_disposable": False,
        "status": "INVALID",
        "confidence": 0,
        "message": "Domain does not have valid mail exchange (MX) records."
    }


def verify_email_smtp(email: str, check_catchall: bool = True, timeout: float = 4.0) -> dict:
    """
    Advanced Zero-Bounce SMTP Handshake Verifier:
    1. Checks Syntax and Disposable lists.
    2. Resolves primary MX server.
    3. Connects on port 25 with HELO/EHLO.
    4. Probes for Catch-All status with dummy mailbox.
    5. Sends RCPT TO probe to verify recipient mailbox existence.
    Returns deliverability status, confidence score, and MX details.
    """
    base_check = verify_email_address(email)
    if base_check["status"] == "INVALID":
        return {
            **base_check,
            "smtp_checked": False,
            "is_catchall": False,
            "smtp_code": None
        }

    domain = base_check["domain"]
    mx_hosts = get_mx_hosts(domain)
    if not mx_hosts:
        return {
            **base_check,
            "smtp_checked": False,
            "is_catchall": False,
            "smtp_code": None
        }

    target_mx = mx_hosts[0]
    is_catchall = False
    sender_domain = "agency-lead-crm.net"

    try:
        server = smtplib.SMTP(timeout=timeout)
        server.connect(target_mx, 25)
        server.ehlo(sender_domain)

        # Check for Catch-All behavior if requested
        if check_catchall:
            dummy_address = f"verify_probe_check_{hash(domain) % 999999}@{domain}"
            try:
                server.mail(f"probe@{sender_domain}")
                dummy_code, _ = server.rcpt(dummy_address)
                if dummy_code == 250:
                    is_catchall = True
                server.rset()
            except Exception:
                pass

        # Probe the real target mailbox
        server.mail(f"probe@{sender_domain}")
        code, resp_bytes = server.rcpt(email)
        resp_msg = resp_bytes.decode('utf-8', errors='ignore') if isinstance(resp_bytes, bytes) else str(resp_bytes)
        
        try:
            server.quit()
        except Exception:
            pass

        if code == 250:
            if is_catchall:
                return {
                    "email": email,
                    "domain": domain,
                    "has_mx": True,
                    "is_disposable": False,
                    "status": "CATCH_ALL",
                    "confidence": 70,
                    "is_catchall": True,
                    "smtp_checked": True,
                    "smtp_code": 250,
                    "message": f"Server accepted recipient (Catch-All Domain): {target_mx}"
                }
            return {
                "email": email,
                "domain": domain,
                "has_mx": True,
                "is_disposable": False,
                "status": "SMTP_DELIVERABLE",
                "confidence": 98,
                "is_catchall": False,
                "smtp_checked": True,
                "smtp_code": 250,
                "message": f"Mailbox verified active via SMTP on {target_mx}"
            }
        elif code in (550, 551, 552, 553, 501):
            return {
                "email": email,
                "domain": domain,
                "has_mx": True,
                "is_disposable": False,
                "status": "SMTP_INVALID",
                "confidence": 0,
                "is_catchall": False,
                "smtp_checked": True,
                "smtp_code": code,
                "message": f"Mailbox rejected by server ({code}): {resp_msg.strip()}"
            }
        else:
            # Temporary error or greylisting (421, 450, etc.)
            return {
                "email": email,
                "domain": domain,
                "has_mx": True,
                "is_disposable": False,
                "status": "MX_VERIFIED",
                "confidence": 80,
                "is_catchall": is_catchall,
                "smtp_checked": True,
                "smtp_code": code,
                "message": f"MX verified, SMTP deferred ({code}): {resp_msg.strip()}"
            }

    except (socket.timeout, smtplib.SMTPConnectError, ConnectionRefusedError, OSError):
        # Fallback to MX verified if connection blocked or port 25 filtered
        return {
            "email": email,
            "domain": domain,
            "has_mx": True,
            "is_disposable": False,
            "status": "MX_VERIFIED",
            "confidence": 80,
            "is_catchall": False,
            "smtp_checked": False,
            "smtp_code": None,
            "message": f"Valid MX server confirmed ({target_mx}). Direct port 25 handshake timed out."
        }
    except Exception as e:
        return {
            "email": email,
            "domain": domain,
            "has_mx": True,
            "is_disposable": False,
            "status": "MX_VERIFIED",
            "confidence": 75,
            "is_catchall": False,
            "smtp_checked": False,
            "smtp_code": None,
            "message": f"MX confirmed; SMTP check note: {str(e)}"
        }


def format_and_validate_phone(phone_str: str, default_region: str = "US") -> dict:
    """Advanced telecom parsing, line-type detection & WhatsApp link generation."""
    if not phone_str:
        return {
            "original": "",
            "formatted": "",
            "e164": "",
            "whatsapp": "",
            "whatsapp_url": "",
            "phone_type": "UNKNOWN",
            "status": "UNVERIFIED"
        }
    
    clean = re.sub(r"[^\d+]", "", phone_str)
    try:
        parsed = phonenumbers.parse(phone_str, default_region)
        if phonenumbers.is_valid_number(parsed):
            e164 = phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
            int_fmt = phonenumbers.format_number(parsed, PhoneNumberFormat.INTERNATIONAL)
            wa_digits = e164.replace("+", "")
            num_type_code = phonenumbers.number_type(parsed)
            line_type = PHONE_TYPE_LABELS.get(num_type_code, "UNKNOWN")
            
            return {
                "original": phone_str,
                "formatted": int_fmt,
                "e164": e164,
                "whatsapp": wa_digits,
                "whatsapp_url": f"https://wa.me/{wa_digits}",
                "phone_type": line_type,
                "status": "VALID"
            }
    except Exception:
        pass
    
    e164_fallback = clean if clean.startswith("+") else f"+{clean}"
    wa_fallback = clean.replace("+", "")
    return {
        "original": phone_str,
        "formatted": phone_str,
        "e164": e164_fallback,
        "whatsapp": wa_fallback,
        "whatsapp_url": f"https://wa.me/{wa_fallback}" if len(wa_fallback) >= 9 else "",
        "phone_type": "UNKNOWN",
        "status": "UNVERIFIED"
    }
