# Project Overview

This document provides the conceptual overview of **LWILL AI BUILDER v1**. For structural/technical architecture, see `docs/ARCHITECTURE.md`. For point-in-time verified implementation state, see `docs/PROJECT-STATUS.md`. For decision history, see `docs/DECISIONS.md`. For phase sequencing, see `docs/ROADMAP.md`.

---

## What LWILL AI Builder Is

Per `README.md`: an open-source AI Builder platform for multi-tenant ERP, CRM, Healthcare, Commerce, Automation and AI-powered application generation.

`lwill-ai-builder` (this repository) is the central multi-tenant **platform** repository - see the "Multi-Tenant Repository Isolation & Client Portability" section of `docs/PROJECT-STATUS.md` for the authoritative platform-vs-tenant repository boundary.

## Why It Exists

Per ADR 003 (`docs/DECISIONS.md`), the project's initial ERP domain models (booking, POS, inventory, customer management) are being validated against the real operational requirements of a first client (HDK Beauty / X Nail) before being generalized into a reusable platform. See ADR 010 (`docs/DECISIONS.md`) for the amendment clarifying that this validation strategy does not permit tenant-specific code to be committed into this repository.

## Business / Technical Objective

- **Technical objective (verified)**: Establish a governed monorepo (Turborepo + pnpm) with provider-neutral authentication, authorization, and tenant-hierarchy foundations - see "Verified Implemented State" in `docs/PROJECT-STATUS.md`.
- **Business objective**: NOT SPECIFIED beyond the client-first validation strategy in ADR 003. No consolidated business case, target market sizing, or commercial model document exists in this repository.

## Platform vs. Tenant Model

Authoritative source: "Multi-Tenant Repository Isolation & Client Portability" in `docs/PROJECT-STATUS.md`. Summary only (do not duplicate the full rule list here):

- `lwill-ai-builder` = reusable platform infrastructure only (authentication, authentication context, tenant context, authorization, tenant isolation, database abstractions, shared SaaS infrastructure, common security/governance contracts).
- Each tenant/client (e.g., EagleBABA, X Nail) = its own independent repository containing only tenant-specific application functionality.
- Current tenant repository names: EagleBABA -> `eagle13-d609ce96` (specified). X Nail -> **NOT SPECIFIED** (no dedicated repository name has been assigned yet).

## Long-Term Vision

NOT SPECIFIED as a single consolidated statement. The closest verified evidence of intended direction is the phase sequence in `docs/ROADMAP.md` (Foundation -> Authentication/Multi-Tenancy -> X Nail Release 1 -> Production Hardening -> Academy/Retail/Distribution -> Marketplace -> AI Builder Generation Engine -> Native Mobile Apps). No document defines an end-state vision beyond this phase list.

## Current X Nail MVP status

The native-auth navigation slice is locally verified. It uses the existing server-authoritative session and refresh contract and protects the client against stale browser-document/history restoration and stale in-flight restore results. Production verification and deployment remain pending.
