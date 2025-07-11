# Development Setup (Native)

This guide explains how to run the project in development mode natively with Node.js and PostgreSQL.

## Prerequisites

Before starting development, ensure you have the following installed:

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **PostgreSQL 12+** - Download from [postgresql.org](https://www.postgresql.org/download/)
3. **Git** - For version control

## Database Setup

### 1. Install and Start PostgreSQL

**Windows:**

```powershell
# Install PostgreSQL and start the service
# Use PostgreSQL installer from postgresql.org
# Or use chocolatey: choco install postgresql

# Start PostgreSQL service
net start postgresql-x64-14  # Adjust version as needed
```

**macOS:**

```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql
```

### 2. Create Database and User

**Windows (Recommended - Use included script):**

```powershell
# Use the included Windows setup script
.\setup-postgres.ps1
```

**Manual Setup (All platforms):**

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE pchart_web;

-- Create user
CREATE USER pchart_user WITH PASSWORD 'pchart_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pchart_web TO pchart_user;
GRANT ALL ON SCHEMA public TO pchart_user;

-- Exit psql
\q
```

**Note for Windows**: If you encounter PowerShell syntax issues, see the [Windows Development Setup Guide](docs/windows-development-setup.md) for detailed troubleshooting.

## Project Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd p_chart_web

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://pchart_user:pchart_password@localhost:5432/pchart_web

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-key-change-this-in-production

# Application Environment
NODE_ENV=development
PORT=3000

# Logging Configuration
NEXTAUTH_DEBUG=true
NEXT_PUBLIC_DEPLOYMENT_URL=http://localhost:3000

# Prisma Configuration
PRISMA_CLI_BINARY_TARGETS=native
```

### 3. Database Schema Setup

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Optional: Seed database with sample data
npm run generate:test-data
```

## Development Workflow

### Start Development Server

```bash
# Start development server with hot reloading
npm run dev

# Or with custom port
PORT=3001 npm run dev
```

The application will be available at:

- **Web Application**: http://localhost:3000
- **API Routes**: http://localhost:3000/api/\*

### Database Management

```bash
# Open Prisma Studio for database management
npx prisma studio
# Access at: http://localhost:5555

# Reset database (if needed)
npx prisma db push --force-reset

# Generate test data
npm run generate:test-data
```

## What Changes Instantly?

When running in development mode with `npm run dev`, these changes reflect instantly:

✅ **React components and pages**
✅ **API routes**
✅ **Styles and CSS**
✅ **Configuration files**
✅ **Scripts in `/scripts/` directory**
✅ **Utility functions**

❌ **Package.json changes** (requires `npm install`)
❌ **Prisma schema changes** (requires `npx prisma db push`)
❌ **Environment variables** (requires server restart)

## Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm start               # Start production server

# Database
npx prisma studio       # Database management UI
npx prisma db push      # Update database schema
npx prisma generate     # Generate Prisma client

# Testing & Utilities
npm run test:db         # Test database connection
npm run generate:test-data        # Generate test data
npm run sync-production-data      # Sync production data
```

## Troubleshooting

### Common Issues

**Database Connection Issues:**

```bash
# Test database connection
npm run test:db

# Check PostgreSQL service status
# Windows: services.msc (look for PostgreSQL)
# macOS: brew services list | grep postgresql
```

**Windows-Specific Database Issues:**
```powershell
# If DATABASE_URL environment variable issues occur:
$env:DATABASE_URL="postgresql://pchart_user:pchart_password@localhost:5432/pchart_web"
npx prisma db push

# Clear Next.js cache and restart
Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
npm run dev
```

**Port Already in Use:**

```bash
# Find process using port 3000
# Windows: netstat -ano | findstr :3000
# macOS/Linux: lsof -i :3000

# Kill process or use different port
PORT=3001 npm run dev
```

**Windows PowerShell Port Issues:**
```powershell
# Find and kill process using port 3000
$processId = (netstat -ano | findstr :3000 | ForEach-Object { ($_ -split '\s+')[4] } | Select-Object -First 1)
if ($processId) { taskkill /F /PID $processId }

# Or use different port
$env:PORT=3001; npm run dev
```

**Prisma Issues:**

```bash
# Regenerate Prisma client
npx prisma generate

# Reset database and regenerate
npx prisma db push --force-reset
```

**Module Not Found:**

```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install
```

### Development Tips

1. **Use Prisma Studio** for database inspection and editing
2. **Check browser console** for frontend errors
3. **Monitor terminal** for backend errors and logs
4. **Use hot reloading** - save files to see changes instantly
5. **Environment variables** - restart server after changing `.env`

## File Structure

```
├── src/
│   ├── pages/           # Next.js pages and API routes
│   ├── components/      # React components
│   ├── lib/            # Utility functions
│   └── styles/         # CSS styles
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
├── scripts/            # Utility scripts
├── public/             # Static files
├── package.json        # Dependencies and scripts
└── .env               # Environment variables
```

## Production Deployment

For production deployment on Windows:

```powershell
# Run the native deployment script
.\deploy.ps1

# Or force rebuild
.\deploy.ps1 -Force
```

This will:

1. Install dependencies
2. Build the application
3. Set up database schema
4. Prepare for production use

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
