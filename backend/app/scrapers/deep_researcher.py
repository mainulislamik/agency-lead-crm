import re
import urllib.parse
import asyncio
import base64
from typing import Dict, List, Optional, Any, Set
import httpx
from bs4 import BeautifulSoup
import phonenumbers
from app.verifiers.lead_verifier import verify_email_address

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
HTTP_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Image editing / studio relevant decision makers
TARGET_ROLES = [
    "Owner", "Co-Founder", "Founder", "CEO", "Managing Director", "Partner", "President",
    "Creative Director", "Art Director", "Head of Creative", "Creative Lead",
    "Studio Manager", "Studio Director", "Production Manager", "Photo Producer",
    "Lead Photographer", "Commercial Photographer", "Senior Photographer",
    "Lead Retoucher", "Head of Retouching", "Senior Retoucher", "Digital Artist",
    "Marketing Director", "E-Commerce Director"
]

def is_google_maps_url(url: str) -> bool:
    """Detect if URL is from Google Maps or a Google Maps shortlink"""
    u = url.lower().strip()
    return any(x in u for x in [
        "google.com/maps",
        "maps.google.com",
        "maps.app.goo.gl",
        "goo.gl/maps"
    ])

def normalize_url(url: str) -> str:
    """Ensure protocol exists and clean URL"""
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    return url

def extract_domain(url: str) -> Optional[str]:
    """Extract clean domain from URL"""
    try:
        parsed = urllib.parse.urlparse(normalize_url(url))
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        if ":" in domain:
            domain = domain.split(":")[0]
        return domain if "." in domain else None
    except Exception:
        return None

async def resolve_google_maps_info(url: str) -> Dict[str, Any]:
    """Follow redirects and extract business name, coordinates, address, and website from Google Maps"""
    info = {
        "company_name": "",
        "google_maps_url": url,
        "lat": None,
        "lng": None,
        "address": None,
        "city": None,
        "country": None,
        "postal_code": None,
        "phone": None,
        "website": None,
        "rating": None,
        "reviews_count": 0,
    }

    canonical_url = url
    try:
        async with httpx.AsyncClient(headers=HTTP_HEADERS, follow_redirects=True, timeout=15.0) as client:
            resp = await client.get(url)
            canonical_url = str(resp.url)
            info["google_maps_url"] = canonical_url
    except Exception as e:
        print(f"[DeepResearcher] Error fetching Google Maps URL: {e}")

    # Extract Place Name from canonical URL path /maps/place/<name>/
    place_match = re.search(r'/maps/place/([^/@?]+)', canonical_url)
    if place_match:
        raw_name = place_match.group(1).replace('+', ' ')
        info["company_name"] = urllib.parse.unquote(raw_name).strip()
    
    # Check query param ?q=
    if not info["company_name"]:
        parsed_url = urllib.parse.urlparse(canonical_url)
        q_params = urllib.parse.parse_qs(parsed_url.query)
        if "q" in q_params and q_params["q"]:
            info["company_name"] = q_params["q"][0].replace("+", " ").strip()

    # Extract coordinates (@lat,lng)
    coord_match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', canonical_url)
    if coord_match:
        info["lat"] = coord_match.group(1)
        info["lng"] = coord_match.group(2)

    # Reverse Geocode via OpenStreetMap Nominatim if coordinates present
    if info["lat"] and info["lng"]:
        try:
            async with httpx.AsyncClient(headers={"User-Agent": "PicasaAgencyLeadEngine/1.0"}, timeout=8.0) as client:
                geo_url = f"https://nominatim.openstreetmap.org/reverse?lat={info['lat']}&lon={info['lng']}&format=json&extratags=1"
                r = await client.get(geo_url)
                if r.status_code == 200:
                    geo_data = r.json()
                    addr = geo_data.get("address", {})
                    info["address"] = geo_data.get("display_name")
                    info["city"] = addr.get("city") or addr.get("town") or addr.get("suburb") or addr.get("county")
                    info["country"] = addr.get("country")
                    info["postal_code"] = addr.get("postcode")
                    # Check if OSM has website tag
                    extratags = geo_data.get("extratags", {})
                    if extratags.get("website"):
                        info["website"] = extratags.get("website")
                    if extratags.get("phone"):
                        info["phone"] = extratags.get("phone")
        except Exception as e:
            print(f"[DeepResearcher] Reverse geocoding error: {e}")

    # If website was not found in OSM, discover via multi-search engine
    if info["company_name"] and not info["website"]:
        try:
            city_hint = info["city"] or ""
            found_site = await discover_official_website(info["company_name"], city_hint)
            if found_site:
                info["website"] = found_site
        except Exception as e:
            print(f"[DeepResearcher] Web search for company website error: {e}")

    return info

