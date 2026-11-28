#!/usr/bin/env python3
"""Opt-in native canary. Only use trusted, pre-acquired host, bd and package artifacts."""

import argparse
import base64
from contextlib import contextmanager
import errno
from hashlib import file_digest
import json
import os
from pathlib import Path
import re
import secrets
import signal
import socket
import subprocess
import tarfile
import tempfile
import time
import urllib.error
import urllib.request


CASES = ("registration", "read", "deny", "stop", "replay", "handoff")


class Blocked(Exception):
    pass


class Interrupted(BaseException):
    """Unwind the active case without classifying an operator signal as a case failure."""


class Interruption:
    """Record the first signal and defer unwinding across launch and cleanup."""

    def __init__(self):
        self.signum = None
        self.deferred = True

    def receive(self, signum, _frame):
        if self.signum is None:
            self.signum = signum
            if not self.deferred:
                raise Interrupted

    @contextmanager
    def defer(self):
        previous = self.deferred
        self.deferred = True
        try:
            yield
        finally:
            self.deferred = previous
        if not previous and self.signum is not None:
            raise Interrupted


def group_running(pgid):
    """Check the owned Linux session for live members of its original group.

    The caller must retain the leader's PID until all group signaling ends.
    Zombies cannot execute and only their respective parents can reap them.
    """
    for path in Path("/proc").iterdir():
        if not path.name.isdecimal():
            continue
        try:
            # The command name may contain spaces and closing parentheses.
            state, _, group, session, *_ = (path / "stat").read_bytes().rsplit(b")", 1)[1].split()
        except (FileNotFoundError, ProcessLookupError):
            continue
        if int(group) == int(session) == pgid and state not in (b"Z", b"X"):
            return True
    return False


def wait_group(pgid, seconds):
    """Allow the owned group to exit, returning its last observed live state."""
    deadline = time.monotonic() + seconds
    while group_running(pgid):
        if time.monotonic() >= deadline:
            return True
        time.sleep(.05)
    return False


def stop_group(pgid, errors):
    """Terminate the pinned group, escalating if the grace-period result is uncertain."""
    for signum, seconds in ((signal.SIGTERM, 8), (signal.SIGKILL, 4)):
        try:
            os.killpg(pgid, signum)
        except ProcessLookupError:
            return True
        except OSError as error:
            errors.append(f"Could not send {signum.name} to owned process group: {error}")
        try:
            running = wait_group(pgid, seconds)
        except (OSError, ValueError, IndexError) as error:
            errors.append(f"Process group observation failed: {error}")
            running = None
        if running is False:
            return True
    return None if running is None else False


def require(condition, detail):
    if not condition:
        raise RuntimeError(detail)


def digest(path):
    with path.open("rb") as f:
        return file_digest(f, "sha256").hexdigest()


def read_result(text):
    """Decode the native execute text: return value, log, or both agreeing."""
    def reject_constant(value):
        raise ValueError(f"Invalid JSON constant: {value}")

    def decode(body):
        data = json.loads(body, parse_constant=reject_constant)
        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object in native execute result")
        return data

    if text.startswith("Logs:\n"):
        return decode(text.removeprefix("Logs:\n"))
    returned, framing, logged = text.partition("\n\nLogs:\n")
    result = decode(returned)
    if framing and decode(logged) != result:
        raise ValueError("Native execute return and log disagree")
    return result


def verify_diagnostics_snapshot(messages, expected):
    """Return the saved report instructions after checking the command capture."""
    snapshots = [m for m in messages if m.get("type") == "user" and (
        m.get("text") == "/oc-beads:diagnostics details"
        or "ocBeadsWorkflow" in (m.get("metadata") or {})
    )]
    require(len(snapshots) == 1, f"Expected one saved diagnostics invocation, found {len(snapshots)}")
    saved = snapshots[0]
    workflow = (saved.get("metadata") or {}).get("ocBeadsWorkflow") or {}
    instructions = workflow.get("instructions")
    require(saved["id"] == expected["id"] and saved["text"] == "/oc-beads:diagnostics details"
            and saved.get("metadata") == expected["metadata"] and workflow.get("version") == 1
            and isinstance(instructions, str) and "\nBEGIN_DIAGNOSTIC_REPORT\n" in instructions
            and "\nEND_DIAGNOSTIC_REPORT\n" in instructions, "Saved diagnostics snapshot is wrong or incomplete")
    return instructions


