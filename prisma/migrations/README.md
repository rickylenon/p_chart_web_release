# Prisma Database Management

This directory contains the database migrations for the project.

## Current Approach

The project is currently using `prisma db push` to apply schema changes directly to the database. This approach is simpler than using migrations but has some limitations:

1. It doesn't track migration history
2. It may cause data loss if schema changes are incompatible with existing data
3. It's not recommended for production environments with critical data

### Why Use `db push`?

The project was initially set up using `prisma db push` instead of migrations. When we tried to switch to migrations, we encountered conflicts with existing tables. To avoid these conflicts, we're continuing to use `db push` for now.

### Important Notes

- Using `prisma db push --accept-data-loss` will apply schema changes directly to the database
- This may cause data loss if schema changes are incompatible with existing data
- For production environments with critical data, consider a more careful migration strategy

## Future Migrations

If you want to switch to using migrations in the future, you'll need to:

1. Create a baseline migration that matches the current database schema
2. Update the build command to use `prisma migrate deploy` instead of `prisma db push`
3. Be careful with existing data, as migrations may cause data loss

To create a new migration:

```bash
npx prisma migrate dev --name <migration-name>
```

This will create a new migration file in this directory that you can commit to your repository. 