#!/usr/bin/env node
/**
 * Fails when an error code has no message in one of messages/{en,vi,ja}.json.
 *
 * Codes come from lib/error-codes.ts. When the backend repo sits next to this one
 * (../glossary-ai-backend), its ErrorCode enum is compared with that list as well.
 * See glossary-ai-backend/docs/adr/error-code-contract.md.
 *
 * Notification types follow the same contract: lib/notification-types.ts needs a message under
 * `Notifications.<TYPE>` in every locale, the `Notifications` keys must match across locales, and the list
 * is compared with the backend's NotificationType enum.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["en", "vi", "ja"];
const SUPPORT_KEYS = ["VALIDATION_FAILED_FIELD", "reference", "copyReference", "referenceCopied"];

function constArray(source, name) {
  const match = source.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) throw new Error(`Could not find ${name} in lib/error-codes.ts`);
  return [...match[1].matchAll(/"([A-Z_]+)"/g)].map((item) => item[1]);
}

const codesSource = readFileSync(join(root, "lib/error-codes.ts"), "utf8");
const serverCodes = constArray(codesSource, "SERVER_ERROR_CODES");
const clientCodes = constArray(codesSource, "CLIENT_ERROR_CODES");
const fieldCodes = constArray(codesSource, "FIELD_ERROR_CODES");
const problems = [];

for (const locale of LOCALES) {
  const errors = JSON.parse(readFileSync(join(root, `messages/${locale}.json`), "utf8")).Errors ?? {};
  for (const key of [...serverCodes, ...clientCodes, ...SUPPORT_KEYS]) {
    if (typeof errors[key] !== "string") problems.push(`messages/${locale}.json: missing Errors.${key}`);
  }
  for (const code of fieldCodes) {
    if (typeof errors.fields?.[code] !== "string") problems.push(`messages/${locale}.json: missing Errors.fields.${code}`);
  }
}

const backendEnum = join(root, "../glossary-ai-backend/app/helpers/exceptions.py");
if (existsSync(backendEnum)) {
  const python = readFileSync(backendEnum, "utf8");
  const enumBody = python.match(/class ErrorCode\(StrEnum\):([\s\S]*?)\nclass /)?.[1] ?? "";
  const backendCodes = [...enumBody.matchAll(/^\s{4}([A-Z_]+) = \(/gm)].map((item) => item[1]);
  for (const code of backendCodes.filter((code) => !serverCodes.includes(code))) {
    problems.push(`lib/error-codes.ts: backend code ${code} is missing from SERVER_ERROR_CODES`);
  }
  for (const code of serverCodes.filter((code) => !backendCodes.includes(code))) {
    problems.push(`lib/error-codes.ts: ${code} is not in the backend's ErrorCode enum`);
  }
} else {
  console.warn("Backend repo not found next to this one; skipped the comparison with its ErrorCode enum.");
}

// --- Notification types ---

const typesSource = readFileSync(join(root, "lib/notification-types.ts"), "utf8");
const notificationTypes = constArray(typesSource, "NOTIFICATION_TYPES");

function flatKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === "object" ? flatKeys(child, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

const notificationKeys = {};
for (const locale of LOCALES) {
  const notifications = JSON.parse(readFileSync(join(root, `messages/${locale}.json`), "utf8")).Notifications ?? {};
  notificationKeys[locale] = new Set(flatKeys(notifications));
  for (const key of [...notificationTypes, "UNKNOWN"]) {
    if (typeof notifications[key] !== "string") problems.push(`messages/${locale}.json: missing Notifications.${key}`);
  }
}
for (const locale of LOCALES.slice(1)) {
  for (const key of notificationKeys[LOCALES[0]]) {
    if (!notificationKeys[locale].has(key)) problems.push(`messages/${locale}.json: missing Notifications.${key}`);
  }
  for (const key of notificationKeys[locale]) {
    if (!notificationKeys[LOCALES[0]].has(key)) problems.push(`messages/${LOCALES[0]}.json: missing Notifications.${key}`);
  }
}

const backendModels = join(root, "../glossary-ai-backend/app/entities/models.py");
if (existsSync(backendModels)) {
  const python = readFileSync(backendModels, "utf8");
  const enumBody = python.match(/class NotificationType\(str, enum\.Enum\):([\s\S]*?)\n\n\n/)?.[1] ?? "";
  const backendTypes = [...enumBody.matchAll(/^\s{4}([A-Z_]+) = "/gm)].map((item) => item[1]);
  for (const type of backendTypes.filter((type) => !notificationTypes.includes(type))) {
    problems.push(`lib/notification-types.ts: backend type ${type} is missing from NOTIFICATION_TYPES`);
  }
  for (const type of notificationTypes.filter((type) => !backendTypes.includes(type))) {
    problems.push(`lib/notification-types.ts: ${type} is not in the backend's NotificationType enum`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(
  `Error codes OK: ${serverCodes.length + clientCodes.length} codes, ${fieldCodes.length} field codes, ` +
    `${notificationTypes.length} notification types, ${LOCALES.length} locales.`,
);
