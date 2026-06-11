const defaultGrpcTarget = "localhost:50051";

function hasUrlScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function hasPort(value: string) {
  return /:\d+$/.test(value);
}

export function xoGrpcTarget(env: NodeJS.ProcessEnv = process.env) {
  const target = env.XO_GRPC_TARGET?.trim();

  if (!target) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "XO_GRPC_TARGET is required in production. Use a gRPC target like backend.example.com:50051.",
      );
    }

    return defaultGrpcTarget;
  }

  if (hasUrlScheme(target)) {
    throw new Error(
      "XO_GRPC_TARGET must be a gRPC target like localhost:50051, not an HTTP URL.",
    );
  }

  if (!hasPort(target)) {
    throw new Error("XO_GRPC_TARGET must include a port, for example localhost:50051.");
  }

  return target;
}
