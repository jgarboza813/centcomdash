import { z } from "zod";
import { validDate } from "./dates";
export const dateInput = z
  .string()
  .refine(validDate, "Choose a valid calendar date");
export const taskInput = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1, "Enter a task title"),
    weightLabel: z.enum(["XL", "L", "M", "S"]),
    completed: z.boolean(),
  })
  .strict();
export const transitionInput = z
  .object({
    requestId: z.uuid(),
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict();
export const saveInput = transitionInput
  .extend({
    tasks: z
      .array(taskInput)
      .refine(
        (ts) => new Set(ts.map((t) => t.id)).size === ts.length,
        "Task IDs must be unique",
      ),
  })
  .strict();
