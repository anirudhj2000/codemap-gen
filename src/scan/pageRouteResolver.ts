import path from "node:path";

export function pageFileToRoute(absFile: string, repoRoot: string): string {
  const rel = path.relative(repoRoot, absFile);
  const withoutExt = rel.replace(/\.[tj]sx?$/, "");
  const route = withoutExt
    .replace(/^pages/, "")
    .replace(/\/index$/, "/")
    .replace(/\[(.+?)\]/g, ":$1"); // dynamic segments ⇒ :slug
  return route === "" ? "/" : route;
} 