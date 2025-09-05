import XLSX from "xlsx";
import dayjs from "dayjs";

// AccessType enum equivalent
export const AccessType = {
  Both: "BOTH",
  Openchat: "OPENCHAT",
  Portal: "PORTAL",
};

// Status enum equivalent
export const Status = {
  Add: "ADD",
  Delete: "DELETE",
  Unchange: "UNCHANGE",
  Update: "UPDATE",
};

/**
 * Extracts specific columns from an Excel file into a JSON array
 * @param {string} filePath Path to the Excel file
 * @param {string} sheetName Name of the sheet to extract data from
 * @param {object} columnMapping Object mapping Excel column names to JSON property names
 * @returns {Array} Array of JSON objects with the extracted data
 */
export function extractExcelColumnsToJson(filePath, sheetName, columnMapping) {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in the workbook`);
  }

  // Convert sheet to JSON with raw data
  const rawData = XLSX.utils.sheet_to_json(sheet);
  console.log(`Found ${rawData.length} rows in sheet "${sheetName}"`);

  // Map the columns to the desired property names
  return rawData.map((row) => {
    const result = {};

    for (const [propertyName, excelColumn] of Object.entries(columnMapping)) {
      if (excelColumn in row) {
        result[propertyName] = row[excelColumn];
      }
    }

    return result;
  });
}

/**
 * Extracts data from an Excel file and maps it to RegistrationCreationData format
 * @param {string} filePath Path to the Excel file
 * @returns {Array} Array of RegistrationCreationData objects, one per company
 */
export function extractRegistrationData(filePath) {
  console.log("Extracting data from:", filePath);

  // Extract company profile data
  const companyData = extractExcelColumnsToJson(filePath, "Company", {
    _key: "key",
    addressEn: "addressEn",
    addressTh: "addressTh",
    code: "code",
    contactPersonEmail: "contactPersonEmail",
    contactPersonNameEn: "contactPersonNameEn",
    contactPersonNameTh: "contactPersonNameTh",
    contactPersonPhone: "contactPersonPhone",
    nameEn: "nameEn",
    nameTh: "nameTh",
    phone: "phone",
    sector: "sector",
  });

  // Extract CEO data
  const ceoData = extractExcelColumnsToJson(filePath, "Ceo", {
    _key: "key",
    email: "email",
    fullNameEn: "fullNameEn",
    fullNameTh: "fullNameTh",
    phone: "phone",
    positionEn: "positionEn",
    positionTh: "positionTh",
  });

  // Extract organization admin profile data
  const orgAdminData = extractExcelColumnsToJson(filePath, "OrgAdmin", {
    _key: "key",
    effectiveDate: "effectiveDate",
    email: "email",
    fullNameEn: "fullNameEn",
    fullNameTh: "fullNameTh",
    phone: "phone",
    positionEn: "positionEn",
    positionTh: "positionTh",
    lineId: "lineId",
    openChatName: "openChatName",
    allowOpenChat: "allowOpenChat",
    isAllowOpenChatChanged: "isAllowOpenChatChanged",
  });

  // Extract user request list data
  const userRequestsData = extractExcelColumnsToJson(filePath, "UserList", {
    _key: "key",
    accessType: "accessType",
    email: "email",
    fullNameEn: "fullNameEn",
    fullNameTh: "fullNameTh",
    lineId: "lineId",
    openChatName: "openChatName",
    phone: "phone",
    positionEn: "positionEn",
    positionTh: "positionTh",
  });

  // Process user requests to set proper values
  const userRequests = userRequestsData.map((user) => ({
    ...user,
    // Convert string values to enum values
    accessType: mapToAccessType(user.accessType),
    status: Status.Add,
    roleId: user.role === "User" ? 3 : 4,
  }));

  // Collect all unique company keys from all sheets
  const allKeys = new Set();

  // Add keys from each data array if they exist
  companyData.forEach((item) => allKeys.add(item._key));
  ceoData.forEach((item) => allKeys.add(item._key));
  orgAdminData.forEach((item) => allKeys.add(item._key));
  userRequests.forEach((item) => allKeys.add(item._key));
  console.log("All keys:", allKeys);

  const companyKeys = Array.from(allKeys);
  console.log(`Found ${companyKeys.length} unique company keys`);

  // For each company key, create a registration data object
  return companyKeys.map((key) => {
    console.log(`Processing company with key: ${key}`);

    const company = companyData.find((item) => item._key === key) || {};
    const ceo = ceoData.find((item) => item._key === key) || {};
    const orgAdmin = orgAdminData.find((item) => item._key === key) || {};
    const users = userRequests.filter((user) => user._key === key) || [];

    console.log(
      `Company: ${company.nameEn || "Unknown"}, Users: ${users.length}`
    );

    console.log("effective Date:", orgAdmin.effectiveDate);

    // Create the RegistrationCreationData object for this company
    return {
      ceoProfile: {
        email: ceo.email || "",
        fullNameEn: ceo.fullNameEn || "",
        fullNameTh: ceo.fullNameTh || "",
        phone: ceo.phone || "",
        positionEn: ceo.positionEn || "",
        positionTh: ceo.positionTh || "",
      },
      companyProfile: {
        addressEn: company.addressEn || "",
        addressTh: company.addressTh || "",
        code: company.code || "",
        contactPersonEmail: company.contactPersonEmail || "",
        contactPersonNameEn: company.contactPersonNameEn || "",
        contactPersonNameTh: company.contactPersonNameTh || "",
        contactPersonPhone: company.contactPersonPhone || "",
        nameEn: company.nameEn || "",
        nameTh: company.nameTh || "",
        phone: company.phone || "",
        sector: company.sector || "",
      },
      orgAdminProfile: {
        effectiveDate: orgAdmin.effectiveDate
          ? dayjs(orgAdmin.effectiveDate.toString()).toDate()
          : dayjs().toDate(),
        email: orgAdmin.email || "",
        fullNameEn: orgAdmin.fullNameEn || "",
        fullNameTh: orgAdmin.fullNameTh || "",
        phone: orgAdmin.phone || "",
        positionEn: orgAdmin.positionEn || "",
        positionTh: orgAdmin.positionTh || "",
        lineId: orgAdmin.lineId || null,
        openChatName: orgAdmin.openChatName || null,
        allowOpenChat: orgAdmin.allowOpenChat || "NO",
        isAllowOpenChatChanged:
          Boolean(orgAdmin.isAllowOpenChatChanged) || false,
      },
      userRequestList: users.map((user) => ({
        accessType: user.accessType,
        email: user.email || "",
        fullNameEn: user.fullNameEn || "",
        fullNameTh: user.fullNameTh || "",
        lineId: user.lineId || null,
        openChatName: user.openChatName || null,
        phone: user.phone || "",
        positionEn: user.positionEn || "",
        positionTh: user.positionTh || "",
        roleId: user.roleId,
        status: user.status,
      })),
    };
  });
}

/**
 * Maps a string value to AccessType enum
 * @param {string} value The access type value
 * @returns {string} The mapped AccessType value
 */
function mapToAccessType(value) {
  if (!value) return AccessType.Portal; // Default

  const upperValue = value.toUpperCase();
  if (upperValue === "BOTH") return AccessType.Both;
  if (upperValue === "OPENCHAT") return AccessType.Openchat;
  return AccessType.Portal;
}

/**
 * Maps a string value to Status enum
 * @param {string} value The status value
 * @returns {string} The mapped Status value
 */
function mapToStatus(value) {
  if (!value) return Status.Add; // Default

  const upperValue = value.toUpperCase();
  if (upperValue === "ADD") return Status.Add;
  if (upperValue === "DELETE") return Status.Delete;
  if (upperValue === "UNCHANGE") return Status.Unchange;
  if (upperValue === "UPDATE") return Status.Update;
  return Status.Add;
}
