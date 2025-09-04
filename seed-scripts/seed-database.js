// Enhanced Database Seeding Script for Company and User Relationships
const mysql = require("mysql2/promise");
const path = require("path");
const config = require("./config");
const { readExcelFile } = require("./excel-parser");
const { createRelationshipMappings } = require("./relation-helpers");

// Format date for MySQL
function formatDate(date) {
  if (!date) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// Main seeding function
async function seedDatabase() {
  console.log("Starting database seeding process...");

  // Create connection to database
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    console.log("Database connection established.");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    return;
  }

  try {
    // Read Excel data
    const excelFilePath = path.join(__dirname, config.excel.path);
    console.log(`Reading Excel data from: ${excelFilePath}`);
    const excelData = readExcelFile(excelFilePath); // readExcelFile is not async

    // Create relationship mappings
    console.log("Creating relationship mappings between tables...");
    const mappings = createRelationshipMappings(excelData);

    // Start transaction
    await connection.beginTransaction();

    // 1. Seed RegistrationReferences - one per company
    console.log("Seeding RegistrationReferences...");
    for (const companyKey of Object.keys(mappings.companyMap)) {
      const company = mappings.companyMap[companyKey];
      const now = formatDate(new Date());
      const hex = randomBytes(4).toString("hex").toUpperCase(); // 8 hex chars
      const code = `PT${hex}`;

      const contactPersonInfo = company.data;

      await connection.execute(
        `
        INSERT INTO RegistrationReferences (
          code, status, requestType, 
          contactPersonPhone, contactPersonEmail, contactPersonNameEn, contactPersonNameTh,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          code,
          "PENDING_CEO_APPROVAL",
          "CREATE",
          contactPersonInfo.contactPersonPhone || null,
          contactPersonInfo.contactPersonEmail || null,
          contactPersonInfo.contactPersonNameEn || null,
          contactPersonInfo.contactPersonNameTh || null,
          now,
          now,
        ]
      );
    }

    // 2. Seed RegistrationCompanyProfiles
    console.log("Seeding RegistrationCompanyProfiles...");
    for (const companyKey of Object.keys(mappings.companyMap)) {
      const company = mappings.companyMap[companyKey];
      const companyData = company.data;
      const now = formatDate(new Date());
      const referenceId = company.index + 1; // Link to the corresponding reference

      await connection.execute(
        `
        INSERT INTO RegistrationCompanyProfiles (
          nameTh, nameEn, sector, addressTh, addressEn, phone, referenceId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          companyData.nameTh || null,
          companyData.nameEn || null,
          companyData.sector || null,
          companyData.addressTh || null,
          companyData.addressEn || null,
          companyData.phone || null,
          referenceId,
          now,
          now,
        ]
      );
    }

    // 3. Seed RegistrationCeoProfiles
    console.log("Seeding RegistrationCeoProfiles...");
    for (const ceoIndex of Object.keys(mappings.ceoMap)) {
      const ceoMapping = mappings.ceoMap[ceoIndex];
      const ceoData = ceoMapping.ceoData;
      const now = formatDate(new Date());

      await connection.execute(
        `
        INSERT INTO RegistrationCeoProfiles (
          fullNameTh, fullNameEn, positionTh, positionEn, phone, email, referenceId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          ceoData.fullNameTh || null,
          ceoData.fullNameEn || null,
          ceoData.positionTh || null,
          ceoData.positionEn || null,
          ceoData.phone || null,
          ceoData.email || null,
          ceoMapping.referenceId,
          now,
          now,
        ]
      );
    }

    // 4. Seed RegistrationOrgAdminProfiles
    console.log("Seeding RegistrationOrgAdminProfiles...");
    for (const adminIndex of Object.keys(mappings.orgAdminMap)) {
      const adminMapping = mappings.orgAdminMap[adminIndex];
      const adminData = adminMapping.adminData;
      const now = formatDate(new Date());
      const effectiveDate = adminData.EffectiveDate
        ? formatDate(new Date(adminData.EffectiveDate))
        : now;

      await connection.execute(
        `
        INSERT INTO RegistrationOrgAdminProfiles (
          fullNameTh, fullNameEn, positionTh, positionEn, phone, email, effectiveDate, referenceId,
          allowOpenChat, lineId, openChatName, isAllowOpenChatChanged, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          adminData.fullNameTh || null,
          adminData.fullNameEn || null,
          adminData.positionTh || null,
          adminData.positionEn || null,
          adminData.phone || null,
          adminData.email || null,
          effectiveDate,
          adminMapping.referenceId,
          "NO", // Default value for allowOpenChat
          adminData.lineId || null,
          adminData.openChatName || null,
          0, // Default value for isAllowOpenChatChanged
          now,
          now,
        ]
      );
    }

    // 5. Seed PortalUserChangeRequests
    console.log("Seeding PortalUserChangeRequests...");
    for (const request of mappings.changeRequests) {
      const now = formatDate(new Date());

      await connection.execute(
        `
        INSERT INTO PortalUserChangeRequests (
          code, type, referenceId, organizationId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          request.code,
          request.type,
          request.referenceId,
          request.organizationId,
          now,
          now,
        ]
      );
    }

    // 6. Seed PortalUserRequestLists
    console.log("Seeding PortalUserRequestLists...");
    for (const userIndex of Object.keys(mappings.userRequestMap)) {
      const userMapping = mappings.userRequestMap[userIndex];
      const userData = userMapping.userData;
      const now = formatDate(new Date());

      await connection.execute(
        `
        INSERT INTO PortalUserRequestLists (
          requestId, email, roleId, fullNameEn, fullNameTh, positionEn, positionTh,
          lineId, openChatName, phone, accessType, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          userMapping.requestId,
          userData.email || null,
          userData.role || 1, // Default role ID if not specified
          userData.fullNameEn || null,
          userData.fullNameTh || null,
          userData.positionEn || null,
          userData.positionTh || null,
          userData.lineId || null,
          userData.openChatName || null,
          userData.phone || null,
          userData.accessType || "PORTAL",
          userData.status || "ADD",
          now,
          now,
        ]
      );
    }

    // Optionally seed the remaining tables (PortalUserProfiles, PortalCompanyProfiles, PortalCeoProfiles)
    // Here you would use similar patterns but derive data from the already inserted records

    // Commit transaction
    await connection.commit();
    console.log("Database seeding completed successfully!");
  } catch (error) {
    // Rollback on error
    if (connection) {
      await connection.rollback();
    }
    console.error("Database seeding failed:", error);
  } finally {
    // Close connection
    if (connection) {
      await connection.end();
    }
  }
}

// Execute the seeding function
seedDatabase().catch(console.error);
