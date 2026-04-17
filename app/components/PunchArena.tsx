"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { MouseFollowerGlove } from "./MouseFollowerGlove";
import { PlayerNameForm } from "./PlayerNameForm";
import {
  JEW_CAKE_SMASH_REACTION,
  JEW_DEFAULT_REACTION,
  JEW_POOP_HIT_REACTION,
  JEW_REACTION_FLASH_CHANCE,
  pickRandomJewReactionExcludingDefault,
  randomReactionDwellMs,
  type JewReaction,
} from "@/lib/jewReactions";
import {
  incrementJewCakeCount,
  incrementJewPowCount,
  subscribeJewSpecialCounts,
} from "@/lib/jewSpecialCounters";
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

type HitInputKind = "pointer" | "keyboard" | "themed";

type HitInput = {
  clientX: number;
  clientY: number;
  /** 포인터일 때: 스크립트로 만든 이벤트면 false */
  isTrusted?: boolean;
  inputKind: HitInputKind;
};

type PopStickerOverride = {
  label: string;
  stickerSrc: string;
};

const PROJECTILE_FLIGHT_MS = 0.62;
const PROJECTILE_IMG_PX = 80;
const PROJECTILE_IMG_HALF = PROJECTILE_IMG_PX / 2;

/** 매크로 의심 시 서버·화면 누적 타격을 이 값으로 맞춤 */
const MACRO_PENALTY_HIT_COUNT = 10;
const MACRO_NOTICE_MS = 7000;

type ProjectileFlight = {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
};

type LastHitSnapshot = {
  x: number;
  y: number;
  t: number;
  inputKind: HitInputKind;
};

