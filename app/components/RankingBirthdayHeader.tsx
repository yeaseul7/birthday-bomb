"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchLettersFromFirestore,
  type LetterMemoRow,
} from "@/lib/letterFirestore";
import {
  subscribeJewSpecialCounts,
  type JewSpecialCounts,
} from "@/lib/jewSpecialCounters";
import { LetterMemoList } from "./LetterMemoList";

const INITIAL: JewSpecialCounts = { powCount: 0, cakeCount: 0 };

export function RankingBirthdayHeader() {
  const [counts, setCounts] = useState<JewSpecialCounts>(INITIAL);
  const [lettersOpen, setLettersOpen] = useState(false);
  const [letters, setLetters] = useState<LetterMemoRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeJewSpecialCounts(setCounts);
  }, []);

  const loadLetters = useCallback(async () => {
    setListError(null);
    setListLoading(true);
    try {
      const rows = await fetchLettersFromFirestore();
      setLetters(rows);
    } catch {
      setListError("편지를 불러오지 못했어요.");
      setLetters([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!lettersOpen) return;
    void loadLetters();
  }, [lettersOpen, loadLetters]);

  useEffect(() => {
    if (!lettersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLettersOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lettersOpen]);

  const closeLetters = useCallback(() => {
    setLettersOpen(false);
    setListError(null);
  }, []);

  return (
    <>
      <header className="shrink-0">
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-6">
          <div className="w-full max-w-xs text-center">
            <h1 className="text-balance text-base font-semibold leading-snug text-amber-950 sm:text-lg">
              보석아 생일 축하했어~
            </h1>
            <p className="mt-3 text-sm text-amber-900/85 sm:text-base">
              <span className="tabular-nums font-semibold text-rose-700">
                케이크 {counts.cakeCount}번
              </span>
              <span className="mx-2 text-amber-800/40" aria-hidden>
                ·
              </span>
              <span className="tabular-nums font-semibold text-amber-900/90">
                똥 {counts.powCount}번
              </span>
              <span className="mt-1 block text-xs font-normal text-amber-800/70 sm:text-[0.8125rem]">
                보석이가 맞은 횟수예요
              </span>
            </p>
          </div>
          <div className="flex shrink-0 justify-center sm:pt-0.5">
            <button
              type="button"
              onClick={() => setLettersOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/15 bg-white/80 px-3.5 py-2 text-xs font-semibold text-amber-950 shadow-sm backdrop-blur-sm transition hover:bg-white/95 sm:px-4 sm:text-sm"
              aria-label="받은 편지 보기"
              aria-haspopup="dialog"
              aria-expanded={lettersOpen}
            >
              <span aria-hidden>💌</span>
              받은 편지
            </button>
          </div>
        </div>
      </header>

      {lettersOpen ? (
        <div
          className="fixed inset-0 z-[9600] flex items-end justify-center bg-amber-950/45 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeLetters();
          }}
        >
          <div
            className="flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-amber-900/20 bg-[#f5f0e6] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="received-letters-title"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-amber-900/15 bg-[#fffdf8] px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h2
                  id="received-letters-title"
                  className="text-base font-black text-amber-950 sm:text-lg"
                >
                  보석이 받은 편지
                </h2>
                <p className="mt-1 text-xs leading-snug text-amber-900/65 sm:text-sm">
                  모두가 남긴 메시지를 최신 순으로 볼 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={closeLetters}
                className="shrink-0 rounded-lg border border-amber-900/20 bg-white/90 px-3 py-1.5 text-xs font-semibold text-amber-950 sm:text-sm"
              >
                닫기
              </button>
            </div>

            <LetterMemoList
              letters={letters}
              listLoading={listLoading}
              listError={listError}
              emptyLabel="아직 도착한 편지가 없어요."
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
