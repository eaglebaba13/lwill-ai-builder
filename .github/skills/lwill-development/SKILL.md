---
name: lwill-development
description: 'Standard implementation and verification workflow for LWILL AI BUILDER. Use when implementing, fixing, testing, or preparing repository changes that must follow project requirements, ADRs, multi-tenant architecture, security boundaries, and approval gates.'
---

# LWILL Development

Use this workflow for repository implementation tasks. Keep work scoped to the approved requirement and treat current code plus passing tests as implementation evidence.

## Evidence and Classification

1. Inspect repository state, branch, recent history, and existing changes before editing.
2. Establish the source-of-truth requirement from the relevant SRS, accepted ADRs, architecture documentation, and `docs/PROJECT-STATUS.md`. Reconcile stale or conflicting claims against current code and git evidence.
3. Inspect the relevant code, services, contracts, Prisma schema and migrations, tests, dependencies, and configuration.
4. Classify the current functionality as exactly one of: `IMPLEMENTED`, `PARTIAL`, `PLACEHOLDER`, `MOCK`, `NOT IMPLEMENTED`, or `BROKEN`. Documentation alone is never proof of implementation.
5. Stop and report the evidence when a requirement is genuinely `NOT SPECIFIED`, sources conflict without a controlling decision, or architectural approval is required. Do not guess.

## Implementation Guardrails

- Reuse verified platform functionality before adding abstractions. Preserve provider-neutral contracts, reusable modules, multi-tenant and tenant-repository boundaries, authorization boundaries, and accepted architectural decisions.
- Implement the smallest production-safe change required by the approved requirement. Do not redesign architecture without explicit approval.
- Do not invent behavior that an SRS or ADR marks `NOT SPECIFIED`.
- Do not modify migration `0_init` or create a migration unless the task explicitly authorizes it. Never manually modify production database state.
- Use the local repository as the development source of truth. The VPS is deployment/runtime infrastructure, not the primary development environment or canonical repository.
- Never expose or commit secrets, credentials, tokens, private keys, or real environment values. Never deploy unverified experimental code.
- For authentication or security work, preserve existing authentication, tenant-context, and authorization boundaries. Do not invent route names, CSRF mechanisms, error contracts, token policies, or secret-management products.

## Workflow

1. **Inspect**: Read repository governance and inspect git state.
2. **Establish requirements**: Read the relevant SRS, ADRs, architecture documentation, and project status; identify approved behavior and unresolved items.
3. **Inspect implementation**: Trace the controlling code path and its services, contracts, persistence, tests, and configuration.
4. **Classify**: Record the current state using the required classification vocabulary and cite concrete code/test evidence.
5. **Choose the change**: Identify the smallest production-safe implementation that reuses existing platform capabilities.
6. **Implement**: Make focused changes without crossing unapproved architecture, tenancy, security, database, or deployment boundaries.
7. **Test**: Add or update focused tests and run the narrowest relevant checks first.
8. **Verify**: Where applicable run `pnpm test`, `pnpm build`, `pnpm lint`, and `git diff --check`. Run additional package, Prisma, migration, or security checks required by the changed surface.
9. **Review**: Inspect the complete git diff for scope, correctness, secrets, unintended files, generated artifacts, and architectural drift.
10. **Report**: Before proposing any commit, provide files changed, implementation summary, requirements addressed, tests performed, build/lint results, git diff summary, and remaining gaps.
11. **Await approval**: Do not commit, push, or deploy automatically. Wait for separate explicit approval before each action: commit, then push, then deployment.

The sequence is:

`Inspect -> Establish source-of-truth requirements -> Inspect existing implementation -> Classify current state -> Identify smallest required change -> Implement -> Add/update focused tests -> Run verification -> Review diff -> Report -> Await commit approval -> Await push approval -> Await deployment approval`
