# Student 3 Repository Analysis

## Project overview

KitchenAsty is a multi-workspace restaurant management application. Its repository contains customer-facing storefront functionality, administrative functionality, a backend API, shared code, and a mobile application.

## Technology stack

The project uses the following technologies, based on its package and source structure:

| Area | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Frontend | React, Vite |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT and bcrypt |
| Validation | Zod |
| Real-time communication | Socket.IO |
| Unit/integration testing | Vitest and Supertest |
| Browser automation | Playwright |
| Mobile | Expo / React Native |
| CI | GitHub Actions |

## Main repository areas

- `packages/server`: API and backend logic.
- `packages/admin`: administrative frontend.
- `packages/storefront`: customer-facing frontend.
- `packages/shared`: shared application code.
- `packages/mobile`: mobile application.
- `e2e`: Playwright end-to-end specifications.
- `reports/student-3`: Student 3 test reports and supporting evidence.
- `docs/sqe`: software quality engineering documentation.

## Testing architecture

Vitest is used for unit and integration testing. Supertest supports API-level integration checks. Playwright runs browser scenarios against the admin and storefront applications.

The Playwright configuration starts the API and both web applications for browser testing. The configured test projects separate admin and storefront scenarios.

GitHub Actions provides automated quality and test workflows. SonarCloud coverage inputs include server and storefront LCOV reports.

## Observations

The repository has multiple application workspaces and a shared dependency tree. Dependency changes therefore require validation across the affected workspaces, not only the backend.

The recorded validation includes successful server, shared, admin, storefront, mobile, and documentation builds. The full browser run was not completely green: 135 tests passed and 5 failed.

This analysis describes the checked-out repository and recorded test setup. It is not a complete architectural review or a production infrastructure assessment.
