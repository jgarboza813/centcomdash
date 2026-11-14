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
      <svg
        className="sync-icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
      </svg>
      <span>
        {running
          ? "Syncing…"
          : recovery
            ? "Things Sync — recover result"
            : "Things Sync"}
      </span>
    </button>
  );
}
