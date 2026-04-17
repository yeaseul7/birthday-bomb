"use client";

import { useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { useJewLeaderboard } from "./JewLeaderboardContext";
import { readStoredUserDocId } from "@/lib/playerNameStorage";

export type { LeaderRow } from "./JewLeaderboardContext";

const ROW_VARIANTS = {
  initial: { opacity: 0.85, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
};

export type HitCountLeaderboardPlacement = "fixed" | "inline";

const LEADERBOARD_TOP_N = 10;

/** 4위 이하 — 은은한 메달 실루엣 */
function RankMedalOutline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 15l-2 7M16 15l2 7M10 22h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RankMedalBadge({
  rank,
  placement,
}: {
  rank: number;
  placement: HitCountLeaderboardPlacement;
}) {
  const wrap =
    placement === "inline"
      ? "flex h-4 w-4 shrink-0 items-center justify-center"
      : "flex h-5 w-5 shrink-0 items-center justify-center sm:h-5 sm:w-5";

  if (rank === 1) {
    return (
      <span className={wrap} title="1위 금메달" role="img" aria-label="1위 금메달">
        <span className="text-[15px] leading-none sm:text-[17px]">🥇</span>
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className={wrap} title="2위 은메달" role="img" aria-label="2위 은메달">
        <span className="text-[15px] leading-none sm:text-[17px]">🥈</span>
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className={wrap} title="3위 동메달" role="img" aria-label="3위 동메달">
        <span className="text-[15px] leading-none sm:text-[17px]">🥉</span>
      </span>
    );
  }
  return (
    <span
      className={wrap}
      title={`${rank}위`}
      aria-hidden
    >
      <RankMedalOutline
        className={
          placement === "inline"
            ? "h-3 w-3 text-amber-700/35"
            : "h-3.5 w-3.5 text-amber-700/40 sm:h-4 sm:w-4"
        }
      />
    </span>
  );
}

type HitCountLeaderboardProps = {
  placement: HitCountLeaderboardPlacement;
};

function ChevronToggleIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={[
        "h-4 w-4 shrink-0 text-amber-900/55 transition-transform duration-200",
        open ? "rotate-180" : "rotate-0",
      ].join(" ")}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HitCountLeaderboard({ placement }: HitCountLeaderboardProps) {
  const { rows, error } = useJewLeaderboard();
  const [mobileRankOpen, setMobileRankOpen] = useState(true);

  const myDocId =
    typeof window !== "undefined" ? readStoredUserDocId() : "";

  const shellClass =
    placement === "fixed"
      ? "fixed right-2 top-14 hidden w-[11rem] max-w-[calc(100vw-1rem)] sm:flex sm:right-4 sm:top-16 sm:w-56"
      : "relative mx-auto mt-1 w-full max-w-[min(100%,20rem)] sm:hidden";

  const panelClass =
    placement === "inline"
      ? "rounded-xl border border-amber-900/20 bg-white/92 px-2 py-1.5 shadow-md backdrop-blur-md sm:rounded-2xl sm:px-3 sm:py-2.5"
      : "rounded-2xl border border-amber-900/20 bg-white/90 px-2.5 py-2 shadow-lg backdrop-blur-md sm:px-3 sm:py-2.5";

  const titleClass =
    placement === "inline"
      ? "border-b border-amber-900/10 pb-1 text-center text-[9px] font-bold uppercase tracking-wider text-amber-900/70"
      : "border-b border-amber-900/10 pb-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-amber-900/70 sm:text-xs";

  const listMaxH =
    placement === "inline"
      ? "max-h-[min(28vh,11rem)] sm:max-h-[min(56vh,26rem)]"
      : "max-h-[min(52vh,22rem)] sm:max-h-[min(56vh,26rem)]";

  const rankBody =
    error ? (
      <p
        className={
          placement === "inline"
            ? "mt-1.5 text-center text-[9px] leading-snug text-red-600"
            : "mt-2 text-center text-[10px] leading-snug text-red-600 sm:text-xs"
        }
      >
        {error}
      </p>
    ) : rows.length === 0 ? (
      <p
        className={
          placement === "inline"
            ? "mt-1.5 text-center text-[9px] text-amber-950/50"
            : "mt-2 text-center text-[10px] text-amber-950/50 sm:text-xs"
        }
      >
        아직 참가자가 없어요
      </p>
    ) : (
      <LayoutGroup>
        <ol
          className={`mt-1 overflow-y-auto overscroll-contain pr-0.5 ${listMaxH} ${placement === "inline" ? "space-y-0" : "space-y-0.5"}`}
        >
          {rows.slice(0, LEADERBOARD_TOP_N).map((row, index) => {
            const rank = index + 1;
            const isMe = myDocId !== "" && row.docId === myDocId;
            const rowText =
              placement === "inline" ? "text-[9px]" : "text-[10px] sm:text-xs";
            return (
              <motion.li
                key={row.docId}
                layout
                layoutId={`${placement}-${row.docId}`}
                variants={ROW_VARIANTS}
                initial="initial"
                animate="animate"
                transition={{
                  layout: { type: "spring", stiffness: 420, damping: 32 },
                  opacity: { duration: 0.2 },
                }}
                className={[
                  "flex items-center justify-between gap-1 rounded-md px-0.5 py-px",
                  rowText,
                  isMe
                    ? "bg-amber-200/70 font-semibold text-amber-950 ring-1 ring-amber-400/50"
                    : "text-amber-950/90",
                ].join(" ")}
              >
                <span className="flex shrink-0 items-center gap-0.5 text-amber-700/80">
                  <RankMedalBadge rank={rank} placement={placement} />
                  {rank > 3 ? (
                    <span className="min-w-[1.1rem] tabular-nums">{rank}.</span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">
                  {row.name}
                </span>
                <span className="shrink-0 tabular-nums font-bold text-rose-600">
                  {row.hitCount}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
    );

  return (
    <aside
      className={`pointer-events-auto z-[8000] flex flex-col ${shellClass}`}
      aria-label="타격 횟수 랭킹"
    >
      <div className={`w-full ${panelClass}`}>
        {placement === "inline" ? (
          <>
            <button
              type="button"
              id="hit-rank-toggle"
              onClick={() => setMobileRankOpen((o) => !o)}
              aria-expanded={mobileRankOpen}
              aria-controls="hit-rank-panel"
              className={[
                "flex min-h-11 w-full items-center gap-1.5 border-b border-amber-900/10",
                "px-0.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-900/70",
                "touch-manipulation active:bg-amber-900/[0.04]",
              ].join(" ")}
            >
              <span className="min-w-0 flex-1 text-center">실시간 랭킹</span>
              <ChevronToggleIcon open={mobileRankOpen} />
            </button>
            <div
              id="hit-rank-panel"
              role="region"
              aria-labelledby="hit-rank-toggle"
              hidden={!mobileRankOpen}
            >
              {rankBody}
            </div>
          </>
        ) : (
          <>
            <p className={titleClass}>실시간 랭킹</p>
            {rankBody}
          </>
        )}
      </div>
    </aside>
  );
}
