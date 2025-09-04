# Database Seeding Script

This script seeds data into 9 database tables based on data from an Excel file.

## Tables Seeded

1. RegistrationReferences
2. RegistrationCompanyProfiles
3. RegistrationCeoProfiles
4. RegistrationOrgAdminProfiles
5. PortalUserChangeRequests
6. PortalUserRequestLists
7. PortalUserProfiles
8. PortalCompanyProfiles
9. PortalCeoProfiles

## Prerequisites

- Node.js installed
- MySQL/MariaDB database (InnoDB engine)
- Excel file with data to seed (optional, will generate dummy data if not available)

## Setup

1. Install dependencies:
```
npm install
```

2. Configure database connection:
Open `seed-database.js` and update the `dbConfig` object with your database credentials:
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'your_password', // Change this to your actual password
  database: 'misp' // Change to your database name if different
};
```

3. Prepare Excel file:
If you want to use your own data, make sure your Excel file has sheets named after the tables and columns matching the database schema.

## Running the Script

Run the script using:
```
npm run seed
```

Or directly:
```
node seed-database.js
```

## Data Generation

If specific sheets are not found in the Excel file, or if fields are missing, the script will generate dummy data automatically.

## Schema Information

The script is based on the following table schemas:

### RegistrationReferences
- Primary key: `id` (int, auto-increment)
- Status options: 'PENDING_CEO_APPROVAL', 'PENDING_ADMIN_APPROVAL', 'APPROVED', 'REJECTED'
- Request types: 'CREATE', 'UPDATE'

### RegistrationCompanyProfiles
- Primary key: `id` (int, auto-increment)
- Foreign key: `referenceId` references RegistrationReferences.id

### RegistrationCeoProfiles
- Primary key: `id` (int, auto-increment)
- Foreign key: `referenceId` references RegistrationReferences.id

### RegistrationOrgAdminProfiles
- Primary key: `id` (int, auto-increment)
- Foreign key: `referenceId` references RegistrationReferences.id
- allowOpenChat options: 'YES', 'NO'

### PortalUserChangeRequests
- Primary key: `id` (int, auto-increment)
- Type options: 'INTERNAL', 'EXTERNAL'
- Foreign keys: `referenceId` and `organizationId`

### PortalUserRequestLists
- Primary key: `id` (int, auto-increment)
- Foreign keys: `requestId` and `roleId`
- Access type options: 'OPENCHAT', 'PORTAL', 'BOTH'
- Status options: 'ADD', 'UPDATE', 'DELETE', 'UNCHANGED'

### PortalUserProfiles
- Primary key: `id` (int, auto-increment)
- Foreign key: `userId`

### PortalCompanyProfiles
- Primary key: `id` (int, auto-increment)
- Foreign keys: `referenceId` and `organizationId`

### PortalCeoProfiles
- Primary key: `id` (int, auto-increment)
- Foreign key: `organizationId`

## Error Handling

The script includes error handling and will continue even if some inserts fail. Check the console output for any error messages.
