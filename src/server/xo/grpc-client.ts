import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { xoGrpcTarget } from "@/server/config";
import type {
  GameState,
  GameStreamEvent,
  Mark,
  Player,
  PlayerMark,
} from "@/lib/game";

type StartGameResult = {
  state: GameState;
  playerToken: string;
  playerMark: PlayerMark;
};

type ProtoPlayer = {
  displayName?: string;
  mark?: unknown;
};

type ProtoGameState = {
  gameId?: string;
  joinCode?: string;
  status?: unknown;
  board?: unknown[];
  playerX?: ProtoPlayer | null;
  playerO?: ProtoPlayer | null;
  nextTurn?: unknown;
  winner?: unknown;
  isDraw?: boolean;
  version?: number | string;
};

type StartGameProtoResponse = {
  state?: ProtoGameState;
  playerToken?: string;
};

type GameStateProtoResponse = {
  state?: ProtoGameState;
};

type HealthProtoResponse = {
  status?: unknown;
  message?: string;
};

export type BackendHealth = {
  status: "serving" | "not_serving" | "unknown";
  message: string;
};

type ProtoGameEvent = {
  type?: string;
  eventId?: number | string;
  state?: ProtoGameState;
  message?: string;
};

type UnaryMethod = (
  request: Record<string, unknown>,
  callback: (error: grpc.ServiceError | null, response: unknown) => void,
) => void;

type UnaryClient = Record<string, UnaryMethod>;

type WatchGameMethod = (
  request: Record<string, unknown>,
) => grpc.ClientReadableStream<unknown>;

type GameServiceClient = UnaryClient & {
  watchGame: WatchGameMethod;
};

type ServiceConstructor = new (
  target: string,
  credentials: grpc.ChannelCredentials,
) => UnaryClient;

type GameServiceConstructor = new (
  target: string,
  credentials: grpc.ChannelCredentials,
) => GameServiceClient;

type XoPackage = {
  xo: {
    v1: {
      LobbyService: ServiceConstructor;
      GameService: GameServiceConstructor;
      HealthService: ServiceConstructor;
    };
  };
};

const protoRoot = path.join(process.cwd(), "proto");
const packageDefinition = protoLoader.loadSync(
  ["xo/v1/lobby.proto", "xo/v1/game.proto", "xo/v1/health.proto"],
  {
    arrays: true,
    defaults: false,
    enums: String,
    includeDirs: [protoRoot],
    keepCase: false,
    longs: String,
    objects: true,
    oneofs: true,
  },
);
const xoPackage = grpc.loadPackageDefinition(
  packageDefinition,
) as unknown as XoPackage;

function lobbyClient() {
  return new xoPackage.xo.v1.LobbyService(
    xoGrpcTarget(),
    grpc.credentials.createInsecure(),
  );
}

function gameClient() {
  return new xoPackage.xo.v1.GameService(
    xoGrpcTarget(),
    grpc.credentials.createInsecure(),
  );
}

function healthClient() {
  return new xoPackage.xo.v1.HealthService(
    xoGrpcTarget(),
    grpc.credentials.createInsecure(),
  );
}

function callUnary<TResponse>(
  client: UnaryClient,
  method: string,
  request: Record<string, unknown>,
) {
  return new Promise<TResponse>((resolve, reject) => {
    client[method](request, (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response as TResponse);
    });
  });
}

function mapMark(mark: unknown): Mark {
  if (mark === "MARK_X" || mark === "X" || mark === 2 || mark === "2") {
    return "x";
  }

  if (mark === "MARK_O" || mark === "O" || mark === 3 || mark === "3") {
    return "o";
  }

  return "empty";
}

function mapPlayer(
  player: ProtoPlayer | null | undefined,
  fallbackMark: PlayerMark,
  fallbackName: string,
  role: string,
): Player | null {
  if (!player && fallbackMark === "o") {
    return null;
  }

  const mark = mapMark(player?.mark);
  const displayName = player?.displayName?.trim();

  if (!displayName && mark === "empty" && fallbackMark === "o") {
    return null;
  }

  return {
    displayName: displayName || fallbackName,
    mark: mark === "empty" ? fallbackMark : mark,
    role,
  };
}

function mapStatus(status: unknown): GameState["status"] {
  if (status === "GAME_STATUS_IN_PROGRESS" || status === 2 || status === "2") {
    return "in_progress";
  }

  if (status === "GAME_STATUS_FINISHED" || status === 3 || status === "3") {
    return "finished";
  }

  if (status === "GAME_STATUS_ABORTED" || status === 4 || status === "4") {
    return "aborted";
  }

  return "waiting";
}

