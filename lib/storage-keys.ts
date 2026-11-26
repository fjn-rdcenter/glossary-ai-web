/**
 * Every localStorage/sessionStorage key Glossary AI uses.
 *
 * Production shares its origin with other products (the app is mounted under a
 * path on the same domain), and Web Storage is scoped per origin, not per path.
 * Every key must therefore carry the `glossaryai_` prefix. Never read, write or
 * remove an unprefixed key: it may belong to another product.
 * See docs/adr/glossaryai-browser-storage-namespace.md.
 */

const PREFIX = "glossaryai_";

export const ACCESS_TOKEN_STORAGE_KEY = `${PREFIX}access_token`;
export const LOGGED_OUT_STORAGE_KEY = `${PREFIX}logged_out`;
export const USERNAME_STORAGE_KEY = `${PREFIX}username`;
export const USER_INFO_STORAGE_KEY = `${PREFIX}user_info`;
/** "on" once the user turned desktop notifications on in this browser. */
export const DESKTOP_NOTIFICATIONS_STORAGE_KEY = `${PREFIX}desktop_notifications`;

export const getGlossaryTourStageStorageKey = (userId: string) =>
  `${PREFIX}glossary_tour_stage_${userId}`;

/** sessionStorage */
export const SESSION_GLOSSARY_TEMPLATE_STORAGE_KEY = `${PREFIX}session_glossary_template_v2`;

/** Developer debug flags, set by hand in the browser console. */
export const MARKDOWN_DOCUMENT_WORKER_DEBUG_STORAGE_KEY = `${PREFIX}debug_markdown_document_worker`;
export const FILE_VIEWER_DEBUG_STORAGE_KEY = `${PREFIX}debug_file_viewer`;
