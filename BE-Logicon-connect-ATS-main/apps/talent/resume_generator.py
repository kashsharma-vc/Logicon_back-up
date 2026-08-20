"""
apps/talent/resume_generator.py

Professional ATS Resume PDF generator for candidates in Logicon Connect ATS.
Uses ReportLab Platypus to render clean, executive, beautifully formatted CVs.
"""

import io
import re
import html
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)


def _escape(val) -> str:
    """Safely escape XML characters for ReportLab Paragraphs."""
    if val is None:
        return ""
    s = str(val).strip()
    # Normalize fancy unicode dashes and quotes to ASCII
    s = s.replace('\u2013', '-').replace('\u2014', '-').replace('\u2018', "'").replace('\u2019', "'").replace('\u2022', '*')
    return html.escape(s)


def _safe_str(val, default="Not Provided") -> str:
    if val is None or str(val).strip() in ("", "None", "null", "undefined", "—", "-"):
        return default
    return str(val).strip()


def build_candidate_text_summary(candidate) -> str:
    """
    Build a plain text summary of candidate data for search indexing and raw_text storage.
    """
    lines = []
    full_name = candidate.full_name.strip() or f"Candidate {candidate.id}"
    lines.append(f"Name: {full_name}")

    phone = candidate.phone_normalized or candidate.phone
    if phone:
        lines.append(f"Phone: {phone}")
    if candidate.alternate_phone:
        lines.append(f"Alternate Phone: {candidate.alternate_phone}")
    if candidate.email:
        lines.append(f"Email: {candidate.email}")

    role_name = ""
    if candidate.target_job_role:
        role_name = candidate.target_job_role.name
    elif candidate.current_role:
        role_name = candidate.current_role
    if role_name:
        lines.append(f"Role / Designation: {role_name}")

    if candidate.current_location:
        lines.append(f"Location: {candidate.current_location}")
    if candidate.preferred_location:
        lines.append(f"Preferred Location: {candidate.preferred_location}")

    if candidate.total_experience_years is not None:
        lines.append(f"Total Experience: {candidate.total_experience_years} Years")
    if candidate.current_company:
        lines.append(f"Current Company: {candidate.current_company}")

    if candidate.collar_type:
        collar_disp = candidate.get_collar_type_display() if hasattr(candidate, 'get_collar_type_display') else candidate.collar_type
        lines.append(f"Collar Type: {collar_disp}")
    if candidate.billing_type:
        bill_disp = candidate.get_billing_type_display() if hasattr(candidate, 'get_billing_type_display') else candidate.billing_type
        lines.append(f"Billing Type: {bill_disp}")

    # Skills
    skills = list(candidate.skills.all()) if hasattr(candidate, 'skills') else []
    if skills:
        skill_str = ", ".join(s.skill_name for s in skills if s.skill_name)
        if skill_str:
            lines.append(f"Skills: {skill_str}")

    # Experiences
    experiences = list(candidate.experiences.all()) if hasattr(candidate, 'experiences') else []
    if experiences:
        lines.append("Work History:")
        for exp in experiences:
            exp_line = f"  - {exp.job_title} at {exp.company_name}"
            if exp.start_date or exp.end_date:
                start = exp.start_date.strftime('%b %Y') if exp.start_date else ''
                end = 'Present' if exp.is_current else (exp.end_date.strftime('%b %Y') if exp.end_date else '')
                exp_line += f" ({start} - {end})"
            lines.append(exp_line)
            exp_desc = getattr(exp, 'description', '') or (', '.join(exp.responsibilities) if isinstance(getattr(exp, 'responsibilities', None), list) else str(getattr(exp, 'responsibilities', '') or ''))
            if exp_desc:
                lines.append(f"    {exp_desc}")

    # Educations
    educations = list(candidate.educations.all()) if hasattr(candidate, 'educations') else []
    if educations:
        lines.append("Education:")
        for edu in educations:
            edu_line = f"  - {edu.degree}"
            inst = getattr(edu, 'institute', getattr(edu, 'institution', ''))
            if inst:
                edu_line += f", {inst}"
            if edu.end_year:
                edu_line += f" ({edu.end_year})"
            lines.append(edu_line)

    return "\n".join(lines)


