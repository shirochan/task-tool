# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Common Development Tasks
```bash
# Run development server
npm run dev

# Build and start production
npm run build && npm run start

# Check for type errors and linting issues
npm run build  # Includes TypeScript checking and linting

# Run full quality checks (as done in CI)
npm run lint && npm run build
```

### 🚨 Pre-Push Checklist (MANDATORY)

**IMPORTANT**: Always run these commands locally before pushing to remote repository:

```bash
# 1. Run linter
npm run lint

# 2. Verify build
npm run build

# 3. Optional: Run all quality checks in one command
npm run lint && npm run build
```

**Why this is critical:**
- Prevents CI pipeline failures
- Ensures code quality and consistency
- Catches issues early in development cycle
- Maintains stable main branch

**What to check:**
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Build completes successfully

**If any check fails:**
- Fix the issues locally
- Re-run the checks
- Only push when ALL checks pass

### Docker Development
```bash
# Build Docker image
docker compose build

# Run production environment
docker compose up -d

# Run development environment (with hot reload)
docker compose --profile dev up -d app-dev

# View logs
docker compose logs -f

# Stop containers
docker compose down
```

## Architecture Overview

This is a Japanese-language AI-powered task management application built with Next.js 15 App Router. The application combines traditional task management with AI-driven work estimation, automatic weekly schedule generation, and comprehensive settings management for personal productivity.

### Core Technology Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI based)
- **Database**: SQLite with better-sqlite3 (local file storage)
- **AI Integration**: OpenAI GPT-4 API with intelligent fallback
- **Forms**: React Hook Form + Zod validation
- **CI/CD**: GitHub Actions (automated linting, building, security scanning)

### High-Level Architecture

#### Three-Layer Architecture
1. **Presentation Layer** (`src/components/`, `src/app/`)
   - React components with TypeScript
   - Next.js App Router for routing and layouts
   - shadcn/ui components for consistent UI

2. **Business Logic Layer** (`src/lib/services/`)
   - `TaskService`: Task CRUD operations, scheduling logic, settings management, and category management
   - `AIService`: OpenAI integration with fallback mechanisms

3. **Data Access Layer** (`src/lib/database/`)
   - SQLite database with prepared statements
   - Lazy initialization pattern for database connections
   - Five main tables: tasks, task_schedules, ai_estimates, user_settings, custom_categories

#### Key Components
- **TaskManager**: Main orchestrating component with tab navigation (tasks vs schedule view) and settings access
- **TaskForm**: Handles task creation/editing with integrated AI estimation
- **WeeklySchedule**: Calendar visualization with automatic task allocation
- **Settings**: Comprehensive settings management for work hours, custom categories, and data backup

#### Database Schema
```sql
tasks: id, title, description, priority ('must'|'want'), category, estimated_hours, status, timestamps
task_schedules: task_id, day_of_week (1-5), start_time, end_time, scheduled_date
ai_estimates: task_id, estimated_hours, confidence_score, reasoning, questions_asked
user_settings: id, setting_key, value, timestamps
custom_categories: id, name, color, timestamps
```

#### API Routes Structure
- `/api/tasks` - Task CRUD operations
- `/api/tasks/[id]` - Individual task operations  
- `/api/estimate` - AI-powered work estimation
- `/api/schedule` - Weekly schedule management
- `/api/schedule/generate` - Automatic schedule generation
- `/api/schedule/[id]` - Individual schedule updates
- `/api/schedule/move` - Task movement between dates
- `/api/settings` - User settings management
- `/api/categories` - Custom category management
- `/api/categories/[id]` - Individual category operations
- `/api/backup` - Data backup and restore functionality

### Key Patterns and Conventions

#### Database Patterns
- **Lazy initialization**: Database connections are created only when needed
- **Prepared statements**: All database queries use prepared statements through getter methods
- **Graceful handling**: Database operations include proper error handling and logging
- **Instance methods**: TaskService uses instance methods for better maintainability and consistency

#### AI Integration Patterns
- **Fallback strategy**: OpenAI API failures gracefully fall back to mock estimation logic
- **Structured prompts**: AI prompts are designed for JSON responses with specific schemas
- **Error boundaries**: AI operations are wrapped in try-catch with user-friendly error messages

#### Form Handling
- **Zod validation**: All forms use Zod schemas for type-safe validation
- **React Hook Form**: Consistent form state management across components
- **Real-time feedback**: AI estimation integrates seamlessly into form workflow

#### Styling Approach
- **Tailwind CSS**: Utility-first styling with custom CSS variables
- **Design system**: shadcn/ui components provide consistent design patterns
- **Responsive design**: Mobile-first approach with proper breakpoints
- **Japanese localization**: All UI text is in Japanese
- **Modal patterns**: Settings and forms use consistent modal overlay patterns

### Development Guidelines

#### Working with the Database
- Database initialization happens automatically on first access
- Use the `TaskService` class methods rather than direct database access
- The database file is created in `data/tasks.db` and should be gitignored
- Settings are managed through key-value pairs in the `user_settings` table
- Custom categories support color customization and are managed through dedicated endpoints

#### AI Integration
- Set `OPENAI_API_KEY` in `.env.local` for full AI functionality
- Mock estimation works without API key for development
- AI responses are parsed as JSON with fallback error handling

#### Adding New Features
- Follow the three-layer architecture (UI → Service → Database)
- Add new API routes under `/api/` following REST conventions
- Use TypeScript interfaces from `src/lib/types.ts`
- Maintain the Japanese language interface

#### Component Development
- Use shadcn/ui components for consistency
- Follow the existing prop patterns and TypeScript interfaces
- Maintain responsive design principles
- Include proper error states and loading indicators
- Settings components should use modal patterns for consistent UX
- Form components should include proper validation and error handling

### Environment Setup

#### Required Environment Variables
```bash
# Optional - enables full AI functionality
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### Database Setup
- SQLite database auto-initializes on first run
- Database file: `data/tasks.db` (created automatically)
- Schema is applied automatically from `src/lib/database/schema.sql`

### CI/CD Pipeline

#### GitHub Actions Workflows
- **CI Workflow** (`.github/workflows/ci.yml`)
  - ESLint and TypeScript checking on Node.js 24.x
  - Build verification

- **Security Workflow** (`.github/workflows/security.yml`)
  - npm audit for dependency vulnerabilities
  - CodeQL static analysis for security issues
  - Weekly scheduled security scans

- **Docker Workflow** (`.github/workflows/docker.yml`)
  - Docker image building
  - Container registry publishing (on main branch)

#### Dependency Management
- **Dependabot** (`.github/dependabot.yml`)
  - Weekly automated dependency updates
  - Separate handling for npm and Docker dependencies
  - Automatic PR creation with proper labeling

#### Quality Gates
Before any code reaches production:
1. ESLint checks must pass
2. TypeScript compilation must succeed
3. Build process must complete successfully
4. Security scans must pass

#### Development Workflow
1. Create feature branch from main
2. Implement changes
3. Run `npm run lint && npm run build`
4. Create Pull Request
5. CI pipeline runs automatically
6. Code review and approval
7. Merge to main triggers deployment pipeline