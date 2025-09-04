// Utility functions for Excel data processing
const XLSX = require("xlsx");
const path = require("path");

// Function to read data from Excel file
function readExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    // Object to store data from each sheet
    const data = {};

    // Read each sheet
    sheetNames.forEach((sheetName) => {
      console.log(`Reading sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];

      // Normalize sheet names to match our expected table names
      let normalizedName = sheetName;
      if (sheetName === "Company Profile") {
        normalizedName = "RegistrationCompanyProfiles";
      } else if (sheetName === "Ceo Profile") {
        normalizedName = "RegistrationCeoProfiles";
      } else if (sheetName === "Organization Admin Profile") {
        normalizedName = "RegistrationOrgAdminProfiles";
      } else if (sheetName === "User Request List") {
        normalizedName = "PortalUserRequestLists";
      }

      data[normalizedName] = XLSX.utils.sheet_to_json(worksheet);
    });

    return data;
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw error;
  }
}

// Helper function to normalize company names for matching
function normalizeName(name) {
  if (!name) return null;
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s.-]/g, "");
}

// Helper function to extract company name from email domain
function extractCompanyFromEmail(email) {
  if (!email) return null;
  const domain = email.split("@")[1];
  if (!domain) return null;
  // Take the domain part without the TLD (.com, .co.th, etc.)
  const companyPart = domain.split(".")[0]; // e.g., "jitta" from "jitta.com"
  return normalizeName(companyPart);
}

// Function to map Excel data to database schema
function mapExcelDataToSchema(data, tableNames) {
  const result = {};

  // First, create a map of company names for reference
  const companyMap = {};
  if (data["RegistrationCompanyProfiles"]) {
    data["RegistrationCompanyProfiles"].forEach((company, index) => {
      const normalizedName = normalizeName(company.nameEn);
      if (normalizedName) {
        companyMap[normalizedName] = {
          index: index,
          id: index + 1, // Simulating auto-increment ID
          ...company,
        };
      }
    });
  }

  // Create references first
  result["RegistrationReferences"] = [];
  if (data["RegistrationCompanyProfiles"]) {
    // Create one reference per company
    data["RegistrationCompanyProfiles"].forEach((company, index) => {
      const now = new Date();
      const code = `REF-${Math.floor(1000000 + Math.random() * 9000000)}`;

      result["RegistrationReferences"].push({
        id: index + 1,
        code: code,
        status: "PENDING_CEO_APPROVAL",
        requestType: "CREATE",
        contactPersonPhone: company.contactPersonPhone,
        contactPersonEmail: company.contactPersonEmail,
        contactPersonNameEn: company.contactPersonNameEn,
        contactPersonNameTh: company.contactPersonNameTh,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  // Process each table using the reference and company information
  tableNames.forEach((tableName) => {
    // Skip RegistrationReferences since we've already created it
    if (tableName === "RegistrationReferences") {
      return;
    }

    result[tableName] = [];

    if (tableName === "RegistrationCompanyProfiles" && data[tableName]) {
      data[tableName].forEach((row, index) => {
        result[tableName].push({
          ...mapCompanyProfile(row),
          referenceId: index + 1, // Link to the corresponding reference
        });
      });
    } else if (tableName === "RegistrationCeoProfiles" && data[tableName]) {
      data[tableName].forEach((row) => {
        // Link CEO to company using the Remark field which contains company name
        const companyNormalizedName = normalizeName(row.Remark);
        const company = companyMap[companyNormalizedName];

        if (company) {
          result[tableName].push({
            ...mapCeoProfile(row),
            referenceId: company.index + 1,
          });
        } else {
          console.warn(`No company found for CEO with Remark: "${row.Remark}"`);
        }
      });
    } else if (
      tableName === "RegistrationOrgAdminProfiles" &&
      data[tableName]
    ) {
      data[tableName].forEach((row) => {
        // First try to match by Company field if available
        let company = null;

        if (row.Company) {
          const normalizedCompanyName = normalizeName(row.Company);
          company = companyMap[normalizedCompanyName];

          // Try fuzzy matching if direct match fails
          if (!company) {
            const matchKey = Object.keys(companyMap).find(
              (k) =>
                k.includes(normalizedCompanyName) ||
                (normalizedCompanyName && normalizedCompanyName.includes(k))
            );
            if (matchKey) company = companyMap[matchKey];
          }
        }

        // Fall back to email domain matching if Company field isn't available or didn't match
        if (!company) {
          // Link Org Admin to company using email domain
          const companyFromEmail = extractCompanyFromEmail(row.email);

          // Try direct match first
          if (companyMap[companyFromEmail]) {
            company = companyMap[companyFromEmail];
          } else {
            // Try fuzzy matching if direct match fails
            const matchKey = Object.keys(companyMap).find(
              (k) =>
                k.includes(companyFromEmail) ||
                (companyFromEmail && companyFromEmail.includes(k))
            );
            if (matchKey) company = companyMap[matchKey];
          }
          if (matchKey) company = companyMap[matchKey];
        }

        if (company) {
          result[tableName].push({
            ...mapOrgAdminProfile(row),
            referenceId: company.index + 1,
          });
        } else {
          console.warn(
            `No company found for Org Admin with email: "${row.email}"`
          );
        }
      });
    } else if (tableName === "PortalUserChangeRequests") {
      // Create user change requests - one per company
      Object.keys(companyMap).forEach((companyKey, index) => {
        const company = companyMap[companyKey];
        const requestId = index + 1;
        const code = `REQ-${Math.floor(1000000 + Math.random() * 9000000)}`;

        result[tableName].push({
          id: requestId,
          code: code,
          type: "INTERNAL",
          referenceId: company.index + 1,
          organizationId: company.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    } else if (tableName === "PortalUserRequestLists" && data[tableName]) {
      data[tableName].forEach((row) => {
        // First try to match by Company field if available
        let company = null;

        if (row.Company) {
          const normalizedCompanyName = normalizeName(row.Company);
          company = companyMap[normalizedCompanyName];

          // Try fuzzy matching if direct match fails
          if (!company) {
            const matchKey = Object.keys(companyMap).find(
              (k) =>
                k.includes(normalizedCompanyName) ||
                (normalizedCompanyName && normalizedCompanyName.includes(k))
            );
            if (matchKey) company = companyMap[matchKey];
          }
        }

        // Fall back to email domain matching if Company field isn't available or didn't match
        if (!company) {
          // Link User Request to company using email domain
          const companyFromEmail = extractCompanyFromEmail(row.email);

          // Try direct match first
          if (companyMap[companyFromEmail]) {
            company = companyMap[companyFromEmail];
          } else {
            // Try fuzzy matching if direct match fails
            const matchKey = Object.keys(companyMap).find(
              (k) =>
                k.includes(companyFromEmail) ||
                (companyFromEmail && companyFromEmail.includes(k))
            );
            if (matchKey) company = companyMap[matchKey];
          }
          if (matchKey) company = companyMap[matchKey];
        }

        if (company) {
          // Use company index + 1 as the requestId to link to PortalUserChangeRequests
          const requestId = company.index + 1;

          result[tableName].push({
            ...mapPortalUserRequestList(row),
            requestId: requestId,
            roleId: row.role ? parseInt(row.role) : 1, // Default role ID if not specified
          });
        } else {
          console.warn(
            `No company found for User Request with email: "${row.email}"`
          );
        }
      });
    } else if (
      tableName === "PortalUserProfiles" ||
      tableName === "PortalCompanyProfiles" ||
      tableName === "PortalCeoProfiles"
    ) {
      // For these tables, derive data from the registration profiles
      // This is a simplification - you may want to customize the logic further

      if (
        tableName === "PortalCompanyProfiles" &&
        result["RegistrationCompanyProfiles"]
      ) {
        result["RegistrationCompanyProfiles"].forEach((company, index) => {
          result[tableName].push({
            ...mapPortalCompanyProfile(company),
            organizationId: index + 1,
            referenceId: index + 1,
          });
        });
      } else if (
        tableName === "PortalCeoProfiles" &&
        result["RegistrationCeoProfiles"]
      ) {
        result["RegistrationCeoProfiles"].forEach((ceo, index) => {
          result[tableName].push({
            ...mapPortalCeoProfile(ceo),
            organizationId: ceo.referenceId, // Using referenceId as organizationId
          });
        });
      } else if (
        tableName === "PortalUserProfiles" &&
        result["PortalUserRequestLists"]
      ) {
        // Create user profiles from user request lists
        // This is simplified - in a real system, you might have different logic
        result["PortalUserRequestLists"].forEach((userRequest, index) => {
          result[tableName].push({
            ...mapPortalUserProfile(userRequest),
            userId: index + 1, // Auto-generated user ID
          });
        });
      }
    }
  });

  return result;
}

// Mapping functions for each table
function mapRegistrationReference(row) {
  return {
    code: row.code,
    status: row.status || "PENDING_CEO_APPROVAL",
    requestType: row.requestType || "CREATE",
    ceoApprovedDate: row.ceoApprovedDate,
    adminApprovedDate: row.adminApprovedDate,
    pdfVersion: row.pdfVersion,
    pdfLink: row.pdfLink,
    pdfLinkExpiresAt: row.pdfLinkExpiresAt,
    contactPersonPhone: row.contactPersonPhone,
    contactPersonEmail: row.contactPersonEmail,
    contactPersonNameEn: row.contactPersonNameEn,
    contactPersonNameTh: row.contactPersonNameTh,
    token: row.token,
    expiresAt: row.expiresAt,
    rejectedAt: row.rejectedAt,
    createdAt: row.createdAt || new Date(),
    updatedAt: row.updatedAt || new Date(),
  };
}

function mapCompanyProfile(row) {
  return {
    nameTh: row.nameTh,
    nameEn: row.nameEn,
    sector: row.sector,
    code: row.code,
    addressTh: row.addressTh,
    addressEn: row.addressEn,
    phone: row.phone,
    referenceId: row.referenceId,
    createdAt: row.createdAt || new Date(),
    updatedAt: row.updatedAt || new Date(),
  };
}

function mapCeoProfile(row) {
  return {
    fullNameTh: row.fullNameTh,
    fullNameEn: row.fullNameEn,
    positionTh: row.positionTh,
    positionEn: row.positionEn,
    phone: row.phone,
    email: row.email,
    referenceId: row.referenceId,
    createdAt: row.createdAt || new Date(),
    updatedAt: row.updatedAt || new Date(),
  };
}

function mapOrgAdminProfile(row) {
  // Map from "Organization Admin Profile" sheet to RegistrationOrgAdminProfiles
  const now = new Date();
  return {
    fullNameTh: row.fullNameTh,
    fullNameEn: row.fullNameEn,
    positionTh: row.positionTh,
    positionEn: row.positionEn,
    phone: row.phone,
    email: row.email,
    effectiveDate: row.EffectiveDate ? new Date(row.EffectiveDate) : now,
    referenceId: row.referenceId,
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || now,
    allowOpenChat: row.allowOpenChat || "NO",
    lineId: row.lineId,
    openChatName: row.openChatName,
    isAllowOpenChatChanged: row.isAllowOpenChatChanged || 0,
  };
}

function mapPortalUserChangeRequest(row) {
  const now = new Date();
  return {
    code: row.code,
    type: row.type || "INTERNAL",
    referenceId: row.referenceId,
    organizationId: row.organizationId,
    approvedDate: row.approvedDate,
    rejectedAt: row.rejectedAt,
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || now,
  };
}

function mapPortalUserRequestList(row) {
  // Map from "User Request List" sheet to PortalUserRequestLists
  const now = new Date();

  // Map role names to roleId values
  let roleId;
  if (row.role === "User") {
    roleId = 3;
  } else if (row.role === "Publisher") {
    roleId = 4;
  } else {
    roleId = row.roleId || 3; // Default to 3 if not specified
  }

  return {
    requestId: row.requestId,
    email: row.email,
    roleId: roleId,
    fullNameEn: row.fullNameEn,
    fullNameTh: row.fullNameTh,
    positionEn: row.positionEn,
    positionTh: row.positionTh,
    lineId: row.lineId,
    openChatName: row.openChatName,
    phone: row.phone,
    accessType: row.accessType || "PORTAL",
    status: row.status || "ADD",
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || now,
  };
}

function mapPortalUserProfile(row) {
  const now = new Date();
  return {
    userId: row.userId,
    fullNameEn: row.fullNameEn,
    lineId: row.lineId,
    phone: row.phone,
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || now,
    acceptConsentAt: row.acceptConsentAt,
    fullNameTh: row.fullNameTh,
    positionEn: row.positionEn,
    positionTh: row.positionTh,
    openChatName: row.openChatName,
    effectiveDate: row.effectiveDate,
  };
}

function mapPortalCompanyProfile(row) {
  const now = new Date();
  return {
    nameTh: row.nameTh,
    nameEn: row.nameEn,
    sector: row.sector,
    code: row.code,
    addressTh: row.addressTh,
    addressEn: row.addressEn,
    phone: row.phone,
    referenceId: row.referenceId,
    organizationId: row.organizationId,
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || now,
    lastReviewedAt: row.lastReviewedAt || now,
  };
}

function mapPortalCeoProfile(row) {
  const now = new Date();
  return {
    fullNameTh: row.fullNameTh,
    fullNameEn: row.fullNameEn,
    positionTh: row.positionTh,
    positionEn: row.positionEn,
    phone: row.phone,
    email: row.email,
    organizationId: row.organizationId,
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || now,
  };
}

module.exports = {
  readExcelFile,
  mapExcelDataToSchema,
  normalizeName,
  extractCompanyFromEmail,
};
