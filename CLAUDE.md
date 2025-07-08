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

# Build and test production
npm run build && npm run start

# Check for type errors and linting issues
npm run build  # Includes TypeScript checking and linting
```

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

This is a Japanese-language AI-powered task management application built with Next.js 15 App Router. The application combines traditional task management with AI-driven work estimation and automatic weekly schedule generation.

### Core Technology Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI based)
- **Database**: SQLite with better-sqlite3 (local file storage)
- **AI Integration**: OpenAI GPT-4 API with intelligent fallback
- **Forms**: React Hook Form + Zod validation

### High-Level Architecture

#### Three-Layer Architecture
1. **Presentation Layer** (`src/components/`, `src/app/`)
   - React components with TypeScript
   - Next.js App Router for routing and layouts
   - shadcn/ui components for consistent UI

2. **Business Logic Layer** (`src/lib/services/`)
   - `TaskService`: Task CRUD operations and scheduling logic
   - `AIService`: OpenAI integration with fallback mechanisms

3. **Data Access Layer** (`src/lib/database/`)
   - SQLite database with prepared statements
   - Lazy initialization pattern for database connections
   - Three main tables: tasks, task_schedules, ai_estimates

#### Key Components
- **TaskManager**: Main orchestrating component with tab navigation (tasks vs schedule view)
- **TaskForm**: Handles task creation/editing with integrated AI estimation
- **WeeklySchedule**: Calendar visualization with automatic task allocation

#### Database Schema
```sql
tasks: id, title, description, priority ('must'|'want'), category, estimated_hours, status, timestamps
task_schedules: task_id, day_of_week (1-5), start_time, end_time, scheduled_date
ai_estimates: task_id, estimated_hours, confidence_score, reasoning, questions_asked
```

#### API Routes Structure
- `/api/tasks` - Task CRUD operations
- `/api/tasks/[id]` - Individual task operations  
- `/api/estimate` - AI-powered work estimation
- `/api/schedule` - Weekly schedule management
- `/api/schedule/generate` - Automatic schedule generation

### Key Patterns and Conventions

#### Database Patterns
- **Lazy initialization**: Database connections are created only when needed
- **Prepared statements**: All database queries use prepared statements through getter methods
- **Graceful handling**: Database operations include proper error handling and logging

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

### Development Guidelines

#### Working with the Database
- Database initialization happens automatically on first access
- Use the `TaskService` class methods rather than direct database access
- The database file is created in `data/tasks.db` and should be gitignored

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

### Testing the Application

#### Manual Testing Workflow
1. Start development server: `npm run dev`
2. Test task creation with and without AI estimation
3. Generate weekly schedule to verify algorithm
4. Test responsive design on different screen sizes
5. Verify database persistence across restarts

#### Key Test Scenarios
- Task CRUD operations
- AI estimation (with and without OpenAI API)
- Schedule generation with various task combinations
- Form validation and error handling
- Mobile responsive behavior