function mapHealthStatus(status: unknown): BackendHealth["status"] {
  if (status === "HEALTH_STATUS_SERVING" || status === 1 || status === "1") {
    return "serving";
  }

  if (status === "HEALTH_STATUS_NOT_SERVING" || status === 2 || status === "2") {
    return "not_serving";
  }

  return "unknown";
}

function mapBoard(board: unknown[] | undefined) {
  const mappedBoard = Array.isArray(board) ? board.map(mapMark) : [];

  return Array.from({ length: 9 }, (_, index) => mappedBoard[index] ?? "empty");
}

function mapVersion(version: number | string | undefined) {
  const numericVersion = Number(version ?? 0);

  return Number.isFinite(numericVersion) ? numericVersion : 0;
}

function mapGameState(state: ProtoGameState | undefined): GameState {
  if (!state?.gameId || !state.joinCode) {
    throw new Error("gRPC response did not include a valid game state");
  }

  const playerX = mapPlayer(state.playerX, "x", "Player X", "Host");

  if (!playerX) {
    throw new Error("gRPC response did not include player X");
  }

  return {
    gameId: state.gameId,
    joinCode: state.joinCode,
    status: mapStatus(state.status),
    board: mapBoard(state.board),
    playerX,
    playerO: mapPlayer(state.playerO, "o", "Player O", "Opponent"),
    nextTurn:
      mapMark(state.nextTurn) === "o"
        ? "o"
        : "x",
    winner: mapMark(state.winner),
    isDraw: Boolean(state.isDraw),
    version: mapVersion(state.version),
  };
}

function mapGameEvent(event: ProtoGameEvent): GameStreamEvent {
  return {
    type: event.type ?? "GAME_EVENT_TYPE_UNSPECIFIED",
    eventId: mapVersion(event.eventId),
    state: mapGameState(event.state),
    message: event.message ?? "",
  };
}

function mapStartGameResponse(
  response: StartGameProtoResponse,
  playerMark: PlayerMark,
): StartGameResult {
  if (!response.playerToken) {
    throw new Error("gRPC response did not include a player token");
  }

  return {
    state: mapGameState(response.state),
    playerToken: response.playerToken,
    playerMark,
  };
}

export async function createGame(displayName: string): Promise<StartGameResult> {
  const response = await callUnary<StartGameProtoResponse>(
    lobbyClient(),
    "createGame",
    { displayName },
  );

  return mapStartGameResponse(response, "x");
}

export async function getHealth(): Promise<BackendHealth> {
  const response = await callUnary<HealthProtoResponse>(
    healthClient(),
    "health",
    {},
  );

  return {
    status: mapHealthStatus(response.status),
    message: response.message ?? "",
  };
}

export async function joinGame(
  joinCode: string,
  displayName: string,
): Promise<StartGameResult> {
  const response = await callUnary<StartGameProtoResponse>(
    lobbyClient(),
    "joinGame",
    { joinCode, displayName },
  );

  return mapStartGameResponse(response, "o");
}

export async function getState(
  gameId: string,
  playerToken: string,
): Promise<GameState> {
  const response = await callUnary<GameStateProtoResponse>(
    gameClient(),
    "getState",
    { gameId, playerToken },
  );

  return mapGameState(response.state);
}

export async function makeMove(
  gameId: string,
  playerToken: string,
  cellIndex: number,
): Promise<GameState> {
  const response = await callUnary<GameStateProtoResponse>(
    gameClient(),
    "makeMove",
    { gameId, playerToken, cellIndex },
  );

  return mapGameState(response.state);
}

export function watchGame({
  gameId,
  playerToken,
  afterVersion,
  onEvent,
  onError,
  onEnd,
}: {
  gameId: string;
  playerToken: string;
  afterVersion: number;
  onEvent: (event: GameStreamEvent) => void;
  onError: (error: Error) => void;
  onEnd: () => void;
}) {
  const stream = gameClient().watchGame({
    gameId,
    playerToken,
    afterVersion,
  });

  stream.on("data", (event) => {
    try {
      onEvent(mapGameEvent(event as ProtoGameEvent));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Invalid stream event"));
      stream.cancel();
    }
  });
  stream.on("error", onError);
  stream.on("end", onEnd);

  return () => {
    stream.cancel();
  };
}
