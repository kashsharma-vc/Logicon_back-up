import openpyxl

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated

from apps.core.models import Organization
from apps.jobs.models import JobRole
from apps.talent.models import Candidate
from apps.talent.services import normalize_phone
from apps.talent.tasks import generate_bulk_candidate_resumes_task


def _clean_val(val) -> str:
    if val is None:
        return ""

    s = str(val).strip()

    if s.endswith(".0") and s[:-2].isdigit():
        return s[:-2]

    return s


def _safe_phone_norm(mobile: str, idx: int) -> str:
    """
    Normalize phone numbers safely.

    Falls back to a generated number when the supplied value
    cannot be normalized.
    """

    if not mobile:
        return f"99{idx:08d}"

    try:
        normalized = normalize_phone(str(mobile))

        # Extra protection for DB max_length=20
        if normalized:
            return str(normalized)[:20]

    except Exception:
        pass

    digits = ''.join(
        filter(str.isdigit, str(mobile))
    )

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


def _is_valid_role_name(name: str) -> bool:
    """Validate that a string is a realistic job role name and not an email, date, phone, or garbage."""
    if not name:
        return False
    s = str(name).strip()
    # Reject email addresses
    if '@' in s or re.search(r'@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', s):
        return False
    # Reject dates or timestamps
    if '00:00:00' in s or re.search(r'\d{4}-\d{2}-\d{2}', s) or re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', s):
        return False
    # Reject mostly numeric strings / phone numbers
    digits = ''.join(filter(str.isdigit, s))
    if len(digits) >= 8 and (len(digits) / max(1, len(s)) > 0.6):
        return False
    # Reject URLs
    if s.startswith('http://') or s.startswith('https://') or s.startswith('www.'):
        return False
    # Reject excessively long strings (> 70 chars)
    if len(s) > 70:
        return False
    return True


