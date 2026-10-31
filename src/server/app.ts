import express from "express";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { resolve } from "node:path";
import type { DB } from "./db/database";
import { readDay, mutate, monthDays, AppError } from "./daily-plan-service";
import { dateInput } from "../domain/validation";
export function createApp(db: DB) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const host = req.headers.host ?? "";
    const origin = req.headers.origin;
    if (
      !/^127\.0\.0\.1:\d+$/.test(host) ||
      (origin && !/^http:\/\/127\.0\.0\.1:(3001|5173|4173)$/.test(origin))
    ) {
      res
        .status(403)
        .json({
          error: { code: "LOCAL_ACCESS_ONLY", message: "Local access only." },
        });
      return;
    }
    if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
    if (["PUT", "POST"].includes(req.method) && !req.is("application/json")) {
      res
        .status(400)
        .json({
          error: { code: "VALIDATION_ERROR", message: "JSON input required." },
        });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/days/:date", (req, res) =>
    res.json(readDay(db, dateInput.parse(req.params.date))),
  );
  app.put("/api/days/:date", (req, res) =>
    res.json(mutate(db, dateInput.parse(req.params.date), "save", req.body)),
  );
  for (const action of ["finalize", "reopen"] as const)
    app.post(`/api/days/:date/${action}`, (req, res) =>
      res.json(mutate(db, dateInput.parse(req.params.date), action, req.body)),
    );
  app.get("/api/months/:month", (req, res) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(req.params.month))
      throw new AppError("VALIDATION_ERROR", 400, "Invalid month.");
    res.json(monthDays(db, req.params.month));
  });
  app.use("/api", (_req, res) =>
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Not found." } }),
  );
  app.use(express.static(resolve("dist")));
  const errors: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: err.issues[0]?.message ?? "Invalid input",
          },
        });
      return;
    }
    const status =
      err instanceof AppError
        ? err.status
        : err.type === "entity.too.large"
          ? 413
          : err.type === "entity.parse.failed"
            ? 400
            : 500;
    res
      .status(status)
      .json({
        error: {
          code:
            err instanceof AppError
              ? err.code
              : status === 413
                ? "PAYLOAD_TOO_LARGE"
                : status === 400
                  ? "VALIDATION_ERROR"
                  : "STORAGE_ERROR",
          message:
            err instanceof AppError
              ? err.message
              : status === 413
                ? "This plan is too large to save."
                : status === 400
                  ? "Invalid JSON."
                  : "Could not load or save. Retry your changes.",
        },
      });
  };
  app.use(errors);
  return app;
}
