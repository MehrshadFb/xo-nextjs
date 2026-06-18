import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const protoLoader = require("@grpc/proto-loader");

const protoRoot = path.join(process.cwd(), "proto");
const protoFiles = {
  common: "xo/v1/common.proto",
  game: "xo/v1/game.proto",
  health: "xo/v1/health.proto",
  lobby: "xo/v1/lobby.proto",
};

const expectedServices = [
  {
    file: "lobby",
    rpcs: ["CreateGame", "JoinGame"],
    service: "LobbyService",
  },
  {
    file: "game",
    rpcs: ["GetState", "MakeMove", "RequestRematch", "WatchGame"],
    service: "GameService",
  },
  {
    file: "health",
    rpcs: ["Health"],
    service: "HealthService",
  },
];

const expectedMessages = [
  {
    file: "common",
    fields: [
      ["string", "game_id", 1],
      ["string", "join_code", 2],
      ["GameStatus", "status", 3],
      ["repeated Mark", "board", 4],
      ["Player", "player_x", 5],
      ["Player", "player_o", 6],
      ["Mark", "next_turn", 7],
      ["Mark", "winner", 8],
      ["bool", "is_draw", 9],
      ["int64", "version", 10],
      ["MatchScore", "score", 11],
      ["RematchState", "rematch", 12],
      ["int64", "round_number", 13],
    ],
    message: "GameState",
  },
  {
    file: "common",
    fields: [
      ["int64", "x_wins", 1],
      ["int64", "o_wins", 2],
      ["int64", "draws", 3],
    ],
    message: "MatchScore",
  },
  {
    file: "common",
    fields: [
      ["bool", "x_requested", 1],
      ["bool", "o_requested", 2],
    ],
    message: "RematchState",
  },
  {
    file: "lobby",
    fields: [
      ["GameState", "state", 1],
      ["string", "player_token", 2],
    ],
    message: "CreateGameResponse",
  },
  {
    file: "lobby",
    fields: [
      ["GameState", "state", 1],
      ["string", "player_token", 2],
    ],
    message: "JoinGameResponse",
  },
  {
    file: "game",
    fields: [
      ["string", "game_id", 1],
      ["string", "player_token", 2],
    ],
    message: "GetStateRequest",
  },
  {
    file: "game",
    fields: [["GameState", "state", 1]],
    message: "GetStateResponse",
  },
  {
    file: "game",
    fields: [
      ["string", "game_id", 1],
      ["string", "player_token", 2],
      ["int32", "cell_index", 3],
    ],
    message: "MakeMoveRequest",
  },
  {
    file: "game",
    fields: [["GameState", "state", 1]],
    message: "MakeMoveResponse",
  },
  {
    file: "game",
    fields: [
      ["string", "game_id", 1],
      ["string", "player_token", 2],
    ],
    message: "RequestRematchRequest",
  },
  {
    file: "game",
    fields: [["GameState", "state", 1]],
    message: "RequestRematchResponse",
  },
  {
    file: "game",
    fields: [
      ["GameEventType", "type", 1],
      ["int64", "event_id", 2],
      ["GameState", "state", 3],
      ["string", "message", 6],
    ],
    message: "GameEvent",
  },
  {
    file: "game",
    fields: [
      ["string", "game_id", 1],
      ["string", "player_token", 2],
      ["int64", "after_version", 3],
    ],
    message: "WatchGameRequest",
  },
  {
    file: "health",
    fields: [
      ["HealthStatus", "status", 1],
      ["string", "message", 2],
    ],
    message: "HealthResponse",
  },
];

const expectedEnumValues = [
  {
    enumName: "Mark",
    file: "common",
    values: ["MARK_EMPTY", "MARK_X", "MARK_O"],
  },
  {
    enumName: "GameStatus",
    file: "common",
    values: [
      "GAME_STATUS_WAITING",
      "GAME_STATUS_IN_PROGRESS",
      "GAME_STATUS_FINISHED",
      "GAME_STATUS_ABORTED",
    ],
  },
  {
    enumName: "HealthStatus",
    file: "health",
    values: ["HEALTH_STATUS_SERVING", "HEALTH_STATUS_NOT_SERVING"],
  },
  {
    enumName: "GameEventType",
    file: "game",
    values: [
      "GAME_EVENT_TYPE_STATE_SNAPSHOT",
      "GAME_EVENT_TYPE_PLAYER_JOINED",
      "GAME_EVENT_TYPE_MOVE_MADE",
      "GAME_EVENT_TYPE_GAME_OVER",
      "GAME_EVENT_TYPE_PLAYER_LEFT",
      "GAME_EVENT_TYPE_REMATCH_REQUESTED",
      "GAME_EVENT_TYPE_ROUND_STARTED",
    ],
  },
];

function fail(message) {
  throw new Error(`proto contract: ${message}`);
}

function readProto(fileKey) {
  const relativePath = protoFiles[fileKey];

  if (!relativePath) {
    fail(`unknown proto key ${fileKey}`);
  }

  return readFileSync(path.join(protoRoot, relativePath), "utf8");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blockFor(source, keyword, name) {
  const blockMatch = source.match(
    new RegExp(`\\b${keyword}\\s+${escapeRegex(name)}\\s*\\{([\\s\\S]*?)\\n\\}`),
  );

  if (!blockMatch) {
    fail(`missing ${keyword} ${name}`);
  }

  return blockMatch[1];
}

function assertService({ file, rpcs, service }) {
  const body = blockFor(readProto(file), "service", service);

  for (const rpc of rpcs) {
    if (!new RegExp(`\\brpc\\s+${escapeRegex(rpc)}\\s*\\(`).test(body)) {
      fail(`missing ${service}.${rpc}`);
    }
  }
}

function assertMessage({ fields, file, message }) {
  const body = blockFor(readProto(file), "message", message);

  for (const [type, fieldName, tag] of fields) {
    const fieldPattern = new RegExp(
      `\\b${escapeRegex(type)}\\s+${escapeRegex(fieldName)}\\s*=\\s*${tag}\\b`,
    );

    if (!fieldPattern.test(body)) {
      fail(`missing ${message}.${fieldName} as ${type} = ${tag}`);
    }
  }
}

function assertEnum({ enumName, file, values }) {
  const body = blockFor(readProto(file), "enum", enumName);

  for (const value of values) {
    if (!new RegExp(`\\b${escapeRegex(value)}\\s*=`).test(body)) {
      fail(`missing enum value ${enumName}.${value}`);
    }
  }
}

protoLoader.loadSync(Object.values(protoFiles), {
  arrays: true,
  defaults: false,
  enums: String,
  includeDirs: [protoRoot],
  keepCase: false,
  longs: String,
  objects: true,
  oneofs: true,
});

for (const service of expectedServices) {
  assertService(service);
}

for (const message of expectedMessages) {
  assertMessage(message);
}

for (const enumValue of expectedEnumValues) {
  assertEnum(enumValue);
}

console.log("proto contract: passed");
