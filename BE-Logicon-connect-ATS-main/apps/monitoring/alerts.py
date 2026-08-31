import logging
import json
import urllib.request
from django.conf import settings

logger = logging.getLogger(__name__)


def capture_provisioning_failure_alert(employee_id: int, action: str, error_detail: str, attempts: int):
    """
    Fires Sentry event and dispatches PagerDuty / Webhook alert on dead-letter or provisioning failure.
    """
    alert_payload = {
        "event_type": "fieldsense_provisioning_failed",
        "severity": "CRITICAL",
        "employee_id": employee_id,
        "action": action,
        "attempts": attempts,
        "error_detail": error_detail,
        "environment": getattr(settings, 'ENVIRONMENT', 'production'),
    }

    logger.critical("DEAD-LETTER CRITICAL ALERT: %s", json.dumps(alert_payload))

    # Dispatch to Sentry if SENTRY_DSN is configured
    sentry_dsn = getattr(settings, 'SENTRY_DSN', '')
    if sentry_dsn:
        try:
            import sentry_sdk
            sentry_sdk.capture_message(
                f"FieldSense Provisioning Dead-Letter: Employee #{employee_id} ({action}) - {error_detail}",
                level="fatal",
            )
        except ImportError:
            pass

    # Dispatch to PagerDuty / Webhook if WEBHOOK_URL is configured
    webhook_url = getattr(settings, 'PAGERDUTY_WEBHOOK_URL', '')
    if webhook_url:
        try:
            req = urllib.request.Request(
                webhook_url,
                data=json.dumps(alert_payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception as exc:
            logger.error("Failed to dispatch alert webhook to PagerDuty: %s", exc)

    return alert_payload