def generate_candidate_resume_pdf_bytes(candidate) -> bytes:
    """
    Generate a professional, high-quality ATS resume PDF document for a candidate.
    Returns the binary PDF content.
    """
    buffer = io.BytesIO()

    # Geometry & Theme
    PAGE_WIDTH, PAGE_HEIGHT = letter
    MARGIN = 36  # 0.5 inch margins

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=f"Resume_{candidate.full_name or candidate.id}",
        author="Logicon Connect ATS",
    )

    # Color Palette
    PRIMARY = colors.HexColor("#1E3A8A")       # Deep Navy
    SECONDARY = colors.HexColor("#2563EB")     # Royal Blue
    TEXT_DARK = colors.HexColor("#1E293B")     # Dark Slate
    TEXT_MUTED = colors.HexColor("#64748B")    # Slate Gray
    BG_LIGHT = colors.HexColor("#F8FAFC")      # Slate 50
    BG_HEADER = colors.HexColor("#EFF6FF")     # Blue 50
    BORDER_COLOR = colors.HexColor("#CBD5E1")  # Slate 300

    # Typography Styles
    styles = getSampleStyleSheet()

    name_style = ParagraphStyle(
        'CandidateName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
    )

    role_subtitle_style = ParagraphStyle(
        'CandidateRole',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=SECONDARY,
    )

    meta_tag_style = ParagraphStyle(
        'CandidateMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_MUTED,
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=PRIMARY,
        textTransform='uppercase',
    )

    label_style = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_MUTED,
    )

    value_style = ParagraphStyle(
        'ValueStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=TEXT_DARK,
    )

    value_bold_style = ParagraphStyle(
        'ValueBoldStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=TEXT_DARK,
    )

    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
    )

    skill_badge_style = ParagraphStyle(
        'SkillBadge',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
    )

    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MUTED,
        alignment=1,  # Center
    )

    content_width = PAGE_WIDTH - (2 * MARGIN)

    story = []

    # ─────────────────────────────────────────────────────────────────────────
    # 1. HEADER SECTION (Card with subtle border and fill)
    # ─────────────────────────────────────────────────────────────────────────
    full_name = _escape(candidate.full_name.strip() or f"Candidate {candidate.id}")
    
    role_display = "General Candidate"
    if candidate.target_job_role:
        role_display = candidate.target_job_role.name
    elif candidate.current_role:
        role_display = candidate.current_role
    role_display = _escape(role_display)

    source_label = _escape(candidate.get_source_display() if hasattr(candidate, 'get_source_display') else (candidate.source or "Talent Pool"))
    created_date = candidate.created_at.strftime('%d %b %Y') if hasattr(candidate, 'created_at') and candidate.created_at else datetime.now().strftime('%d %b %Y')

    header_left = [
        Paragraph(f"<b>{full_name}</b>", name_style),
        Spacer(1, 2),
        Paragraph(f"<b>{role_display.upper()}</b>", role_subtitle_style),
    ]

    header_right = [
        Paragraph(f"<b>Candidate ID:</b> #{candidate.id}", value_style),
        Spacer(1, 2),
        Paragraph(f"<b>Source:</b> {source_label} | <b>Intake:</b> {created_date}", meta_tag_style),
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[content_width * 0.65, content_width * 0.35],
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BACKGROUND', (0, 0), (-1, -1), BG_HEADER),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#BFDBFE")),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))

    story.append(header_table)
    story.append(Spacer(1, 10))

    # Helper function for section headers
    def make_section_header(title: str):
        p = Paragraph(f"<b>{_escape(title)}</b>", section_heading_style)
        t = Table([[p]], colWidths=[content_width])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('LINEBELOW', (0, 0), (-1, -1), 1.5, PRIMARY),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        return t

    # ─────────────────────────────────────────────────────────────────────────
    # 2. CONTACT & PROFILE INFORMATION
    # ─────────────────────────────────────────────────────────────────────────
    story.append(make_section_header("Contact & Profile Details"))
    story.append(Spacer(1, 4))

    phone_val = _escape(candidate.phone_normalized or candidate.phone or "Not Provided")
    alt_phone_val = _escape(candidate.alternate_phone or "Not Provided")
    email_val = _escape(candidate.email or "Not Provided")
    loc_val = _escape(candidate.current_location or "Not Provided")
    pref_loc_val = _escape(candidate.preferred_location or "Any")

    collar_val = "Not Specified"
    if candidate.collar_type:
        collar_val = _escape(candidate.get_collar_type_display() if hasattr(candidate, 'get_collar_type_display') else candidate.collar_type)

    billing_val = "Not Specified"
    if candidate.billing_type:
        billing_val = _escape(candidate.get_billing_type_display() if hasattr(candidate, 'get_billing_type_display') else candidate.billing_type)

    contact_rows = [
        [
            Paragraph("Primary Phone:", label_style),
            Paragraph(f"<b>{phone_val}</b>", value_style),
            Paragraph("Current Location:", label_style),
            Paragraph(loc_val, value_style),
        ],
        [
            Paragraph("Alternate Phone:", label_style),
            Paragraph(alt_phone_val, value_style),
            Paragraph("Preferred Location:", label_style),
            Paragraph(pref_loc_val, value_style),
        ],
        [
            Paragraph("Email Address:", label_style),
            Paragraph(email_val, value_style),
            Paragraph("Collar / Billing:", label_style),
            Paragraph(f"{collar_val} | {billing_val}", value_style),
        ],
    ]

    col_w = [content_width * 0.20, content_width * 0.30, content_width * 0.22, content_width * 0.28]
    contact_table = Table(contact_rows, colWidths=col_w)
    contact_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#F1F5F9")),
    ]))

    story.append(contact_table)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. PROFESSIONAL SUMMARY & EMPLOYMENT STATUS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(make_section_header("Professional Overview"))
    story.append(Spacer(1, 4))

    exp_val = "Fresher / Entry Level"
    if candidate.total_experience_years is not None and candidate.total_experience_years > 0:
        exp_val = f"{candidate.total_experience_years} Years"
    exp_val = _escape(exp_val)

    curr_comp = _escape(candidate.current_company or "Not Specified")
    curr_role = _escape(candidate.current_role or role_display)

    notice_val = f"{candidate.notice_period_days} Days" if candidate.notice_period_days is not None else "Immediate / Unknown"
    notice_val = _escape(notice_val)

    ctc_val = "Not Specified"
    if candidate.current_ctc is not None or candidate.expected_ctc is not None:
        cur = f"INR {candidate.current_ctc:,.0f}" if candidate.current_ctc else "N/A"
        exp = f"INR {candidate.expected_ctc:,.0f}" if candidate.expected_ctc else "N/A"
        ctc_val = f"Current: {cur} | Expected: {exp}"

    overview_rows = [
        [
            Paragraph("Total Experience:", label_style),
            Paragraph(f"<b>{exp_val}</b>", value_style),
            Paragraph("Current Company:", label_style),
            Paragraph(curr_comp, value_style),
        ],
        [
            Paragraph("Current Role:", label_style),
            Paragraph(curr_role, value_style),
            Paragraph("Notice Period:", label_style),
            Paragraph(notice_val, value_style),
        ],
    ]

    if ctc_val != "Not Specified":
        overview_rows.append([
            Paragraph("Compensation (CTC):", label_style),
            Paragraph(ctc_val, value_style),
            Paragraph("", label_style),
            Paragraph("", value_style),
        ])

    overview_table = Table(overview_rows, colWidths=col_w)
    overview_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#F1F5F9")),
    ]))

    story.append(overview_table)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 4. SKILLS & COMPETENCIES
    # ─────────────────────────────────────────────────────────────────────────
    skills_list = list(candidate.skills.all()) if hasattr(candidate, 'skills') else []

    story.append(make_section_header("Skills & Competencies"))
    story.append(Spacer(1, 4))

    if skills_list:
        skill_items = []
        for s in skills_list:
            s_name = _escape(s.skill_name)
            prof = f" ({_escape(s.get_proficiency_display())})" if hasattr(s, 'get_proficiency_display') and getattr(s, 'proficiency', None) else ""
            yrs = f" [{s.years_experience} yrs]" if getattr(s, 'years_experience', None) else ""
            skill_items.append(f"- <b>{s_name}</b>{prof}{yrs}")

        # Distribute into 2 columns
        mid = (len(skill_items) + 1) // 2
        col1 = "<br/>".join(skill_items[:mid])
        col2 = "<br/>".join(skill_items[mid:]) if mid < len(skill_items) else ""

        skills_table = Table(
            [[Paragraph(col1, skill_badge_style), Paragraph(col2, skill_badge_style)]],
            colWidths=[content_width * 0.5, content_width * 0.5],
        )
        skills_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(skills_table)
    else:
        # Default skill based on target role or designation
        default_skill_text = f"- Core Competency: <b>{role_display}</b><br/>- General operations, task execution, and site readiness."
        story.append(Paragraph(default_skill_text, skill_badge_style))

    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 5. WORK EXPERIENCE / EMPLOYMENT HISTORY
    # ─────────────────────────────────────────────────────────────────────────
    experiences = list(candidate.experiences.all()) if hasattr(candidate, 'experiences') else []

    story.append(make_section_header("Work Experience History"))
    story.append(Spacer(1, 4))

    if experiences:
        for idx, exp in enumerate(experiences):
            exp_title = _escape(exp.job_title or "Position")
            exp_company = _escape(exp.company_name or "Company")
            
            start_str = exp.start_date.strftime('%b %Y') if exp.start_date else ""
            end_str = "Present" if exp.is_current else (exp.end_date.strftime('%b %Y') if exp.end_date else "")
            duration_str = f"{start_str} - {end_str}".strip(" -") if (start_str or end_str) else "Duration not specified"
            duration_str = _escape(duration_str)

            loc_val = getattr(exp, 'location', '')
            loc_str = f" | {_escape(loc_val)}" if loc_val else ""

            exp_block = [
                Paragraph(f"<b>{exp_title}</b> - <font color='{PRIMARY.hexval()}'>{exp_company}</font>{loc_str}", value_bold_style),
                Paragraph(f"<font color='{TEXT_MUTED.hexval()}'>{duration_str}</font>", meta_tag_style),
            ]

            exp_desc = getattr(exp, 'description', '') or (', '.join(exp.responsibilities) if isinstance(getattr(exp, 'responsibilities', None), list) else str(getattr(exp, 'responsibilities', '') or ''))
            if exp_desc:
                exp_block.append(Spacer(1, 2))
                exp_block.append(Paragraph(_escape(exp_desc), body_style))

            exp_table = Table([[exp_block]], colWidths=[content_width])
            exp_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT if idx % 2 == 0 else colors.white),
                ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(exp_table)
            story.append(Spacer(1, 4))
    else:
        # If no explicit CandidateExperience rows, display current company summary if present
        if candidate.current_company or candidate.current_role:
            comp_name = _escape(candidate.current_company or "Previous Employer")
            r_name = _escape(candidate.current_role or role_display)
            exp_text = f"<b>{r_name}</b> at <b>{comp_name}</b> ({exp_val})<br/><font color='{TEXT_MUTED.hexval()}'>Primary profile record from talent intake.</font>"
        else:
            exp_text = f"<b>{role_display}</b> ({exp_val})<br/><font color='{TEXT_MUTED.hexval()}'>Profile created via intake without separate previous employment logs.</font>"

        emp_table = Table([[Paragraph(exp_text, body_style)]], colWidths=[content_width])
        emp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(emp_table)

    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 6. EDUCATION & CREDENTIALS
    # ─────────────────────────────────────────────────────────────────────────
    educations = list(candidate.educations.all()) if hasattr(candidate, 'educations') else []

    if educations:
        story.append(make_section_header("Education & Credentials"))
        story.append(Spacer(1, 4))

        for edu in educations:
            deg = _escape(edu.degree or "Degree / Certification")
            inst = _escape(getattr(edu, 'institute', getattr(edu, 'institution', 'Institution')) or "Institution")
            spec = getattr(edu, 'specialization', getattr(edu, 'field_of_study', ''))
            field = f" ({_escape(spec)})" if spec else ""
            yr = f" | Class of {edu.end_year}" if edu.end_year else ""
            score = f" | Score: {_escape(edu.grade_or_score)}" if hasattr(edu, 'grade_or_score') and edu.grade_or_score else ""

            edu_line = f"- <b>{deg}</b>{field} - {inst}{yr}{score}"
            story.append(Paragraph(edu_line, body_style))
            story.append(Spacer(1, 2))

        story.append(Spacer(1, 8))

    # ─────────────────────────────────────────────────────────────────────────
    # 7. ATS VERIFICATION FOOTER
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 6))
    org_name = _escape(getattr(candidate.org, 'name', 'Enterprise'))
    verification_text = (
        f"<b>Logicon Connect ATS - Verified Talent Pool Intake Document</b><br/>"
        f"Document ID: ATS-RES-{candidate.id:06d} | Generated: {datetime.now().strftime('%d-%b-%Y %H:%M:%S UTC')} | "
        f"Org: {org_name}"
    )

    footer_table = Table([[Paragraph(verification_text, footer_style)]], colWidths=[content_width])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('LINEABOVE', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))

    story.append(KeepTogether([footer_table]))

    # Build Document
    doc.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
