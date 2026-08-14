import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const clientDirectory = resolve(process.cwd(), "dist", "client");
const files = ["index.html", "index.rsc"];

for (const file of files) {
  const path = resolve(clientDirectory, file);
  try {
    await access(path);
  } catch {
    throw new Error(`Expected static export file is missing: ${path}`);
  }

  const source = await readFile(path, "utf8");
  const output = source
    // Vinext emits root-relative asset paths. GitHub Pages project sites are
    // served below /<repository>/, so make the exported root page portable.
    .replaceAll('"/assets/', '"./assets/')
    .replaceAll('"/favicon.svg"', '"./favicon.svg"');

  await writeFile(path, output);
}
