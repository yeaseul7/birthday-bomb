"use client";

import { useEffect, useState } from "react";
import {
  subscribeJewSpecialCounts,
  type JewSpecialCounts,
} from "@/lib/jewSpecialCounters";

const INITIAL: JewSpecialCounts = { powCount: 0, cakeCount: 0 };

export function RankingBirthdayHeader() {
  const [counts, setCounts] = useState<JewSpecialCounts>(INITIAL);

  useEffect(() => {
    return subscribeJewSpecialCounts(setCounts);
  }, []);

  return (
    <header className="shrink-0 text-center">
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
    </header>
  );
}
