import io
import openpyxl
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

from apps.jobs.models import JobRole
from apps.talent.models import Candidate, Resume

class BulkExcelResumeGenerateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({"error": "No file provided"}, status=400)
            
        file_obj = request.FILES['file']
        try:
            wb = openpyxl.load_workbook(file_obj)
            ws = wb.active
        except Exception as e:
            return Response({"error": f"Failed to read Excel file: {str(e)}"}, status=400)
            
        org = request.user.org
        if not org:
            return Response({"error": "User does not belong to an organization."}, status=400)

        collar_type = request.POST.get('collar_type', '')
        billing_type = request.POST.get('billing_type', '')

        created_count = 0
        
        # Iterate over rows, skip header
        for idx, row in enumerate(ws.iter_rows(values_only=True)):
            if idx == 0:
                continue # Skip header
                
            if not row or not any(row):
                continue
                
            # Expected columns: Name, Mobile No, Designation
            name = str(row[0]).strip() if row[0] else ""
            mobile = str(row[1]).strip() if len(row) > 1 and row[1] else ""
            designation = str(row[2]).strip() if len(row) > 2 and row[2] else ""
            
            if not name or not mobile or not designation:
                continue
                
            # Get or create JobRole
            job_role = JobRole.objects.filter(org=org, name__iexact=designation).first()
            if not job_role:
                job_role = JobRole.objects.create(
                    org=org,
                    name=designation,
                    code=designation.lower().replace(" ", "_")[:64],
                    skill_category='skilled'
                )
            
            # Get or create Candidate
            parts = name.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""
            
            candidate = Candidate.objects.filter(org=org, phone_normalized=mobile).first()
            if not candidate:
                candidate = Candidate.objects.create(
                    org=org,
                    phone=mobile,
                    phone_normalized=mobile,
                    first_name=first_name,
                    last_name=last_name,
                    source='excel_import',
                    target_job_role=job_role,
                    collar_type=collar_type,
                    billing_type=billing_type or None,
                )
            else:
                # Update existing candidate if needed
                if collar_type:
                    candidate.collar_type = collar_type
                if billing_type:
                    candidate.billing_type = billing_type
                candidate.target_job_role = job_role
                candidate.save()
            
            # Generate PDF
            buffer = io.BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            p.setFont("Helvetica-Bold", 24)
            p.drawString(100, 700, name)
            
            p.setFont("Helvetica", 14)
            p.drawString(100, 660, f"Designation: {designation}")
            p.drawString(100, 630, f"Mobile: {mobile}")
            
            p.setFont("Helvetica", 12)
            p.drawString(100, 580, f"Auto-generated resume for {name}.")
            p.drawString(100, 560, f"Applying for the {designation} role.")
            p.showPage()
            p.save()
            
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            # Create Resume
            resume = Resume(
                candidate=candidate,
                original_filename=f"{name.replace(' ', '_')}_{designation}.pdf",
                content_type="application/pdf",
                size_bytes=len(pdf_bytes),
                status='uploaded',
                source_type='excel_import',
                document_type='pdf',
                target_job_role=job_role
            )
            resume.file.save(f"{name.replace(' ', '_')}_resume.pdf", ContentFile(pdf_bytes), save=True)
            
            created_count += 1

        return Response({"message": f"Successfully generated {created_count} resumes into the pool!"})
