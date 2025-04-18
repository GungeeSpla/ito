const prefix = "%cito";
const styleInfo =
  "color: #3b82f6; font-weight: bold; border: 1px solid #3b82f6; padding: 2px 4px; border-radius: 4px;";
const styleSuccess =
  "color: #10b981; font-weight: bold; border: 1px solid #10b981; padding: 2px 4px; border-radius: 4px;";
const styleWarn =
  "color: #f59e0b; font-weight: bold; border: 1px solid #f59e0b; padding: 2px 4px; border-radius: 4px;";
const styleError =
  "color: #ef4444; font-weight: bold; border: 1px solid #ef4444; padding: 2px 4px; border-radius: 4px;";

export const logInfo = (msg: string, obj?: any) => {
  console.log(`${prefix}%c ${msg}`, styleInfo, "color: inherit;", obj ?? "");
};

export const logSuccess = (msg: string, obj?: any) => {
  console.log(`${prefix}%c ${msg}`, styleSuccess, "color: inherit;", obj ?? "");
};

export const logWarn = (msg: string, obj?: any) => {
  console.warn(`${prefix}%c ${msg}`, styleWarn, "color: inherit;", obj ?? "");
};

export const logError = (msg: string, obj?: any) => {
  console.error(`${prefix}%c ${msg}`, styleError, "color: inherit;", obj ?? "");
};
