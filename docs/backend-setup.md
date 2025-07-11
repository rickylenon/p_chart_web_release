# Backend Setup Guide - P-Chart Web

This guide covers the complete backend setup for P-Chart Web, including database configuration, API structure, and native deployment.

## 🏗️ Architecture Overview

P-Chart Web uses a modern, scalable architecture:

- **Frontend**: Next.js with server-side rendering
- **API Layer**: Next.js API routes 
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with custom providers
- **Deployment**: Native Node.js processes

## 📋 Prerequisites

### Development Environment
- Node.js v18 or higher
- PostgreSQL v13 or higher
- Git
- Text editor (VS Code recommended)

### Production Environment  
- Windows Server 2019+ or Windows 10+
- Node.js v18 or higher
- PostgreSQL v13 or higher
- PowerShell v5.1 or higher

## 🚀 Quick Start

### 1. Database Setup

```sql
-- Create database and user
CREATE DATABASE pchart_web;
CREATE USER pchart_user WITH PASSWORD 'pchart_password';
GRANT ALL PRIVILEGES ON DATABASE pchart_web TO pchart_user;
```

### 2. Environment Configuration

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://pchart_user:pchart_password@localhost:5432/pchart_web"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-in-production"

# Application
NODE_ENV="development"
PORT=3000
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Apply database schema
npx prisma db push

# Optional: Load sample data
npm run sync-production-data
```

### 5. Start Development Server

```bash
npm run dev
```

## Native Deployment (Recommended)

For production environments, P-Chart Web uses native Node.js deployment for optimal performance and reliability:

### Prerequisites

- Node.js v18 or higher
- PostgreSQL v13 or higher
- PowerShell for Windows servers

### Deployment Process

```powershell
# 1. Extract deployment bundle
# 2. Run system check
.\deployment\1-check-system.ps1

# 3. Deploy application  
.\deployment\deploy-offline.ps1

# 4. Verify status
.\deployment\3-check-status.ps1
```

The native deployment automatically:

- Configures database connections
- Sets up environment variables
- Initializes database schema
- Starts Node.js processes
- Configures health monitoring

## 🗄️ Database Configuration

### Schema Management

P-Chart Web uses Prisma for database management:

```bash
# View current schema
npx prisma studio

# Apply schema changes
npx prisma db push

# Generate migrations
npx prisma migrate dev --name migration_name

# Reset database (development only)
npx prisma migrate reset
```

### Database Connection

In production native deployment:

- **Direct connection**: No connection pooling overhead
- **Persistence**: Native PostgreSQL service management
- **Backup**: Standard PostgreSQL backup tools
- **Monitoring**: Direct database performance monitoring

## 🔌 API Structure

### API Routes Organization

```
src/pages/api/
├── auth/                  # Authentication endpoints
├── dashboard/             # Dashboard data endpoints
├── defects/              # Defect management
├── master-defects/       # Master defect data
├── operation-defects/    # Operation-specific defects
├── production-orders/    # Production order management
├── notifications/        # Notification system
└── health.ts            # Health check endpoint
```

### Authentication API

NextAuth.js provides secure authentication:

```typescript
// src/pages/api/auth/[...nextauth].ts
export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Custom authentication logic
        return user;
      }
    })
  ]
});
```

### Health Monitoring

```typescript
// src/pages/api/health.ts
export default async function handler(req, res) {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}
```

## 🔐 Security Configuration

### Environment Variables

Secure configuration management:

```env
# Strong secrets for production
NEXTAUTH_SECRET="generate-strong-secret-key"
DATABASE_URL="postgresql://user:secure_password@localhost:5432/db"

# API rate limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100        # Max requests per window
```

### Database Security

- Use strong passwords for database users
- Limit database user permissions
- Enable PostgreSQL SSL in production
- Regular security updates

## 📊 Monitoring and Logging

### Application Monitoring

```bash
# Check application status
.\deployment\3-check-status.ps1

# View application logs
.\deployment\view-logs.ps1

# Monitor performance
Get-Process node
```

### Database Monitoring

```sql
-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('pchart_web'));

-- Monitor slow queries
SELECT query, mean_time, calls FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

## 🔧 Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_defects_created_at ON defects(created_at);

-- Analyze and vacuum
ANALYZE;
VACUUM;
```

### Application Optimization

```bash
# Enable Node.js performance options
NODE_OPTIONS="--max-old-space-size=4096"

# Use production build
npm run build
npm start
```

## 🧪 Testing and Development

### Database Testing

```bash
# Test database connection
npm run test-db-connection

# Load test data
npm run generate-test-data

# Run database migrations
npx prisma migrate dev
```

### API Testing

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test authentication
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check PostgreSQL service
Get-Service postgresql*

# Test connection manually
psql -h localhost -U pchart_user -d pchart_web
```

**Application Won't Start:**
```bash
# Check Node.js processes
Get-Process node

# Verify environment variables
Get-Content .env
```

**Port Already in Use:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Change port in .env
PORT=3001
```

### Diagnostic Tools

```bash
# System diagnostics
.\deployment\diagnose-directory-usage.ps1

# Create support package
.\deployment\8-create-support-package.ps1
```

## 📚 Additional Resources

### Documentation Links

- [Project Structure](project-structure.md)
- [Data Flow Guide](data-flow.md)
- [UI Components](ui-components.md)
- [Session Management](session.md)

### Development Tools

- **Prisma Studio**: Database management interface
- **VS Code Extensions**: Prisma, TypeScript, Tailwind CSS
- **Debugging**: Node.js debugger with VS Code integration

---

**Migration**: Existing manual deployments should migrate to native deployment for better reliability, security, and maintenance.

**Performance**: Native deployment provides better performance compared to virtualized solutions.

**Monitoring**: Comprehensive monitoring and logging included in deployment scripts.

**Support**: Full diagnostic and troubleshooting tools available.
