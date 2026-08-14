import io
import openpyxl
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated

from apps.core.models import Organization
from apps.jobs.models import JobRole
from apps.talent.models import Candidate, Resume
from apps.talent.services import normalize_phone


def _clean_val(val) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    if s.endswith(".0") and s[:-2].isdigit():
        return s[:-2]
    return s


def _safe_phone_norm(mobile: str, idx: int) -> str:
    if not mobile:
        return f"99{idx:08d}"
    try:
        return normalize_phone(str(mobile))
    except Exception:
        digits = ''.join(filter(str.isdigit, str(mobile)))
        if digits.startswith('91') and len(digits) == 12:
            digits = digits[2:]
        elif digits.startswith('0') and len(digits) == 11:
            digits = digits[1:]
        if len(digits) == 10:
            return digits
        if len(digits) > 10:
            return digits[-10:]
        if len(digits) > 0:
            return digits.zfill(10)
        return f"99{idx:08d}"


class BulkExcelResumeGenerateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        file_obj = (
            request.FILES.get('file')
            or request.FILES.get('excel_file')
            or request.FILES.get('import_file')
            or (next(iter(request.FILES.values()), None) if request.FILES else None)
            or request.data.get('file')
        )
        if not file_obj:
            return Response({"error": "No file provided. Please attach a CSV or XLSX file."}, status=400)
            
        org = getattr(request.user, 'org', None) or Organization.objects.first()
        if not org:
            return Response({"error": "No organization set on account or system."}, status=400)

        collar_type = request.POST.get('collar_type') or request.data.get('collar_type') or ''
        billing_type = request.POST.get('billing_type') or request.data.get('billing_type') or ''

        # 1. Collect all valid rows into memory efficiently
        parsed_rows = []
        designation_names = set()
        mobiles = set()

        sheet_rows = []
        try:
            from .services import _read_candidate_sheet, _value, _row_names
            file_obj.seek(0)
            sheet_rows = _read_candidate_sheet(file_obj)
        except Exception:
            sheet_rows = []

        if sheet_rows:
            for idx, row in enumerate(sheet_rows, start=1):
                mobile = _clean_val(_value(row, 'mobile', 'phone', 'contact', 'mobile_no', 'mobile_number', 'phone_number'))
                alt_mobile = _clean_val(_value(row, 'alternate_phone', 'alt_phone', 'alternate_number', 'alt_number', 'secondary_phone', 'alt_contact', 'alternate_contact', 'alternate_mobile')) or None
                name = _clean_val(_value(row, 'name', 'full_name', 'candidate_name', 'first_name', 'name_of_candidate'))
                first_name, last_name = _row_names(row) if name else ('', '')
                if not name and (first_name or last_name):
                    name = f"{first_name} {last_name}".strip()
                designation = _clean_val(_value(row, 'designation', 'role', 'job_role', 'current_role', 'mapped_role', 'position'))

                if not mobile and not name:
                    continue

                if not mobile:
                    mobile = f"99{idx:08d}"
                if not name:
                    mobile_clean = ''.join(filter(str.isdigit, mobile))
                    name = f"Candidate {mobile_clean[-4:] if len(mobile_clean) >= 4 else idx}"
                if not designation:
                    designation = 'General Candidate'

                phone_norm = _safe_phone_norm(mobile, idx)
                parsed_rows.append({
                    'name': name,
                    'mobile': mobile,
                    'alt_mobile': alt_mobile,
                    'phone_norm': phone_norm,
                    'designation': designation,
                })
                designation_names.add(designation)
                mobiles.add(phone_norm)

        # Fallback to direct positional openpyxl read if sheet_rows produced no rows
        if not parsed_rows:
            try:
                file_obj.seek(0)
                wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
                for sheet in wb.worksheets:
                    for idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
                        if not row or not any(row):
                            continue

                        cell0 = _clean_val(row[0]) if len(row) > 0 and row[0] else ""
                        cell1 = _clean_val(row[1]) if len(row) > 1 and row[1] else ""
                        cell2 = _clean_val(row[2]) if len(row) > 2 and row[2] else ""

                        if idx == 1 and ('name' in cell0.lower() or 'mobile' in cell1.lower() or 'phone' in cell1.lower() or 'role' in cell2.lower()):
                            continue  # skip header row

                        if not cell0 and not cell1:
                            continue

                        mobile = cell1 or f"99{idx:08d}"
                        name = cell0 or f"Candidate {mobile[-4:]}"
                        designation = cell2 or "General Candidate"

                        phone_norm = _safe_phone_norm(mobile, idx)
                        parsed_rows.append({
                            'name': name,
                            'mobile': mobile,
                            'alt_mobile': None,
                            'phone_norm': phone_norm,
                            'designation': designation,
                        })
                        designation_names.add(designation)
                        mobiles.add(phone_norm)
            except Exception:
                pass

        if not parsed_rows:
            return Response({"error": "No valid candidate rows found in the uploaded file. Please ensure the file contains candidate data with phone/mobile and name columns."}, status=400)

        # 2. Batch lookup & create missing JobRoles in 1-2 queries
        existing_roles = {r.name.lower(): r for r in JobRole.objects.filter(org=org)}
        roles_to_create = []
        for desig in designation_names:
            if desig.lower() not in existing_roles:
                roles_to_create.append(
                    JobRole(
                        org=org,
                        name=desig,
                        code=desig.lower().replace(" ", "_")[:64],
                        skill_category='skilled',
                    )
                )
        if roles_to_create:
            JobRole.objects.bulk_create(roles_to_create, batch_size=2000, ignore_conflicts=True)
            existing_roles = {r.name.lower(): r for r in JobRole.objects.filter(org=org)}

        # 3. Batch lookup & bulk create/update Candidates
        existing_candidates = {c.phone_normalized: c for c in Candidate.objects.filter(org=org, phone_normalized__in=mobiles)}
        
        candidates_to_create = []
        candidates_to_update = []
        created_phone_set = set()

        for row_data in parsed_rows:
            phone_norm = row_data['phone_norm']
            desig = row_data['designation']
            job_role = existing_roles.get(desig.lower())
            
            name = row_data['name']
            parts = name.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""

            if phone_norm not in existing_candidates and phone_norm not in created_phone_set:
                c = Candidate(
                    org=org,
                    phone=row_data['mobile'],
                    alternate_phone=row_data.get('alt_mobile'),
                    phone_normalized=phone_norm,
                    first_name=first_name,
                    last_name=last_name,
                    source='excel_import',
                    target_job_role=job_role,
                    collar_type=collar_type,
                    billing_type=billing_type or None,
                )
                candidates_to_create.append(c)
                created_phone_set.add(phone_norm)
            elif phone_norm in existing_candidates:
                c = existing_candidates[phone_norm]
                if row_data.get('alt_mobile'):
                    c.alternate_phone = row_data['alt_mobile']
                c.collar_type = collar_type or c.collar_type
                c.billing_type = billing_type or c.billing_type
                c.target_job_role = job_role or c.target_job_role
                candidates_to_update.append(c)

        if candidates_to_create:
            Candidate.objects.bulk_create(candidates_to_create, batch_size=5000, ignore_conflicts=True)
            existing_candidates = {c.phone_normalized: c for c in Candidate.objects.filter(org=org, phone_normalized__in=mobiles)}

        if candidates_to_update:
            Candidate.objects.bulk_update(candidates_to_update, ['alternate_phone', 'collar_type', 'billing_type', 'target_job_role'], batch_size=5000)


        # 4. Generate Resumes in bulk efficiently (with strict deduplication for repeated candidates)
        sample_pdf_bytes = self._generate_sample_pdf_bytes()
        pdf_file = ContentFile(sample_pdf_bytes, name="synthetic_resume.pdf")

        cand_ids = [c.id for c in existing_candidates.values() if c.id]
        existing_candidate_resumes = set(
            Resume.objects.filter(candidate_id__in=cand_ids)
            .values_list('candidate_id', 'target_job_role_id')
        )
        created_resume_keys = set()
        resumes_to_create = []

        for row_data in parsed_rows:
            phone_norm = row_data['phone_norm']
            candidate = existing_candidates.get(phone_norm)
            if not candidate:
                continue
            
            desig = row_data['designation']
            job_role = existing_roles.get(desig.lower())
            role_id = job_role.id if job_role else None
            dedup_key = (candidate.id, role_id)

            # Skip if candidate already has a resume for this role in DB or in this upload batch
            if dedup_key in existing_candidate_resumes or dedup_key in created_resume_keys:
                continue

            created_resume_keys.add(dedup_key)
            name = row_data['name']
            safe_name = name.replace(' ', '_')

            r = Resume(
                candidate=candidate,
                original_filename=f"{safe_name}_{desig}.pdf",
                content_type="application/pdf",
                size_bytes=len(sample_pdf_bytes),
                status='uploaded',
                source_type='excel_import',
                document_type='pdf',
                target_job_role=job_role,
            )
            r.file.save(f"{safe_name}_resume.pdf", pdf_file, save=False)
            resumes_to_create.append(r)

        if resumes_to_create:
            Resume.objects.bulk_create(resumes_to_create, batch_size=5000)

        return Response({
            "message": f"Processed {len(parsed_rows)} candidate rows ({len(candidates_to_create)} new candidates created, {len(resumes_to_create)} resumes added, skipped rapid duplicates)."
        })

    def _generate_sample_pdf_bytes(self):
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.setFont("Helvetica-Bold", 20)
        p.drawString(100, 700, "Candidate Resume Document")
        p.setFont("Helvetica", 12)
        p.drawString(100, 660, "Auto-generated bulk import document for talent pool intake.")
        p.showPage()
        p.save()
        val = buffer.getvalue()
        buffer.close()
        return val