/** 동일·근접 좌표에 비정상적으로 빠른 반복 → 매크로·오토클릭 의심 */
function isLikelyMacroTap(
  prev: LastHitSnapshot | null,
  input: HitInput,
  now: number,
): boolean {
  if (input.inputKind === "pointer" && input.isTrusted === false) {
    return true;
  }
  if (input.inputKind === "themed" && input.isTrusted === false) {
    return true;
  }
  if (!prev) return false;

  const dt = now - prev.t;

  if (input.inputKind === "themed") {
    if (prev.inputKind === "themed" && dt < 48) return true;
    return false;
  }

  if (input.inputKind === "keyboard" && prev.inputKind === "keyboard") {
    return dt < 90;
  }

  if (input.inputKind !== "pointer") return false;

  const sameRoundedPixel =
    Math.round(input.clientX) === Math.round(prev.x) &&
    Math.round(input.clientY) === Math.round(prev.y);
  if (sameRoundedPixel && dt < 55) {
    return true;
  }

  const dx = Math.abs(input.clientX - prev.x);
  const dy = Math.abs(input.clientY - prev.y);
  if (dx < 2.5 && dy < 2.5 && dt < 38) {
    return true;
  }

  return false;
}

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
  const lastHitSnapshotRef = useRef<LastHitSnapshot | null>(null);
  const [hits, setHits] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [reaction, setReaction] = useState<JewReaction>(JEW_DEFAULT_REACTION);
  const [pops, setPops] = useState<PopHit[]>([]);
  const [cakeFly, setCakeFly] = useState<ProjectileFlight | null>(null);
  const cakeFlyingRef = useRef(false);
  const cakeBtnRef = useRef<HTMLButtonElement>(null);
  const [poopFly, setPoopFly] = useState<ProjectileFlight | null>(null);
  const poopFlyingRef = useRef(false);
  const poopBtnRef = useRef<HTMLButtonElement>(null);
  /** 개발(Strict)에서 애니메이션 완료 콜백이 두 번 불릴 때 중복 적용 방지 */
  const cakeImpactConsumedRef = useRef(false);
  const poopImpactConsumedRef = useRef(false);
  /** null: 클라이언트에서 아직 읽기 전(깜빡임 방지) */
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [macroNotice, setMacroNotice] = useState<string | null>(null);
  const macroNoticeClearRef = useRef<number | undefined>(undefined);
  const [jewPowHitsTotal, setJewPowHitsTotal] = useState(0);
  const [jewCakeHitsTotal, setJewCakeHitsTotal] = useState(0);

  const interactionLocked =
    reactionInputLocked || cakeFly !== null || poopFly !== null;

  useEffect(() => {
    setPlayerName(readStoredPlayerName());
  }, []);

  useEffect(() => {
    const unsub = subscribeJewSpecialCounts((c) => {
      setJewPowHitsTotal(c.powCount);
      setJewCakeHitsTotal(c.cakeCount);
    });
    return unsub;
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
      if (macroNoticeClearRef.current !== undefined) {
        window.clearTimeout(macroNoticeClearRef.current);
        macroNoticeClearRef.current = undefined;
      }
      reactionInputLockedRef.current = false;
      cakeFlyingRef.current = false;
      poopFlyingRef.current = false;
    };
  }, []);

  const applyMacroPenalty = useCallback(() => {
    const docId = readStoredUserDocId();
    setHits(MACRO_PENALTY_HIT_COUNT);
    if (docId) {
      void updateUserHitCount(docId, MACRO_PENALTY_HIT_COUNT).catch(() => { });
    }
    lastHitSnapshotRef.current = null;
    setMacroNotice(
      "메크로가 감지되어 현재 유저의 누적 타격 수를 10으로 초기화했습니다.",
    );
    if (macroNoticeClearRef.current !== undefined) {
      window.clearTimeout(macroNoticeClearRef.current);
    }
    macroNoticeClearRef.current = window.setTimeout(() => {
      macroNoticeClearRef.current = undefined;
      setMacroNotice(null);
    }, MACRO_NOTICE_MS);
  }, []);

  const spawnPop = useCallback(
    (clientX: number, clientY: number, override?: PopStickerOverride) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      const pick =
        override ??
        (HIT_EFFECTS[Math.floor(Math.random() * HIT_EFFECTS.length)] ??
          HIT_EFFECTS[0]!);
      const id = nextId();
      setPops((prev) => [
        ...prev,
        { id, x, y, label: pick.label, stickerSrc: pick.stickerSrc },
      ]);
      window.setTimeout(() => {
        setPops((prev) => prev.filter((p) => p.id !== id));
      }, 700);
    },
    [],
  );

  const registerHit = useCallback(
    (input: HitInput, popOverride?: PopStickerOverride) => {
      if (
        reactionInputLockedRef.current ||
        cakeFlyingRef.current ||
        poopFlyingRef.current
      ) {
        return;
      }

      const now = performance.now();
      if (isLikelyMacroTap(lastHitSnapshotRef.current, input, now)) {
        applyMacroPenalty();
        return;
      }

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
      spawnPop(input.clientX, input.clientY, popOverride);

      lastHitSnapshotRef.current = {
        x: input.clientX,
        y: input.clientY,
        t: now,
        inputKind: input.inputKind,
      };
    },
    [spawnPop, applyMacroPenalty],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (
        reactionInputLockedRef.current ||
        cakeFlyingRef.current ||
        poopFlyingRef.current
      ) {
        return;
      }
      if (e.button !== 0 && e.pointerType === "mouse") return;
      registerHit({
        clientX: e.clientX,
        clientY: e.clientY,
        isTrusted: e.isTrusted,
        inputKind: "pointer",
      });
    },
    [registerHit],
  );

  const applyCakeImpact = useCallback(() => {
    if (cakeImpactConsumedRef.current) return;
    cakeImpactConsumedRef.current = true;

    const photo = photoButtonRef.current;
    cakeFlyingRef.current = false;
    setCakeFly(null);
    if (!photo) {
      cakeImpactConsumedRef.current = false;
      return;
    }
    const br = photo.getBoundingClientRect();
    const cx = br.left + br.width / 2;
    const cy = br.top + br.height * 0.32;

    if (bounceToDefaultRef.current !== undefined) {
      window.clearTimeout(bounceToDefaultRef.current);
      bounceToDefaultRef.current = undefined;
    }
    reactionInputLockedRef.current = true;
    setReactionInputLocked(true);
    setReaction(JEW_CAKE_SMASH_REACTION);
    bounceToDefaultRef.current = window.setTimeout(() => {
      bounceToDefaultRef.current = undefined;
      setReaction(JEW_DEFAULT_REACTION);
      reactionInputLockedRef.current = false;
      setReactionInputLocked(false);
    }, randomReactionDwellMs());

    setHits((n) => {
      const next = n + 1;
      const docId = readStoredUserDocId();
      if (docId) {
        void updateUserHitCount(docId, next).catch(() => { });
      }
      return next;
    });
    setShaking(true);
    spawnPop(cx, cy, { label: "펑!", stickerSrc: "/jewel/cake.png" });
    setJewCakeHitsTotal((c) => c + 1);
    void incrementJewCakeCount().catch(() => {
      setJewCakeHitsTotal((c) => Math.max(0, c - 1));
    });
    lastHitSnapshotRef.current = {
      x: cx,
      y: cy,
      t: performance.now(),
      inputKind: "themed",
    };
  }, [spawnPop]);

  const applyPoopImpact = useCallback(() => {
    if (poopImpactConsumedRef.current) return;
    poopImpactConsumedRef.current = true;

    const photo = photoButtonRef.current;
    poopFlyingRef.current = false;
    setPoopFly(null);
    if (!photo) {
      poopImpactConsumedRef.current = false;
      return;
    }
    const br = photo.getBoundingClientRect();
    const cx = br.left + br.width / 2;
    const cy = br.top + br.height * 0.36;

    if (bounceToDefaultRef.current !== undefined) {
      window.clearTimeout(bounceToDefaultRef.current);
      bounceToDefaultRef.current = undefined;
    }
    reactionInputLockedRef.current = true;
    setReactionInputLocked(true);
    setReaction(JEW_POOP_HIT_REACTION);
    bounceToDefaultRef.current = window.setTimeout(() => {
      bounceToDefaultRef.current = undefined;
      setReaction(JEW_DEFAULT_REACTION);
      reactionInputLockedRef.current = false;
      setReactionInputLocked(false);
    }, randomReactionDwellMs());

    setHits((n) => {
      const next = n + 1;
      const docId = readStoredUserDocId();
      if (docId) {
        void updateUserHitCount(docId, next).catch(() => { });
      }
      return next;
    });
    setShaking(true);
    spawnPop(cx, cy, { label: "퍽!", stickerSrc: "/jewel/pow.png" });
    setJewPowHitsTotal((c) => c + 1);
    void incrementJewPowCount().catch(() => {
      setJewPowHitsTotal((c) => Math.max(0, c - 1));
    });
    lastHitSnapshotRef.current = {
      x: cx,
      y: cy,
      t: performance.now(),
      inputKind: "themed",
    };
  }, [spawnPop]);

  const startCakeThrow = useCallback(() => {
    if (
      reactionInputLockedRef.current ||
      cakeFlyingRef.current ||
      poopFlyingRef.current
    ) {
      return;
    }
    const photo = photoButtonRef.current;
    const cBtn = cakeBtnRef.current;
    if (!photo || !cBtn) return;

    const pr = photo.getBoundingClientRect();
    const cr = cBtn.getBoundingClientRect();
    const targetX = pr.left + pr.width / 2;
    const targetY = pr.top + pr.height * 0.32;
    const themedInput: HitInput = {
      clientX: targetX,
      clientY: targetY,
      isTrusted: true,
      inputKind: "themed",
    };
    const now = performance.now();
    if (isLikelyMacroTap(lastHitSnapshotRef.current, themedInput, now)) {
      applyMacroPenalty();
      return;
    }

    cakeImpactConsumedRef.current = false;
    cakeFlyingRef.current = true;
    setCakeFly({
      sx: cr.left + cr.width / 2,
      sy: cr.top + cr.height / 2,
      ex: targetX,
      ey: targetY,
    });
  }, [applyMacroPenalty]);

  const startPoopThrow = useCallback(() => {
    if (
      reactionInputLockedRef.current ||
      cakeFlyingRef.current ||
      poopFlyingRef.current
    ) {
      return;
    }
    const photo = photoButtonRef.current;
    const pBtn = poopBtnRef.current;
    if (!photo || !pBtn) return;

    const pr = photo.getBoundingClientRect();
    const cr = pBtn.getBoundingClientRect();
    const targetX = pr.left + pr.width / 2;
    const targetY = pr.top + pr.height * 0.36;
    const themedInput: HitInput = {
      clientX: targetX,
      clientY: targetY,
      isTrusted: true,
      inputKind: "themed",
    };
    const now = performance.now();
    if (isLikelyMacroTap(lastHitSnapshotRef.current, themedInput, now)) {
      applyMacroPenalty();
      return;
    }

    poopImpactConsumedRef.current = false;
    poopFlyingRef.current = true;
    setPoopFly({
      sx: cr.left + cr.width / 2,
      sy: cr.top + cr.height / 2,
      ex: targetX,
      ey: targetY,
    });
  }, [applyMacroPenalty]);

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
      {macroNotice ? (
        <div
          role="alert"
          className="w-full max-w-lg rounded-xl border-2 border-rose-600/80 bg-rose-50 px-3 py-2.5 text-center text-sm font-semibold leading-snug text-rose-950 shadow-md sm:max-w-xl sm:px-4 sm:text-base"
        >
          {macroNotice}
        </div>
      ) : null}
      <header className="w-full px-2 text-center sm:px-4">
        <p className="mt-2 text-balance text-2xl font-black leading-tight tracking-tight text-amber-950 sm:mt-3 sm:text-3xl md:text-4xl">
          사랑하는 만큼 생일빵 때리기
        </p>
        <p className="mt-2 text-center text-sm font-semibold text-amber-950 sm:mt-2.5 sm:text-base">
          누적 타격{" "}
          <span className="tabular-nums text-lg font-bold text-rose-600 sm:text-xl">
            {hits}
          </span>
          회
        </p>
        <p className="mx-auto mt-2 max-w-full overflow-x-auto whitespace-nowrap text-center text-[11px] font-medium text-amber-950/85 sm:mt-2.5 sm:text-sm">
          보석이가 똥 맞은 횟수{" "}
          <span className="tabular-nums font-bold text-amber-900">
            {jewPowHitsTotal}
          </span>
          회
          <span className="mx-1.5 text-amber-900/35 sm:mx-2" aria-hidden>
            ·
          </span>
          케이크 맞은 횟수{" "}
          <span className="tabular-nums font-bold text-amber-900">
            {jewCakeHitsTotal}
          </span>
          회
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
              if (e.key !== "Enter" && e.key !== " ") return;
              if (interactionLocked) return;
              e.preventDefault();
              const btn = photoButtonRef.current;
              if (!btn) return;
              const br = btn.getBoundingClientRect();
              registerHit({
                clientX: br.left + br.width / 2,
                clientY: br.top + br.height / 2,
                isTrusted: e.isTrusted,
                inputKind: "keyboard",
              });
            }}
            className={[
              "relative box-border flex w-full items-center justify-center outline-none transition-transform",
              "min-h-[min(44dvh,340px)] px-5 py-8 sm:min-h-[min(48dvh,380px)] sm:px-8 sm:py-10 md:min-h-[min(52dvh,420px)] md:px-12 md:py-12",
              interactionLocked
                ? "cursor-wait pointer-events-none opacity-90"
                : "cursor-pointer",
            ].join(" ")}
            aria-busy={interactionLocked}
            aria-label="사진 탭해서 생일빵 때리기"
          >
            <div className="relative mx-auto w-full max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={reaction.id}
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

        {cakeFly ? (
          <motion.img
            src="/jewel/cake.png"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none fixed z-[10060] object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            style={{
              left: cakeFly.sx - PROJECTILE_IMG_HALF,
              top: cakeFly.sy - PROJECTILE_IMG_HALF,
              width: PROJECTILE_IMG_PX,
              height: PROJECTILE_IMG_PX,
            }}
            initial={{ x: 0, y: 0, scale: 0.82, rotate: -10 }}
            animate={{
              x: cakeFly.ex - cakeFly.sx,
              y: cakeFly.ey - cakeFly.sy,
              scale: 1.18,
              rotate: 14,
            }}
            transition={{
              duration: PROJECTILE_FLIGHT_MS,
              ease: [0.2, 0.72, 0.36, 0.98],
            }}
            onAnimationComplete={applyCakeImpact}
          />
        ) : null}

        {poopFly ? (
          <motion.img
            src="/jewel/pow.png"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none fixed z-[10060] object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            style={{
              left: poopFly.sx - PROJECTILE_IMG_HALF,
              top: poopFly.sy - PROJECTILE_IMG_HALF,
              width: PROJECTILE_IMG_PX,
              height: PROJECTILE_IMG_PX,
            }}
            initial={{ x: 0, y: 0, scale: 0.78, rotate: 8 }}
            animate={{
              x: poopFly.ex - poopFly.sx,
              y: poopFly.ey - poopFly.sy,
              scale: 1.12,
              rotate: -18,
            }}
            transition={{
              duration: PROJECTILE_FLIGHT_MS,
              ease: [0.18, 0.68, 0.4, 1],
            }}
            onAnimationComplete={applyPoopImpact}
          />
        ) : null}
      </div>

      <div className="flex flex-row items-center justify-center gap-8 px-2 py-1 touch-manipulation sm:gap-10">
        <button
          ref={poopBtnRef}
          type="button"
          onClick={startPoopThrow}
          disabled={interactionLocked}
          aria-label="얼리 똥 던지기"
          className="inline-flex size-[3.25rem] items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:size-14 [&:focus-visible]:ring-2 [&:focus-visible]:ring-amber-800/35 [&:focus-visible]:ring-offset-2 [&:focus-visible]:ring-offset-[#fffdf5]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/jewel/pow.png"
            alt=""
            width={56}
            height={56}
            draggable={false}
            aria-hidden
            className="pointer-events-none h-full w-full object-contain select-none"
          />
        </button>
        <button
          ref={cakeBtnRef}
          type="button"
          onClick={startCakeThrow}
          disabled={interactionLocked}
          aria-label="케이크 던지기"
          className="inline-flex size-[3.25rem] items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:size-14 [&:focus-visible]:ring-2 [&:focus-visible]:ring-rose-700/35 [&:focus-visible]:ring-offset-2 [&:focus-visible]:ring-offset-[#fffdf5]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/jewel/cake.png"
            alt=""
            width={56}
            height={56}
            draggable={false}
            aria-hidden
            className="pointer-events-none h-full w-full object-contain select-none"
          />
        </button>
      </div>
    </div>
  );
}
