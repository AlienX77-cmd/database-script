export interface RegistrationCreationData {
  ceoProfile: CeoProfile;
  companyProfile: CompanyProfile;
  orgAdminProfile: OrgAdminProfile;
  userRequestList: UserRequestList[];
}

export interface CeoProfile {
  /**
   * Email address of the CEO
   */
  email: string;
  /**
   * Full name of the CEO in English language
   */
  fullNameEn: string;
  /**
   * Full name of the CEO in Thai language
   */
  fullNameTh: string;
  /**
   * Phone number of the CEO
   */
  phone: string;
  /**
   * Position of the CEO in English
   */
  positionEn: string;
  /**
   * Position of the CEO in Thai
   */
  positionTh: string;
  [property: string]: any;
}

export interface CompanyProfile {
  /**
   * Company address in English
   */
  addressEn: string;
  /**
   * Company address in Thai
   */
  addressTh: string;
  /**
   * Company code or identifier used during registration
   */
  code: string;
  /**
   * Contact Person Email
   */
  contactPersonEmail: string;
  /**
   * Contact Person Name in English
   */
  contactPersonNameEn: string;
  /**
   * Contact Person Name in Thai
   */
  contactPersonNameTh: string;
  /**
   * Contact Person Phone
   */
  contactPersonPhone: string;
  /**
   * Company name in English language
   */
  nameEn: string;
  /**
   * Company name in Thai language
   */
  nameTh: string;
  /**
   * Company phone number
   */
  phone: string;
  /**
   * Business sector of the company
   */
  sector: string;
  [property: string]: any;
}

export interface OrgAdminProfile {
  /**
   * Effective date for the admin's role or profile (YYYY-MM-DD)
   */
  effectiveDate: Date;
  /**
   * Email address of the admin
   */
  email: string;
  /**
   * Full name of the admin in English language
   */
  fullNameEn: string;
  /**
   * Full name of the admin in Thai language
   */
  fullNameTh: string;
  /**
   * Phone number of the admin
   */
  phone: string;
  /**
   * Position of the admin in English
   */
  positionEn: string;
  /**
   * Position of the admin in Thai
   */
  positionTh: string;
  lineId?: null | string;
  openChatName?: null | string;
  allowOpenChat: string;
  isAllowOpenChatChanged: boolean;
}

export interface UserRequestList {
  /**
   * Type of access for the user. Defaults to PORTAL.
   */
  accessType: AccessType;
  /**
   * Email address of the user to be changed
   */
  email: string;
  /**
   * Full name of the user in English language
   */
  fullNameEn: string;
  /**
   * Full name of the user in Thai language
   */
  fullNameTh: string;
  /**
   * User's LINE ID
   */
  lineId?: null | string;
  /**
   * User's OpenChat display name
   */
  openChatName?: null | string;
  /**
   * Phone number of the user
   */
  phone: string;
  /**
   * Position of the user
   */
  positionEn: string;
  positionTh: string;
  /**
   * Identifier for the Role (R.id) to be assigned or modified for the user
   */
  roleId: number;
  /**
   * The type of change action for this user (e.g., ADD new user, UPDATE existing, DELETE user)
   */
  status: Status;
  [property: string]: any;
}

/**
 * Type of access for the user. Defaults to PORTAL.
 */
export enum AccessType {
  Both = "BOTH",
  Openchat = "OPENCHAT",
  Portal = "PORTAL",
}

/**
 * The type of change action for this user (e.g., ADD new user, UPDATE existing, DELETE user)
 */
export enum Status {
  Add = "ADD",
  Delete = "DELETE",
  Unchange = "UNCHANGE",
  Update = "UPDATE",
}
