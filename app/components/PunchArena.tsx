"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { MouseFollowerGlove } from "./MouseFollowerGlove";
import { PlayerNameForm } from "./PlayerNameForm";
import {
  JEW_DEFAULT_REACTION,
  JEW_REACTION_FLASH_CHANCE,
  pickRandomJewReactionExcludingDefault,
  randomReactionDwellMs,
  type JewReaction,
} from "@/lib/jewReactions";
import { fetchUserHitCount, updateUserHitCount } from "@/lib/jewUserFirestore";
import { readStoredPlayerName, readStoredUserDocId } from "@/lib/playerNameStorage";

/** 1·2: hit, 3·4: heart, 5(빗나감!): wind */
const HIT_EFFECTS = [
  { label: "퍽", stickerSrc: "/jewel/hit.png" },
  { label: "퍽퍽", stickerSrc: "/jewel/hit.png" },
  { label: "딱콩", stickerSrc: "/jewel/heart.png" },
  { label: "쿵야", stickerSrc: "/jewel/heart.png" },
  { label: "빗나감!", stickerSrc: "/jewel/wind.png" },
] as const;

type PopHit = {
  id: string;
  x: number;
  y: number;
  label: string;
  stickerSrc: string;
};

function nextId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type PunchArenaProps = {
  /** 모바일에서 헤더 아래에 붙는 실시간 랭킹 슬롯 */
  leaderboardSlot?: ReactNode;
};

