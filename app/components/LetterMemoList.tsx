"use client";

import type { LetterMemoRow } from "@/lib/letterFirestore";

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

export function formatLetterMemoDate(ms: number): string {
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

export type LetterMemoListProps = {
  letters: LetterMemoRow[];
  listLoading: boolean;
  listError: string | null;
  emptyLabel: string;
  /** 목록 위에 붙는 짧은 설명 (선택) */
  caption?: string;
};

export function LetterMemoList({
  letters,
  listLoading,
  listError,
  emptyLabel,
  caption,
}: LetterMemoListProps) {
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4"
      style={{
        backgroundImage:
          "radial-gradient(rgba(120,53,15,0.06) 1px, transparent 1px)",
        backgroundSize: "14px 14px",
      }}
    >
      {caption ? (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-900/50">
          {caption}
        </p>
      ) : null}
      {listLoading ? (
        <p className="py-6 text-center text-sm text-amber-800/60">불러오는 중…</p>
      ) : listError ? (
        <p className="py-4 text-center text-sm text-red-600">{listError}</p>
      ) : letters.length === 0 ? (
        <p className="py-8 text-center text-sm text-amber-800/55">{emptyLabel}</p>
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
                    {formatLetterMemoDate(memo.createdAtMs)}
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
  );
}