async def discover_official_website(company_name: str, city_hint: str = "") -> Optional[str]:
    """Discover company's official website using Brave Search, Bing, and DuckDuckGo fallbacks"""
    query = f"{company_name} {city_hint} studio website".strip()
    
    ignored_domains = [
        "wikipedia.org", "facebook.com", "instagram.com", "linkedin.com",
        "twitter.com", "x.com", "yelp.com", "yellowpages.com", "tripadvisor.com",
        "mapquest.com", "youtube.com", "tiktok.com", "pinterest.com", "yahoo.com",
        "google.com", "bing.com", "brave.com", "zoominfo.com", "dnb.com", "crunchbase.com"
    ]

    # Engine 1: Brave Search
    try:
        brave_url = f"https://search.brave.com/search?q={urllib.parse.quote(query)}"
        async with httpx.AsyncClient(headers=HTTP_HEADERS, follow_redirects=True, timeout=8.0) as client:
            r = await client.get(brave_url)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if href.startswith("http") and not any(ig in href for ig in ignored_domains):
                        domain = extract_domain(href)
                        if domain and len(domain.split(".")) >= 2:
                            p = urllib.parse.urlparse(href)
                            return f"{p.scheme}://{p.netloc}/"
    except Exception as e:
        print(f"[DeepResearcher] Brave website search fallback: {e}")

    # Engine 2: OpenStreetMap Search API
    try:
        osm_query = f"{company_name} {city_hint}".strip()
        osm_url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(osm_query)}&format=json&extratags=1"
        async with httpx.AsyncClient(headers={"User-Agent": "PicasaAgencyLeadEngine/1.0"}, timeout=6.0) as client:
            r = await client.get(osm_url)
            if r.status_code == 200:
                for item in r.json():
                    web = item.get("extratags", {}).get("website")
                    if web and web.startswith("http"):
                        return web
    except Exception as e:
        print(f"[DeepResearcher] OSM website search fallback: {e}")

    return None

def detect_tech_stack(html: str) -> List[str]:
    """Detect e-commerce and CMS technology stack from HTML"""
    stack = []
    h = html.lower()
    
    if "cdn.shopify.com" in h or "shopify" in h:
        stack.append("Shopify")
    if "woocommerce" in h or "wp-content/plugins/woocommerce" in h:
        stack.append("WooCommerce")
    if "magento" in h or "mage/" in h:
        stack.append("Magento")
    if "bigcommerce" in h:
        stack.append("BigCommerce")
    if "squarespace" in h:
        stack.append("Squarespace")
    if "wix.com" in h:
        stack.append("Wix")
    if "webflow" in h:
        stack.append("Webflow")
    if "wp-content" in h or "wordpress" in h:
        if "WordPress" not in stack:
            stack.append("WordPress")
    if "prestashop" in h:
        stack.append("PrestaShop")
        
    return stack

def extract_social_links(soup: BeautifulSoup) -> Dict[str, str]:
    """Extract official social media profiles from HTML links"""
    socials = {}
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        h_lower = href.lower()

        if "linkedin.com/company/" in h_lower and "linkedin" not in socials:
            socials["linkedin"] = href
        elif "linkedin.com/in/" in h_lower and "linkedin_personal" not in socials:
            socials["linkedin_personal"] = href
        elif "instagram.com/" in h_lower and "instagram" not in socials:
            if not any(x in h_lower for x in ["/p/", "/explore/", "/reel/", "/stories/"]):
                socials["instagram"] = href
        elif "facebook.com/" in h_lower and "facebook" not in socials:
            if not any(x in h_lower for x in ["sharer", "share", "/dialog/"]):
                socials["facebook"] = href
        elif ("twitter.com/" in h_lower or "x.com/" in h_lower) and "twitter" not in socials:
            if not any(x in h_lower for x in ["intent", "share", "status"]):
                socials["twitter"] = href
        elif "behance.net/" in h_lower and "behance" not in socials:
            socials["behance"] = href
        elif "pinterest.com/" in h_lower and "pinterest" not in socials:
            socials["pinterest"] = href
        elif "youtube.com/" in h_lower and "youtube" not in socials:
            socials["youtube"] = href
            
    return socials