export function PunchArena({ leaderboardSlot }: PunchArenaProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const photoButtonRef = useRef<HTMLDivElement>(null);
  const bounceToDefaultRef = useRef<number | undefined>(undefined);
  /** 반응 사진이 바뀐 뒤 기본 컷으로 돌아오기 전까지 탭 무시 (연타 시 어색함 방지) */
  const reactionInputLockedRef = useRef(false);
  const [reactionInputLocked, setReactionInputLocked] = useState(false);
  const [hits, setHits] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [reaction, setReaction] = useState<JewReaction>(JEW_DEFAULT_REACTION);
  const [pops, setPops] = useState<PopHit[]>([]);
  /** null: 클라이언트에서 아직 읽기 전(깜빡임 방지) */
  const [playerName, setPlayerName] = useState<string | null>(null);

  useEffect(() => {
    setPlayerName(readStoredPlayerName());
  }, []);

  /** Firestore에 저장된 누적 타격 — 새로 들어와도 0부터가 아니게 */
  useEffect(() => {
    if (!playerName) return;
    const docId = readStoredUserDocId();
    if (!docId) return;
    let cancelled = false;
    void (async () => {
      try {
        const serverHits = await fetchUserHitCount(docId);
        if (!cancelled) {
          setHits((prev) => Math.max(prev, serverHits));
        }
      } catch {
        /* 권한/오프라인: 로컬 0 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerName]);

  useEffect(() => {
    if (!shaking) return;
    const t = window.setTimeout(() => setShaking(false), 420);
    return () => window.clearTimeout(t);
  }, [shaking]);

  useEffect(() => {
    return () => {
      if (bounceToDefaultRef.current !== undefined) {
        window.clearTimeout(bounceToDefaultRef.current);
        bounceToDefaultRef.current = undefined;
      }
      reactionInputLockedRef.current = false;
    };
  }, []);

  const spawnPop = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    const pick =
      HIT_EFFECTS[Math.floor(Math.random() * HIT_EFFECTS.length)] ??
      HIT_EFFECTS[0]!;
    const id = nextId();
    setPops((prev) => [
      ...prev,
      { id, x, y, label: pick.label, stickerSrc: pick.stickerSrc },
    ]);
    window.setTimeout(() => {
      setPops((prev) => prev.filter((p) => p.id !== id));
    }, 700);
  }, []);

  const registerHit = useCallback(
    (clientX: number, clientY: number) => {
      if (reactionInputLockedRef.current) return;

      if (Math.random() < JEW_REACTION_FLASH_CHANCE) {
        reactionInputLockedRef.current = true;
        setReactionInputLocked(true);
        setReaction(pickRandomJewReactionExcludingDefault());
        bounceToDefaultRef.current = window.setTimeout(() => {
          bounceToDefaultRef.current = undefined;
          setReaction(JEW_DEFAULT_REACTION);
          reactionInputLockedRef.current = false;
          setReactionInputLocked(false);
        }, randomReactionDwellMs());
      } else {
        setReaction(JEW_DEFAULT_REACTION);
      }

      setHits((n) => {
        const next = n + 1;
        const docId = readStoredUserDocId();
        if (docId) {
          void updateUserHitCount(docId, next).catch(() => {
            /* 네트워크/권한 실패 시 UI는 계속 동작 */
          });
        }
        return next;
      });
      setShaking(true);
      spawnPop(clientX, clientY);
    },
    [spawnPop],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (reactionInputLocked) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      registerHit(e.clientX, e.clientY);
    },
    [reactionInputLocked, registerHit],
  );

  const onSavedName = useCallback((name: string) => {
    setPlayerName(name);
  }, []);


  if (playerName === null) {
    return (
      <div
        className="flex min-h-[40vh] w-full max-w-md flex-col items-center justify-center px-4"
        aria-busy="true"
      >
        <p className="text-sm text-amber-950/60 sm:text-base">불러오는 중…</p>
      </div>
    );
  }

  if (!playerName) {
    return <PlayerNameForm onSaved={onSavedName} />;
  }

  return (
    <div className="flex w-full max-w-full flex-col items-center gap-4 sm:max-w-2xl sm:gap-6 md:max-w-3xl md:gap-8">
      <MouseFollowerGlove />
      <header className="w-full px-2 text-center sm:px-4">
        <p className="text-sm font-medium text-amber-950/70 sm:text-base">
          <span className="font-semibold text-amber-950">{playerName}</span>
          님이 보석이를
        </p>
        <p className="mt-2 text-balance text-2xl font-black leading-tight tracking-tight text-amber-950 sm:mt-3 sm:text-3xl md:text-4xl">
          사랑하는 만큼 생일빵 때리기
        </p>
      </header>

      {leaderboardSlot ? (
        <div className="w-full max-sm:mb-1 max-sm:px-1">{leaderboardSlot}</div>
      ) : null}

      <div
        ref={wrapRef}
        className="relative w-full touch-manipulation select-none"
      >
        <div className={shaking ? "animate-shake" : ""}>
          <div
            className="pointer-events-none mb-2 flex w-full justify-center px-2 sm:mb-3"
            role="note"
          >
            <div className="relative max-w-[min(92%,22rem)]">
              <div
                className={[
                  "relative rounded-2xl border-[2.5px] border-amber-900/40",
                  "bg-gradient-to-b from-white via-[#fffdf9] to-amber-50/95",
                  "px-3 py-2 text-center text-[11px] font-semibold leading-snug tracking-wide text-amber-950",
                  "shadow-[0_3px_0_rgba(120,53,15,0.12),0_10px_28px_-8px_rgba(120,53,15,0.28),inset_0_1px_0_rgba(255,255,255,0.98)]",
                  "sm:rounded-[1.35rem] sm:px-3.5 sm:py-2.5 sm:text-xs md:text-sm",
                ].join(" ")}
              >
                {reaction.line}
              </div>
              {/* 꼬리 — 아래(사진 쪽) */}
              <div
                className="absolute -bottom-2 left-1/2 z-0 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[2px] border-r-[2.5px] border-b-[2.5px] border-amber-900/40 bg-gradient-to-br from-white to-amber-50/95 shadow-[2px_2px_0_rgba(120,53,15,0.08)] sm:h-4 sm:w-4"
                aria-hidden
              />
            </div>
          </div>

          <div
            ref={photoButtonRef}
            role="button"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (reactionInputLocked) return;
                const btn = photoButtonRef.current;
                if (!btn) return;
                const br = btn.getBoundingClientRect();
                registerHit(br.left + br.width / 2, br.top + br.height / 2);
              }
            }}
            className={[
              "relative box-border flex w-full items-center justify-center outline-none transition-transform",
              "min-h-[min(44dvh,340px)] px-5 py-8 sm:min-h-[min(48dvh,380px)] sm:px-8 sm:py-10 md:min-h-[min(52dvh,420px)] md:px-12 md:py-12",
              reactionInputLocked
                ? "cursor-wait pointer-events-none opacity-90"
                : "cursor-pointer",
            ].join(" ")}
            aria-busy={reactionInputLocked}
            aria-label="사진 탭해서 생일빵 때리기"
          >
            <div className="relative mx-auto w-full max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reaction.imageSrc}
                alt="맞추기 대상 사진"
                draggable={false}
                className="mx-auto block h-auto w-full max-w-full object-contain [max-height:min(46dvh,420px)] sm:[max-height:min(50dvh,480px)] md:[max-height:min(54dvh,540px)]"
                onError={() =>
                  setReaction({
                    ...JEW_DEFAULT_REACTION,
                    imageSrc: "/placeholder-boyfriend.svg",
                  })
                }
              />
            </div>
          </div>
        </div>

        {pops.map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute z-[10050]"
            style={{
              left: p.x,
              top: p.y,
              transform: "translate(-50%, calc(-50% - clamp(2.5rem, 12vw, 4.5rem)))",
            }}
          >
            <div className="inline-flex animate-pop">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.stickerSrc}
                  alt=""
                  width={128}
                  height={128}
                  draggable={false}
                  aria-hidden
                  className="block h-[5.5rem] w-[5.5rem] object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)] sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36"
                />
                <span
                  className={[
                    "absolute -right-1 -top-1 z-[1] max-w-[9.5rem] text-right text-base font-black leading-tight text-neutral-900",
                    "[-webkit-text-stroke:2.5px_#fff] [paint-order:stroke_fill]",
                    "drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
                    "sm:-right-0.5 sm:-top-0.5 sm:max-w-[11rem] sm:text-lg md:text-xl lg:text-2xl",
                  ].join(" ")}
                >
                  {p.label}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm font-semibold text-amber-950 sm:text-base">
        누적 타격 <span className="tabular-nums text-lg sm:text-xl">{hits}</span>회
      </p>
    </div>
  );
}
