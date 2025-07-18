import fs from "node:fs/promises";
import path from "node:path";
import { MapJSON } from "../graph/buildGraph";

export async function writeMap(outputPath: string, map: MapJSON) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(map, null, 2), "utf8");
  console.log(`✅ Code map written to ${outputPath}`);
} 