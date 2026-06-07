import { GameState, Mark, PlayerMark, normalizeRoomCode } from "@/lib/game";

type StartGameResult = {
  state: GameState;
  playerToken: string;
  playerMark: PlayerMark;
};

const emptyBoard: Mark[] = Array.from({ length: 9 }, () => "empty");

function makeJoinCode() {
  return `WOOD-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function makeToken(mark: PlayerMark) {
  return `mock_${mark}_${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeDisplayName(displayName: string, fallback: string) {
  const trimmed = displayName.trim();

  return trimmed || fallback;
}

function buildState({
  gameId,
  joinCode,
  playerXName = "Player X",
  playerOName,
  board = emptyBoard,
  nextTurn = "x",
}: {
  gameId: string;
  joinCode: string;
  playerXName?: string;
  playerOName?: string;
  board?: Mark[];
  nextTurn?: PlayerMark;
}): GameState {
  return {
    gameId,
    joinCode,
    status: playerOName ? "in_progress" : "waiting",
    board,
    playerX: {
      displayName: playerXName,
      mark: "x",
      role: "Host",
    },
    playerO: playerOName
      ? {
          displayName: playerOName,
          mark: "o",
          role: "Opponent",
        }
      : null,
    nextTurn,
    winner: "empty",
    isDraw: false,
    version: playerOName ? 2 : 1,
  };
}

export async function createGame(displayName: string): Promise<StartGameResult> {
  const joinCode = makeJoinCode();

  return {
    state: buildState({
      gameId: joinCode,
      joinCode,
      playerXName: normalizeDisplayName(displayName, "Player X"),
    }),
    playerToken: makeToken("x"),
    playerMark: "x",
  };
}

export async function joinGame(
  joinCode: string,
  displayName: string,
): Promise<StartGameResult> {
  const normalizedJoinCode = normalizeRoomCode(joinCode);

  return {
    state: buildState({
      gameId: normalizedJoinCode,
      joinCode: normalizedJoinCode,
      playerOName: normalizeDisplayName(displayName, "Player O"),
    }),
    playerToken: makeToken("o"),
    playerMark: "o",
  };
}

export async function getState(
  gameId: string,
  playerToken: string,
): Promise<GameState> {
  const normalizedGameId = normalizeRoomCode(gameId);
  const playerMark = playerToken.includes("_o_") ? "o" : "x";

  return buildState({
    gameId: normalizedGameId,
    joinCode: normalizedGameId,
    playerXName: playerMark === "x" ? "You" : "Player X",
    playerOName: playerMark === "o" ? "You" : undefined,
  });
}

export async function makeMove(
  gameId: string,
  playerToken: string,
  cellIndex: number,
): Promise<GameState> {
  const normalizedGameId = normalizeRoomCode(gameId);
  const playerMark: PlayerMark = playerToken.includes("_o_") ? "o" : "x";
  const nextTurn: PlayerMark = playerMark === "x" ? "o" : "x";
  const board = [...emptyBoard];
  board[cellIndex] = playerMark;

  return {
    ...buildState({
      gameId: normalizedGameId,
      joinCode: normalizedGameId,
      playerXName: playerMark === "x" ? "You" : "Player X",
      playerOName: playerMark === "o" ? "You" : "Player O",
      board,
      nextTurn,
    }),
    version: 3,
  };
}
