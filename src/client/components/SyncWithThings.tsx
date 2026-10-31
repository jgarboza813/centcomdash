export function SyncWithThings({
  onSync,
  running,
  recovery,
  available,
}: {
  onSync: () => void;
  running: boolean;
  recovery: boolean;
  available: boolean;
}) {
  return (
    <button
      className="sync-things"
      onClick={onSync}
      disabled={running || (!available && !recovery)}
      aria-busy={running}
      title={
        recovery
          ? "Check the previous sync result without reading Things"
          : available
            ? "Read today’s marked Things tasks"
            : "Sync is available for today’s editable plan"
      }
    >
      {running
        ? "Syncing…"
        : recovery
          ? "Sync with Things — recover result"
          : "⟳ Sync with Things"}
    </button>
  );
}
