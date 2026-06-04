import { Mark, normalizeRoomCode } from "@/lib/game";

export type PlayerMark = Exclude<Mark, "empty">;

export type GameSession = {
  gameId: string;
  joinCode: string;
  playerToken: string;
  playerMark: PlayerMark;
  displayName: string;
  createdAt: number;
};

const STORAGE_KEY = "xo.gameSession";

type CreateSessionInput = {
  displayName: string;
  mode: "create" | "join";
  joinCode?: string;
};

function makePreviewCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function makePreviewToken() {
  return `preview_${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeDisplayName(displayName: string, fallback: string) {
  const trimmed = displayName.trim();

  return trimmed || fallback;
}

function isGameSession(value: unknown): value is GameSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GameSession>;

  return (
    typeof candidate.gameId === "string" &&
    typeof candidate.joinCode === "string" &&
    typeof candidate.playerToken === "string" &&
    (candidate.playerMark === "x" || candidate.playerMark === "o") &&
    typeof candidate.displayName === "string" &&
    typeof candidate.createdAt === "number"
  );
}

export function createPreviewSession({
  displayName,
  mode,
  joinCode,
}: CreateSessionInput): GameSession {
  const playerMark = mode === "create" ? "x" : "o";
  const code =
    mode === "create"
      ? `WOOD-${makePreviewCode()}`
      : normalizeRoomCode(joinCode ?? "");

  return {
    gameId: code,
    joinCode: code,
    playerToken: makePreviewToken(),
    playerMark,
    displayName: normalizeDisplayName(
      displayName,
      playerMark === "x" ? "Player X" : "Player O",
    ),
    createdAt: Date.now(),
  };
}

export function saveGameSession(session: GameSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readGameSession(gameId: string) {
  const rawSession = window.localStorage.getItem(STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession: unknown = JSON.parse(rawSession);

    if (
      isGameSession(parsedSession) &&
      normalizeRoomCode(parsedSession.gameId) === normalizeRoomCode(gameId)
    ) {
      return parsedSession;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return null;
}

export function clearGameSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
