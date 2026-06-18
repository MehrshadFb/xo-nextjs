const baseUrl = normalizeBaseUrl(
  process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000",
);
const requestTimeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 10_000);
const streamTimeoutMs = Number(process.env.SMOKE_STREAM_TIMEOUT_MS ?? 10_000);

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function endpoint(path) {
  return new URL(path, baseUrl);
}

async function requestJson(path, init = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(endpoint(path), {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
    const bodyText = await response.text();
    const body = bodyText ? JSON.parse(bodyText) : {};

    if (!response.ok) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }

    return body;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postJson(path, body) {
  return requestJson(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function openGameStream(gameId, playerToken, afterVersion) {
  const controller = new AbortController();
  const params = new URLSearchParams({
    playerToken,
    afterVersion: String(afterVersion),
  });
  const response = await fetch(
    endpoint(`/api/games/${encodeURIComponent(gameId)}/events?${params}`),
    {
      headers: {
        Accept: "text/event-stream",
      },
      signal: controller.signal,
    },
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`SSE stream failed with HTTP ${response.status}: ${bodyText}`);
  }

  if (!response.body) {
    throw new Error("SSE stream did not include a response body");
  }

  return {
    buffer: "",
    controller,
    reader: response.body.getReader(),
  };
}

function parseSseEvent(rawEvent) {
  const event = {
    data: [],
    name: "message",
  };

  for (const line of rawEvent.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      event.name = line.slice("event:".length).trim();
    }

    if (line.startsWith("data:")) {
      event.data.push(line.slice("data:".length).trimStart());
    }
  }

  return {
    data: event.data.join("\n"),
    name: event.name,
  };
}

async function readNextSseEvent(stream) {
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await stream.reader.read();

    if (done) {
      throw new Error("SSE stream ended before receiving the expected event");
    }

    stream.buffer += decoder.decode(value, { stream: true });

    if (stream.buffer.includes("\n\n")) {
      const separatorIndex = stream.buffer.indexOf("\n\n");
      const rawEvent = stream.buffer.slice(0, separatorIndex);
      stream.buffer = stream.buffer.slice(separatorIndex + 2);

      return parseSseEvent(rawEvent);
    }
  }
}

async function waitForGameEvent(stream, expectedVersion, { close = false } = {}) {
  const timeoutId = setTimeout(() => stream.controller.abort(), streamTimeoutMs);

  try {
    while (true) {
      const event = await readNextSseEvent(stream);

      if (event.name === "stream-error") {
        const payload = JSON.parse(event.data);
        throw new Error(payload.error ?? "SSE stream reported an error");
      }

      if (event.name !== "game") {
        continue;
      }

      const payload = JSON.parse(event.data);

      if (payload.eventId === expectedVersion) {
        return payload;
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Timed out waiting for SSE game event");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);

    if (close) {
      stream.controller.abort();
    }
  }
}

function logStep(message) {
  console.log(`smoke: ${message}`);
}

async function moveAndWait({
  cellIndex,
  expectedMark,
  gameId,
  playerToken,
  stream,
}) {
  const moved = await postJson(`/api/games/${encodeURIComponent(gameId)}/moves`, {
    cellIndex,
    playerToken,
  });

  assert(
    moved.state.board[cellIndex] === expectedMark,
    `move response did not place ${expectedMark.toUpperCase()} in cell ${cellIndex}`,
  );

  const streamed = await waitForGameEvent(stream, moved.state.version);

  assert(
    streamed.state.version === moved.state.version,
    "SSE version mismatch after move",
  );
  assert(
    streamed.state.board[cellIndex] === expectedMark,
    `SSE event did not include ${expectedMark.toUpperCase()} move`,
  );

  return moved;
}

async function main() {
  logStep(`using ${baseUrl}`);

  const health = await requestJson("/api/health");

  assert(health.status === "ok", "health endpoint should report ok");
  assert(health.backend === "serving", "health endpoint should report backend serving");
  logStep("health check passed");

  const created = await postJson("/api/lobby/create", {
    displayName: "Smoke X",
  });
  const gameId = created.state?.gameId;
  const playerXToken = created.playerToken;

  assert(gameId, "create response did not include gameId");
  assert(playerXToken, "create response did not include player token");
  assert(created.playerMark === "x", "created player should be X");
  assert(created.state.status === "waiting", "new game should be waiting");
  logStep(`created game ${created.state.joinCode}`);

  const joined = await postJson("/api/lobby/join", {
    displayName: "Smoke O",
    joinCode: created.state.joinCode,
  });
  const playerOToken = joined.playerToken;

  assert(playerOToken, "join response did not include player token");
  assert(joined.playerMark === "o", "joined player should be O");
  assert(joined.state.gameId === gameId, "join response gameId mismatch");
  assert(joined.state.status === "in_progress", "joined game should be in progress");
  assert(joined.state.roundNumber === 1, "first round should be round 1");
  assert(joined.state.score.draws === 0, "new game should start with zero draws");
  logStep("joined second player");

  const stream = await openGameStream(gameId, playerXToken, 0);
  const initialEvent = await waitForGameEvent(stream, joined.state.version);

  assert(
    initialEvent.state.status === "in_progress",
    "initial SSE event should include in-progress game",
  );
  logStep("opened realtime stream");

  const firstMove = await moveAndWait({
    cellIndex: 4,
    expectedMark: "x",
    gameId,
    playerToken: playerXToken,
    stream,
  });

  assert(firstMove.state.nextTurn === "o", "first move should advance turn to O");
  logStep("made X move");

  await moveAndWait({
    cellIndex: 0,
    expectedMark: "o",
    gameId,
    playerToken: playerOToken,
    stream,
  });

  await moveAndWait({
    cellIndex: 3,
    expectedMark: "x",
    gameId,
    playerToken: playerXToken,
    stream,
  });

  await moveAndWait({
    cellIndex: 1,
    expectedMark: "o",
    gameId,
    playerToken: playerOToken,
    stream,
  });

  const winningMove = await moveAndWait({
    cellIndex: 5,
    expectedMark: "x",
    gameId,
    playerToken: playerXToken,
    stream,
  });

  assert(winningMove.state.status === "finished", "winning move should finish game");
  assert(winningMove.state.winner === "x", "X should win the first round");
  assert(winningMove.state.score.xWins === 1, "X score should increment");
  assert(winningMove.state.score.oWins === 0, "O score should stay zero");
  assert(winningMove.state.score.draws === 0, "draw score should stay zero");
  logStep("finished first round and verified score");

  const rematchX = await postJson(
    `/api/games/${encodeURIComponent(gameId)}/rematch`,
    { playerToken: playerXToken },
  );
  const rematchXEvent = await waitForGameEvent(stream, rematchX.state.version);

  assert(rematchX.state.status === "finished", "first rematch request should wait");
  assert(
    rematchX.state.rematch.xRequested === true,
    "X rematch request should be recorded",
  );
  assert(
    rematchXEvent.type === "GAME_EVENT_TYPE_REMATCH_REQUESTED",
    "SSE should report rematch requested",
  );
  logStep("requested rematch as X");

  const rematchO = await postJson(
    `/api/games/${encodeURIComponent(gameId)}/rematch`,
    { playerToken: playerOToken },
  );
  const rematchOEvent = await waitForGameEvent(stream, rematchO.state.version, {
    close: true,
  });

  assert(rematchO.state.status === "in_progress", "second request should start round");
  assert(rematchO.state.roundNumber === 2, "rematch should advance to round 2");
  assert(rematchO.state.nextTurn === "x", "new round should start with X");
  assert(rematchO.state.score.xWins === 1, "X score should persist");
  assert(rematchO.state.score.oWins === 0, "O score should persist");
  assert(rematchO.state.score.draws === 0, "draw score should persist");
  assert(
    rematchO.state.board.every((mark) => mark === "empty"),
    "new round should reset the board",
  );
  assert(
    rematchOEvent.type === "GAME_EVENT_TYPE_ROUND_STARTED",
    "SSE should report round started",
  );
  logStep("started next round and verified score persisted");

  const params = new URLSearchParams({ playerToken: playerOToken });
  const fetched = await requestJson(
    `/api/games/${encodeURIComponent(gameId)}?${params}`,
  );

  assert(fetched.state.roundNumber === 2, "state fetch should show round 2");
  assert(fetched.state.score.xWins === 1, "state fetch should include X score");
  assert(fetched.state.board.every((mark) => mark === "empty"), "state fetch should show reset board");
  logStep("fetched updated game state");

  console.log("smoke: passed");
}

main().catch((error) => {
  console.error(`smoke: failed: ${error.message}`);
  process.exitCode = 1;
});
