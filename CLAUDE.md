# WorldLore — Project Rules

## Permissions

### Authorized (no confirmation needed)
- ALL shell commands: build, test, lint, dev servers, git, npm, npx, node, etc.
- ALL file operations: read, write, edit, create, delete source files
- ALL git operations: commit, push, pull, branch, merge, rebase, reset
- ALL package management: npm install, npm uninstall, npm update, npx
- Running any dev server, build process, or test suite
- Creating, modifying, deleting any source code file
- Modifying configuration files (tsconfig, vite, eslint, prettier, etc.)
- Running Prisma commands: generate, format, validate, studio
- Running docker/docker-compose commands
- GitHub CLI (gh) operations: PRs, issues, releases

### PROHIBITED without explicit user permission
- **Database destructive operations**: DROP TABLE, DELETE FROM, TRUNCATE, dropping columns, dropping indexes
- **Database schema changes**: migrations (prisma migrate), ALTER TABLE, CREATE TABLE
- **Database data modifications**: INSERT, UPDATE, DELETE on production data
- **Prisma migrate dev / deploy / reset** — ALWAYS ask first
- Never run `prisma db push` or `prisma migrate reset` without asking
- Never delete or modify `.env` files containing database credentials

### When in doubt about database
Ask the user. The rule is simple: **anything that touches the database schema or data requires explicit permission. Everything else is authorized.**

## Tech Stack
- **Monorepo**: npm workspaces — `apps/api`, `apps/web`, `landing`, `packages/*`
- **API**: Express + Prisma + TypeScript (port 3001)
- **Web**: Vite + React + TypeScript (port 5173)
- **Database**: PostgreSQL (remote, 116.203.82.200:5432)
- **ENV**: `apps/api/.env`
- **CORS**: http://localhost:5173

## Development Workflow

### Feature Implementation Flow
1. **Plan** → Use planner agent for complex features
2. **TDD** → Write tests first, then implement
3. **Code** → Follow rules in `.claude/rules/`
4. **Review** → Use code-reviewer agent
5. **Commit** → Conventional commits (feat, fix, refactor, docs, test, chore)

### Available Agents (`.claude/agents/`)
| Agent | Use When |
|-------|----------|
| planner | Complex features, multi-step tasks |
| architect | System design, architecture decisions |
| tdd-guide | New features — write tests first |
| code-reviewer | After writing code |
| security-reviewer | Before commits, auth code, API endpoints |
| database-reviewer | DB queries, schema changes |
| build-error-resolver | Build fails |
| refactor-cleaner | Dead code cleanup |
| e2e-runner | Critical user flow testing |
| doc-updater | Documentation updates |

### Available Commands (`.claude/commands/`)
`plan`, `tdd`, `code-review`, `build-fix`, `verify`, `e2e`, `checkpoint`, `multi-plan`, `multi-execute`, `quality-gate`, `save-session`, `resume-session`, `test-coverage`, `update-docs`, `refactor-clean`

### Code Standards
- Follow rules in `.claude/rules/` (common + TypeScript-specific)
- Immutability: never mutate, always return new objects
- Files < 800 lines, functions < 50 lines
- No `console.log` in production code
- No `any` — use `unknown` + narrowing
- Zod for input validation at boundaries
- Proper error handling everywhere

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Branch naming: `feature/`, `fix/`, `refactor/`, `chore/`
- Always analyze full diff before PR creation

### Testing
- 80%+ coverage target
- Unit + Integration + E2E for critical paths
- TDD workflow: RED → GREEN → REFACTOR
