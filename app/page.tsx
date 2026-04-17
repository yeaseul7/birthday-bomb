import { HitCountLeaderboard } from "./components/HitCountLeaderboard";
import { JewLeaderboardProvider } from "./components/JewLeaderboardContext";
import { PunchArena } from "./components/PunchArena";

export default function Home() {
  return (
    <JewLeaderboardProvider>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#fff7ed,transparent_45%),radial-gradient(circle_at_80%_0%,#ffe4e6,transparent_40%),linear-gradient(160deg,#fffbeb,#fed7aa_35%,#fecdd3_70%,#fde68a)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#78350f_1px,transparent_1px)] [background-size:18px_18px]" />
        <HitCountLeaderboard placement="fixed" />
        <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-2 py-3 sm:px-4 sm:py-8 md:py-10">
          <PunchArena
            leaderboardSlot={<HitCountLeaderboard placement="inline" />}
          />
        </main>
      </div>
    </JewLeaderboardProvider>
  );
}
