# Main Logicon ERP - Detailed System Architecture & Structure Documentation

This document provides an in-depth technical overview of the Main Logicon ERP system, detailing both its functional workflows and physical codebase structure.

---

## 1. Directory Structure

The Main Logicon ecosystem is split into two primary repositories (folders):
`BE-Logicon-connect-ATS-main` (Django Backend) and `FE-Logicon-Connect-ATS-main` (React Frontend).

### 1.1 Backend Structure (`BE-Logicon-connect-ATS-main/apps/`)
The backend is a modular Django application. Each major business domain is encapsulated in its own app:
- `accounts/` & `access/`: Manages user identities, Role-Based Access Control (RBAC), and Capabilities.
- `core/`: Common models (Organizations, Departments), base utilities, and SSO integrations (e.g., `asset_vault.py`).
- `sales/`: The CRM module handling Leads, Site Surveys, and Proposals.
- `hiring/`, `talent/`, `mrf/`, `intake/`: The Applicant Tracking System (ATS). Manages Manpower Requisition Forms (MRFs), candidate sourcing, pipelines, and offers.
- `inventory/`: The execution backend for inventory, processing stock movements and schema definitions.
- `workflow/`: The centralized Workflow Engine handling approvals and Turnaround Time (TAT) SLA monitoring.
- `budgets/`, `wages/`: Financial modeling, calculating margins, markups, and minimum wages.
- `deployment/`, `sites/`: Post-hire operations and physical site management.

### 1.2 Frontend Structure (`FE-Logicon-Connect-ATS-main/src/`)
The frontend is a Vite + React + TypeScript application strictly organized by feature domains:
- `app/routes.tsx`: The central router controlling all authenticated and public paths.
- `features/auth/`: Login, capability enforcement (`RequireCapability`), and session management.
- `features/sales/`: UI for leads, site role requirements (SRR), and proposal workspaces.
- `features/hiring/` & `features/talent/`: Interview pipelines, MRF creation, candidate management.
- `features/inventory/`: The Inventory Operations Execution engine (`InventoryOperationsPage.tsx`), rendering dynamic forms based on backend schemas.
- `features/integrations/`: Houses `AssetVaultPage.tsx`, the iframe container that SSO-authenticates the user into Field Sense.

---

## 2. Login & Access Control
The system uses a robust, capability-driven role-based access control (RBAC) architecture to securely separate internal users from external clients.

### Authentication Flow
- **Identities**: Users are centrally managed. Internal employees and external client stakeholders have discrete roles.
- **Capabilities over Roles**: Instead of hardcoding permissions to generic roles like "Admin" or "Sales", the system uses **Capabilities** (e.g., `CAP.ASSET_VAULT_ACCESS`, `DEPLOYMENT_ANY`). This allows highly granular access control to specific UI routes and API endpoints.
- **User Portals**: When a client user logs in, they only see Client-facing features (like Proposal Responses or Client Staff Views), whereas internal users see dashboards tailored to their specific department (HR, Finance, Operations, Sales).

---

## 3. CRM (Sales & SRR)
The CRM module drives the acquisition of new clients and the expansion of existing sites. It follows a structured pipeline: **Lead → Site Survey → Role Requirements → Proposal → Negotiation**.

### Core Flow & Database Entities
1. **Lead Creation (`SalesLead`)**: Sales representatives create leads for new clients, site expansions, or renewals.
2. **Site Survey**: Before quoting a price, Operations and Sales conduct a site survey to determine the exact ground realities and feasibility of the request.
3. **Site Role Requirements (SRR)**: Based on the survey, the exact manpower requirements are defined. For example, "Site A requires 5 Security Guards and 1 Supervisor". This SRR acts as the **absolute source of truth** for all future hiring limits.
4. **Budgeting & Proposal Generation**: The system generates a commercial budget combining the manpower costs (Wages) and required inventory costs (Uniforms, Equipment) plus predefined markups.
5. **Client Negotiation**: The proposal is sent to the client via a public link (`PublicProposalResponsePage`). The client can approve, reject, or request revisions directly through the portal.
6. **Client Onboarding & Mobilisation**: Once the proposal is won, the site goes into Mobilisation, preparing the ground for active operations.

---

## 4. ATS (Applicant Tracking System) & Hiring
The ATS module is directly integrated with the CRM's Site Role Requirements. You cannot hire arbitrarily; all hiring is strictly controlled by approved Manpower Requisition Forms (MRFs).

### Core Flow & Database Entities
1. **Manpower Requisition Form (`ManpowerRequest` / `MRFLineItem`)**: 
   - A site manager or client requests staff by raising an MRF. 
   - The system strictly validates the MRF against the approved **Site Role Requirements (SRR)**. If a site is only approved for 5 guards, the system will block an MRF requesting a 6th guard unless an explicit "Headcount Increase" flow is triggered.
   - The MRF goes through an internal (and sometimes client) approval workflow via the centralized Workflow Engine.
2. **Talent Sourcing**: Candidates submit applications via public Intake forms, entering the `Candidate` database.
3. **Hiring Application (`HiringApplication`)**: A candidate is officially linked to an approved MRF Line Item.
4. **Pipeline Execution (`PipelineStage`)**: The candidate moves through dynamic, org-specific pipeline stages:
   - *Screening / Shortlisting*
   - *Interviews* (Internal and Client Review)
   - *Selection*
   - *Offer Released / Accepted*
5. **Deployment**: Once the offer is accepted, the candidate transitions from an external applicant to a deployed Employee linked to the specific Site.

---

## 5. Inventory & Logistics
The Inventory system is designed as a state-of-the-art **Execution Engine**. Rather than hardcoding approval chains into the frontend, it relies on a dynamic configuration backend.

### Architecture: Configuration vs. Execution
- **Master Setup (Configuration Engine)**: Administrators configure the rules of the inventory system. They define:
  - **Request Types**: Defines what kind of requests can be made (e.g., "IT Asset", "Uniform Request") and attaches a dynamic JSON `form_schema` and a specific `workflow_template`.
  - **Policies**: Business rules (e.g., "Approval Required", "Warranty Tracking").
  - **Assignment Rules**: Who can receive the items (Employees, Sites, Clients).
- **Inventory Operations (Execution Engine)**: The frontend operations page (`InventoryOperationsPage`) is entirely dynamic. It fetches the Request Types and automatically renders the appropriate UI forms based on the `form_schema`. It has zero hardcoded business logic.

### Request Flow
1. **User Request**: An employee requests a new laptop. The UI renders the form strictly based on the "IT Asset" `form_schema`.
2. **Workflow Engine**: Upon submission, the system triggers the specific `WorkflowInstance` tied to that Request Type. 
3. **Approvals**: The request is routed to the appropriate managers or IT admins for approval based on the workflow template.
4. **Stock Movement (`StockMovement`)**: Once fully approved, the system logs an immutable stock movement (e.g., 'issue', 'transfer', 'adjustment'), physically assigning the asset to the employee and decrementing warehouse stock.

---

## 6. Centralized Workflow Engine
Underpinning CRM approvals, ATS MRFs, and Inventory Requests is the `apps.workflow` module. 
- It allows administrators to build dynamic, multi-step approval templates (e.g., Step 1: HR Approval, Step 2: Finance Approval).
- It tracks strict Turnaround Times (TAT) and Service Level Agreements (SLAs) for every step.
- It provides a unified "My Tasks" inbox (`MyTasksPage`) where managers can see pending approvals across all modules (Inventory, MRFs, Proposals) in one place.
