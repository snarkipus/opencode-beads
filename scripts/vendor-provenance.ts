import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  createVendorManifest,
  selectStableRelease,
  selectStableTag,
  serializeVendorManifest,
  validateVendorManifest,
  VENDOR_MANIFEST,
} from "../src/vendor-provenance";

const [command, ...args] = process.argv.slice(2);

if (command === "select-tag") {
  const [tagsFile] = args;
  if (!tagsFile) throw new Error("Usage: select-tag <git-ls-remote-file>");
  console.log(selectStableTag(await fs.readFile(tagsFile, "utf-8")));
} else if (command === "select-release") {
  const [tagsFile] = args;
  if (!tagsFile) throw new Error("Usage: select-release <git-ls-remote-file>");
  const release = selectStableRelease(await fs.readFile(tagsFile, "utf-8"));
  console.log(`${release.tag}\t${release.commit}`);
} else if (command === "write") {
  const [vendorDir, repository, tag, commit] = args;
  if (!vendorDir || !repository || !tag || !commit) {
    throw new Error("Usage: write <vendor-dir> <repository> <tag> <commit>");
  }
  const manifest = await createVendorManifest(vendorDir, repository, tag, commit);
  await fs.writeFile(path.join(vendorDir, VENDOR_MANIFEST), serializeVendorManifest(manifest));
} else if (command === "validate") {
  const [vendorDir] = args;
  if (!vendorDir) throw new Error("Usage: validate <vendor-dir>");
  const manifest = await validateVendorManifest(vendorDir);
  console.log(`Validated ${manifest.files.length} vendor checksums from ${manifest.tag}`);
} else {
  throw new Error("Usage: vendor-provenance.ts <select-tag|select-release|write|validate> ...");
}