class Probe:
    """Own the disposable workspace, native server launches and evidence files."""

    def __init__(self, args, interruption):
        self.interruption = interruption
        self.args = args
        self.root = Path(tempfile.mkdtemp(prefix="beads-native-", dir=args.scratch))
        print(f"Evidence: {self.root}", flush=True)
        self.work = self.root / "workspace"
        self.package = self.root / "unpacked/package"
        self.key = secrets.token_urlsafe(24)
        self.server = None
        for name in ("workspace", "home", "config", "cache", "data", "state", "run", "tmp", "bin", "unpacked"):
            (self.root / name).mkdir(mode=0o700)
        (self.root / "bin/bd").symlink_to(args.bd)
        self.env = {
            "PATH": f"{self.root}/bin:/usr/bin:/bin", "HOME": str(self.root / "home"),
            "USER": "native-canary", "GIT_CONFIG_NOSYSTEM": "1",
            "TMPDIR": str(self.root / "tmp"), "BEADS_DIR": str(self.work / ".beads"),
            "OPENCODE_DB": str(self.root / "data/native.sqlite"), "OPENCODE_DISABLE_AUTOUPDATE": "1",
            **{f"XDG_{kind}_HOME": str(self.root / directory) for kind, directory in
               (("CONFIG", "config"), ("CACHE", "cache"), ("DATA", "data"), ("STATE", "state"))},
            "XDG_RUNTIME_DIR": str(self.root / "run"),
        }
        provider, model = args.model.split("/", 1)
        self.model = {"providerID": provider, "id": model}

    def save(self, name, data):
        (self.root / f"{name}.json").write_text(json.dumps(data, indent=2) + "\n")

    def run(self, *cmd):
        return subprocess.run(cmd, cwd=self.work, env=self.env, check=True, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, text=True, timeout=20).stdout

    def request(self, path, payload=None, record=None):
        """Capture the HTTP status and body, including native error responses."""
        token = base64.b64encode(f"opencode:{self.key}".encode()).decode()
        request = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}",
            data=None if payload is None else json.dumps(payload).encode(),
            headers={"Authorization": f"Basic {token}", "Content-Type": "application/json"})
        try:
            response = urllib.request.urlopen(request, timeout=8)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status, raw = response.status, response.read()
        try:
            body = json.loads(raw)
        except ValueError:
            body = raw.decode()
        if record:
            self.save(record, {"status": status, "body": body})
        return status, body

    def api(self, path, payload=None, record=None):
        status, body = self.request(path, payload, record)
        require(200 <= status < 300, f"{path}: HTTP {status}: {body}")
        return body.get("data", body) if isinstance(body, dict) else body

    def until(self, read, detail, error=RuntimeError, seconds=None):
        """Poll for a truthy observation, checking the deadline between reads."""
        deadline = time.monotonic() + (seconds or self.args.timeout)
        while time.monotonic() < deadline:
            result = read()
            if result:
                return result
            time.sleep(.25)
        raise error(detail)

    def prepare(self):
        """Verify artifact identity and seed the disposable store before launch."""
        require(digest(self.args.package) == self.args.package_sha256, "Package SHA-256 mismatch")
        with tarfile.open(self.args.package) as archive:
            archive.extractall(self.root / "unpacked", filter="data")
        require(json.loads((self.package / "package.json").read_text())["name"] == "@snarkipus/opencode-beads",
                "Wrong package")
        version = self.run(self.args.host, "--version").strip()
        require(version == f"opencode v{self.args.version}", f"Wrong executable version: {version}")
        self.save("identity", {"host": version, "hostPath": str(self.args.host), "hostSHA256": digest(self.args.host),
                               "packageSHA256": self.args.package_sha256, "bdPath": str(self.args.bd),
                               "bdSHA256": digest(self.args.bd), "bd": self.run("bd", "version").strip(),
                               "model": self.model, "workspace": str(self.work), "environment": self.env})
        self.run("git", "init", "-q")
        self.run("bd", "--actor", self.args.fixture_actor, "init", "--prefix", "canary", "--skip-agents", "--skip-hooks",
                 "--non-interactive", "--sandbox")
        context = json.loads(self.run("bd", "context", "--json", "--sandbox"))
        self.save("bd-context", context)
        require(context["beads_dir"] == self.env["BEADS_DIR"], "bd resolved a different fixture")
        issue = json.loads(self.run("bd", "--actor", self.args.fixture_actor, "create", "Disposable canary fixture",
                                   "--description", "Native qualification fixture only", "--json", "--sandbox"))
        self.issue = issue["id"]
        self.save("issue", issue)

    def start(self, phase, observer=None):
        """Launch an owned Linux process group and confirm native registration."""
        config = {"plugins": [str(self.package)] + ([str(observer)] if observer else [])}
        (self.work / "opencode.json").write_text(json.dumps(config))
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            self.port = sock.getsockname()[1]
        with self.interruption.defer(), (self.root / f"{phase}-server.log").open("wb") as log:
            self.server = subprocess.Popen(
                [self.args.host, "serve", "--hostname", "127.0.0.1", "--port", str(self.port)],
                cwd=self.work, env={**self.env, "OPENCODE_PASSWORD": self.key}, start_new_session=True,
                stdin=subprocess.DEVNULL, stdout=log, stderr=log)
        exe = Path(os.readlink(f"/proc/{self.server.pid}/exe"))
        require(exe == self.args.host, f"Private process executable mismatch: {exe}")

        def ready():
            # Keep an exited leader waitable to pin the group ID until shutdown.
            exited = os.waitid(os.P_PID, self.server.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            require(exited is None, "Private host exited before readiness")
            try:
                return self.api("/api/info", record=f"{phase}-info")
            except urllib.error.URLError:
                return None

        info = self.until(ready, "Private host did not listen", seconds=15)
        require(info["version"] == self.args.version, "Private API version mismatch")
        self.save(f"{phase}-process", {"pid": self.server.pid, "port": self.port, "executable": str(exe)})
        expected = {"opencode-beads"} | ({"native-canary-observer"} if observer else set())

        def registered():
            plugins = self.api("/api/plugin", record=f"{phase}-plugins")
            failed = [p for p in plugins if p["id"] in expected and p["state"]["status"] == "failed"]
            require(not failed, f"Plugin failed to load: {failed}")
            return expected <= {p["id"] for p in plugins if p["state"]["status"] == "active"}

        self.until(registered, f"Expected active plugins: {expected}", seconds=15)

    def close(self, label):
        """Write separate listener and owned process-group observations to the receipt."""
        if self.server is None:
            return
        with self.interruption.defer():
            server = self.server
            pid = server.pid
            listener_closed = None
            errors = []
            group_closed = exit_code = None
            try:
                # Confirm the leader is still ours to wait for before using its group ID.
                os.waitid(os.P_PID, pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            except OSError as error:
                errors.append(f"Could not verify ownership of the server leader: {error}")
            else:
                group_closed = stop_group(pid, errors)
                # Reaping can release the numeric group ID. Never signal it again.
                try:
                    exit_code = server.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    errors.append("Private server leader did not exit")
            self.server = None
            try:
                with socket.socket() as sock:
                    sock.settimeout(.5)
                    outcome = sock.connect_ex(("127.0.0.1", self.port))
                if outcome in (0, errno.ECONNREFUSED):
                    listener_closed = outcome == errno.ECONNREFUSED
                else:
                    errors.append(f"Listener observation inconclusive: {os.strerror(outcome)}")
            except OSError as error:
                errors.append(f"Listener observation failed: {error}")

            if group_closed is False:
                errors.append("Owned process group did not exit")
            if listener_closed is False:
                errors.append("Private listener did not close")
            self.save(label, {"pid": pid, "port": self.port, "exit": exit_code,
                              "listenerClosed": listener_closed, "processGroupClosed": group_closed,
                              "errors": errors})
            require(not errors, "; ".join(errors))

    def sid(self, label, effect=None):
        payload = {"title": f"Disposable {label}", "agent": "build", "model": self.model}
        if effect:
            payload["permissions"] = [{"action": "shell", "resource": "bd update *", "effect": effect}]
        return self.api("/api/session", payload, f"{label}-session")["id"]

    def session(self, sid, suffix="", payload=None, record=None):
        return self.api(f"/api/session/{sid}{suffix}", payload, record)

    def messages(self, sid, label):
        return self.session(sid, "/message", record=f"{label}-messages")

    def wait_model(self, sid, label, since=0):
        """Capture a settled model turn and distinguish provider blockers from execution failures."""
        def idle():
            session = self.session(sid)
            t = session["time"]
            return session if session.get("outcome") and t.get("idle", 0) >= max(since, t.get("busy", 1)) else None
        outcome = self.until(idle, f"{label}: no model outcome within timeout", Blocked)
        self.save(f"{label}-outcome", outcome)
        messages = self.messages(sid, label)
        if outcome["outcome"] == "failed":
            diagnostic = json.dumps(messages)
            if re.search(r"authentication|credential|model.not.found|unauthoriz|rate.limit|provider.*unavailable", diagnostic, re.I):
                raise Blocked(f"{label}: provider/model unavailable; see native messages")
            raise RuntimeError(f"{label}: native execution failed; see messages")
        return messages

    @staticmethod
    def tools(messages):
        return [part for msg in messages if msg["type"] == "assistant"
                for part in msg.get("content", []) if part["type"] == "tool"]

    @staticmethod
    def leaf(tool, name, status):
        return any(c["tool"] == name and c["status"] == status
                   for c in (tool["state"].get("metadata") or {}).get("toolCalls", []))

    def readback(self, label):
        outputs = json.loads(self.run("bd", "show", self.issue, "--json", "--sandbox"))
        self.save(f"{label}-bd", outputs)
        return outputs

    def owned_bd_processes(self):
        """Sample matching CLI processes for Stop evidence only."""
        found = []
        for path in Path("/proc").glob("[0-9]*"):
            try:
                pid = int(path.name)
                if os.getpgid(pid) != self.server.pid and Path(os.readlink(path / "cwd")) != self.work:
                    continue
                if Path(os.readlink(path / "exe")) == self.args.bd:
                    found.append((pid, (path / "cmdline").read_bytes().decode().split("\0")[:-1]))
            except (OSError, ValueError):
                continue
        return found

    def registration(self):
        """Check native registration and capture a diagnostics snapshot for replay."""
        cmds = self.api("/api/command", record="commands")
        require(sum(c["name"].startswith("oc-beads:") for c in cmds) == 30, "Expected 30 registered commands")
        require(any(s["id"] == "oc-beads" for s in self.api("/api/skill", record="skills")), "Skill missing")
        require(any(a["id"] == "beads-task-agent" for a in self.api("/api/agent", record="agents")), "Task agent missing")
        sid = self.sid("registration")
        self.session(sid, "/command", {"name": "oc-beads:diagnostics", "text": "details"})
        snapshot = self.until(lambda: next((m for m in self.session(sid, "/context")
            if m.get("metadata", {}).get("ocBeadsWorkflow")), None), "Diagnostics did not save its snapshot")
        self.save("diagnostic-snapshot", snapshot)
        instructions = snapshot["metadata"]["ocBeadsWorkflow"]["instructions"]
        require(f"| Host | ✅ | OpenCode {self.args.version} |" in instructions, "Registration / Host diagnostics disagree")
        require("| Typed tools | ✅ | Registered |" in instructions, "Diagnostics did not confirm typed registration")
        return sid, snapshot

    def model_ready(self):
        models = self.api("/api/model", record="models")
        if not any(all(m.get(k) == v for k, v in self.model.items()) for m in models):
            raise Blocked("Model is unavailable in clean native profile; no credentials were imported")

    def read_case(self):
        self.model_ready()
        sid, baseline = self.sid("read"), self.readback("read-before")
        self.session(sid, "/prompt", {"text": f"Disposable fixture only. Use native execute with "
            f"search({{query:'get',namespace:'beads'}}), then use execute to call tools.beads.get({{ids:['{self.issue}']}}) "
            "and console.log(JSON.stringify(result)). No shell, no changes, no retry."})
        tools = self.tools(self.wait_model(sid, "read"))
        require(any(self.leaf(t, "search", "completed") and "tools.beads.get" in json.dumps(t) for t in tools),
                "No native discovery result")
        for t in tools:
            if not self.leaf(t, "beads.get", "completed"):
                continue
            text = next((c["text"] for c in t["state"].get("content", []) if c["type"] == "text"), "")
            result = read_result(text)
            require(result["status"] == "acknowledged" and result["complete"] and
                    result["issues"][self.issue] == baseline[0], "Typed result differs from independent readback")
            require(self.readback("read-after") == baseline, "Read mutated fixture")
            return
        raise RuntimeError("No completed native beads.get call")

    def note_case(self, label):
        """Verify denial or stopped permission handling with independent issue readback."""
        effect = "ask" if label == "stop" else "deny"
        self.model_ready()
        sid, baseline = self.sid(label, effect), self.readback(f"{label}-before")
        marker = f"CANARY-DO-NOT-LAND-{label.upper()}-{secrets.token_hex(5)}"
        self.session(sid, "/prompt", {"text": f"Disposable fixture permission check. Use native execute to "
            f"discover tools.beads.note then call tools.beads.note({{id:'{self.issue}',text:'{marker}'}}) once. "
            "No shell fallback, no retry and no other operations."})
        if label == "deny":
            tools = self.tools(self.wait_model(sid, label))
            require(any(self.leaf(t, "beads.note", "error") and "Permission denied: shell" in json.dumps(t)
                        for t in tools), "No native note denial")
            require(self.readback("deny-after") == baseline, "DENIED note mutated fixture")
            return

        def pending():
            return next((p for p in self.session(sid, "/permission") if p["action"] == "shell"
                         and any(marker in r for r in p["resources"])), None)

        request = self.until(pending, "No typed permission wait observed (model unavailable or did not call note)", Blocked)
        self.save("stop-request", request)
        require(request["sessionID"] == sid and request["save"] == [] and request["source"]["type"] == "tool"
                and len(request["resources"]) == 1 and request["resources"][0].startswith(f"bd update {self.issue} --append-notes "),
                "Unexpected permission target; will not reply")
        self.save("stop-processes-at-pending", self.owned_bd_processes())
        require(self.session(sid, "/interrupt", {}, "stop-interrupt")["interrupted"], "Stop did not interrupt")
        before = self.wait_model(sid, "stop")
        require(self.session(sid)["outcome"] == "interrupted" and any(
            t["state"].get("error", {}).get("type") == "aborted" and marker in json.dumps(t)
            for t in self.tools(before)), "Missing interrupted note execution record")
        require(self.readback("stop-after-interrupt") == baseline, "STOPPED note mutated fixture before reply")
        stale = pending()
        require(stale is None or stale == request, "Pending request changed; will not reply")
        self.save("stop-stale", stale)
        status, body = self.request(f"/api/session/{sid}/permission/{request['id']}/reply",
                                    {"decision": "once"}, "stop-late-reply")
        samples = []
        for _ in range(10):
            samples.extend(self.owned_bd_processes())
            time.sleep(.1)
        self.save("stop-processes-after-reply", samples)
        after = self.messages(sid, "stop-after-reply")
        latter = self.readback("stop-after-reply")
        require(latter == baseline, "RELEASE BLOCKER: late approval mutated fixture")
        require(not any(marker in " ".join(args) for _, args in samples), "Late approval spawned a note process")
        require(self.tools(after) == self.tools(before), "Tool records changed after the late reply")
        require(self.api("/api/permission/saved", record="stop-saved") == [], "Late reply saved approval")
        require(pending() is None, "Late reply left the permission pending")
        require(200 <= status < 300 or status in (404, 409, 410), f"Unexpected late reply: HTTP {status}: {body}")
        self.save("stop-disposition", {"reply": status, "outcome": "consumed-no-op" if 200 <= status < 300 else "rejected",
                                      "scope": "permission wait, not a running bd process"})

    def settle_replay(self, sid, label):
        """Record the session state and interrupt busy work before reopening or finishing."""
        session = self.session(sid, record=f"{label}-before-settle")
        t = session["time"]
        if t.get("busy", 0) > t.get("idle", 0):
            self.session(sid, "/interrupt?resume=false", {}, f"{label}-interrupt")

        def idle():
            current = self.session(sid)
            times = current["time"]
            return current if current.get("outcome") and times.get("idle", 0) >= times.get("busy", 1) else None

        self.save(f"{label}-settled", self.until(idle, f"{label}: native session did not settle"))
        require(self.session(sid, "/inbox", record=f"{label}-inbox") == [], f"{label}: inbox is not empty")

    def replay(self, sid, snapshot):
        """Reopen the registered session and observe the restored snapshot on a model request."""
        self.model_ready()
        stored = self.session(sid, "/context", record="replay-before-context")
        expected = verify_diagnostics_snapshot(stored, snapshot)
        self.settle_replay(sid, "replay-before")
        verify_diagnostics_snapshot(self.session(sid, "/context", record="replay-settled-context"), snapshot)
        initial_pid = self.server.pid
        self.close("cleanup-before-reopen")
        observer = self.root / "observer"
        observer.mkdir()
        marker = f"Disposable replay check {secrets.token_hex(8)}. Reply briefly; do not use tools."
        target = json.dumps({"sid": sid, "id": snapshot["id"], "text": snapshot["text"],
                             "instructions": expected, "prompt": marker})
        (observer / "package.json").write_text('{"name":"native-canary-observer","type":"module","exports":{"./server":"./index.js"}}')
        (observer / "index.js").write_text(f'''import {{ existsSync, writeFileSync }} from "node:fs";
const target = {target};
export default {{id:"native-canary-observer",async setup(ctx) {{
  await ctx.session.hook("context", event => {{
    if (event.sessionID !== target.sid) return;
    const file = new URL("../replay-observed.json", import.meta.url);
    if (existsSync(file)) return;
    const snapshots = event.messages.filter(m => m.id === target.id);
    const texts = snapshots.flatMap(m => m.content.map(p => p.text));
    const prompts = event.messages.filter(m => m.role === "user" && m.content.some(p => p.text === target.prompt));
    const context = event.system.filter(p => p.text?.startsWith("<beads-context"));
    writeFileSync(file, JSON.stringify({{
      sessionID: event.sessionID, snapshots, prompts, context,
      snapshotCount: snapshots.length,
      restoredCount: event.messages.flatMap(m => m.content).filter(p => p.text === target.instructions).length,
      compactCount: texts.filter(t => t === target.text).length
    }}), {{flag: "wx"}});
  }});
}}}};
''')
        self.start("reopened", observer)
        require(self.server.pid != initial_pid, "Reopen did not start a new private process")
        stored = self.session(sid, "/context", record="replay-reopened-context")
        verify_diagnostics_snapshot(stored, snapshot)
        since = time.time_ns() // 1_000_000
        observed_file = self.root / "replay-observed.json"
        require(not observed_file.exists(), "Unexpected request before replay prompt")
        self.session(sid, "/prompt", {"text": marker}, "replay-prompt")
        self.until(observed_file.exists, "No post-reopen request observed", Blocked)
        observed = json.loads(observed_file.read_text())
        require(observed["sessionID"] == sid and observed["snapshotCount"] == 1
                and observed["restoredCount"] == 1 and observed["compactCount"] == 1
                and len(observed["prompts"]) == 1 and bool(observed["context"]),
                "Post-reopen request did not contain exactly one restored snapshot, compact invocation and Beads context")

        def actual_model_request():
            messages = self.session(sid, "/message", record="replay-after-messages")
            return next((m for m in messages if m["type"] == "assistant"
                         and m["time"].get("firstToken", 0) >= since
                         and all(m.get("model", {}).get(k) == v for k, v in self.model.items())), None)

        self.save("replay-model-response", self.until(actual_model_request, "Replay request produced no native model token", Blocked))
        self.settle_replay(sid, "replay-after")

    def handoff(self):
        self.model_ready()
        sid = self.sid("handoff")
        self.session(sid, "/prompt", {"text": "Launch exactly one beads-task-agent with the native subagent tool. "
            "Tell it only: reply CANARY-CHILD-HANDOFF and use no tools. No other work. Wait for native delivery."})
        self.wait_model(sid, "handoff-launch")

        def completion():
            messages = self.messages(sid, "handoff")
            return next((m for m in messages if m["type"] == "synthetic" and
                         m.get("metadata", {}).get("source") == "subagent"), None)

        message = self.until(completion, "No native child report arrived")
        child = self.api(f"/api/session/{message['metadata']['childID']}", record="handoff-child")
        require(child["parentID"] == sid and child["agent"] == "beads-task-agent" and child["outcome"] == "succeeded"
                and message["metadata"]["state"] == "completed" and "CANARY-CHILD-HANDOFF" in message["text"]
                and (message["text"].startswith('<background-result kind="subagent"')
                     if tuple(map(int, self.args.version.split("."))) >= (2, 4, 0) else message["text"].startswith("<subagent ")),
                "Native child completion, envelope or identity mismatch")
        require(any(t["name"] == "subagent" and t["state"]["status"] == "completed"
                    for t in self.tools(self.messages(sid, "handoff"))), "No native launch record")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ("host", "bd", "package", "scratch"):
        parser.add_argument(f"--{key}", type=lambda p: Path(p).resolve(strict=True), required=True)
    for key in ("version", "package-sha256", "model", "fixture-actor"):
        parser.add_argument(f"--{key}", required=True)
    parser.add_argument("--cases", choices=CASES, nargs="+", default=CASES)
    parser.add_argument("--timeout", type=int, default=60, help="default polling window in seconds (1–120); an in-flight request may outlast it")
    args = parser.parse_args()
    if not (re.fullmatch(r"\d+\.\d+\.\d+", args.version) and re.fullmatch(r"[0-9a-f]{64}", args.package_sha256)
            and re.fullmatch(r"[^/]+/.+", args.model) and 1 <= args.timeout <= 120):
        parser.error("Expected stable x.y.z, SHA-256, provider/model and timeout 1..120")
    interruption = Interruption()
    previous = {sig: signal.signal(sig, interruption.receive) for sig in (signal.SIGINT, signal.SIGTERM)}
    try:
        return run_probe(Probe(args, interruption))
    finally:
        for sig, handler in previous.items():
            signal.signal(sig, handler)


def run_cases(probe, results):
    """Record each completed case and stop dispatch after a failure."""
    probe.prepare()
    probe.start("initial")
    registration = None
    for case in probe.args.cases:
        try:
            if case == "registration":
                registration = probe.registration()
            elif case == "read":
                probe.read_case()
            elif case in ("deny", "stop"):
                probe.note_case(case)
            elif case == "replay":
                probe.replay(*(registration or probe.registration()))
            elif case == "handoff":
                probe.handoff()
            results[case] = {"status": "pass"}
        except Blocked as error:
            results[case] = {"status": "blocked", "detail": str(error)}
        except Exception as error:
            results[case] = {"status": "fail", "detail": str(error)}
            break


def run_probe(probe):
    """Run selected cases and retain cleanup and verdicts after the first signal."""
    interruption = probe.interruption
    results = {}
    try:
        try:
            interruption.deferred = False
            if interruption.signum is not None:
                raise Interrupted
            run_cases(probe, results)
        except Exception as error:
            results["setup"] = {"status": "fail", "detail": str(error)}
        finally:
            interruption.deferred = True
    except Interrupted:
        pass
    try:
        probe.close("cleanup")
    except Exception as error:
        results["cleanup"] = {"status": "fail", "detail": str(error)}
    if interruption.signum is not None:
        results["interruption"] = {"status": "fail", "signal": signal.Signals(interruption.signum).name}
    probe.save("results", results)
    print(json.dumps(results, indent=2))
    return 1 if any(r["status"] == "fail" for r in results.values()) else 2 if any(
        r["status"] == "blocked" for r in results.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
