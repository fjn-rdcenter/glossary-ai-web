import type {
  GlossaryDetailResponse,
  GlossaryPermissionAdminResponse,
  GlossaryPermissionBaseResponse,
} from "@/lib/types";
import type {GlossaryLocale} from "./glossary-copy";

export const SESSION_GLOSSARY_TEMPLATE_ID = "__glossary-session-template__";

const STORAGE_KEY = "glossary-ai:session-glossary-template:v2";
const STORAGE_VERSION = 2;

type SessionGlossaryState = {
  deleted: boolean;
  glossary: GlossaryDetailResponse | null;
  permissions: GlossaryPermissionAdminResponse;
  version: typeof STORAGE_VERSION;
};

type SessionGlossaryUpdate = {
  description?: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  terms: Array<{id?: string; source: string; target: string}>;
};

const templateCopy: Record<GlossaryLocale, {description: string; name: string}> = {
  en: {
    name: "Sample terminology glossary",
    description: "A session-only glossary for trying details, editing, sharing, and term management.",
  },
  vi: {
    name: "Bộ thuật ngữ mẫu",
    description: "Bộ thuật ngữ chỉ lưu trong phiên để thử xem thông tin, chỉnh sửa, chia sẻ và quản lý thuật ngữ.",
  },
  ja: {
    name: "サンプル用語集",
    description: "詳細表示、編集、共有、用語管理を試すためのセッション専用用語集です。",
  },
};

const templateTerms = [
  {source: "用語集", target: "Bộ thuật ngữ"},
  {source: "ファイル", target: "ファイル"},
  {source: "翻訳", target: "Bản dịch"},
  {source: "文書", target: "Tài liệu"},
  {source: "言語", target: "Ngôn ngữ"},
  {source: "原文", target: "Văn bản gốc"},
  {source: "訳文", target: "Văn bản đích"},
  {source: "用語", target: "Thuật ngữ"},
  {source: "共有", target: "Chia sẻ"},
  {source: "編集", target: "Chỉnh sửa"},
  {source: "履歴", target: "Lịch sử"},
  {source: "設定", target: "Cấu hình"},
];

function createPermissions(): GlossaryPermissionAdminResponse {
  return {
    glossaryId: SESSION_GLOSSARY_TEMPLATE_ID,
    ownerId: "session-user",
    ownerName: "Session user",
    publicPermission: null,
    userPermissions: [],
  };
}

function createTemplate(locale: GlossaryLocale): GlossaryDetailResponse {
  const now = new Date().toISOString();
  const terms = templateTerms.map((term, index) => ({
    ...term,
    glossaryId: SESSION_GLOSSARY_TEMPLATE_ID,
    id: `session-term-${index + 1}`,
  }));

  return {
    id: SESSION_GLOSSARY_TEMPLATE_ID,
    ...templateCopy[locale],
    sourceLanguage: "ja",
    targetLanguage: "vn",
    termCount: terms.length,
    createdAt: now,
    updatedAt: now,
    terms: {
      items: terms,
      total: terms.length,
      page: 1,
      size: terms.length,
      pages: 1,
    },
  };
}

function createState(locale: GlossaryLocale): SessionGlossaryState {
  return {
    deleted: false,
    glossary: createTemplate(locale),
    permissions: createPermissions(),
    version: STORAGE_VERSION,
  };
}

function isValidState(value: unknown): value is SessionGlossaryState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<SessionGlossaryState>;
  return state.version === STORAGE_VERSION && typeof state.deleted === "boolean";
}

function readState(): SessionGlossaryState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeState(state: SessionGlossaryState) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The template remains non-persistent when session storage is unavailable.
  }
}

function getActiveState() {
  const state = readState();
  return state && !state.deleted && state.glossary ? state : null;
}

export function isSessionGlossaryTemplate(value: string | {id: string} | null | undefined) {
  const id = typeof value === "string" ? value : value?.id;
  return id === SESSION_GLOSSARY_TEMPLATE_ID;
}

export function getOrCreateSessionGlossaryTemplate(locale: GlossaryLocale) {
  const stored = readState();
  if (stored?.deleted) return null;
  if (stored?.glossary) return stored.glossary;

  const state = createState(locale);
  writeState(state);
  return state.glossary;
}

export function updateSessionGlossaryTemplate(update: SessionGlossaryUpdate) {
  const state = getActiveState();
  if (!state?.glossary) return null;

  const termSequence = Date.now();
  const terms = update.terms.map((term, index) => ({
    glossaryId: SESSION_GLOSSARY_TEMPLATE_ID,
    id: term.id || `session-term-${termSequence}-${index + 1}`,
    source: term.source,
    target: term.target,
  }));
  const glossary: GlossaryDetailResponse = {
    ...state.glossary,
    name: update.name,
    description: update.description,
    sourceLanguage: update.sourceLanguage,
    targetLanguage: update.targetLanguage,
    termCount: terms.length,
    updatedAt: new Date().toISOString(),
    terms: {
      items: terms,
      total: terms.length,
      page: 1,
      size: terms.length,
      pages: 1,
    },
  };

  writeState({...state, glossary});
  return glossary;
}

export function deleteSessionGlossaryTemplate() {
  const state = readState();
  writeState({
    deleted: true,
    glossary: null,
    permissions: state?.permissions ?? createPermissions(),
    version: STORAGE_VERSION,
  });
}

export function clearSessionGlossaryTemplate() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The next empty-list visit will retry creating the session template.
  }
}

export function getSessionGlossaryPermissions() {
  return getActiveState()?.permissions ?? null;
}

export function setSessionGlossaryPublic(nextPublic: boolean) {
  const state = getActiveState();
  if (!state) return null;

  const publicPermission: GlossaryPermissionBaseResponse | null = nextPublic
    ? {
        id: "session-public-permission",
        principalType: "public",
        principalId: null,
        permission: "clone",
        expiresAt: null,
        status: "accepted",
        grantedBy: state.permissions.ownerId,
        createdAt: new Date().toISOString(),
      }
    : null;
  const permissions = {...state.permissions, publicPermission};
  writeState({...state, permissions});
  return permissions;
}

export function inviteSessionGlossaryUser(principalId: string, expiresAt: string | null) {
  const state = getActiveState();
  if (!state) return null;

  const normalizedPrincipal = principalId.trim();
  const existing = state.permissions.userPermissions.find(
    (permission) => permission.principalId?.toLocaleLowerCase() === normalizedPrincipal.toLocaleLowerCase(),
  );
  const permission: GlossaryPermissionBaseResponse = {
    id: existing?.id ?? `session-permission-${Date.now()}`,
    principalType: "user",
    principalId: normalizedPrincipal,
    permission: "view",
    expiresAt,
    status: "accepted",
    grantedBy: state.permissions.ownerId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const userPermissions = existing
    ? state.permissions.userPermissions.map((item) => (item.id === existing.id ? permission : item))
    : [...state.permissions.userPermissions, permission];
  const permissions = {...state.permissions, userPermissions};
  writeState({...state, permissions});
  return permissions;
}

export function removeSessionGlossaryPermission(permissionId: string) {
  const state = getActiveState();
  if (!state) return null;

  const permissions = {
    ...state.permissions,
    userPermissions: state.permissions.userPermissions.filter((permission) => permission.id !== permissionId),
  };
  writeState({...state, permissions});
  return permissions;
}
