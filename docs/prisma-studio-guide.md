# Prisma Studio and Data Seeding Guide

## Prisma Studio

Prisma Studio is a visual database editor for viewing and modifying data in your database. It provides an intuitive interface to browse and edit records for all models defined in your Prisma schema.

### Starting Prisma Studio

To launch Prisma Studio, run the following command from your project root:

```bash
npx prisma studio
```

This will start Prisma Studio on [http://localhost:5555](http://localhost:5555). Open this URL in your browser to access the interface.

### Using Prisma Studio

With Prisma Studio, you can:

1. **Browse data**: Navigate through all your models in the left sidebar
2. **View records**: See all records for a selected model in a table view
3. **Edit data**: Click on any cell to modify values
4. **Add records**: Create new records with the "Add record" button
5. **Delete records**: Remove records with the delete button
6. **Filter and sort**: Use the filter and sort options to organize data
7. **Relationships**: View and navigate relationships between models

### Best Practices

- Use Prisma Studio for development and debugging purposes
- Be cautious when modifying production data directly
- Remember that Prisma Studio reflects your schema definitions, so make sure your schema is up to date

## Data Seeding

The project uses Prisma's seeding functionality to populate initial data. The seed script is defined in `prisma/seed.ts` and is executed with:

```bash
npx prisma db seed
```

### Seeded Data

The seed script populates the following data:

#### Users
- **Admin User**
  - Username: `admin`
  - Password: `admin123`
  - Role: `Admin`
  - Department: `IT`

- **Encoder User**
  - Username: `encoder`
  - Password: `encoder123`
  - Role: `Encoder`
  - Department: `Production`

#### Operation Steps
The operation steps are loaded from `docs/operation_steps.csv` and include:

| Label | Operation Number | Step Order |
|-------|-----------------|------------|
| Cable Cutting OP10 | OP10 | 0 |
| 1st Side Process OP15 | OP15 | 1 |
| 2nd Side Process OP20 | OP20 | 2 |
| Taping Process OP30 | OP30 | 3 |
| QC Sampling OP40 | OP40 | 4 |

#### Defects
Defects are loaded from `docs/defects_masterlist.csv`. The defects table has the following structure:

- **name**: The name of the defect (unique identifier)
- **category**: Category of the defect
- **applicableOperation**: Which operation this defect applies to (e.g., OP10, OP15)
- **reworkable**: Boolean flag indicating if this defect can be reworked
- **machine**: The machine associated with this defect
- **isActive**: Boolean flag indicating if this defect is currently active in the system

There are approximately 570 defects defined in the system, organized by category and applicable operation.

### Customizing Seed Data

To modify the seed data:

1. Edit the CSV files in the `docs/` directory:
   - `operation_steps.csv` for operation steps
   - `defects_masterlist.csv` for defects

2. Modify the `prisma/seed.ts` file if you need to change the seeding logic

3. Run the seed command again:
   ```bash
   npx prisma db seed
   ```

### Notes on Data Structure

- **Defects** are uniquely identified by their name field. The same defect name cannot be used across different operations or categories.
- **Operation Steps** are uniquely identified by their operation number.
- When updating the seed files, be careful not to introduce duplicate names for defects or operation steps.

## Database Reset

To completely reset the database and re-apply all seeds:

```bash
npx prisma db push --force-reset && npx prisma db seed
```

This command will:
1. Reset the database, removing all existing data
2. Apply the schema defined in `prisma/schema.prisma`
3. Run the seed script to populate initial data 