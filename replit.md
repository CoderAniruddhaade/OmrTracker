# OMR Tracker

A web-based OMR (Optical Mark Recognition) sheet tracking application for Physics, Chemistry, and Biology practice with multi-user activity tracking.

## Overview

This application allows users to:
- Create OMR sheets with their name and 24 questions (8 per subject)
- Mark each question as "Done" or "Not Done"
- If "Done", mark as "Practiced" or "Not Practiced"
- View their own submission history and statistics
- Track other users' activities and progress
- View detailed user profiles with completion statistics

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, TanStack Query
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ui/           # Shadcn UI components
│   │   ├── omr-sheet-form.tsx    # Main OMR sheet form component
│   │   ├── activity-feed.tsx     # Activity feed component
│   │   └── user-stats.tsx        # User statistics card
│   ├── pages/
│   │   ├── landing.tsx           # Landing page (logged out users)
│   │   ├── home.tsx              # Home dashboard (logged in users)
│   │   ├── user-profile.tsx      # User profile page
│   │   ├── my-sheets.tsx         # User's sheets history
│   │   └── not-found.tsx         # 404 page
│   ├── hooks/
│   │   ├── useAuth.ts            # Authentication hook
│   │   └── use-toast.ts          # Toast notifications
│   ├── lib/
│   │   ├── queryClient.ts        # TanStack Query setup
│   │   └── authUtils.ts          # Auth utilities
│   └── App.tsx                   # Main app component
server/
├── db.ts                         # Database connection
├── replitAuth.ts                 # Replit Auth integration
├── routes.ts                     # API routes
├── storage.ts                    # Database storage operations
└── index.ts                      # Server entry point
shared/
└── schema.ts                     # Database schema and types
```

## API Routes

- `GET /api/auth/user` - Get current authenticated user
- `POST /api/omr-sheets` - Create new OMR sheet
- `GET /api/my-sheets` - Get current user's sheets
- `GET /api/activity` - Get all users' activity
- `GET /api/users/:userId` - Get user profile with sheets
- `GET /api/chapters` - Get current week's chapters configuration
- `POST /api/moderator/login` - Moderator authentication (password: "Sanskruti")
- `PUT /api/moderator/chapters` - Update chapters for the week

## Database Schema

### Users Table
- `id` (varchar, primary key) - User ID from Replit Auth
- `email` (varchar) - User email
- `firstName` (varchar) - First name
- `lastName` (varchar) - Last name
- `profileImageUrl` (varchar) - Profile picture URL
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### OMR Sheets Table
- `id` (varchar, primary key) - UUID
- `userId` (varchar, foreign key) - Reference to users
- `name` (varchar) - Sheet name
- `physics` (jsonb) - Physics questions data
- `chemistry` (jsonb) - Chemistry questions data
- `biology` (jsonb) - Biology questions data
- `createdAt` (timestamp)

### Sessions Table
- Used for Replit Auth session storage

## Subject Colors

- Physics: Blue (`--physics: 215 75% 50%`)
- Chemistry: Green (`--chemistry: 150 60% 40%`)
- Biology: Orange (`--biology: 30 70% 48%`)

## Running the App

The app runs with `npm run dev` which starts both frontend (Vite) and backend (Express) on port 5000.

## Recent Changes

- Initial implementation of OMR Tracker with full CRUD functionality
- Added Replit Auth for user authentication
- Created responsive dashboard with activity feed
- Implemented user profile pages with statistics
- **NEW**: Added Moderator Panel with weekly chapter management
  - Moderator password: "Sanskruti"
  - Access via /moderator route
  - Add/remove chapters for each subject
  - Changes apply immediately to all new sheets

## Moderator Features

- Weekly chapter updates for Physics (4), Chemistry (2), and Biology (6) subjects
- Password-protected moderator panel ("Sanskruti")
- Simple interface to add and remove chapters
- Real-time updates to database
