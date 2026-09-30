export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// The backend sleeps when idle; the request that wakes it fails with
// 502/503/504 (or a network error) while the container boots.
export function isServerWaking(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 502 || error.status === 503 || error.status === 504;
  }
  return error instanceof TypeError;
}
