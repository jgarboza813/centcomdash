export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(
    "/api" + path,
    body
      ? {
          signal,
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { signal },
  );
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error?.code ?? "ERROR",
      data.error?.message ?? "Request failed.",
    );
  return data;
}
