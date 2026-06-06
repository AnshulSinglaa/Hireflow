import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_NAME = os.getenv("FROM_NAME", "HireFlow")


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send email via SMTP.
    Returns True if sent, False if failed.
    Non-fatal — caller handles fallback.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"EMAIL SKIPPED (no SMTP config): {subject} → {to_email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{FROM_NAME} <{SMTP_USER}>"
        msg["To"] = to_email

        # plain text version
        text_part = MIMEText(body, "plain")
        msg.attach(text_part)

        # send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        print(f"✅ EMAIL SENT: {subject} → {to_email}")
        return True

    except Exception as e:
        print(f"❌ EMAIL FAILED: {e}")
        return False


def send_shortlisted_email(candidate_email: str, candidate_name: str,
                            job_title: str, company: str) -> bool:
    subject = f"Congratulations! You've been shortlisted — {job_title} at {company}"
    body = f"""Dear {candidate_name},

Congratulations! You have been shortlisted for the position of {job_title} at {company}.

Our team was impressed with your profile and would like to move forward with your application.

You will receive further details about the interview process shortly. Please keep an eye on your HireFlow dashboard for updates.

Best regards,
{company} Hiring Team
HireFlow Platform"""
    return send_email(candidate_email, subject, body)


def send_rejected_email(candidate_email: str, candidate_name: str,
                         job_title: str, company: str,
                         reason: str = None, tips: list = None) -> bool:
    subject = f"Update on your application — {job_title} at {company}"
    tips_text = ""
    if tips:
        tips_text = "\n\nTo improve your future applications:\n"
        tips_text += "\n".join(f"• {tip}" for tip in tips[:3])

    body = f"""Dear {candidate_name},

Thank you for applying for {job_title} at {company}.

After careful review, we regret to inform you that we will not be moving forward with your application at this time.

{f'Reason: {reason}' if reason else ''}
{tips_text}

We encourage you to keep improving your profile and apply for future opportunities. Best of luck in your job search.

Best regards,
{company} Hiring Team
HireFlow Platform"""
    return send_email(candidate_email, subject, body)


def send_interview_email(candidate_email: str, candidate_name: str,
                          job_title: str, company: str,
                          date: str, time: str, duration: int,
                          format: str, meet_link: str = None,
                          notes: str = None) -> bool:
    subject = f"Interview Scheduled — {job_title} at {company}"
    link_text = f"\nMeeting Link: {meet_link}" if meet_link else ""
    notes_text = f"\nAdditional Notes: {notes}" if notes else ""

    body = f"""Dear {candidate_name},

Your interview has been scheduled for the position of {job_title} at {company}.

Interview Details:
─────────────────
Date:     {date}
Time:     {time} IST
Duration: {duration} minutes
Format:   {format.replace('_', ' ').title()}
{link_text}
{notes_text}

Please ensure you are available at the scheduled time. If you have any questions, contact the recruiter directly.

Best regards,
{company} Hiring Team
HireFlow Platform"""
    return send_email(candidate_email, subject, body)


def send_interview_rescheduled_email(candidate_email: str, candidate_name: str,
                                      job_title: str, company: str,
                                      new_date: str, new_time: str,
                                      meet_link: str = None) -> bool:
    subject = f"Interview Rescheduled — {job_title} at {company}"
    link_text = f"\nNew Meeting Link: {meet_link}" if meet_link else ""

    body = f"""Dear {candidate_name},

Your interview for {job_title} at {company} has been rescheduled.

New Interview Details:
──────────────────────
Date: {new_date}
Time: {new_time} IST
{link_text}

Please update your calendar accordingly.

Best regards,
{company} Hiring Team
HireFlow Platform"""
    return send_email(candidate_email, subject, body)


def create_notification(
    user_id: int,
    type: str,
    title: str,
    message: str,
    db,
    related_job_id: int = None,
    related_application_id: int = None
):
    """Create in-app notification in DB"""
    from app import models
    notification = models.Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_job_id=related_job_id,
        related_application_id=related_application_id
    )
    db.add(notification)
    db.commit()
