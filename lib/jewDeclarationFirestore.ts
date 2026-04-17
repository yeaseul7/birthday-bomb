import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { JEW_USER_PARENT_DOC_ID } from "@/lib/jewUserFirestore";

/**
 * 경로: jew / main / declaration / (autoId)
 * 매크로 감지 시점의 누적 타격 수와 시각을 감사 로그로 남긴다.
 */
export async function addMacroDeclaration(params: {
  hitCount: number;
  userDocId: string | null;
}): Promise<void> {
  const db = getFirestoreDb();
  const declarationCollection = collection(
    db,
    "jew",
    JEW_USER_PARENT_DOC_ID,
    "declaration",
  );
  await addDoc(declarationCollection, {
    hitCount: Math.max(0, Math.floor(params.hitCount)),
    userDocId: params.userDocId ?? "",
    createdAt: serverTimestamp(),
  });
}
