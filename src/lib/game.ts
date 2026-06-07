export type Mark = "empty" | "x" | "o";

export type PlayerMark = Exclude<Mark, "empty">;

export type GameStatus = "waiting" | "in_progress" | "finished" | "aborted";

export type Player = {
  displayName: string;
  mark: PlayerMark;
  role: string;
};

export type GameState = {
  gameId: string;
  joinCode: string;
  status: GameStatus;
  board: Mark[];
  playerX: Player;
  playerO: Player | null;
  nextTurn: PlayerMark;
  winner: Mark;
  isDraw: boolean;
  version: number;
};

export const previewGame: GameState = {
  gameId: "preview",
  joinCode: "WOOD-42",
  status: "in_progress",
  board: ["x", "o", "x", "empty", "o", "empty", "empty", "x", "empty"],
  playerX: {
    displayName: "Player X",
    mark: "x",
    role: "Host",
  },
  playerO: {
    displayName: "Player O",
    mark: "o",
    role: "Opponent",
  },
  nextTurn: "x",
  winner: "empty",
  isDraw: false,
  version: 5,
};

export function markLabel(mark: Mark) {
  if (mark === "empty") {
    return "";
  }

  return mark.toUpperCase();
}

export function statusLabel(status: GameStatus) {
  const labels: Record<GameStatus, string> = {
    waiting: "Waiting",
    in_progress: "In progress",
    finished: "Finished",
    aborted: "Aborted",
  };

  return labels[status];
}

export function normalizeRoomCode(gameId: string) {
  const decoded = decodeURIComponent(gameId);
  const cleaned = decoded.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();

  return cleaned || "WOOD-42";
}
