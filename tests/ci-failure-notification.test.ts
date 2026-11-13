import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { resolve } from "node:path";

const workflow = resolve(import.meta.dir, "../.github/workflows/notify-ci-failure.yml");

test("CI failure notifications use trusted metadata and a bounded, secret-safe Discord sender", async () => {
  expect(await Bun.file(workflow).exists(), "failure notifier must be wired into CI").toBeTrue();
  const text = (await fs.readFile(workflow, "utf8")).replace(/\r\n/g, "\n");
  expect(text).toContain("workflows: [ci, beads-contract]");
  expect(text).toContain("github.event.workflow_run.conclusion == 'failure'");
  expect(text).toContain("permissions: {}");
  expect(text).not.toMatch(/uses:|download-artifact|actions\/checkout/);
  const source = text.match(/          python3 - <<'PY'\n([\s\S]+?)          PY\n/)?.[1]?.replace(/^          /gm, "");
  expect(source).toBeDefined();
  const program = `
import io, json, os, tempfile, urllib.error, urllib.request
scope = {"__name__": "fixture"}
exec(${JSON.stringify(source)}, scope)
webhook = "https://discord.com/api/webhooks/123/fixture-not-real"
calls = []
mode = "success"
class Opener:
    def open(self, request, timeout):
        calls.append(request)
        assert timeout == 10
        assert request.full_url == webhook + "?wait=true"
        assert request.get_header("User-agent") == "OpenCode-Beads-CI-Notifier/1.0"
        payload = json.loads(request.data)
        assert payload["allowed_mentions"] == {"parse": []}
        assert "https://github.com/snarkipus/opencode-beads/actions/runs/42" in payload["content"]
        assert len(payload["content"]) < 2000
        if mode == "http":
            raise urllib.error.HTTPError(webhook, 403, "Forbidden", {}, None)
        if mode == "network":
            raise OSError(webhook)
        return io.BytesIO(b'{"id":"456"}')
def opener(*handlers):
    assert len(handlers) == 1
    assert handlers[0].redirect_request(None, None, None, None, None, None) is None
    return Opener()
urllib.request.build_opener = opener
with tempfile.TemporaryDirectory(prefix="ci-notify-test-") as directory:
    event_path = os.path.join(directory, "event.json")
    os.environ["GITHUB_EVENT_PATH"] = event_path
    os.environ["DISCORD_CI_WEBHOOK_URL"] = webhook
    event = {"repository": {"full_name": "snarkipus/opencode-beads"},
             "workflow_run": {"name": "ci", "conclusion": "failure", "id": 42,
                              "head_branch": "@everyone " + "x" * 300}}
    def event_file():
        with open(event_path, "w") as target: json.dump(event, target)
    event_file()
    assert scope["main"]() == 0 and len(calls) == 1
    calls.clear()
    event["workflow_run"]["conclusion"] = "success"
    event_file()
    assert scope["main"]() == 0 and not calls
    event["workflow_run"]["conclusion"] = "failure"
    for field, invalid in [("repository", "other/repo"), ("workflow", "release")]:
        original_repo = event["repository"]["full_name"]
        original_name = event["workflow_run"]["name"]
        if field == "repository": event["repository"]["full_name"] = invalid
        else: event["workflow_run"]["name"] = invalid
        event_file()
        try: scope["main"](); raise AssertionError("Untrusted metadata accepted")
        except SystemExit as error: assert "Unexpected" in str(error)
        assert not calls
        event["repository"]["full_name"] = original_repo
        event["workflow_run"]["name"] = original_name
    event_file()
    for invalid in ["", "https://other.example/api/webhooks/123/token"]:
        os.environ["DISCORD_CI_WEBHOOK_URL"] = invalid
        try: scope["main"](); raise AssertionError("Missing/incorrect destination accepted")
        except SystemExit as error: assert "Set DISCORD_CI_WEBHOOK_URL" in str(error)
        assert not calls
    os.environ["DISCORD_CI_WEBHOOK_URL"] = webhook
    for failure in ["http", "network"]:
        mode = failure
        calls.clear()
        try: scope["main"](); raise AssertionError("Delivery failure hidden")
        except SystemExit as error:
            assert webhook not in str(error) and "fixture-not-real" not in str(error)
            assert "HTTP 403" in str(error) if failure == "http" else "uncertain" in str(error)
        assert len(calls) == 1
print("NOTIFIER_OFFLINE_PASS")
`;
  const child = Bun.spawn([process.platform === "win32" ? "python" : "python3", "-c", program], { stdout: "pipe", stderr: "pipe" });
  const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
  expect(code, stderr).toBe(0);
  expect(stdout).toContain("NOTIFIER_OFFLINE_PASS");
  expect(stdout + stderr).not.toContain("fixture-not-real");
});
