import { GameState, PlayerMark, normalizeRoomCode } from "@/lib/game";

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
  state: GameState;
  displayName: string;
  playerToken: string;
  playerMark: PlayerMark;
};

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

export function createGameSession({
  state,
  displayName,
  playerToken,
  playerMark,
}: CreateSessionInput): GameSession {
  return {
    gameId: state.gameId,
    joinCode: state.joinCode,
    playerToken,
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
