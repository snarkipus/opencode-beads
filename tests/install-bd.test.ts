import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const installer = fileURLToPath(new URL("../scripts/install-bd.sh", import.meta.url));
const asset = "beads_1.3.4_linux_amd64.tar.gz";

test.skipIf(process.platform !== "linux").each([
  { name: "exact version", output: "bd version 1.3.4 (fixture)", status: 0, result: 0 },
  { name: "wrong version", output: "bd version 1.3.40 (fixture)", status: 0, result: 1 },
  { name: "prerelease", output: "bd version 1.3.4-rc.1", status: 0, result: 1 },
  { name: "failed command", output: "bd version 1.3.4 (fixture)", status: 7, result: 7 },
])("installer checks staged binary before replacing destination for $name", async ({ output, status, result }) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "install-bd-test-"));
  try {
    const bin = join(directory, "bin");
    const dest = join(directory, "destination");
    await Promise.all([fs.mkdir(bin), fs.mkdir(dest)]);
    const original = "#!/bin/sh\necho original\n";
    const staged = `#!/bin/sh\n[ "$1" = version ] || exit 99\necho '${output}'\nexit ${status}\n`;
    await fs.writeFile(join(dest, "bd"), original, { mode: 0o755 });
    await fs.writeFile(join(directory, "bd"), staged, { mode: 0o755 });
    await fs.writeFile(join(bin, "uname"), "#!/bin/sh\necho x86_64\n", { mode: 0o755 });
    await fs.writeFile(join(bin, "curl"), '#!/bin/sh\ncp "${0%/*}/../${6##*/}" "$5"\n', { mode: 0o755 });
    const tar = Bun.spawnSync(["tar", "-czf", asset, "bd"], { cwd: directory });
    expect(tar.exitCode).toBe(0);
    const digest = createHash("sha256")
      .update(await fs.readFile(join(directory, asset)))
      .digest("hex");
    await fs.writeFile(join(directory, "checksums.txt"), `${digest}  ${asset}\n`);
    const child = Bun.spawnSync(["bash", installer, "v1.3.4", dest], {
      cwd: directory,
      env: { PATH: `${bin}:/usr/bin:/bin`, TMPDIR: directory },
    });
    expect(child.exitCode).toBe(result);
    expect(child.stdout.toString()).toBe(result === 0 ? `${output}\n` : "");
    expect(await fs.readFile(join(dest, "bd"), "utf8")).toBe(result === 0 ? staged : original);
    if (status === 0 && result === 1) expect(child.stderr.toString()).toContain("Expected bd version 1.3.4");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
