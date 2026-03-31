import { GHL_CONFIG, resolveGhlConfig, summarizeGhlConfig } from "../src/js/ghl-config.js";

const resolvedConfig = resolveGhlConfig(process.env, GHL_CONFIG);
const summary = summarizeGhlConfig(resolvedConfig);

console.log("EEKOS GHL ID Check");
console.log("");

if (summary.ready) {
  console.log("All required GHL IDs are set.");
  process.exit(0);
}

console.log("Missing or placeholder IDs:");
summary.missingPaths.forEach((path) => {
  console.log(`- ${path}`);
});

console.log("");
console.log("Set the missing IDs in environment variables or src/js/ghl-config.js before wiring live GHL data mapping.");

process.exit(1);
