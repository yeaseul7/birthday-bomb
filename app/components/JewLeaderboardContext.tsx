"use client";

import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { collection, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getFirestoreDb } from "@/lib/firebase";
import { JEW_USER_PARENT_DOC_ID } from "@/lib/jewUserFirestore";

export type LeaderRow = {
  docId: string;
  name: string;
  hitCount: number;
};

function buildRowsFromSnapshot(
  docs: QueryDocumentSnapshot<DocumentData>[],
): LeaderRow[] {
  return docs
    .map((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      const name = typeof d.name === "string" ? d.name.trim() : "";
      const raw = d.hitCount;
      const hitCount =
        typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
      return { docId: docSnap.id, name, hitCount };
    })
    .filter((r) => r.name.length > 0)
    .sort(
      (a, b) =>
        b.hitCount - a.hitCount || a.name.localeCompare(b.name, "ko"),
    );
}

type JewLeaderboardValue = {
  rows: LeaderRow[];
  error: string | null;
};

const JewLeaderboardContext = createContext<JewLeaderboardValue | null>(null);

export function JewLeaderboardProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestoreDb();
    const col = collection(db, "jew", JEW_USER_PARENT_DOC_ID, "user");
    const unsub = onSnapshot(
      col,
      (snap) => {
        setError(null);
        setRows(buildRowsFromSnapshot(snap.docs));
      },
      (e) => {
        setError(e.message || "랭킹을 불러오지 못했어요.");
      },
    );
    return () => unsub();
  }, []);

  const value = useMemo(() => ({ rows, error }), [rows, error]);

  return (
    <JewLeaderboardContext.Provider value={value}>
      {children}
    </JewLeaderboardContext.Provider>
  );
}

export function useJewLeaderboard(): JewLeaderboardValue {
  const ctx = useContext(JewLeaderboardContext);
  if (!ctx) {
    throw new Error("useJewLeaderboard must be used within JewLeaderboardProvider");
  }
  return ctx;
}
