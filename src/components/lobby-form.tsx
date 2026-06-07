"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createGame, joinGame } from "@/lib/api";
import { createGameSession, saveGameSession } from "@/lib/session";

type LobbyMode = "create" | "join";

export function LobbyForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LobbyMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const code = joinCode.trim().replace(/\s+/g, "-").toUpperCase();

    if (mode === "join" && !code) {
      setError("Enter a join code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        mode === "create"
          ? await createGame(displayName)
          : await joinGame(code, displayName);
      const session = createGameSession({
        state: result.state,
        displayName,
        playerToken: result.playerToken,
        playerMark: result.playerMark,
      });

      saveGameSession(session);
      router.push(`/game/${encodeURIComponent(session.gameId)}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start game.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="wood-panel rounded-xl p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
          disabled={isSubmitting}
          className={[
            "h-12 rounded-lg border-2 px-4 text-base font-black transition",
            mode === "create"
              ? "border-[#5f351c] bg-[#1f7a71] text-[#fff6df]"
              : "border-[#5f351c]/35 bg-[#fff6df] text-[#5f351c]",
          ].join(" ")}
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          disabled={isSubmitting}
          className={[
            "h-12 rounded-lg border-2 px-4 text-base font-black transition",
            mode === "join"
              ? "border-[#5f351c] bg-[#b34a5a] text-[#fff6df]"
              : "border-[#5f351c]/35 bg-[#fff6df] text-[#5f351c]",
          ].join(" ")}
        >
          Join
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        {mode === "join" ? (
          <label className="block text-sm font-black text-[#5f351c]">
            Join code
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              name="joinCode"
              type="text"
              autoComplete="off"
              placeholder="WOOD-42"
              className="mt-2 h-12 w-full rounded-lg border-2 border-[#5f351c]/35 bg-[#fff6df] px-3 font-mono text-base uppercase text-[#24160d] outline-none transition focus:border-[#1f7a71] focus:ring-4 focus:ring-[#d7fff8]"
            />
          </label>
        ) : null}

        <label className="block text-sm font-black text-[#5f351c]">
          Your name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            name="displayName"
            type="text"
            autoComplete="nickname"
            placeholder={mode === "create" ? "Player X" : "Player O"}
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#5f351c]/35 bg-[#fff6df] px-3 text-base text-[#24160d] outline-none transition focus:border-[#1f7a71] focus:ring-4 focus:ring-[#d7fff8]"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 h-12 w-full rounded-lg border-2 border-[#5f351c] bg-[#5f351c] px-4 text-base font-black text-[#fff6df] transition hover:bg-[#4c2915]"
      >
        {isSubmitting
          ? "Starting..."
          : mode === "create"
            ? "Create game"
            : "Join game"}
      </button>

      {error ? (
        <p className="mt-3 text-sm font-black text-[#8b2f1f]">{error}</p>
      ) : null}
    </form>
  );
}
