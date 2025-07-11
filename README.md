# P-Chart Web Application

## Overview

P-Chart is a web-based application for managing production orders, defects, and operations data. Built with Next.js and PostgreSQL.

<!-- Build trigger: Fix 404 dashboard issue with BUILD_ID mismatch -->

A production monitoring and quality control web application.

## About

The P-Chart System is a web-based application designed for real-time defect monitoring and production process tracking. Built with modern web technologies, it provides centralized access to production data through a responsive and intuitive interface within the organization's network.

**Developer:** [LE CHAMP (South East Asia) Pte Ltd](https://www.lechamp.com.sg/) - A company established in 1982 in Singapore, specializing in supplying high-quality equipment and components for the electronics and semiconductor industries.

**Client:** [JAE Philippines](https://www.jae.com/en/) - Japan Aviation Electronics Industry, Ltd. subsidiary in the Philippines.

## Getting Started

### Development Setup

For local development:

#### Prerequisites

- Node.js v23.7.0 (recommended) or 20.x+
- npm, yarn, or pnpm
- PostgreSQL 15 (recommended) or newer

#### Quick Setup (Windows)

**For Windows users, use the included automated setup scripts:**

```powershell
# 1. Setup PostgreSQL database
.\setup-postgres.ps1

# 2. Create .env file
.\create-env.ps1

# 3. Install dependencies and setup schema
npm install
$env:DATABASE_URL="postgresql://pchart_user:pchart_password@localhost:5432/pchart_web"
npx prisma db push

# 4. Start development server (development only)
$env:DATABASE_URL="postgresql://pchart_user:pchart_password@localhost:5432/pchart_web"
npm run dev

# Note: For production deployment, use the deployment scripts instead
```

**📖 For detailed Windows setup instructions and troubleshooting, see: [Windows Development Setup Guide](docs/windows-development-setup.md)**

#### Manual Installation (All Platforms)

1. Clone the repository

   ```
   git clone <repository-url>
   ```

2. Install dependencies

   ```
   npm install
   # or
   yarn
   # or
   pnpm install
   ```

3. Create a PostgreSQL database

   ```sql
   CREATE DATABASE pchart_web;
   CREATE USER pchart_user WITH PASSWORD 'pchart_password';
   GRANT ALL PRIVILEGES ON DATABASE pchart_web TO pchart_user;
   ```

4. Create a `.env` file with the required environment variables

   ```
   DATABASE_URL="postgresql://pchart_user:pchart_password@localhost:5432/pchart_web"
   NEXTAUTH_SECRET="development-secret-change-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   NODE_ENV="development"
   ```

5. Setup database schema

   ```
   npx prisma db push
   npm run sync-production-data  # Optional: load production data
   ```

6. Run the development server

   ```
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

   **⚠️ Note for Production**: This application uses standalone deployment. In production, use `node server.js` instead of npm commands.

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Deployment

**Prerequisites for PowerShell Scripts:**
```powershell
# Set execution policy (run as Administrator):
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Native deployment for Windows servers (Standalone Server):**

```powershell
# 1. Extract deployment bundle to server
# 2. Run system check
.\deployment\1-check-system.ps1

# 3. Deploy application (creates standalone server)
.\deployment\deploy-offline.ps1

# 4. Verify status
.\deployment\3-check-status.ps1

# 5. Start application (uses simplified lifecycle scripts)
.\start.ps1
```

**⚠️ Production Uses Standalone Server**: Production deployment creates `server.js` file and uses `node server.js` for optimal performance and reliability.

**Application Lifecycle Management:**

```powershell
# Navigate to production directory
cd C:\p_chart_web

# Start application
.\start.ps1

# Stop application  
.\stop.ps1

# Restart application
.\restart.ps1
```

**Production Data Integration:**

```powershell
# Place your production data file in database folder
# Run deployment with data import
.\deployment\deploy-offline.ps1
```

Features included:

- **Standalone server deployment** with `node server.js` (NOT npm start)
- **Simplified lifecycle management** with start.ps1, stop.ps1, restart.ps1
- Native Node.js application processes
- PostgreSQL database with direct connections
- **Production data import** with automatic backup
- Application updates via ZIP bundles
- Automated backup system with retention
- Health monitoring and logging
- Offline deployment capability

➡️ **[Deployment Guide](deployment/README.md)**

## Project Structure

The project follows a modular component architecture:

- `src/components/layout` - Layout components
- `src/components/dashboard` - Dashboard-specific components
- `src/components/ui` - Reusable UI components
- `prisma/` - Database schema and migrations
- `src/pages/api/` - API endpoints

For detailed documentation, see:

- [Project Structure Documentation](docs/project-structure.md)
- [Navigation Architecture](docs/navigation-architecture.md)
- [Backend and Database Setup](docs/backend-setup.md)
- [Data Flow: Frontend to Backend](docs/data-flow.md)
- [UI Components and Styling](docs/ui-components.md)
- [Session Handling](docs/session.md)
- [Dashboard Series Filter](docs/dashboard-series-filter.md)

## Key Features

- Responsive navigation system
- Authentication with NextAuth.js
- Production order management
- Defect tracking and reporting
- Operations monitoring
- Role-based access control
- Real-time notifications
- Edit request workflow for defect modifications

## Development vs Production

### Development
- **Start Command**: `npm run dev`
- **Mode**: Next.js development server with hot reload
- **Database**: Local PostgreSQL or development database

### Production  
- **Start Command**: `node server.js` (standalone server)
- **Mode**: Optimized standalone Next.js server
- **Database**: Production PostgreSQL database
- **⚠️ Important**: Never use `npm start` in production - only standalone server

## Technology Stack

### Frontend

- **Framework**: Next.js (latest)
- **UI Components**: Radix UI with shadcn/ui
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Data Visualization**: Recharts
- **Date Handling**: date-fns
- **Table Management**: TanStack Table

### Backend

- **API Routes**: Next.js API Routes
- **Authentication**: NextAuth.js with custom credential provider
- **Database ORM**: Prisma
- **Database**: PostgreSQL 15 (production), MySQL (development supported)
- **Security**: bcryptjs for password hashing
- **Real-time Updates**: Socket.IO

### Development Tools

- **TypeScript**: Type safety throughout the codebase
- **ESLint**: Code quality and consistency
- **Prisma Studio**: Database management
- **Testing Scripts**: Custom test data generation

## Deployment

### Production Deployment

**Native deployment for Windows servers (Standalone Server):**

```powershell
# 1. Extract deployment bundle to server
# 2. Run system check
.\deployment\1-check-system.ps1

# 3. Deploy application (creates standalone server)
.\deployment\deploy-offline.ps1

# 4. Start application (uses node server.js)
cd C:\pchart-web
.\start-application.ps1
```

Features:

- **Standalone server**: Uses `node server.js` (NOT npm start) for maximum performance
- **Offline deployment**: No internet required on production server
- **Native performance**: Direct Node.js process execution
- **Self-contained**: All dependencies in ZIP bundle
- **Easy management**: PowerShell scripts for all operations

➡️ **[Deployment Guide](deployment/README.md)**

## Contributing

1. Create a feature branch from the development branch
2. Make your changes following the existing code style
3. Update documentation if necessary
4. Submit a pull request to the development branch

#
