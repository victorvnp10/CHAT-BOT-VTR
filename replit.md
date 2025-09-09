# replit.md

## Overview

This is a full-stack web application for managing specialized chatbots focused on official document creation for the Brazilian Air Force (FAB). The system allows users to interact with AI-powered chatbots that help create various types of official documents like "Ofícios," emails, reports, and meeting minutes, following specific military documentation standards (NSCA 10-2 - 2019).

The application provides a dashboard where users can select from available chatbots, create new conversations, and manage chatbot configurations. It includes a default "SAD VIRTUAL" chatbot pre-configured for document assistance, with the ability to create custom chatbots through an admin interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming and Font Awesome icons
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API structure with route handlers in `/server/routes.ts`
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Storage Layer**: Abstracted storage interface with in-memory implementation for development
- **AI Integration**: OpenAI API integration for chat completions using GPT-4o model

### Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM
- **Schema**: Two main entities - `chatbots` and `conversations`
  - Chatbots store persona, tasks, instructions, and output formatting rules
  - Conversations contain message arrays stored as JSONB with chatbot references
- **Migrations**: Drizzle Kit for schema migrations management
- **Development Storage**: In-memory storage implementation with pre-seeded "SAD VIRTUAL" chatbot

### Authentication and Authorization
- **Current State**: No authentication system implemented
- **User Context**: Hard-coded user identity ("Ten Cel Av Alexandre") displayed in header
- **Session Management**: Basic Express session support with connect-pg-simple (configured but not actively used)

### File Upload Capability
- **Implementation**: Multer middleware configured for multipart/form-data handling
- **Limits**: 10MB file size limit with memory storage
- **Purpose**: Prepared for document attachments and file processing features

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4o model for natural language processing and document generation
- **Configuration**: API key through environment variables (OPENAI_API_KEY or VITE_OPENAI_API_KEY)

### Database Services
- **PostgreSQL**: Primary database with connection via DATABASE_URL environment variable
- **Neon Database**: Serverless PostgreSQL provider (@neondatabase/serverless driver)

### UI and Styling Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for modern interface elements
- **Font Awesome**: Icon library for legacy and specialized icons

### Development Tools
- **Vite**: Frontend build tool with React plugin and runtime error overlay
- **ESBuild**: Backend bundling for production builds
- **TSX**: TypeScript execution for development server
- **Replit Integration**: Development environment plugins for cartographer and runtime error modal

### Data Validation
- **Zod**: TypeScript-first schema validation library
- **Drizzle-Zod**: Integration between Drizzle ORM and Zod for type-safe database operations

### Utility Libraries
- **Date-fns**: Date manipulation and formatting
- **Nanoid**: URL-safe unique string ID generator
- **Class Variance Authority**: Utility for creating variant-based component APIs
- **CLSX/Tailwind Merge**: Conditional className utilities