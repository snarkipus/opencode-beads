import * as fs from "node:fs/promises";
import * as path from "node:path";
import { adaptVendorPrompt, adaptedVendorPaths } from "../src/vendor-adaptations";

const vendorDir = path.resolve(process.argv[2] ?? "vendor");
const validatedPaths = new Set<string>();

for (const directory of ["commands", "agents"]) {
  const files = await fs.readdir(path.join(vendorDir, directory));
  for (const file of files.sort()) {
    if (!file.endsWith(".md")) continue;
    const relativePath = `${directory}/${file}`;
    const content = await fs.readFile(path.join(vendorDir, relativePath), "utf-8");
    adaptVendorPrompt(relativePath, content);
    validatedPaths.add(relativePath);
  }
}

for (const relativePath of adaptedVendorPaths) {
  if (!validatedPaths.has(relativePath)) {
    throw new Error(`Missing adapted vendor prompt: ${relativePath}`);
  }
}

console.log(`Validated ${validatedPaths.size} vendor prompts`);
