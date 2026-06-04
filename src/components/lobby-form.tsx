"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createPreviewSession, saveGameSession } from "@/lib/session";

type LobbyMode = "create" | "join";

export function LobbyForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LobbyMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = joinCode.trim().replace(/\s+/g, "-").toUpperCase();

    if (mode === "join" && !code) {
      return;
    }

    const session = createPreviewSession({
      displayName,
      mode,
      joinCode: code,
    });

    saveGameSession(session);
    router.push(`/game/${encodeURIComponent(session.gameId)}`);
  }

  return (
    <form onSubmit={submit} className="wood-panel rounded-xl p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
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
        className="mt-5 h-12 w-full rounded-lg border-2 border-[#5f351c] bg-[#5f351c] px-4 text-base font-black text-[#fff6df] transition hover:bg-[#4c2915]"
      >
        {mode === "create" ? "Create game" : "Join game"}
      </button>
    </form>
  );
}
