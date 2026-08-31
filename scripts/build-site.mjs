import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "_site");
const version = (process.env.SITE_VERSION || "local").replace(/[^a-zA-Z0-9._-]/g, "");
const rootHtmlFiles = (await readdir(root)).filter((file) => file.endsWith(".html"));
const files = [...rootHtmlFiles, "styles.css", "script.js", "media.js"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of files) {
  if (file.endsWith(".html")) {
    const html = await readFile(path.join(root, file), "utf8");
    const fingerprinted = html.replace(/((?:href|src)="(?:styles\.css|script\.js|media\.js))(?:\?[^"#]*)?("|#)/g, `$1?v=${version}$2`);
    await writeFile(path.join(output, file), fingerprinted);
  } else {
    await cp(path.join(root, file), path.join(output, file));
  }
}

await cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
await cp(path.join(root, "content"), path.join(output, "content"), { recursive: true });
await cp(path.join(root, "projects"), path.join(output, "projects"), { recursive: true });

const projectFiles = (await readdir(path.join(output, "projects"))).filter((file) => file.endsWith(".html"));
for (const projectFile of projectFiles) {
  const projectPath = path.join(output, "projects", projectFile);
  const html = await readFile(projectPath, "utf8");
  const fingerprinted = html.replace(/((?:href|src)="(?:styles\.css|script\.js|media\.js))(?:\?[^"#]*)?("|#)/g, `$1?v=${version}$2`);
  await writeFile(projectPath, fingerprinted);
}

console.log(`Built fingerprinted site artifact in _site (version ${version}).`);
