import { scoreBand } from "../../domain/score-colors";
export function ProgressRing({
  score,
  planned = false,
  large = false,
}: {
  score: number | null;
  planned?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={`ring ${large ? "large" : ""} ${planned ? "allocation" : "score-" + scoreBand(score)}`}
      role="img"
      aria-label={
        score === null
          ? "No plan"
          : `${score}%${planned ? " allocated" : " completed"}`
      }
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="track" cx="60" cy="60" r="49" />
        <circle
          className="arc"
          cx="60"
          cy="60"
          r="49"
          pathLength="100"
          strokeDasharray={`${Math.min(score ?? 0, 100)} 100`}
        />
      </svg>
      {large && <strong>{score === null ? "—" : score + "%"}</strong>}
    </div>
  );
}
