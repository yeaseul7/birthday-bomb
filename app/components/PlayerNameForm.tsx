"use client";

import {
  useCallback,
  useRef,
  useState,
  type FormEvent as ReactFormEvent,
} from "react";
import {
  addUserNameUnderJew,
  findUsersByExactName,
  type JewUserNameMatch,
} from "@/lib/jewUserFirestore";
import {
  PLAYER_NAME_MAX_LEN,
  writeStoredPlayerName,
  writeStoredUserDocId,
} from "@/lib/playerNameStorage";

type PlayerNameFormProps = {
  onSaved: (name: string) => void;
};

type DuplicatePrompt = {
  name: string;
  rows: JewUserNameMatch[];
  selectedId: string;
};

function sortNameMatches(rows: JewUserNameMatch[]): JewUserNameMatch[] {
  return [...rows].sort(
    (a, b) => b.hitCount - a.hitCount || a.id.localeCompare(b.id),
  );
}

export function PlayerNameForm({ onSaved }: PlayerNameFormProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicatePrompt | null>(null);

  const finishWithExistingUser = useCallback(
    (name: string, userDocId: string) => {
      writeStoredUserDocId(userDocId);
      writeStoredPlayerName(name);
      setNameDraft("");
      setDuplicate(null);
      onSaved(name);
    },
    [onSaved],
  );

  const createNewUser = useCallback(
    async (name: string) => {
      const userDocId = await addUserNameUnderJew(name);
      writeStoredUserDocId(userDocId);
      writeStoredPlayerName(name);
      setNameDraft("");
      setDuplicate(null);
      onSaved(name);
    },
    [onSaved],
  );

  const onSubmit = useCallback(
    async (e: ReactFormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const next = nameDraft.trim().slice(0, PLAYER_NAME_MAX_LEN);
      if (!next || submitting) return;
      setError(null);
      setSubmitting(true);
      try {
        const matches = await findUsersByExactName(next);
        if (matches.length === 0) {
          await createNewUser(next);
        } else {
          const rows = sortNameMatches(matches);
          setDuplicate({
            name: next,
            rows,
            selectedId: rows[0]!.id,
          });
        }
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        if (code === "permission-denied") {
          setError(
            "Firestore에 접근 권한이 없어요. Firebase 콘솔에서 jew/main/user 경로 규칙을 확인해 주세요.",
          );
        } else {
          setError("이름을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [createNewUser, nameDraft, submitting],
  );

  const onResumeExisting = useCallback(() => {
    if (!duplicate) return;
    finishWithExistingUser(duplicate.name, duplicate.selectedId);
  }, [duplicate, finishWithExistingUser]);

  const onRename = useCallback(() => {
    setDuplicate(null);
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }, []);

  return (
    <div className="relative flex w-full max-w-md flex-col items-center gap-6 px-4 py-8 sm:gap-8">
      {duplicate ? (
        <div
          className="fixed inset-0 z-[9000] flex items-center justify-center bg-amber-950/40 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-amber-900/15 bg-[#fffdf9] p-5 shadow-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dup-dialog-title"
            aria-describedby="dup-dialog-desc"
          >
            <h2
              id="dup-dialog-title"
              className="text-lg font-black leading-snug text-amber-950 sm:text-xl"
            >
              이미 쓰인 이름이에요
            </h2>
            <p
              id="dup-dialog-desc"
              className="mt-2 text-sm leading-relaxed text-amber-950/75 sm:text-base"
            >
              <span className="font-semibold text-amber-950">
                「{duplicate.name}」
              </span>
              은(는) 한 명만 쓸 수 있어요. 기존 기록으로 들어가거나, 다른 이름으로
              바꿔 주세요.
            </p>

            {duplicate.rows.length > 1 ? (
              <>
                <p className="mt-2 text-xs leading-snug text-amber-900/60 sm:text-sm">
                  예전에 같은 이름으로 여러 기록이 남아 있어요. 연결할 쪽을 골라
                  주세요.
                </p>
                <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-amber-900/10 bg-white/70 p-2">
                  {duplicate.rows.map((row) => {
                    const id = `dup-pick-${row.id}`;
                    const checked = duplicate.selectedId === row.id;
                    return (
                      <li key={row.id}>
                        <label
                          htmlFor={id}
                          className={[
                            "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm",
                            checked
                              ? "bg-amber-200/60 ring-1 ring-amber-400/40"
                              : "hover:bg-amber-100/50",
                          ].join(" ")}
                        >
                          <input
                            id={id}
                            type="radio"
                            name="dupUser"
                            checked={checked}
                            onChange={() =>
                              setDuplicate((d) =>
                                d ? { ...d, selectedId: row.id } : d,
                              )
                            }
                            className="h-4 w-4 accent-amber-800"
                          />
                          <span className="tabular-nums text-amber-950">
                            누적 <strong>{row.hitCount}</strong>회
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="mt-3 rounded-xl border border-amber-900/10 bg-white/70 px-3 py-2 text-sm text-amber-950">
                누적 타격{" "}
                <span className="font-bold tabular-nums text-rose-600">
                  {duplicate.rows[0]?.hitCount ?? 0}
                </span>
                회
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={onRename}
                className="order-2 w-full rounded-xl border border-amber-900/25 bg-white/80 py-3 text-base font-semibold text-amber-950 sm:order-1 sm:w-auto sm:min-w-[7.5rem] sm:py-2.5"
              >
                이름 바꾸기
              </button>
              <button
                type="button"
                onClick={onResumeExisting}
                className="order-1 w-full rounded-xl bg-amber-950 py-3 text-center text-base font-semibold text-amber-50 sm:order-2 sm:w-auto sm:min-w-[10rem] sm:py-2.5"
              >
                이 계정으로 계속
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="text-center">
        <p className="text-balance text-3xl font-black leading-tight text-amber-950 sm:text-4xl md:text-5xl">
          이름을 입력해주세요
        </p>
        <p className="mt-3 text-base leading-relaxed text-amber-950/70 sm:text-lg">
          이름은 한 명당 하나만 쓸 수 있어요. 이미 있는 이름이면 그 기록으로
          이어가거나, 다른 이름을 골라 주세요. 이 기기에서는 브라우저에도 남아
          다시 들어와도 유지돼요.
        </p>
      </header>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
        <label className="sr-only" htmlFor="player-name">
          이름
        </label>
        <input
          ref={nameInputRef}
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
          {submitting ? "확인 중…" : "시작하기"}
        </button>
      </form>
    </div>
  );
}
