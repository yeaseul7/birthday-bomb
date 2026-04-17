"use client";

import { useEffect, useRef, useState } from "react";

const GLOVE_SRC = "/jewel/glove_no_bg.png";

/**
 * 데스크톱: 커서를 따라다니는 글러브.
 * 모바일(주 입력 coarse): 마우스 이동 개념이 없으므로 탭·클릭 시에만 잠깐 표시.
 */
export function MouseFollowerGlove() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const coarseRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const syncCoarse = () => {
      coarseRef.current = mq.matches;
      if (!mq.matches) {
        if (hideTimerRef.current !== undefined) {
          window.clearTimeout(hideTimerRef.current);
          hideTimerRef.current = undefined;
        }
        setVisible(false);
      }
    };
    syncCoarse();
    mq.addEventListener("change", syncCoarse);

    const clearHideTimer = () => {
      if (hideTimerRef.current !== undefined) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = undefined;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (coarseRef.current) return;
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };

    const onDown = (e: PointerEvent) => {
      if (!coarseRef.current) return;
      if (e.pointerType === "mouse") return;
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = undefined;
        setVisible(false);
      }, 420);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      mq.removeEventListener("change", syncCoarse);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      clearHideTimer();
    };
  }, []);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={GLOVE_SRC}
      alt=""
      width={96}
      height={96}
      draggable={false}
      className={[
        "pointer-events-none fixed z-[9999] h-14 w-auto max-w-[min(28vw,120px)] select-none object-contain drop-shadow-md",
        "transition-opacity duration-150 ease-out sm:h-16 md:h-[4.5rem]",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -50%)",
      }}
      aria-hidden
    />
  );
}
