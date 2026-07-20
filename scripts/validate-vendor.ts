import * as fs from "node:fs/promises";
import * as path from "node:path";
import { adaptVendorPrompt, adaptedVendorPaths } from "../src/vendor-adaptations";
import { validateVendorManifest } from "../src/vendor-provenance";

const vendorDir = path.resolve(process.argv[2] ?? "vendor");
const [repository, tag, commit] = process.argv.slice(3);
if ([repository, tag, commit].some(Boolean) && ![repository, tag, commit].every(Boolean)) {
  throw new Error("Expected repository, tag, and commit together");
}
const expectedProvenance =
  repository && tag && commit ? { repository, tag, commit } : undefined;
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

await validateVendorManifest(vendorDir, expectedProvenance);

console.log(`Validated ${validatedPaths.size} vendor prompts`);
