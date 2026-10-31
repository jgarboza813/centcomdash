import express from "express";
const app = express();
app.use(express.json());
let reads = 0,
  completed = false,
  failure = false;
app.use((_q, r, n) => {
  r.setHeader("X-Centcom-Timezone", "America/New_York");
  n();
});
app.get("/metrics", (_q, r) => r.json({ reads }));
app.post("/control", (q, r) => {
  reads = 0;
  completed = !!q.body.completed;
  failure = !!q.body.failure;
  r.json({ ok: true });
});
app.get("/health", (_q, r) => {
  reads++;
  r.json({ read: true, write: false });
});
const tasks = () => [
  {
    uuid: "test-xl",
    start_bucket: 0,
    type: "to-do",
    title: "Imported Things XL",
    status: completed ? "completed" : "incomplete",
    tags: ["❗️", "🔴 XL"],
  },
  {
    uuid: "test-s",
    start_bucket: 1, // This Evening; included in the same upstream /today list.
    type: "to-do",
    title: "Imported Things S",
    status: "incomplete",
    tags: ["❗️", "🔵 S"],
  },
];
app.get("/today", (_q, r) => {
  reads++;
  if (failure) {
    r.status(503).json({ error: "fixture failure" });
    return;
  }
  r.json(tasks());
});
app.get("/todos/:id", (q, r) => {
  reads++;
  const task = tasks().find((t) => t.uuid === q.params.id);
  if (task) r.json(task);
  else r.status(404).json({ error: "not found" });
});
app.listen(5236, "127.0.0.1");