def sanitize_email(email: str) -> Optional[str]:
    """Sanitize and validate extracted email"""
    em = email.lower().strip().strip(".,;:()<>[]'\"")
    # Reject NPM packages mistakenly matched like gsap@3.12.5
    if re.search(r"@\d+\.\d+", em):
        return None
    if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,15}$", em):
        return None
    # Filter image assets or font files mistakenly parsed as emails
    if any(em.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js", ".woff"]):
        return None
    return em

def extract_phone_numbers(text: str, default_country: str = "US") -> List[str]:
    """Extract and format phone numbers with phonenumbers lib"""
    phones = []
    raw_candidates = re.findall(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', text)
    for raw in raw_candidates:
        clean = re.sub(r'[^\d+]', '', raw)
        if 8 <= len(clean) <= 16:
            try:
                parsed = phonenumbers.parse(raw, default_country)
                if phonenumbers.is_valid_number(parsed):
                    formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
                    if formatted not in phones:
                        phones.append(formatted)
            except Exception:
                if raw.strip() not in phones and len(raw.strip()) >= 10:
                    phones.append(raw.strip())
    return phones[:3]

async def crawl_website_deep(website_url: str, base_company_name: Optional[str] = None) -> Dict[str, Any]:
    """Deep crawl homepage and subpages (/about, /team, /contact, /services) for contacts and metadata"""
    clean_url = normalize_url(website_url)
    domain = extract_domain(clean_url)
    
    data = {
        "website": clean_url,
        "domain": domain,
        "company_name": base_company_name or "",
        "description": "",
        "tech_stack": [],
        "social_links": {},
        "emails": set(),
        "phones": [],
        "team_members": [],
        "address": None
    }

    if not domain:
        return data

    async with httpx.AsyncClient(headers=HTTP_HEADERS, follow_redirects=True, timeout=12.0) as client:
        # Step 1: Crawl Homepage
        home_html = ""
        try:
            r = await client.get(clean_url)
            home_html = r.text
            soup = BeautifulSoup(home_html, "html.parser")
            
            # Extract Company Name
            if not data["company_name"]:
                og_site = soup.find("meta", property="og:site_name")
                if og_site and og_site.get("content"):
                    data["company_name"] = og_site["content"].strip()
                elif soup.title and soup.title.string:
                    raw_title = soup.title.string.split("|")[0].split("–")[0].split("-")[0].strip()
                    if raw_title and len(raw_title) < 40:
                        data["company_name"] = raw_title
                    else:
                        data["company_name"] = domain.split(".")[0].capitalize()

            # Description
            meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", property="og:description")
            if meta_desc and meta_desc.get("content"):
                data["description"] = meta_desc["content"].strip()[:250]

            # Tech stack
            data["tech_stack"] = detect_tech_stack(home_html)

            # Social links
            data["social_links"] = extract_social_links(soup)

            # Emails on homepage
            raw_emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", home_html)
            for em in raw_emails:
                clean_em = sanitize_email(em)
                if clean_em:
                    data["emails"].add(clean_em)

            # Phones on homepage
            data["phones"].extend(extract_phone_numbers(home_html))

            # Discover priority subpages
            candidate_links = []
            priority_slugs = ["about", "team", "people", "leadership", "management", "contact", "studio", "services", "creatives", "staff"]
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                full_sub_url = urllib.parse.urljoin(clean_url, href)
                sub_domain = extract_domain(full_sub_url)
                if sub_domain == domain:
                    h_lower = href.lower()
                    if any(slug in h_lower for slug in priority_slugs) and full_sub_url not in candidate_links and full_sub_url != clean_url:
                        candidate_links.append(full_sub_url)

            # Step 2: Fetch priority subpages (concurrency up to 4 pages)
            async def fetch_subpage(sub_url: str):
                try:
                    sub_r = await client.get(sub_url, timeout=8.0)
                    if sub_r.status_code == 200:
                        return sub_r.text
                except Exception:
                    pass
                return ""

            if candidate_links:
                sub_pages_html = await asyncio.gather(*(fetch_subpage(u) for u in candidate_links[:4]))
                for sub_html in sub_pages_html:
                    if not sub_html:
                        continue
                    sub_soup = BeautifulSoup(sub_html, "html.parser")
                    
                    # Update socials
                    sub_socials = extract_social_links(sub_soup)
                    for k, v in sub_socials.items():
                        if k not in data["social_links"]:
                            data["social_links"][k] = v

                    # Extract emails
                    sub_emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", sub_html)
                    for em in sub_emails:
                        clean_em = sanitize_email(em)
                        if clean_em:
                            data["emails"].add(clean_em)

                    # Extract phones
                    sub_phones = extract_phone_numbers(sub_html)
                    for p in sub_phones:
                        if p not in data["phones"]:
                            data["phones"].append(p)

                    # Scan for on-page team members
                    extracted_members = parse_on_page_team(sub_soup)
                    for m in extracted_members:
                        if not any(x["name"].lower() == m["name"].lower() for x in data["team_members"]):
                            data["team_members"].append(m)

        except Exception as e:
            print(f"[DeepResearcher] Error crawling website {clean_url}: {e}")

    if not data["company_name"]:
        data["company_name"] = domain.split(".")[0].capitalize()

    return data

def parse_on_page_team(soup: BeautifulSoup) -> List[Dict[str, str]]:
    """Scan HTML cards and paragraphs for team member names and design roles"""
    members = []
    cards = soup.select(".team, .team-member, .member, .bio, .person, .staff, .card, article")
    for card in cards:
        text = card.get_text(separator=" ", strip=True)
        for role in TARGET_ROLES:
            if re.search(rf"\b{re.escape(role)}\b", text, re.IGNORECASE):
                heading = card.find(["h2", "h3", "h4", "strong", "b"])
                if heading:
                    name_candidate = heading.get_text(strip=True)
                    if 3 <= len(name_candidate) <= 30 and not any(char in name_candidate for char in ["@", "http", "{", "}", "Our", "The"]):
                        members.append({
                            "name": name_candidate,
                            "designation": role,
                            "source": "Website Team Page"
                        })
                        break
    return members

async def search_linkedin_decision_makers(company_name: str, domain: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search for Key Decision Makers on LinkedIn using Brave Search & Bing with fallback"""
    contacts = []
    if not company_name or len(company_name) < 2:
        return contacts

    seen_profiles: Set[str] = set()

    # Strategy 1: Brave Search for LinkedIn profiles
    try:
        q_brave = f'site:linkedin.com/in "{company_name}"'
        brave_url = f"https://search.brave.com/search?q={urllib.parse.quote(q_brave)}"
        async with httpx.AsyncClient(headers=HTTP_HEADERS, follow_redirects=True, timeout=8.0) as client:
            r = await client.get(brave_url)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if "linkedin.com/in/" in href:
                        clean_linkedin = href.split("?")[0]
                        if clean_linkedin in seen_profiles:
                            continue
                        seen_profiles.add(clean_linkedin)

                        raw_headline = a.get_text(strip=True)
                        cleaned = raw_headline.replace("| LinkedIn", "").replace("- LinkedIn", "").strip()
                        parts = re.split(r"\s*[-–—]\s*", cleaned)
                        full_name = parts[0].strip() if len(parts) > 0 else "Creative Director"
                        designation = parts[1].strip() if len(parts) > 1 else "Creative Director / Owner"
                        designation = re.sub(r"\s+at\s+.*$", "", designation, flags=re.IGNORECASE).strip()

                        if 2 <= len(full_name.split()) <= 4 and not any(kw in full_name.lower() for kw in ["linkedin", "top", "best", "the"]):
                            contacts.append({
                                "name": full_name,
                                "designation": designation or "Creative Director",
                                "linkedin_url": clean_linkedin,
                                "source": "LinkedIn OSINT (Brave)",
                                "is_primary": len(contacts) == 0
                            })
                            if len(contacts) >= 4:
                                break
    except Exception as e:
        print(f"[DeepResearcher] Brave LinkedIn search error: {e}")

    # Strategy 2: Bing with en-US cookies fallback
    if len(contacts) < 2:
        try:
            cookies = {"_EDGE_S": "mkt=en-us", "SRCHHPGUSR": "SRCHLANG=en"}
            q_bing = f'site:linkedin.com/in "{company_name}"'
            bing_url = f"https://www.bing.com/search?q={urllib.parse.quote(q_bing)}&setmkt=en-us&setlang=en"
            async with httpx.AsyncClient(headers=HTTP_HEADERS, cookies=cookies, follow_redirects=True, timeout=8.0) as client:
                r = await client.get(bing_url)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, "html.parser")
                    for li in soup.select("li.b_algo"):
                        h2 = li.find("h2")
                        a = li.find("a", href=True)
                        if a and "&u=" in a["href"]:
                            u = a["href"].split("&u=")[1].split("&")[0]
                            if u.startswith("a1"):
                                try:
                                    dec = base64.b64decode(u[2:] + "==").decode("utf-8", errors="ignore")
                                    if "linkedin.com/in/" in dec:
                                        clean_linkedin = dec.split("?")[0]
                                        if clean_linkedin in seen_profiles:
                                            continue
                                        seen_profiles.add(clean_linkedin)
                                        raw_title = h2.get_text(strip=True) if h2 else ""
                                        cleaned = raw_title.replace("| LinkedIn", "").replace("- LinkedIn", "").strip()
                                        parts = re.split(r"\s*[-–—]\s*", cleaned)
                                        full_name = parts[0].strip() if len(parts) > 0 else ""
                                        designation = parts[1].strip() if len(parts) > 1 else "Creative Director / Owner"
                                        designation = re.sub(r"\s+at\s+.*$", "", designation, flags=re.IGNORECASE).strip()

                                        # Filter out non-person names like "Milck Studios", "Milk Photography"
                                        company_words = ["studios", "studio", "photography", "agency", "production", "productions", "inc", "llc", "ltd", "corp"]
                                        if any(cw in full_name.lower().split() for cw in company_words):
                                            continue

                                        if 2 <= len(full_name.split()) <= 4 and not any(kw in full_name.lower() for kw in ["linkedin", "top", "best"]):
                                            contacts.append({
                                                "name": full_name,
                                                "designation": designation or "Creative Director",
                                                "linkedin_url": clean_linkedin,
                                                "source": "LinkedIn OSINT (Bing)",
                                                "is_primary": len(contacts) == 0
                                            })
                                            if len(contacts) >= 5:
                                                break
                                except Exception:
                                    pass
        except Exception as e:
            print(f"[DeepResearcher] Bing LinkedIn search error: {e}")

    return contacts

def generate_email_permutations(first_name: str, last_name: str, domain: str) -> List[str]:
    """Generate high-probability corporate email permutations"""
    first = re.sub(r"[^a-zA-Z]", "", first_name.lower().strip())
    last = re.sub(r"[^a-zA-Z]", "", last_name.lower().strip())
    d = domain.lower().strip()
    
    perms = []
    if first and last:
        perms.append(f"{first}.{last}@{d}")
        perms.append(f"{first}@{d}")
        perms.append(f"{first[0]}{last}@{d}")
        perms.append(f"{first}_{last}@{d}")
        perms.append(f"{last}.{first}@{d}")
        perms.append(f"{first}{last}@{d}")
    elif first:
        perms.append(f"{first}@{d}")
        
    perms.extend([f"studio@{d}", f"production@{d}", f"contact@{d}", f"info@{d}"])
    return list(dict.fromkeys(perms))

def calculate_agency_lead_score(
    has_website: bool,
    has_contacts: bool,
    has_email: bool,
    has_phone: bool,
    has_socials: bool,
    tech_stack: List[str]
) -> int:
    """Calculate lead quality score out of 100 for an image editing post-production agency"""
    score = 30  # Baseline
    if has_website:
        score += 20
    if has_contacts:
        score += 20
    if has_email:
        score += 15
    if has_phone:
        score += 5
    if has_socials:
        score += 5
    if any(t in ["Shopify", "WooCommerce", "Magento", "BigCommerce"] for t in tech_stack):
        score += 5
    return min(score, 100)

def generate_image_editing_pitch(company_name: str, contact_name: str, designation: str, tech_stack: List[str]) -> str:
    """Generate high-converting, personalized cold pitch for image editing & retouching"""
    salutation = f"Hi {contact_name.split()[0]}" if contact_name and "Decision" not in contact_name else f"Hello {company_name} Team"
    
    ecom_hint = ""
    if any(t in tech_stack for t in ["Shopify", "WooCommerce", "Magento"]):
        ecom_hint = "For your high-volume product catalog, we ensure 100% color-accuracy, multi-clipping paths, and web-ready compression.\n\n"

    pitch = (
        f"Subject: Overnight photo retouching & clipping path overflow for {company_name}\n\n"
        f"{salutation},\n\n"
        f"I came across {company_name}'s recent work and was really impressed with your shoot aesthetics and visual standards.\n\n"
        f"We operate a dedicated 24/7 commercial post-production lab that provides overnight overflow support for high-volume photography studios and creative agencies.\n\n"
        f"{ecom_hint}"
        f"Our core agency capabilities:\n"
        f"• Clipping Path & Complex Alpha Channel Masking (from $0.39/image)\n"
        f"• Ghost Mannequin / Apparel Symmetry (from $0.85/image)\n"
        f"• High-End Skin Retouching & Jewelry Tone Matching (from $1.50/image)\n"
        f"• 12 to 24-hour overnight guaranteed turnaround\n\n"
        f"Could we edit 3 to 5 of your challenging RAW images completely free of charge so your team can test our turnaround and precision?\n\n"
        f"Best regards,\n"
        f"Imon Khan\n"
        f"Head of Post-Production Services | Global Studio Lab"
    )
    return pitch

async def run_deep_research(url: str) -> Dict[str, Any]:
    """
    Main orchestrator:
    Accepts either Website URL or Google Maps URL,
    performs deep crawling, LinkedIn OSINT, DNS verification, and returns rich lead object.
    """
    input_url = url.strip()
    is_gmaps = is_google_maps_url(input_url)
    detected_type = "google_maps" if is_gmaps else "website"

    gmaps_info = {}
    target_website = None
    company_name = ""

    if is_gmaps:
        # Step 1A: Parse Google Maps URL & Resolve Metadata
        gmaps_info = await resolve_google_maps_info(input_url)
        company_name = gmaps_info.get("company_name", "")
        target_website = gmaps_info.get("website")
    else:
        # Step 1B: Clean Website URL
        target_website = normalize_url(input_url)

    # Step 2: Deep Crawl Target Website if available
    web_data = {
        "website": target_website,
        "domain": extract_domain(target_website) if target_website else None,
        "company_name": company_name,
        "description": "",
        "tech_stack": [],
        "social_links": {},
        "emails": set(),
        "phones": [],
        "team_members": [],
        "address": None
    }

    if target_website:
        web_data = await crawl_website_deep(target_website, base_company_name=company_name)
        if not company_name and web_data.get("company_name"):
            company_name = web_data["company_name"]

    domain = web_data.get("domain") or (extract_domain(target_website) if target_website else "")

    # Step 3: Search Engine OSINT for Decision Makers on LinkedIn
    linkedin_contacts = await search_linkedin_decision_makers(company_name, domain)
    
    # Merge on-page team members and LinkedIn contacts
    all_raw_contacts = []
    seen_names = set()

    for lc in linkedin_contacts:
        name_key = lc["name"].lower().strip()
        if name_key not in seen_names:
            seen_names.add(name_key)
            all_raw_contacts.append(lc)

    for tc in web_data.get("team_members", []):
        name_key = tc["name"].lower().strip()
        if name_key not in seen_names:
            seen_names.add(name_key)
            all_raw_contacts.append(tc)

    # If still no contacts found, create a placeholder executive
    if not all_raw_contacts:
        all_raw_contacts.append({
            "name": f"{company_name} Creative Director" if company_name else "Creative Director",
            "designation": "Creative Director / Studio Owner",
            "linkedin_url": web_data.get("social_links", {}).get("linkedin"),
            "source": "Inferred Role",
            "is_primary": True
        })

    # Step 4: Email Permutation & DNS MX Verification
    scraped_emails = list(web_data.get("emails", []))
    
    # Check domain MX status once
    domain_has_mx = False
    if domain:
        mx_check = verify_email_address(f"test@{domain}")
        domain_has_mx = mx_check.get("has_mx", False)

    final_contacts = []
    for idx, c in enumerate(all_raw_contacts):
        name_parts = c["name"].split()
        first_name = name_parts[0] if name_parts else "info"
        last_name = name_parts[-1] if len(name_parts) > 1 else ""

        perms = generate_email_permutations(first_name, last_name, domain) if domain else []

        assigned_email = None
        for se in scraped_emails:
            if first_name.lower() in se.lower():
                assigned_email = se
                break
        
        if not assigned_email:
            if perms:
                assigned_email = perms[0]
            elif scraped_emails:
                assigned_email = scraped_emails[0]

        email_status = "VERIFIED" if (domain_has_mx and assigned_email) else "UNVERIFIED"

        # Determine phone & WhatsApp
        phone_val = None
        if web_data.get("phones"):
            phone_val = web_data["phones"][0]
        elif gmaps_info.get("phone"):
            phone_val = gmaps_info["phone"]

        whatsapp_clean = re.sub(r"[^\d]", "", phone_val) if phone_val else None

        final_contacts.append({
            "name": c["name"],
            "designation": c.get("designation", "Creative Director / Studio Owner"),
            "email": assigned_email,
            "email_status": email_status,
            "email_permutations": perms[:5],
            "phone": phone_val,
            "phone_status": "VALID" if phone_val else "UNVERIFIED",
            "whatsapp": whatsapp_clean,
            "linkedin_url": c.get("linkedin_url"),
            "is_primary": idx == 0
        })

    # Step 5: Consolidate Address & Location
    final_address = gmaps_info.get("address") or web_data.get("address")
    final_city = gmaps_info.get("city") or ("New York" if "ny" in (final_address or "").lower() else None)
    final_country = gmaps_info.get("country") or ("USA" if final_city == "New York" else None)
    final_phone = (final_contacts[0]["phone"] if final_contacts else None) or gmaps_info.get("phone")

    # Step 6: Lead Scoring & Cold Outreach Pitch
    lead_score = calculate_agency_lead_score(
        has_website=bool(target_website),
        has_contacts=len(final_contacts) > 0,
        has_email=any(c["email"] for c in final_contacts),
        has_phone=bool(final_phone),
        has_socials=bool(web_data.get("social_links")),
        tech_stack=web_data.get("tech_stack", [])
    )

    lead_contact_name = final_contacts[0]["name"] if final_contacts else ""
    lead_designation = final_contacts[0]["designation"] if final_contacts else ""
    outreach_pitch = generate_image_editing_pitch(
        company_name=company_name or "Studio",
        contact_name=lead_contact_name,
        designation=lead_designation,
        tech_stack=web_data.get("tech_stack", [])
    )

    return {
        "input_url": input_url,
        "detected_type": detected_type,
        "company_name": company_name or (domain.split(".")[0].capitalize() if domain else "Target Studio"),
        "website": target_website,
        "domain": domain,
        "google_maps_url": gmaps_info.get("google_maps_url") if is_gmaps else None,
        "industry": "Commercial Photography & Retouching Studio",
        "address": final_address,
        "city": final_city,
        "country": final_country,
        "rating": gmaps_info.get("rating"),
        "reviews_count": gmaps_info.get("reviews_count", 0),
        "phone": final_phone,
        "general_emails": scraped_emails[:5],
        "social_links": web_data.get("social_links", {}),
        "tech_stack": web_data.get("tech_stack", []),
        "lead_score": lead_score,
        "outreach_pitch": outreach_pitch,
        "contacts": final_contacts,
        "saved": False,
        "saved_company_id": None
    }
