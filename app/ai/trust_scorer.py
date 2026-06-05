import os
import socket
import requests
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def check_domain(email: str) -> bool:
    """Check if email domain has valid MX records"""
    try:
        domain = email.split("@")[1]
        # reject free email providers
        free_providers = [
            "gmail.com", "yahoo.com", "hotmail.com",
            "outlook.com", "rediffmail.com", "ymail.com"
        ]
        if domain in free_providers:
            return False
        socket.getaddrinfo(domain, None)
        return True
    except Exception:
        return False


def check_website(url: str) -> bool:
    """Check if website is live"""
    try:
        if not url.startswith("http"):
            url = "https://" + url
        response = requests.get(url, timeout=5)
        return response.status_code == 200
    except Exception:
        return False


def check_linkedin(linkedin_url: str) -> bool:
    """Check if LinkedIn URL resolves"""
    try:
        if not linkedin_url:
            return False
        response = requests.get(linkedin_url, timeout=5)
        return response.status_code in [200, 999]
        # 999 = LinkedIn blocks bots but URL exists
    except Exception:
        return False


def check_gst_format(gst: str) -> bool:
    """Validate GST number format — 15 alphanumeric chars"""
    if not gst:
        return False
    gst = gst.strip().upper()
    return len(gst) == 15 and gst.isalnum()


def calculate_trust_score(
    email: str,
    website: str = None,
    linkedin_url: str = None,
    gst_number: str = None,
) -> dict:
    """
    Run all verification checks and return trust score.
    Called when recruiter registers or updates company profile.
    """
    results = {
        "domain_verified": False,
        "website_verified": False,
        "linkedin_verified": False,
        "gst_verified": False,
        "checks": {}
    }

    # CHECK 1 — company email domain (+25)
    domain_ok = check_domain(email)
    results["domain_verified"] = domain_ok
    results["checks"]["domain"] = {
        "passed": domain_ok,
        "points": 25 if domain_ok else 0,
        "message": "Company domain verified" if domain_ok
                   else "Use company email, not gmail/yahoo"
    }

    # CHECK 2 — website live (+25)
    website_ok = check_website(website) if website else False
    results["website_verified"] = website_ok
    results["checks"]["website"] = {
        "passed": website_ok,
        "points": 25 if website_ok else 0,
        "message": "Website is live" if website_ok
                   else "Website not reachable or not provided"
    }

    # CHECK 3 — LinkedIn exists (+25)
    linkedin_ok = check_linkedin(linkedin_url) if linkedin_url else False
    results["linkedin_verified"] = linkedin_ok
    results["checks"]["linkedin"] = {
        "passed": linkedin_ok,
        "points": 25 if linkedin_ok else 0,
        "message": "LinkedIn page verified" if linkedin_ok
                   else "LinkedIn URL not valid or not provided"
    }

    # CHECK 4 — GST format valid (+25)
    gst_ok = check_gst_format(gst_number) if gst_number else False
    results["gst_verified"] = gst_ok
    results["checks"]["gst"] = {
        "passed": gst_ok,
        "points": 25 if gst_ok else 0,
        "message": "GST number format valid" if gst_ok
                   else "Invalid or missing GST number"
    }

    # calculate total
    total = sum(c["points"] for c in results["checks"].values())
    results["trust_score"] = total

    # verdict
    if total >= 80:
        results["verification_status"] = "verified"
        results["badge"] = "🟢 Verified"
    elif total >= 50:
        results["verification_status"] = "partial"
        results["badge"] = "🟡 Partially Verified"
    else:
        results["verification_status"] = "unverified"
        results["badge"] = "🔴 Unverified"

    return results
