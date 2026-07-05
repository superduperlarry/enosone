/** MCC-flavored category keys used by policy allowlists and the spend form. */
export const SPEND_CATEGORIES = [
  "software_services",
  "advertising",
  "cloud_infrastructure",
  "data_apis",
  "logistics",
  "travel",
  "office_supplies",
  "professional_services",
  "other",
] as const;

export type SpendCategory = (typeof SPEND_CATEGORIES)[number];
