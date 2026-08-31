import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.talent.models import ResumeSummary
from apps.hiring.models import CandidateMatchResult, HiringApplication

rs = ResumeSummary.objects.filter(confidence__isnull=False).first()
if rs:
    print(f"ResumeSummary confidence: {rs.confidence}")

cm = CandidateMatchResult.objects.filter(match_score__isnull=False).first()
if cm:
    print(f"CandidateMatchResult match_score: {cm.match_score}")

ha = HiringApplication.objects.filter(match_score__isnull=False).first()
if ha:
    print(f"HiringApplication match_score: {ha.match_score}")
