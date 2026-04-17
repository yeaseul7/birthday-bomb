"use client";

import { useCallback, useState, type FormEvent as ReactFormEvent } from "react";
import { addUserNameUnderJew } from "@/lib/jewUserFirestore";
import {
  PLAYER_NAME_MAX_LEN,
  writeStoredPlayerName,
  writeStoredUserDocId,
} from "@/lib/playerNameStorage";

type PlayerNameFormProps = {
  onSaved: (name: string) => void;
};

export function PlayerNameForm({ onSaved }: PlayerNameFormProps) {
  const [nameDraft, setNameDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: ReactFormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const next = nameDraft.trim().slice(0, PLAYER_NAME_MAX_LEN);
      if (!next || submitting) return;
      setError(null);
      setSubmitting(true);
      try {
        const userDocId = await addUserNameUnderJew(next);
        writeStoredUserDocId(userDocId);
        writeStoredPlayerName(next);
        setNameDraft("");
        onSaved(next);
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        if (code === "permission-denied") {
          setError(
            "Firestore에 쓰기 권한이 없어요. Firebase 콘솔에서 jew/main/user 경로에 대한 규칙을 확인해 주세요.",
          );
        } else {
          setError("이름을 서버에 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [nameDraft, onSaved, submitting],
  );

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 px-4 py-8 sm:gap-8">
      <header className="text-center">
        <p className="text-balance text-3xl font-black leading-tight text-amber-950 sm:text-4xl md:text-5xl">
          이름을 입력해주세요
        </p>
        <p className="mt-3 text-base leading-relaxed text-amber-950/70 sm:text-lg">
          이름은 서버에 저장되고, 이 기기에서는 브라우저에도 남아 다시 들어와도 유지돼요.
        </p>
      </header>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
        <label className="sr-only" htmlFor="player-name">
          이름
        </label>
        <input
          id="player-name"
          name="playerName"
          type="text"
          autoComplete="nickname"
          maxLength={PLAYER_NAME_MAX_LEN}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="이름"
          className="w-full rounded-xl border border-amber-900/20 bg-white/80 px-5 py-4 text-xl text-amber-950 shadow-sm outline-none ring-amber-300/50 placeholder:text-amber-950/35 focus:ring-2 sm:text-2xl"
        />
        {error ? (
          <p className="text-base text-red-700 sm:text-lg" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!nameDraft.trim() || submitting}
          className="w-full rounded-xl bg-amber-950 py-4 text-lg font-semibold text-amber-50 transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:text-xl"
        >
          {submitting ? "저장 중…" : "시작하기"}
        </button>
      </form>
    </div>
  );
}
