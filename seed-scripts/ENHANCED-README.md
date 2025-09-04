# Enhanced Database Seeding Script

This script seeds data into the database tables based on Excel data, maintaining proper relationships between tables.

## How It Works

This enhanced version of the seeding script handles the relationships between different tables by:

1. Reading data from an Excel file with the following sheets:

   - Company Profile
   - CEO Profile
   - Organization Admin Profile
   - User Request List

2. Creating proper relationships between:

   - Companies and their CEOs (linked by company name in the Remark field)
   - Companies and their Org Admins (linked by company name in email domains)
   - Companies and User Requests (linked by company name in email domains)
   - PortalUserChangeRequests and PortalUserRequestLists (one-to-many relationship)

3. Maintaining proper foreign key relationships and data consistency

## Usage

1. Make sure your Excel file (`tcm-cert-data-template_AIMC.xlsx`) contains the required sheets with appropriate columns.

2. Configure the database connection in `config.js`:

   ```javascript
   database: {
     host: "localhost",
     user: "root",
     password: "your_password",
     database: "misp",
   }
   ```

3. Run the enhanced seeding script:
   ```
   node enhanced-seed-database.js
   ```

## Excel Sheet Structure

### Company Profile

- nameEn, nameTh
- sector
- addressEn, addressTh
- phone
- contactPersonEmail, contactPersonNameEn, contactPersonPhone

### CEO Profile

- fullNameEn, fullNameTh
- positionEn, positionTh
- email, phone
- Remark (contains company name for mapping)

### Organization Admin Profile

- fullNameEn, fullNameTh
- positionEn, positionTh
- email, phone
- EffectiveDate

### User Request List

- fullNameEn, fullNameTh
- positionEn, positionTh
- email, phone
- lineId, openChatName
- role, accessType

## Relationship Mapping

The script intelligently maps relationships between tables by:

1. Using company name normalization for consistent matching
2. Extracting company names from email domains
3. Implementing fuzzy matching for inexact company name matches
4. Creating one change request per company that links to multiple user requests

## Troubleshooting

If you encounter issues:

1. Ensure your Excel file contains all required sheets and columns
2. Check database connection parameters
3. Verify that the database schema matches the expected structure
4. Review the log output for specific error messages
