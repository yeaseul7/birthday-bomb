"use client";

import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
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

/** 랭킹 폴링 주기 (ms) — onSnapshot 대비 읽기 비용 예측 가능 */
const LEADERBOARD_POLL_MS = 12_000;

export type LeaderRow = {
  docId: string;
  name: string;
  hitCount: number;
};

function buildRowsFromDocs(
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
    let cancelled = false;

    const fetchRows = async () => {
      try {
        const snap = await getDocs(col);
        if (cancelled) return;
        setError(null);
        setRows(buildRowsFromDocs(snap.docs));
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "랭킹을 불러오지 못했어요.",
        );
      }
    };

    void fetchRows();
    const intervalId = window.setInterval(() => {
      void fetchRows();
    }, LEADERBOARD_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchRows();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
