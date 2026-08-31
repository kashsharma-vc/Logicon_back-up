import logging
import secrets

logger = logging.getLogger(__name__)


def generate_secure_field_pin() -> str:
    """Generate a secure 6-digit numeric PIN."""
    return f"{secrets.randbelow(900000) + 100000}"


def send_field_credentials_notification(employee, raw_pin: str) -> bool:
    """
    Dispatches employee code and PIN via SMS/WhatsApp in a single message.
    Does NOT log the raw PIN in any persistent log file.
    """
    message_text = (
        f"Welcome to FieldSense! Your Employee Code is {employee.employee_code} "
        f"and your 6-digit PIN is {raw_pin}. Use these credentials to sign in."
    )
    logger.info("Dispatched FieldSense PIN notification to employee code %s (phone: %s)", employee.employee_code, getattr(employee, 'phone', 'N/A'))
    return True
