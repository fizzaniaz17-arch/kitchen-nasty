# Member 2 PR check for Member 1 review

The proposed independent job is `Member 2 / Reservation API (PostgreSQL)` in [.github/workflows/member2-api.yml](../../../.github/workflows/member2-api.yml). It provisions PostgreSQL 16 on the guarded loopback port, deploys repository migrations, checks generated data, and uploads Vitest output and the generated-ID audit even when requirements fail. A failed Vitest process fails the job.

**Discovery check.** With the installed Vitest 4.1.12, `npx -w packages/server vitest list --filesOnly` listed the 29 default server test files. Both Member 1 files were included. The Member 2 filename ends in `.member2.ts` and is selected by its dedicated config. The default pattern requires a `.test` or `.spec` suffix. Member 1?s existing Sonar command therefore needs no database setup or exclusion for this file. The shared CI unit and integration jobs retain their directory filters.

**Decision for Member 1 and the repository owner.** Review the independent job name, confirm the hosted PR run publishes both the failing report and generated coverage, and select this job in the main ruleset if it is to be a mandatory merge check. Existing Member 1 gates remain owned by Member 1. No hosted run, owner sign-off, ruleset edit or message to a teammate has been recorded. Product requirements currently block a green result.
