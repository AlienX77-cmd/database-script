// Helper functions for managing relationships between database tables
const crypto = require("crypto");

// Helper function for generating random bytes
const randomBytes = (size) => crypto.randomBytes(size);

/**
 * Normalize company name for consistent matching
 * @param {string} name - The company name to normalize
 * @returns {string|null} - The normalized company name or null if invalid
 */
function normalizeName(name) {
  if (!name) return null;
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s.-]/g, "");
}

/**
 * Extract company name from an email domain
 * @param {string} email - The email address
 * @returns {string|null} - The normalized company name from domain or null if invalid
 */
function extractCompanyFromEmail(email) {
  if (!email) return null;
  const domain = email.split("@")[1];
  if (!domain) return null;
  const companyPart = domain.split(".")[0]; // take first segment
  return normalizeName(companyPart);
}

/**
 * Creates mappings between companies, CEOs, admins, and user requests based on Excel data
 * @param {Object} excelData - The parsed Excel data
 * @returns {Object} - Object containing relationship mappings
 */
function createRelationshipMappings(excelData) {
  const companyMap = {};
  const ceoMap = {};
  const orgAdminMap = {};
  const userRequestMap = {};
  const changeRequests = [];

  // First pass: create company map
  if (excelData["RegistrationCompanyProfiles"]) {
    excelData["RegistrationCompanyProfiles"].forEach((company, index) => {
      const normalizedName = normalizeName(company.nameEn);
      if (normalizedName) {
        companyMap[normalizedName] = {
          index,
          id: index + 1, // Simulating auto-increment ID
          data: company,
        };
      }
    });
  }

  // Second pass: map CEOs to companies
  if (excelData["RegistrationCeoProfiles"]) {
    excelData["RegistrationCeoProfiles"].forEach((ceo, index) => {
      const companyNormalizedName = normalizeName(ceo.Remark);

      // Try to find matching company
      let companyMatch = companyMap[companyNormalizedName];

      if (!companyMatch) {
        // Try fuzzy matching
        const matchKey = Object.keys(companyMap).find(
          (k) =>
            k.includes(companyNormalizedName) ||
            (companyNormalizedName && companyNormalizedName.includes(k))
        );
        if (matchKey) companyMatch = companyMap[matchKey];
      }

      if (companyMatch) {
        ceoMap[index] = {
          ceoData: ceo,
          companyId: companyMatch.id,
          referenceId: companyMatch.index + 1,
        };
      }
    });
  }

  // Third pass: map org admins to companies
  if (excelData["RegistrationOrgAdminProfiles"]) {
    excelData["RegistrationOrgAdminProfiles"].forEach((admin, index) => {
      // First try using the Company field if available
      let companyMatch = null;

      if (admin.Company) {
        // If Company column exists, use it for direct mapping
        const normalizedCompanyName = normalizeName(admin.Company);
        companyMatch = companyMap[normalizedCompanyName];

        // Try fuzzy matching if direct match fails
        if (!companyMatch) {
          const matchKey = Object.keys(companyMap).find(
            (k) =>
              k.includes(normalizedCompanyName) ||
              normalizedCompanyName?.includes(k)
          );
          if (matchKey) companyMatch = companyMap[matchKey];
        }
      }

      // Fall back to email domain if Company field isn't available or didn't match
      if (!companyMatch) {
        const companyFromEmail = extractCompanyFromEmail(admin.email);

        // Try direct match
        companyMatch = companyMap[companyFromEmail];

        // Try fuzzy matching if direct match fails
        if (!companyMatch && companyFromEmail) {
          const matchKey = Object.keys(companyMap).find(
            (k) => k.includes(companyFromEmail) || companyFromEmail?.includes(k)
          );
          if (matchKey) companyMatch = companyMap[matchKey];
        }
      }

      if (companyMatch) {
        orgAdminMap[index] = {
          adminData: admin,
          companyId: companyMatch.id,
          referenceId: companyMatch.index + 1,
        };
      } else {
        console.warn(
          `No company found for Org Admin: ${admin.fullNameEn} (${admin.email})`
        );
      }
    });
  }

  // Fourth pass: Create change requests and map user requests
  // Create one change request per company
  Object.values(companyMap).forEach((company, index) => {
    const requestId = index + 1;
    const hex = randomBytes(4).toString("hex").toUpperCase(); // 8 hex chars
    const code = `USERCR${hex}`;

    changeRequests.push({
      id: requestId,
      code,
      type: "INTERNAL",
      referenceId: company.index + 1,
      organizationId: company.id,
    });
  });

  // Map user requests to companies and change requests
  if (excelData["PortalUserRequestLists"]) {
    excelData["PortalUserRequestLists"].forEach((user, index) => {
      // Map role names to roleId values if needed
      if (user.role === "User") {
        user.roleId = 3;
      } else if (user.role === "Publisher") {
        user.roleId = 4;
      } else if (!user.roleId) {
        user.roleId = 3; // Default to 3 if not specified
      }

      // First try using the Company field if available
      let companyMatch = null;
      if (user.Company) {
        // If Company column exists, use it for direct mapping
        const normalizedCompanyName = normalizeName(user.Company);
        companyMatch = companyMap[normalizedCompanyName];

        // Try fuzzy matching if direct match fails
        if (!companyMatch) {
          const matchKey = Object.keys(companyMap).find(
            (k) =>
              k.includes(normalizedCompanyName) ||
              normalizedCompanyName?.includes(k)
          );
          if (matchKey) companyMatch = companyMap[matchKey];
        }
      }

      // Fall back to email domain if Company field isn't available or didn't match
      if (!companyMatch) {
        const companyFromEmail = extractCompanyFromEmail(user.email);

        // Try direct match
        companyMatch = companyMap[companyFromEmail];

        // Try fuzzy matching if direct match fails
        if (!companyMatch && companyFromEmail) {
          const matchKey = Object.keys(companyMap).find(
            (k) => k.includes(companyFromEmail) || companyFromEmail?.includes(k)
          );
          if (matchKey) companyMatch = companyMap[matchKey];
        }
      }

      if (companyMatch) {
        userRequestMap[index] = {
          userData: user,
          companyId: companyMatch.id,
          // Link to the change request for this company
          requestId: companyMatch.index + 1,
        };
      } else {
        console.warn(
          `No company found for User Request: ${user.fullNameEn} (${user.email})`
        );
      }
    });
  }

  return {
    companyMap,
    ceoMap,
    orgAdminMap,
    userRequestMap,
    changeRequests,
  };
}

module.exports = {
  normalizeName,
  extractCompanyFromEmail,
  createRelationshipMappings,
};
