import { it, expect } from "vitest";
import { httpThingsReader } from "../../src/server/things/http-things-reader";
const headers = { "X-Centcom-Timezone": "America/New_York" };
const raw = {
  uuid: "a",
  type: "to-do",
  title: "Task",
  status: "incomplete",
  tags: ["❗️", "🔴 XL"],
  notes: "must not escape",
};
it("uses GET bearer requests, normalizes verified omissions and drops extra data", async () => {
  const calls: { url: string; options: any }[] = [];
  const fetcher = async (url: any, options: any) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify(
        String(url).endsWith("/health")
          ? { read: true, write: false }
          : String(url).endsWith("/today")
            ? [raw]
            : { ...raw, status: "completed" },
      ),
      { headers },
    );
  };
  const reader = httpThingsReader({
    token: "fixture-secret",
    fetcher: fetcher as typeof fetch,
  });
  const snapshot = await reader.readSnapshot(["a"]);
  expect(snapshot.candidates[0]).toMatchObject({
    inTrash: false,
    status: "open",
    tags: ["❗️", "🔴 XL"],
  });
  expect(snapshot.candidates[0]).not.toHaveProperty("notes");
  expect(snapshot.tracked[0]).toMatchObject({ status: "completed" });
  expect(calls).toHaveLength(3);
  expect(
    calls.every(
      (c) =>
        c.options.headers.Authorization === "Bearer fixture-secret" &&
        c.options.redirect === "error",
    ),
  ).toBe(true);
});
it("does not contact source before explicit invocation and refuses remote URLs", async () => {
  let calls = 0;
  const reader = httpThingsReader({
    base: "http://remote.example:5225",
    token: "secret",
    fetcher: (async () => {
      calls++;
      return new Response();
    }) as typeof fetch,
  });
  expect(calls).toBe(0);
  await expect(reader.readSnapshot([])).rejects.toMatchObject({
    code: "THINGS_UNAVAILABLE",
  });
  expect(calls).toBe(0);
});
it("auth/malformed/size/timezone failures do not become empty success", async () => {
  for (const [response, expected] of [
    [() => new Response("{}", { status: 401 }), "THINGS_AUTHENTICATION_FAILED"],
    [() => new Response("not json", { headers }), "THINGS_READ_FAILED"],
    [
      () => new Response(JSON.stringify({ read: true, write: false })),
      "THINGS_DATE_MISMATCH",
    ],
  ] as const) {
    const reader = httpThingsReader({
      token: "secret",
      fetcher: (async () => response()) as typeof fetch,
    });
    await expect(reader.readSnapshot([])).rejects.toMatchObject({
      code: expected,
    });
  }
  const reader = httpThingsReader({
    token: "secret",
    maxBytes: 2,
    fetcher: (async () => new Response("larger", { headers })) as typeof fetch,
  });
  await expect(reader.readSnapshot([])).rejects.toMatchObject({
    code: "THINGS_READ_FAILED",
  });
});
it("bounds execution without automatic retries", async () => {
  let calls = 0;
  const reader = httpThingsReader({
    token: "secret",
    timeoutMs: 5,
    fetcher: ((_u, o) => {
      calls++;
      return new Promise((_resolve, reject) => {
        o?.signal?.addEventListener("abort", () => reject(new Error("abort")));
      });
    }) as typeof fetch,
  });
  await expect(reader.readSnapshot([])).rejects.toMatchObject({
    code: "THINGS_TIMEOUT",
  });
  expect(calls).toBe(1);
});
it("rejects empty tokens and malformed Today members without silently importing a partial list", async () => {
  await expect(
    httpThingsReader({ token: "" }).readSnapshot([]),
  ).rejects.toMatchObject({ code: "THINGS_AUTHENTICATION_FAILED" });
  const fetcher = (async (url: any) =>
    new Response(
      JSON.stringify(
        String(url).endsWith("/health")
          ? { read: true, write: false }
          : [raw, null],
      ),
      { headers },
    )) as typeof fetch;
  await expect(
    httpThingsReader({ token: "fixture", fetcher }).readSnapshot([]),
  ).rejects.toMatchObject({ code: "THINGS_INCOMPATIBLE" });
});
it("maps auth/rate-limit failures and distinguishes tracked 404 from lookup failure", async () => {
  for (const status of [403, 429, 503]) {
    const reader = httpThingsReader({
      token: "fixture",
      fetcher: (async () => new Response("{}", { status })) as typeof fetch,
    });
    await expect(reader.readSnapshot([])).rejects.toMatchObject({
      code:
        status === 403 ? "THINGS_AUTHENTICATION_FAILED" : "THINGS_UNAVAILABLE",
    });
  }
  const fetcher = (async (url: any) => {
    const path = new URL(url).pathname;
    if (path === "/health")
      return new Response(JSON.stringify({ read: true, write: false }), {
        headers,
      });
    if (path === "/today") return new Response("[]", { headers });
    expect(path).toBe("/todos/opaque%2Fid");
    return new Response("{}", { status: 404, headers });
  }) as typeof fetch;
  expect(
    (
      await httpThingsReader({ token: "fixture", fetcher }).readSnapshot([
        "opaque/id",
      ])
    ).tracked,
  ).toEqual([{ sourceId: "opaque/id", missing: true }]);
});

it("includes Today and This Evening candidates in one list read", async () => {
  const paths: string[] = [];
  const fetcher = (async (url: any) => {
    const path = new URL(url).pathname;
    paths.push(path);
    return new Response(
      JSON.stringify(
        path === "/health"
          ? { read: true, write: false }
          : [
              { ...raw, uuid: "daytime", start_bucket: 0 },
              {
                ...raw,
                uuid: "evening",
                start_bucket: 1,
                tags: ["❗️", "🔵 S"],
              },
            ],
      ),
      { headers },
    );
  }) as typeof fetch;
  const snapshot = await httpThingsReader({
    token: "fixture",
    fetcher,
  }).readSnapshot([]);
  expect(snapshot.candidates.map((t) => [t.sourceId, t.inToday])).toEqual([
    ["daytime", true],
    ["evening", true],
  ]);
  expect(paths).toEqual(["/health", "/today"]);
});
