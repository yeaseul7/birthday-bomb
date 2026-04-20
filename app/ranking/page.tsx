import type { Metadata } from "next";
import { HitCountLeaderboard } from "../components/HitCountLeaderboard";
import { JewLeaderboardProvider } from "../components/JewLeaderboardContext";
import { RankingBirthdayHeader } from "../components/RankingBirthdayHeader";

export const metadata: Metadata = {
  title: "참가자 랭킹",
  description: "타격 횟수 기준 실시간 순위",
};

export default function RankingPage() {
  return (
    <JewLeaderboardProvider>
      <div className="relative flex min-h-screen min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#fff7ed,transparent_45%),radial-gradient(circle_at_80%_0%,#ffe4e6,transparent_40%),linear-gradient(160deg,#fffbeb,#fed7aa_35%,#fecdd3_70%,#fde68a)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#78350f_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">
          <RankingBirthdayHeader />
          <main className="flex min-h-0 flex-1 flex-col pt-5 sm:pt-6">
            <HitCountLeaderboard placement="standalone" showFullRanking />
          </main>
        </div>
      </div>
    </JewLeaderboardProvider>
  );
}
