// Browser-only lifecycle probe; served by Vite during isolated acceptance tests.
import { createRoot } from "react-dom/client";
import { useStreaks } from "../../src/client/hooks/useStreaks";
export function mountStreakProbe(container: HTMLElement) {
  const root = createRoot(container);
  function Probe({ tick }: { tick: number }) {
    const state = useStreaks(tick);
    return <output>{JSON.stringify(state)}</output>;
  }
  root.render(<Probe tick={0} />);
  return {
    acknowledge: (tick: number) => root.render(<Probe tick={tick} />),
    unmount: () => root.unmount(),
  };
}
