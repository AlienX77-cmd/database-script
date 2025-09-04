// Enhanced Database Seeding Script for Company and User Relationships
const mysql = require("mysql2/promise");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");
const { readExcelFile } = require("./excel-parser");
const { createRelationshipMappings } = require("./relation-helpers");

// Helper function for generating random bytes
const randomBytes = (size) => crypto.randomBytes(size);

// Format date for MySQL
function formatDate(date) {
  if (!date) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// Helper function to convert role name to role ID
function getRoleId(role) {
  if (role === "User") return 3;
  if (role === "Publisher") return 4;
  return 3; // Default to 3 if not specified or unknown
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

    // Create a map of organizations for later reference
    console.log(
      "Checking organisations table and creating entries if needed..."
    );
    const orgMap = {};

    // Process each company and ensure it exists in the organisations table
    for (const companyKey of Object.keys(mappings.companyMap)) {
      const company = mappings.companyMap[companyKey];
      const companyData = company.data;
      const companyName = companyData.nameEn || "";

      // Check if organisation already exists
      const [orgRows] = await connection.execute(
        "SELECT id FROM organisations WHERE name = ?",
        [companyName]
      );

      let orgId;

      if (orgRows.length > 0) {
        // Organisation exists, use its ID
        orgId = orgRows[0].id;
        console.log(
          `Found existing organisation "${companyName}" with ID ${orgId}`
        );
      } else {
        // Organisation doesn't exist, create it
        const now = formatDate(new Date());
        const [result] = await connection.execute(
          `INSERT INTO organisations 
          (name, sector, date_created, date_modified) 
          VALUES (?, ?, ?, ?)`,
          [companyName, companyData.sector || "", now, now]
        );

        orgId = result.insertId;
        console.log(
          `Created new organisation "${companyName}" with ID ${orgId}`
        );
      }

      // Store orgId in companyMap for reference
      mappings.companyMap[companyKey].orgId = orgId;
    }

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

      // Get the organization ID from the company map
      const company = mappings.companyMap[request.companyKey];
      const orgId = company ? company.orgId : null;

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
          orgId, // Use the ID from organisations table
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
          // Get roleId based on the 'role' field
          getRoleId(userData.role) || 3, // Default to 3 if not specified
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

    // 7. Seed PortalCompanyProfiles
    console.log("Seeding PortalCompanyProfiles...");
    for (const companyKey of Object.keys(mappings.companyMap)) {
      const company = mappings.companyMap[companyKey];
      const companyData = company.data;
      const now = formatDate(new Date());
      const referenceId = company.index + 1;
      const orgId = company.orgId; // Use the organization ID we retrieved/created earlier

      await connection.execute(
        `
        INSERT INTO PortalCompanyProfiles (
          nameTh, nameEn, sector, code, addressTh, addressEn, phone, 
          referenceId, organizationId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          companyData.nameTh || null,
          companyData.nameEn || null,
          companyData.sector || null,
          companyData.code || null,
          companyData.addressTh || null,
          companyData.addressEn || null,
          companyData.phone || null,
          referenceId,
          orgId, // Use the ID from organisations table
          now,
          now,
        ]
      );
    }

    // 8. Seed PortalCeoProfiles if we have CEO data
    console.log("Seeding PortalCeoProfiles...");
    for (const ceoIndex of Object.keys(mappings.ceoMap)) {
      const ceoMapping = mappings.ceoMap[ceoIndex];
      const ceoData = ceoMapping.ceoData;
      const now = formatDate(new Date());

      // Get the organization ID for this CEO's company
      const company = Object.values(mappings.companyMap).find(
        (c) => c.index + 1 === ceoMapping.referenceId
      );
      const orgId = company ? company.orgId : null;

      if (orgId) {
        await connection.execute(
          `
          INSERT INTO PortalCeoProfiles (
            fullNameTh, fullNameEn, positionTh, positionEn, phone, email,
            organizationId, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            ceoData.fullNameTh || null,
            ceoData.fullNameEn || null,
            ceoData.positionTh || null,
            ceoData.positionEn || null,
            ceoData.phone || null,
            ceoData.email || null,
            orgId, // Use the ID from organisations table
            now,
            now,
          ]
        );
      } else {
        console.warn(`No organization ID found for CEO: ${ceoData.fullNameEn}`);
      }
    }

    // 9. Seed PortalUserProfiles
    // Assuming we'll create one user profile for each user request
    console.log("Seeding PortalUserProfiles...");
    for (const userIndex of Object.keys(mappings.userRequestMap)) {
      const userMapping = mappings.userRequestMap[userIndex];
      const userData = userMapping.userData;
      const now = formatDate(new Date());

      // For simplicity, generate a userId that matches the index
      const userId = parseInt(userIndex) + 1;

      await connection.execute(
        `
        INSERT INTO PortalUserProfiles (
          userId, fullNameEn, fullNameTh, positionEn, positionTh, 
          lineId, phone, openChatName, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          userId,
          userData.fullNameEn || null,
          userData.fullNameTh || null,
          userData.positionEn || null,
          userData.positionTh || null,
          userData.lineId || null,
          userData.phone || null,
          userData.openChatName || null,
          now,
          now,
        ]
      );
    }

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
