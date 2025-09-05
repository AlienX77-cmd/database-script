// Example: Extract data from Excel
import { extractRegistrationData } from "./extract.js";
import fs from "fs";

try {
  // Example: Extract entire registration data
  const registrationData1 = extractRegistrationData(
    "./feed-data-tcm-cert_AIMC.xlsx"
  );
  const registrationData2 = extractRegistrationData(
    "./feed-data-tcm-cert_ASCO.xlsx"
  );
  const registrationData3 = extractRegistrationData(
    "./feed-data-tcm-cert_TDO.xlsx"
  );

  // Convert data to formatted JSON string
  const jsonData1 = JSON.stringify(registrationData1, null, 2);
  const jsonData2 = JSON.stringify(registrationData2, null, 2);
  const jsonData3 = JSON.stringify(registrationData3, null, 2);

  // Write to JSON file
  const outputPath1 = "./output-registration-data-AIMC.json";
  fs.writeFileSync(outputPath1, jsonData1, "utf8");
  console.log(`Data successfully extracted and written to ${outputPath1}`);

  const outputPath2 = "./output-registration-data-ASCO.json";
  fs.writeFileSync(outputPath2, jsonData2, "utf8");
  console.log(`Data successfully extracted and written to ${outputPath2}`);

  const outputPath3 = "./output-registration-data-TDO.json";
  fs.writeFileSync(outputPath3, jsonData3, "utf8");
  console.log(`Data successfully extracted and written to ${outputPath3}`);
} catch (error) {
  console.error("Error processing data:", error.message);
}
