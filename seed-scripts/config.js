// Configuration settings for database connection and seeding
module.exports = {
  // Database connection settings
  database: {
    host: "localhost",
    user: "root",
    password: "password", // Change this to your actual password
    database: "misp", // Change to your database name if different
  },

  // Excel file settings
  excel: {
    path: "../tcm-cert-data-template_AIMC.xlsx",
  },

  // Seeding options
  seeding: {
    // Number of records to generate if Excel data is not available
    defaultRecordCount: 10,
    // Tables to seed in the correct order (to maintain foreign key relationships)
    tables: [
      "RegistrationReferences",
      "RegistrationCompanyProfiles",
      "RegistrationCeoProfiles",
      "RegistrationOrgAdminProfiles",
      "PortalUserChangeRequests",
      "PortalUserRequestLists",
      "PortalUserProfiles",
      "PortalCompanyProfiles",
      "PortalCeoProfiles",
    ],
  },
};
