import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { JEW_USER_PARENT_DOC_ID } from "@/lib/jewUserFirestore";

export type LetterMemoRow = {
  id: string;
  userName: string;
  content: string;
  createdAtMs: number;
};

export const LETTER_MESSAGE_MAX_LEN = 1000;
export const LETTER_USER_NAME_MAX_LEN = 64;
/** Firestore 문서 ID 문자열 상한 */
export const LETTER_USER_DOC_ID_MAX_LEN = 128;

/**
 * jew / main / letter — user(표시 이름·문서 id) + 편지 원문(줄바꿈·앞뒤 공백 그대로).
 * 빈 편지만 막기 위해 공백만 있는지는 submit 쪽에서 검사.
 */
export async function submitLetterToFirestore(
  content: string,
  userName: string,
  userDocId: string,
): Promise<void> {
  if (content.length < 1 || content.length > LETTER_MESSAGE_MAX_LEN) {
    throw new Error("편지 내용 길이가 올바르지 않아요.");
  }
  if (content.trim().length < 1) {
    throw new Error("편지 내용을 입력해 주세요.");
  }
  const db = getFirestoreDb();
  const letterCol = collection(
    db,
    "jew",
    JEW_USER_PARENT_DOC_ID,
    "letter",
  );
  await addDoc(letterCol, {
    userName: userName.slice(0, LETTER_USER_NAME_MAX_LEN),
    userDocId: userDocId.trim().slice(0, LETTER_USER_DOC_ID_MAX_LEN),
    content,
    createdAt: serverTimestamp(),
  });
}

function timestampToMs(v: unknown): number {
  if (v && typeof v === "object" && "toMillis" in v) {
    return (v as Timestamp).toMillis();
  }
  return 0;
}

/** 최신 순 — 메모 보드용 */
export async function fetchLettersFromFirestore(): Promise<LetterMemoRow[]> {
  const db = getFirestoreDb();
  const letterCol = collection(
    db,
    "jew",
    JEW_USER_PARENT_DOC_ID,
    "letter",
  );
  const snap = await getDocs(letterCol);
  const rows: LetterMemoRow[] = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const userName =
      typeof data.userName === "string" ? data.userName : "(이름 없음)";
    const content = typeof data.content === "string" ? data.content : "";
    return {
      id: d.id,
      userName,
      content,
      createdAtMs: timestampToMs(data.createdAt),
    };
  });
  rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
  return rows;
}
