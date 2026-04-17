import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";

/**
 * Firestore는 컬렉션 바로 아래에 또 컬렉션을 둘 수 없어,
 * `jew` → 부모 문서 → 하위 `user` 서브컬렉션 구조로 둡니다.
 * 경로: jew / {JEW_USER_PARENT_DOC_ID} / user / (자동 문서 ID)
 */
export const JEW_USER_PARENT_DOC_ID = "main";

export async function addUserNameUnderJew(name: string): Promise<string> {
  const db = getFirestoreDb();
  const userCollection = collection(db, "jew", JEW_USER_PARENT_DOC_ID, "user");
  const ref = await addDoc(userCollection, {
    name,
    hitCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateUserHitCount(
  userDocId: string,
  hitCount: number,
): Promise<void> {
  const db = getFirestoreDb();
  const d = doc(db, "jew", JEW_USER_PARENT_DOC_ID, "user", userDocId);
  await updateDoc(d, { hitCount });
}

/** 재방문 시 화면에 맞출 서버 누적 타격 수 */
export async function fetchUserHitCount(userDocId: string): Promise<number> {
  const db = getFirestoreDb();
  const d = doc(db, "jew", JEW_USER_PARENT_DOC_ID, "user", userDocId);
  const snap = await getDoc(d);
  if (!snap.exists()) return 0;
  const raw = snap.data()?.hitCount;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

export type JewUserNameMatch = {
  id: string;
  hitCount: number;
};

/** 이름이 정확히 일치하는 기존 유저(동명이인 가능) */
export async function findUsersByExactName(
  name: string,
): Promise<JewUserNameMatch[]> {
  const db = getFirestoreDb();
  const userCollection = collection(db, "jew", JEW_USER_PARENT_DOC_ID, "user");
  const q = query(userCollection, where("name", "==", name));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const raw = d.data()?.hitCount;
    const hitCount =
      typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
    return { id: d.id, hitCount };
  });
}
