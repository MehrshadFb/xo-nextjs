import { ApiError, isServerWaking } from "@/lib/errors";
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
    throw new ApiError(body.error ?? "Request failed", response.status);
  }

  return response.json() as Promise<T>;
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];

async function withWakeRetry<T>(
  request: () => Promise<T>,
  onRetry?: () => void,
): Promise<T> {
  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await request();
    } catch (error) {
      if (!isServerWaking(error)) {
        throw error;
      }

      onRetry?.();
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return request();
}

export function createGame(displayName: string, onRetry?: () => void) {
  return withWakeRetry(
    () =>
      requestJson<StartGameResponse>("/api/lobby/create", {
        method: "POST",
        body: JSON.stringify({ displayName }),
      }),
    onRetry,
  );
}

export function joinGame(
  joinCode: string,
  displayName: string,
  onRetry?: () => void,
) {
  return withWakeRetry(
    () =>
      requestJson<StartGameResponse>("/api/lobby/join", {
        method: "POST",
        body: JSON.stringify({ joinCode, displayName }),
      }),
    onRetry,
  );
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

export function requestRematch(gameId: string, playerToken: string) {
  return requestJson<GameStateResponse>(
    `/api/games/${encodeURIComponent(gameId)}/rematch`,
    {
      method: "POST",
      body: JSON.stringify({ playerToken }),
    },
  );
}

export type { GameStreamEvent };
