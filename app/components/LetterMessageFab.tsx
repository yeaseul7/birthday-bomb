"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchLettersFromFirestore,
  LETTER_MESSAGE_MAX_LEN,
  LETTER_USER_NAME_MAX_LEN,
  submitLetterToFirestore,
  type LetterMemoRow,
} from "@/lib/letterFirestore";
import { readStoredPlayerName, readStoredUserDocId } from "@/lib/playerNameStorage";

const MEMO_ROTATIONS = [
  "rotate-[0.4deg]",
  "-rotate-[0.6deg]",
  "rotate-[0.2deg]",
  "-rotate-[0.3deg]",
] as const;

const MEMO_BG = [
  "bg-[#fff9c4] shadow-[2px_3px_0_rgba(120,53,15,0.12),inset_0_-12px_0_-8px_rgba(250,204,21,0.25)]",
  "bg-[#fce7f3] shadow-[2px_3px_0_rgba(120,53,15,0.12),inset_0_-12px_0_-8px_rgba(244,114,182,0.2)]",
  "bg-[#fef3c7] shadow-[2px_3px_0_rgba(120,53,15,0.12),inset_0_-12px_0_-8px_rgba(251,191,36,0.25)]",
] as const;

function formatMemoDate(ms: number): string {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat("ko", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

export function LetterMessageFab() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [letters, setLetters] = useState<LetterMemoRow[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const loadLetters = useCallback(async () => {
    setListError(null);
    setListLoading(true);
    try {
      const rows = await fetchLettersFromFirestore();
      setLetters(rows);
    } catch {
      setListError("메모를 불러오지 못했어요.");
      setLetters([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void loadLetters();
  }, [open, loadLetters]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setBody("");
    setError(null);
    setListError(null);
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!body.trim() || sending) return;
      setError(null);
      setSending(true);
      try {
        const storedName = readStoredPlayerName().slice(
          0,
          LETTER_USER_NAME_MAX_LEN,
        );
        await submitLetterToFirestore(
          body,
          storedName,
          readStoredUserDocId(),
        );
        setBody("");
        await loadLetters();
      } catch {
        setError("전송하지 못했어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        setSending(false);
      }
    },
    [body, loadLetters, sending],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[8500] flex h-14 w-14 items-center justify-center rounded-full border border-amber-900/25 bg-amber-950 text-2xl leading-none shadow-lg ring-1 ring-amber-400/30 transition hover:bg-amber-900 sm:bottom-6 sm:right-6 sm:h-[3.75rem] sm:w-[3.75rem] sm:text-[1.75rem]"
        aria-label="편지 쓰기"
        title="편지 쓰기"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden>✉️</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[9600] flex items-end justify-center bg-amber-950/45 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-amber-900/20 bg-[#f5f0e6] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="letter-modal-title"
          >
            {/* 상단: 새 메모 입력 */}
            <div className="shrink-0 border-b border-amber-900/15 bg-[#fffdf8] px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
              <h2
                id="letter-modal-title"
                className="text-base font-black text-amber-950 sm:text-lg"
              >
                편지 작성하기
              </h2>
              <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2.5">
                <textarea
                  value={body}
                  onChange={(e) =>
                    setBody(e.target.value.slice(0, LETTER_MESSAGE_MAX_LEN))
                  }
                  maxLength={LETTER_MESSAGE_MAX_LEN}
                  rows={4}
                  required
                  placeholder="여기에 새 메모를 적어 주세요"
                  className="mt-1 w-full resize-y rounded-lg border border-amber-900/20 bg-[#fffef5] px-3 py-2 text-sm leading-relaxed text-amber-950 whitespace-pre-wrap outline-none ring-amber-300/40 focus:ring-2"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-amber-800/50 tabular-nums sm:text-xs">
                    {body.length} / {LETTER_MESSAGE_MAX_LEN}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-lg border border-amber-900/20 bg-white/90 px-3 py-1.5 text-xs font-semibold text-amber-950 sm:text-sm"
                    >
                      닫기
                    </button>
                    <button
                      type="submit"
                      disabled={!body.trim() || sending}
                      className="rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-50 disabled:opacity-40 sm:text-sm"
                    >
                      {sending ? "붙이는 중…" : "보드에 붙이기"}
                    </button>
                  </div>
                </div>
                {error ? (
                  <p className="text-xs text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
              </form>
            </div>

            {/* 하단: 메모지 목록 */}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(120,53,15,0.06) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            >
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-900/50">
                보석에게 남긴 편지
              </p>
              {listLoading ? (
                <p className="py-6 text-center text-sm text-amber-800/60">
                  불러오는 중…
                </p>
              ) : listError ? (
                <p className="py-4 text-center text-sm text-red-600">{listError}</p>
              ) : letters.length === 0 ? (
                <p className="py-8 text-center text-sm text-amber-800/55">
                  아직 메모가 없어요. 위에서 첫 메모를 남겨 보세요!
                </p>
              ) : (
                <ul className="flex flex-col gap-3 pb-2">
                  {letters.map((memo, i) => (
                    <li
                      key={memo.id}
                      className={[
                        "relative max-w-[95%] rounded-sm border border-amber-900/12 px-3.5 py-3 sm:px-4 sm:py-3.5",
                        MEMO_BG[i % MEMO_BG.length]!,
                        MEMO_ROTATIONS[i % MEMO_ROTATIONS.length]!,
                      ].join(" ")}
                    >
                      <p className="border-b border-amber-900/10 pb-1.5 text-[11px] font-bold text-amber-950/90 sm:text-xs">
                        <span className="text-amber-800/80">From.</span>{" "}
                        {memo.userName.trim() || "(익명)"}
                        {memo.createdAtMs ? (
                          <span className="ml-2 font-normal tabular-nums text-amber-800/55">
                            {formatMemoDate(memo.createdAtMs)}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-950 sm:text-[0.9375rem]">
                        {memo.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
