import type { GameState, GameStreamEvent, PlayerMark } from "@/lib/game";

export type StartGameResponse = {
  state: GameState;
  playerToken: string;
  playerMark: PlayerMark;
};

export type GameStateResponse = {
  state: GameState;
};

type ApiErrorBody = {
  error?: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export function createGame(displayName: string) {
  return requestJson<StartGameResponse>("/api/lobby/create", {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
}

export function joinGame(joinCode: string, displayName: string) {
  return requestJson<StartGameResponse>("/api/lobby/join", {
    method: "POST",
    body: JSON.stringify({ joinCode, displayName }),
  });
}

export function getGameState(gameId: string, playerToken: string) {
  const params = new URLSearchParams({ playerToken });

  return requestJson<GameStateResponse>(
    `/api/games/${encodeURIComponent(gameId)}?${params.toString()}`,
  );
}

export function gameEventsUrl(
  gameId: string,
  playerToken: string,
  afterVersion = 0,
) {
  const params = new URLSearchParams({
    playerToken,
    afterVersion: String(afterVersion),
  });

  return `/api/games/${encodeURIComponent(gameId)}/events?${params.toString()}`;
}

export function makeMove(
  gameId: string,
  playerToken: string,
  cellIndex: number,
) {
  return requestJson<GameStateResponse>(
    `/api/games/${encodeURIComponent(gameId)}/moves`,
    {
      method: "POST",
      body: JSON.stringify({ playerToken, cellIndex }),
    },
  );
}

export type { GameStreamEvent };
