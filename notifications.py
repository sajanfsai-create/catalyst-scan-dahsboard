import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger(__name__)

def get_smtp_config():
    """Retrieve SMTP configuration from environment variables."""
    return {
        "host": os.environ.get("SMTP_HOST"),
        "port": int(os.environ.get("SMTP_PORT", 587)),
        "user": os.environ.get("SMTP_USER"),
        "password": os.environ.get("SMTP_PASSWORD"),
        "from_addr": os.environ.get("SMTP_FROM", "noreply@catalystscan.local"),
        "use_tls": os.environ.get("SMTP_USE_TLS", "true").lower() == "true"
    }

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an HTML email via SMTP."""
    config = get_smtp_config()
    
    if not config["host"] or not config["user"] or not config["password"]:
        logger.warning(f"SMTP configuration incomplete. Skipping email to {to_email}")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config["from_addr"]
    msg["To"] = to_email

    part2 = MIMEText(html_content, "html")
    msg.attach(part2)

    try:
        with smtplib.SMTP(config["host"], config["port"]) as server:
            if config["use_tls"]:
                server.starttls()
            server.login(config["user"], config["password"])
            server.sendmail(config["from_addr"], to_email, msg.as_string())
        logger.info(f"Successfully sent email to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def send_tamper_alert_email(to_email: str, device_name: str, fingerprint: str, alert_type: str, details: str):
    """Send a notification when a tamper alert is generated."""
    subject = f"[URGENT] CatalystScan Alert: {alert_type} detected on {device_name}"
    html = f"""
    <html>
      <body>
        <h2 style="color: #d9534f;">CatalystScan Security Alert</h2>
        <p>A tamper alert has been detected on one of your devices.</p>
        <table border="1" cellpadding="5" style="border-collapse: collapse;">
          <tr><th>Device Name</th><td>{device_name}</td></tr>
          <tr><th>Fingerprint</th><td>{fingerprint}</td></tr>
          <tr><th>Alert Type</th><td>{alert_type}</td></tr>
          <tr><th>Details</th><td>{details}</td></tr>
          <tr><th>Time (UTC)</th><td>{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}</td></tr>
        </table>
        <p>Please log in to the CatalystScan dashboard to review and resolve this alert.</p>
      </body>
    </html>
    """
    return send_email(to_email, subject, html)

def send_offline_alert_email(to_email: str, device_name: str, fingerprint: str, offline_hours: int):
    """Send a notification when a device has been offline for a certain threshold."""
    subject = f"CatalystScan Notice: Device {device_name} Offline"
    html = f"""
    <html>
      <body>
        <h2 style="color: #f0ad4e;">Device Offline Notification</h2>
        <p>A device in your fleet has not checked in recently.</p>
        <ul>
          <li><strong>Device Name:</strong> {device_name}</li>
          <li><strong>Fingerprint:</strong> {fingerprint}</li>
          <li><strong>Offline For:</strong> > {offline_hours} hours</li>
        </ul>
        <p>Please verify the status of this device.</p>
      </body>
    </html>
    """
    return send_email(to_email, subject, html)
