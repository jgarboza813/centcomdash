import type { Snapshot } from "../../domain/things-sync";
export interface ThingsReader {
  readSnapshot(ids: string[]): Promise<Snapshot>;
}