class BulkExcelResumeGenerateView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):

        # ------------------------------------------------------------
        # 1. Get uploaded Excel file
        # ------------------------------------------------------------

        file_obj = (
            request.FILES.get('file')
            or request.FILES.get('excel_file')
            or request.FILES.get('import_file')
            or (
                next(iter(request.FILES.values()), None)
                if request.FILES
                else None
            )
            or request.data.get('file')
        )

        if not file_obj:
            return Response(
                {
                    "error": (
                        "No file provided. "
                        "Please attach a CSV or XLSX file."
                    )
                },
                status=400,
            )

        # ------------------------------------------------------------
        # 2. Resolve organization
        # ------------------------------------------------------------

        org = (
            getattr(request.user, 'org', None)
            or Organization.objects.first()
        )

        if not org:
            return Response(
                {
                    "error": (
                        "No organization set on account or system."
                    )
                },
                status=400,
            )

        collar_type = (
            request.POST.get('collar_type')
            or request.data.get('collar_type')
            or ''
        )

        billing_type = (
            request.POST.get('billing_type')
            or request.data.get('billing_type')
            or ''
        )

        # ------------------------------------------------------------
        # 3. Parse Excel candidate rows
        # ------------------------------------------------------------

        parsed_rows = []
        designation_names = set()
        mobiles = set()

        sheet_rows = []

        try:
            from .services import (
                _read_candidate_sheet,
                _value,
                _row_names,
                _decimal_or_none,
                _split_skills,
                normalize_skill_name,
            )

            file_obj.seek(0)
            sheet_rows = _read_candidate_sheet(file_obj)

        except Exception:
            sheet_rows = []

        # ------------------------------------------------------------
        # Preferred header-based parser
        # ------------------------------------------------------------

        if sheet_rows:

            for idx, row in enumerate(
                sheet_rows,
                start=1,
            ):

                mobile = _clean_val(
                    _value(
                        row,
                        'mobile', 'phone', 'contact', 'mobile_no', 'mobile_number',
                        'phone_number', 'contact_no', 'ph_no', 'mob', 'cell', 'tel',
                        'whatsapp', 'candidate_mobile', 'candidate_phone', 'calling_number',
                    )
                )

                alt_mobile = _clean_val(
                    _value(
                        row,
                        'alternate_phone', 'alt_phone', 'alternate_number', 'alt_number',
                        'secondary_phone', 'alt_contact', 'alternate_contact',
                        'alternate_mobile', 'alt_mob', 'other_number', 'emergency_contact',
                    )
                ) or None

                name = _clean_val(
                    _value(
                        row,
                        'name', 'full_name', 'candidate_name', 'first_name',
                        'name_of_candidate', 'applicant_name', 'applicant',
                        'employee_name', 'candidate', 'emp_name', 'person_name',
                    )
                )

                first_name, last_name = (
                    _row_names(row)
                    if name
                    else ('', '')
                )

                if not name and (first_name or last_name):
                    name = f"{first_name} {last_name}".strip()

                designation = _clean_val(
                    _value(
                        row,
                        'designation', 'role', 'job_role', 'current_role',
                        'mapped_role', 'position', 'target_role', 'post',
                        'trade', 'job_title', 'title', 'profile', 'work_profile',
                    )
                )

                email = _clean_val(_value(row, 'email', 'email_address', 'mail', 'email_id', 'e_mail', 'mail_id'))
                location = _clean_val(_value(row, 'current_location', 'location', 'city', 'address', 'work_location', 'place', 'job_location'))
                experience_raw = _value(row, 'total_experience_years', 'experience_years', 'experience', 'exp', 'total_exp', 'work_exp', 'total_experience', 'yrs_of_exp')
                company = _clean_val(_value(row, 'current_company', 'company', 'organization', 'employer', 'org', 'current_org', 'prev_company', 'firm'))
                skills_raw = _clean_val(_value(row, 'skills', 'skill', 'key_skills', 'technical_skills', 'skills_list', 'specialization', 'technologies'))

                # --------------------------------------------------------
                # Smart Content-Type Auto-Detection across all cell values
                # (Handles scrambled / misaligned columns gracefully)
                # --------------------------------------------------------
                all_cell_vals = [str(v).strip() for k, v in row.items() if k != '_source_row_number' and v not in (None, '')]

                # 1. Auto-detect Email if missing
                if not email:
                    for val in all_cell_vals:
                        if '@' in val and re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', val):
                            email = val
                            break

                # 2. Auto-detect Phone if missing
                if not mobile:
                    for val in all_cell_vals:
                        # 10-digit Indian phone pattern
                        match = re.search(r'\b[6-9]\d{9}\b', val)
                        if match:
                            mobile = match.group(0)
                            break
                        # Clean digits fallback
                        digs = ''.join(filter(str.isdigit, val))
                        if len(digs) == 10 and digs[0] in '6789':
                            mobile = digs
                            break

                # 3. Auto-detect Experience if missing
                if not experience_raw:
                    for val in all_cell_vals:
                        match = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?|yr)\b', val, re.I)
                        if match:
                            experience_raw = match.group(1)
                            break

                # 4. Auto-detect Designation if missing or invalid
                if not designation or not _is_valid_role_name(designation):
                    for val in all_cell_vals:
                        if val != name and val != email and val != location and val != company:
                            if _is_valid_role_name(val) and len(val) >= 3 and not re.search(r'\b[6-9]\d{9}\b', val):
                                designation = val
                                break

                # Completely empty candidate row
                if not mobile and not name and not email:
                    continue

                # Generate safe fallback phone
                if not mobile:
                    mobile = f"99{idx:08d}"

                # Generate fallback name
                if not name:
                    mobile_clean = ''.join(filter(str.isdigit, mobile))
                    name = f"Candidate {mobile_clean[-4:] if len(mobile_clean) >= 4 else idx}"

                # Final sanitize designation
                if not designation or not _is_valid_role_name(designation):
                    designation = "General Candidate"

                phone_norm = _safe_phone_norm(mobile, idx)
                alt_phone_norm = _safe_phone_norm(alt_mobile, idx) if alt_mobile else None

                parsed_rows.append(
                    {
                        'name': name,
                        'first_name': first_name,
                        'last_name': last_name,
                        'mobile': phone_norm,
                        'alt_mobile': alt_phone_norm,
                        'phone_norm': phone_norm,
                        'designation': designation,
                        'email': email,
                        'location': location,
                        'experience_raw': experience_raw,
                        'company': company,
                        'skills_raw': skills_raw,
                    }
                )

                designation_names.add(
                    designation
                )

                mobiles.add(
                    phone_norm
                )

        # ------------------------------------------------------------
        # Fallback direct openpyxl positional parser
        # ------------------------------------------------------------

        if not parsed_rows:

            try:

                file_obj.seek(0)

                wb = openpyxl.load_workbook(
                    file_obj,
                    read_only=True,
                    data_only=True,
                )

                for sheet in wb.worksheets:

                    for idx, row in enumerate(
                        sheet.iter_rows(
                            values_only=True
                        ),
                        start=1,
                    ):

                        if not row or not any(row):
                            continue

                        cell0 = (
                            _clean_val(row[0])
                            if len(row) > 0 and row[0]
                            else ""
                        )

                        cell1 = (
                            _clean_val(row[1])
                            if len(row) > 1 and row[1]
                            else ""
                        )

                        cell2 = (
                            _clean_val(row[2])
                            if len(row) > 2 and row[2]
                            else ""
                        )

                        # Header row
                        if (
                            idx == 1
                            and (
                                'name' in cell0.lower()
                                or 'mobile' in cell1.lower()
                                or 'phone' in cell1.lower()
                                or 'role' in cell2.lower()
                            )
                        ):
                            continue

                        if not cell0 and not cell1:
                            continue

                        mobile = (
                            cell1
                            or f"99{idx:08d}"
                        )

                        phone_norm = (
                            _safe_phone_norm(
                                mobile,
                                idx,
                            )
                        )

                        name = (
                            cell0
                            or f"Candidate {phone_norm[-4:]}"
                        )

                        designation = (
                            cell2
                            if cell2 and _is_valid_role_name(cell2)
                            else "General Candidate"
                        )

                        parsed_rows.append(
                            {
                                'name': name,
                                'mobile': phone_norm,
                                'alt_mobile': None,
                                'phone_norm': phone_norm,
                                'designation': designation,
                            }
                        )

                        designation_names.add(
                            designation
                        )

                        mobiles.add(
                            phone_norm
                        )

            except Exception:
                pass

        # ------------------------------------------------------------
        # No usable rows
        # ------------------------------------------------------------

        if not parsed_rows:

            return Response(
                {
                    "error": (
                        "No valid candidate rows found in the uploaded file. "
                        "Please ensure the file contains candidate data "
                        "with phone/mobile and name columns."
                    )
                },
                status=400,
            )

        # ------------------------------------------------------------
        # 4. Resolve / create JobRoles
        # ------------------------------------------------------------

        existing_roles = {
            role.name.lower(): role
            for role in JobRole.objects.filter(
                org=org
            )
        }

        roles_to_create = []

        for desig in designation_names:

            if not _is_valid_role_name(desig):
                continue

            role_key = desig.lower()

            if role_key not in existing_roles:

                role_code = (
                    re.sub(r'[^a-zA-Z0-9_]+', '_', desig.lower()).strip('_')[:64]
                ) or f"role_{len(roles_to_create)+1}"

                roles_to_create.append(
                    JobRole(
                        org=org,
                        name=desig,
                        code=role_code,
                        skill_category='skilled',
                    )
                )

        if roles_to_create:

            JobRole.objects.bulk_create(
                roles_to_create,
                batch_size=2000,
                ignore_conflicts=True,
            )

            existing_roles = {
                role.name.lower(): role
                for role in JobRole.objects.filter(
                    org=org
                )
            }

        # ------------------------------------------------------------
        # 5. Find existing Candidates
        # ------------------------------------------------------------

        existing_candidates = {
            candidate.phone_normalized: candidate

            for candidate in Candidate.objects.filter(
                org=org,
                phone_normalized__in=mobiles,
            )
        }

        candidates_to_create = []
        candidates_to_update = []

        created_phone_set = set()

        # ------------------------------------------------------------
        # 6. Prepare Candidate create/update
        # ------------------------------------------------------------

        for row_data in parsed_rows:

            phone_norm = row_data[
                'phone_norm'
            ]

            desig = row_data[
                'designation'
            ]

            job_role = existing_roles.get(
                desig.lower()
            )

            name = row_data[
                'name'
            ]

            parts = name.split(
                " ",
                1,
            )

            first_name = parts[0]

            last_name = (
                parts[1]
                if len(parts) > 1
                else ""
            )

            # --------------------------------------------------------
            # NEW Candidate
            # --------------------------------------------------------

            if (
                phone_norm not in existing_candidates
                and phone_norm not in created_phone_set
            ):

                candidate = Candidate(
                    org=org,

                    phone=phone_norm,

                    alternate_phone=(
                        row_data.get(
                            'alt_mobile'
                        )
                    ),

                    phone_normalized=phone_norm,

                    first_name=first_name,
                    last_name=last_name,

                    email=row_data.get('email') or '',
                    current_location=row_data.get('location') or '',
                    total_experience_years=_decimal_or_none(row_data.get('experience_raw')),
                    current_company=row_data.get('company') or '',

                    source='import_',

                    # Important:
                    # designation should be visible
                    # directly on Candidate too.
                    current_role=desig,

                    target_job_role=job_role,

                    collar_type=collar_type,

                    billing_type=(
                        billing_type
                        or None
                    ),
                )

                candidates_to_create.append(
                    candidate
                )

                created_phone_set.add(
                    phone_norm
                )

            # --------------------------------------------------------
            # Existing Candidate
            # --------------------------------------------------------

            elif phone_norm in existing_candidates:

                candidate = (
                    existing_candidates[
                        phone_norm
                    ]
                )

                if row_data.get(
                    'alt_mobile'
                ):
                    candidate.alternate_phone = (
                        row_data[
                            'alt_mobile'
                        ]
                    )

                if row_data.get('email') and not candidate.email:
                    candidate.email = row_data['email']

                if row_data.get('location') and not candidate.current_location:
                    candidate.current_location = row_data['location']

                if row_data.get('company') and not candidate.current_company:
                    candidate.current_company = row_data['company']

                exp_dec = _decimal_or_none(row_data.get('experience_raw'))
                if exp_dec is not None and candidate.total_experience_years is None:
                    candidate.total_experience_years = exp_dec

                if collar_type:
                    candidate.collar_type = (
                        collar_type
                    )

                if billing_type:
                    candidate.billing_type = (
                        billing_type
                    )

                if desig:
                    candidate.current_role = (
                        desig
                    )

                if job_role:
                    candidate.target_job_role = (
                        job_role
                    )

                candidates_to_update.append(
                    candidate
                )

        # ------------------------------------------------------------
        # 7. Bulk-create Candidates
        # ------------------------------------------------------------

        if candidates_to_create:

            Candidate.objects.bulk_create(
                candidates_to_create,
                batch_size=5000,
                ignore_conflicts=True,
            )

        # IMPORTANT:
        # Re-fetch candidates after bulk_create so that
        # all newly created candidates have real database IDs.
        existing_candidates = {
            candidate.phone_normalized: candidate

            for candidate in Candidate.objects.filter(
                org=org,
                phone_normalized__in=mobiles,
            )
        }

        # ------------------------------------------------------------
        # 8. Bulk-update existing Candidates
        # ------------------------------------------------------------

        if candidates_to_update:

            Candidate.objects.bulk_update(
                candidates_to_update,
                [
                    'alternate_phone',
                    'email',
                    'current_location',
                    'current_company',
                    'total_experience_years',
                    'collar_type',
                    'billing_type',
                    'current_role',
                    'target_job_role',
                ],
                batch_size=5000,
            )

        # ------------------------------------------------------------
        # 8b. Create candidate skills
        # ------------------------------------------------------------
        from apps.talent.models import CandidateSkill
        for row_data in parsed_rows:
            phone_norm = row_data['phone_norm']
            cand = existing_candidates.get(phone_norm)
            if cand and row_data.get('skills_raw'):
                for skill_name in _split_skills(row_data['skills_raw']):
                    norm_s = normalize_skill_name(skill_name)
                    CandidateSkill.objects.get_or_create(
                        candidate=cand,
                        normalized_skill_name=norm_s,
                        defaults={
                            'skill_name': skill_name,
                            'source': 'excel_import',
                        },
                    )

        # ------------------------------------------------------------
        # 9. Queue Resume generation using Celery
        # ------------------------------------------------------------

        candidate_ids = list(
            {
                candidate.id
                for candidate in existing_candidates.values()
                if candidate.id
            }
        )

        RESUME_CHUNK_SIZE = 500

        queued_chunks = 0

        for start in range(
            0,
            len(candidate_ids),
            RESUME_CHUNK_SIZE,
        ):

            chunk_ids = candidate_ids[
                start:
                start + RESUME_CHUNK_SIZE
            ]

            generate_bulk_candidate_resumes_task.delay(
                chunk_ids
            )

            queued_chunks += 1

        # ------------------------------------------------------------
        # 10. Return immediately
        # ------------------------------------------------------------

        return Response(
            {
                "message": (
                    f"Processed {len(parsed_rows)} candidate rows. "
                    f"{len(candidates_to_create)} new candidates created. "
                    f"Resume generation queued in "
                    f"{queued_chunks} background chunks."
                ),
                "rows_processed": len(parsed_rows),
                "new_candidates": len(candidates_to_create),
                "candidate_count": len(candidate_ids),
                "resume_chunks_queued": queued_chunks,
                "resume_chunk_size": RESUME_CHUNK_SIZE,
            },
            status=202,
        )
