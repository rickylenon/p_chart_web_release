# Configuring Prisma for Edge Runtime

This document explains how to fix the error: `PrismaClient is not configured to run in Edge Runtime`

## The Problem

When deploying to platforms like Vercel that use Edge functions, the standard PrismaClient cannot operate correctly in these environments due to Node.js dependencies that Edge Runtime doesn't support.

## Solution Options

### Option 1: Prisma Accelerate (Recommended)

[Prisma Accelerate](https://www.prisma.io/docs/accelerate) is a fully managed SQL query engine that sits between your application and your database, optimized for edge environments.

1. Sign up for Prisma Accelerate at [https://cloud.prisma.io/](https://cloud.prisma.io/)

2. Configure your project with Prisma Accelerate:
   ```bash
   npx prisma generate --data-proxy
   ```

3. Set the `PRISMA_ACCELERATE_URL` environment variable in your Vercel project settings with the URL provided by Prisma Accelerate.

4. Redeploy your application.

### Option 2: Using Driver Adapters

If you prefer not to use Prisma Accelerate, you can use Prisma's [Driver Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers):

1. Install required packages:
   ```bash
   npm install @prisma/adapter-pg pg
   ```

2. Modify your Prisma client initialization in `src/lib/prisma.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client'
   import { PrismaPg } from '@prisma/adapter-pg'
   import { Pool } from 'pg'

   const connectionString = process.env.DATABASE_URL || ''
   const pool = new Pool({ connectionString })
   const adapter = new PrismaPg(pool)
   const prisma = new PrismaClient({ adapter })
   ```

3. Redeploy your application.

### Option 3: Move Database Operations to API Routes

The simplest option is to ensure all database operations happen in standard API routes (not Edge functions):

1. Move any database operations from Edge API handlers to standard API routes
2. Use client-side fetching to call these API routes

This approach doesn't require any additional services or configuration changes.

## Testing Edge Compatibility

To verify if your API is running in Edge runtime:

```typescript
const isEdgeRuntime = () => {
  return process.env.NEXT_RUNTIME === 'edge' || process.env.VERCEL_REGION === 'edge';
};

console.log('Is Edge runtime:', isEdgeRuntime());
```

## Further References

- [Prisma Error Documentation](https://pris.ly/d/accelerate)
- [Prisma Driver Adapters](https://pris.ly/d/driver-adapters)
- [Next.js Edge Runtime](https://nextjs.org/docs/api-reference/edge-runtime) 