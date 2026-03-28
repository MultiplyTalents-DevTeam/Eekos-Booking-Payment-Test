import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const cssPaths = [
  path.join(rootDir, "src", "styles", "room-selector.css"),
  path.join(rootDir, "src", "styles", "booking-modal.css"),
  path.join(rootDir, "src", "styles", "responsive.css")
];

const distDir = path.join(rootDir, "dist");
const embedOutputPath = path.join(distDir, "eekos-room-selector.html");

const browserModuleOrder = [
  path.join(rootDir, "src", "js", "config.js"),
  path.join(rootDir, "src", "js", "data", "images.js"),
  path.join(rootDir, "src", "js", "data", "rooms.js"),
  path.join(rootDir, "src", "js", "lib", "escape.js"),
  path.join(rootDir, "src", "js", "lib", "booking.js"),
  path.join(rootDir, "src", "js", "lib", "payment.js"),
  path.join(rootDir, "src", "js", "lib", "room-filters.js"),
  path.join(rootDir, "src", "js", "lib", "validation.js"),
  path.join(rootDir, "src", "js", "ui", "render-rooms.js"),
  path.join(rootDir, "src", "js", "app.js")
];

function stripModuleSyntax(source) {
  return source
    .replace(/^\s*import\s.+?;\s*$/gm, "")
    .replace(/^\s*export\s+(const|function|class)\s+/gm, "$1 ")
    .replace(/^\s*export\s*\{[^}]+\};?\s*$/gm, "")
    .trim();
}

async function loadTemplate() {
  const templateModule = await import(
    pathToFileURL(path.join(rootDir, "src", "embed", "template.js")).href
  );

  return templateModule.roomSelectorTemplate.trim();
}

async function buildBrowserBundle() {
  const sources = await Promise.all(
    browserModuleOrder.map((filePath) => readFile(filePath, "utf8"))
  );

  return [
    "(function () {",
    ...sources.map(stripModuleSyntax),
    "initializeRoomSelector(document);",
    "})();"
  ].join("\n\n");
}

async function build() {
  const [css, template, jsBundle] = await Promise.all([
    Promise.all(cssPaths.map((filePath) => readFile(filePath, "utf8"))).then((chunks) =>
      chunks.join("\n\n")
    ),
    loadTemplate(),
    buildBrowserBundle()
  ]);

  const embedHtml = [
    "<style>",
    css.trim(),
    "</style>",
    "",
    template,
    "",
    "<script>",
    jsBundle.trim(),
    "</script>",
    ""
  ].join("\n");

  await mkdir(distDir, { recursive: true });
  await writeFile(embedOutputPath, embedHtml, "utf8");

  process.stdout.write(`Built ${path.relative(rootDir, embedOutputPath)}\n`);
}

build().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

