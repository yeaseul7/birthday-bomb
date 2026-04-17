/** 브라우저 로컬 스토리지 — 사이트 데이터를 지우기 전까지 유지 */
export const PLAYER_NAME_KEY = "birthday-bomb-player-name";

/** Firestore `jew/main/user/{id}` 문서 ID */
export const PLAYER_USER_DOC_ID_KEY = "birthday-bomb-user-doc-id";

export const PLAYER_NAME_MAX_LEN = 32;

export function readStoredPlayerName(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(PLAYER_NAME_KEY);
    const t = (raw ?? "").trim();
    return t.slice(0, PLAYER_NAME_MAX_LEN);
  } catch {
    return "";
  }
}

export function writeStoredPlayerName(name: string) {
  try {
    window.localStorage.setItem(
      PLAYER_NAME_KEY,
      name.trim().slice(0, PLAYER_NAME_MAX_LEN),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readStoredUserDocId(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(PLAYER_USER_DOC_ID_KEY);
    return (raw ?? "").trim();
  } catch {
    return "";
  }
}

export function writeStoredUserDocId(docId: string) {
  try {
    window.localStorage.setItem(PLAYER_USER_DOC_ID_KEY, docId.trim());
  } catch {
    /* ignore */
  }
}

export function clearStoredPlayerName() {
  try {
    window.localStorage.removeItem(PLAYER_NAME_KEY);
    window.localStorage.removeItem(PLAYER_USER_DOC_ID_KEY);
  } catch {
    /* ignore */
  }
}
