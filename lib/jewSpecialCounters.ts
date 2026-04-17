import { doc, increment, onSnapshot, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { JEW_USER_PARENT_DOC_ID } from "@/lib/jewUserFirestore";

/** 경로: jew / main / special / totals — 전역 누적 (보석이가 맞은 횟수) */
export const JEW_SPECIAL_COLLECTION_ID = "special";
export const JEW_SPECIAL_COUNTERS_DOC_ID = "totals";

export type JewSpecialCounts = {
  powCount: number;
  cakeCount: number;
};

function specialCountersRef() {
  const db = getFirestoreDb();
  return doc(
    db,
    "jew",
    JEW_USER_PARENT_DOC_ID,
    JEW_SPECIAL_COLLECTION_ID,
    JEW_SPECIAL_COUNTERS_DOC_ID,
  );
}

function parseCounts(data: Record<string, unknown> | undefined): JewSpecialCounts {
  const rawPow = data?.powCount;
  const rawCake = data?.cakeCount;
  return {
    powCount:
      typeof rawPow === "number" && Number.isFinite(rawPow)
        ? Math.max(0, Math.floor(rawPow))
        : 0,
    cakeCount:
      typeof rawCake === "number" && Number.isFinite(rawCake)
        ? Math.max(0, Math.floor(rawCake))
        : 0,
  };
}

/**
 * 트랜잭션(read+write) 대신 FieldValue.increment 한 번만 보냄 → 429(할당량) 완화.
 * 보안 규칙은 병합 후 정수 필드만 검사 (firestore.rules isValidJewSpecialCountersWrite).
 */
export async function incrementJewPowCount(): Promise<void> {
  const ref = specialCountersRef();
  await setDoc(ref, { powCount: increment(1) }, { merge: true });
}

export async function incrementJewCakeCount(): Promise<void> {
  const ref = specialCountersRef();
  await setDoc(ref, { cakeCount: increment(1) }, { merge: true });
}

/** 실시간 전역 똥·케이크 맞은 횟수 (구독 해제 함수 반환) */
export function subscribeJewSpecialCounts(
  onData: (c: JewSpecialCounts) => void,
  onError?: () => void,
): () => void {
  const ref = specialCountersRef();
  return onSnapshot(
    ref,
    (snap) => {
      onData(parseCounts(snap.data()));
    },
    (err) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[jewSpecialCounts] listen failed", err);
      }
      onError?.();
    },
  );
}
