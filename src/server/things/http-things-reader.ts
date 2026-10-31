import { readFileSync } from "node:fs";
import { z } from "zod";
import type { ThingsReader } from "./things-reader";
import { AppError } from "../db/daily-plan-store";
import type { SourceTask, Tracked } from "../../domain/things-sync";
const wireTask = z.object({
  uuid: z.string().min(1),
  type: z.literal("to-do"),
  title: z.string().trim().min(1),
  status: z.enum(["incomplete", "completed", "canceled"]),
  tags: z.array(z.string()).optional(),
  trashed: z.boolean().optional(),
});
export function httpThingsReader(
  options: {
    base?: string;
    token?: string;
    fetcher?: typeof fetch;
    timeoutMs?: number;
    maxBytes?: number;
  } = {},
): ThingsReader {
  return {
    async readSnapshot(ids) {
      const base =
        options.base ??
        process.env.CENTCOM_THINGS_API_URL ??
        "http://127.0.0.1:5225";
      let url: URL;
      try {
        url = new URL(base);
      } catch {
        throw new AppError(
          "THINGS_UNAVAILABLE",
          503,
          "Invalid local Things service URL.",
        );
      }
      if (
        url.protocol !== "http:" ||
        url.hostname !== "127.0.0.1" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        throw new AppError(
          "THINGS_UNAVAILABLE",
          503,
          "Things service must use a local loopback URL.",
        );
      let token = options.token ?? process.env.CENTCOM_THINGS_API_TOKEN;
      try {
        token ??= readFileSync("data/things-api-token", "utf8").trim();
      } catch {
        throw new AppError(
          "THINGS_AUTHENTICATION_FAILED",
          403,
          "Configure the local Things API token on the server.",
        );
      }
      if (!token?.trim())
        throw new AppError(
          "THINGS_AUTHENTICATION_FAILED",
          403,
          "Configure the local Things API token on the server.",
        );
      const signal = AbortSignal.timeout(options.timeoutMs ?? 30000);
      let bytes = 0;
      async function get(path: string, missing = false): Promise<unknown> {
        try {
          const res = await (options.fetcher ?? fetch)(new URL(path, url), {
            headers: { Authorization: "Bearer " + token },
            redirect: "error",
            signal,
          });
          if (res.status === 404 && missing) return null;
          if (res.status === 401 || res.status === 403)
            throw new AppError(
              "THINGS_AUTHENTICATION_FAILED",
              403,
              "The Things service rejected its server token.",
            );
          if (!res.ok)
            throw new AppError(
              "THINGS_UNAVAILABLE",
              503,
              "The local Things service or database is unavailable.",
            );
          if (res.headers.get("x-centcom-timezone") !== "America/New_York")
            throw new AppError(
              "THINGS_DATE_MISMATCH",
              409,
              "Start Things API with the verified Central Command launcher.",
            );
          const chunks: Uint8Array[] = [];
          const stream = res.body?.getReader();
          if (!stream) throw new Error();
          while (true) {
            const part = await stream.read();
            if (part.done) break;
            bytes += part.value.length;
            if (bytes > (options.maxBytes ?? 4194304)) {
              await stream.cancel();
              throw new AppError(
                "THINGS_READ_FAILED",
                502,
                "Things returned too much data. No changes were applied.",
              );
            }
            chunks.push(part.value);
          }
          return JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch (err) {
          if (err instanceof AppError) throw err;
          if (signal.aborted)
            throw new AppError(
              "THINGS_TIMEOUT",
              504,
              "Things sync timed out. Click the button to retry.",
            );
          throw new AppError(
            "THINGS_READ_FAILED",
            502,
            "The local Things service could not be read.",
          );
        }
      }
      const health = z
        .object({ read: z.literal(true), write: z.literal(false) })
        .safeParse(await get("/health"));
      if (!health.success)
        throw new AppError(
          "THINGS_INCOMPATIBLE",
          502,
          "Things API must be healthy and read-only.",
        );
      function normalize(raw: unknown, inToday: boolean): SourceTask {
        const parsed = wireTask.safeParse(raw);
        if (!parsed.success)
          throw new AppError(
            "THINGS_INCOMPATIBLE",
            502,
            "Things returned an unsupported task format.",
          );
        const t = parsed.data;
        return {
          sourceId: t.uuid,
          title: t.title,
          tags: t.tags ?? [],
          status: t.status === "incomplete" ? "open" : t.status,
          inToday,
          inTrash: t.trashed ?? false,
        };
      }
      // The pinned /today reader includes both Today and This Evening.
      // Do not filter by the optional evening bucket or issue a second list read.
      const raw = await get("/today");
      if (!Array.isArray(raw))
        throw new AppError(
          "THINGS_INCOMPATIBLE",
          502,
          "Things returned an invalid Today list.",
        );
      if (
        raw.some(
          (r) =>
            !r ||
            typeof r !== "object" ||
            !["to-do", "project", "heading"].includes(r.type),
        )
      )
        throw new AppError(
          "THINGS_INCOMPATIBLE",
          502,
          "Things returned an unsupported Today record.",
        );
      const candidates = raw
        .filter((r: any) => r?.type === "to-do")
        .map((r) => normalize(r, true));
      const tracked: Tracked[] = [];
      for (const id of ids) {
        const task = await get("/todos/" + encodeURIComponent(id), true);
        tracked.push(
          task === null
            ? { sourceId: id, missing: true }
            : normalize(
                task,
                candidates.some((c) => c.sourceId === id),
              ),
        );
      }
      return { candidates, tracked };
    },
  };
}
