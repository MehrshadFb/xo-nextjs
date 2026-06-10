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

export type GameStreamEvent = {
  type: string;
  eventId: number;
  state: GameState;
  message: string;
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

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function winningCellIndexes(board: Mark[]) {
  for (const line of winningLines) {
    const [firstIndex, secondIndex, thirdIndex] = line;
    const mark = board[firstIndex];

    if (
      mark !== "empty" &&
      mark === board[secondIndex] &&
      mark === board[thirdIndex]
    ) {
      return line;
    }
  }

  return [];
}

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
