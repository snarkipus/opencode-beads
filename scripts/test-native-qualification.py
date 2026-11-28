"""Parser and inert Linux lifecycle fixtures for the manual canary."""

import errno
import json
import os
from pathlib import Path
import runpy
import selectors
import signal
import socket
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch


probe = runpy.run_path(str(Path(__file__).with_name("native-qualification.py")))
read_result = probe["read_result"]
verify_diagnostics_snapshot = probe["verify_diagnostics_snapshot"]

# Sanitized from the native execute content; the leading return and the log
# contain the same result. Native metadata records the leaf but not its output.
RESULT = {
    "operation": "get", "target": ["canary-fixture"], "status": "acknowledged",
    "issues": {"canary-fixture": {"id": "canary-fixture", "title": "Disposable fixture"}},
    "failed": [], "complete": True,
}
TEXT = json.dumps(RESULT, separators=(",", ":"))
FRAMED = f"{TEXT}\n\nLogs:\n{TEXT}"


class ExecuteReadResult(unittest.TestCase):
    def test_captured_return_and_log(self):
        self.assertEqual(read_result(FRAMED), RESULT)

    def test_plain_and_log_only(self):
        for text in (TEXT, f"Logs:\n{TEXT}"):
            with self.subTest(text=text):
                self.assertEqual(read_result(text), RESULT)

    def test_rejects_unexpected_or_malformed_output(self):
        for text in (
            f"unexpected\n{TEXT}", f"{TEXT}\nunexpected", f"{TEXT}\n\nLogs:\nx",
            f"{FRAMED}\nunexpected", f"{TEXT}\n\nLogs:\n{{}}",
            "[]", '{"invalid":NaN}',
        ):
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    read_result(text)


class SavedDiagnosticsSnapshot(unittest.TestCase):
    def test_requires_one_complete_snapshot_matching_the_command_capture(self):
        instructions = "Reproduce the report.\nBEGIN_DIAGNOSTIC_REPORT\nFixture report\nEND_DIAGNOSTIC_REPORT\n"
        snapshot = {
            "type": "user", "id": "msg_fixture", "text": "/oc-beads:diagnostics details",
            "metadata": {"ocBeadsWorkflow": {"version": 1, "instructions": instructions}},
        }
        self.assertEqual(verify_diagnostics_snapshot([snapshot], snapshot), instructions)
        cases = (
            [], [snapshot, {**snapshot, "id": "msg_duplicate"}],
            [{**snapshot, "id": "msg_wrong"}], [{**snapshot, "text": "/oc-beads:show"}],
            [{**snapshot, "metadata": {}}],
        )
        for messages in cases:
            with self.subTest(messages=messages):
                with self.assertRaises(RuntimeError):
                    verify_diagnostics_snapshot(messages, snapshot)
        incomplete = {**snapshot, "metadata": {"ocBeadsWorkflow": {"version": 1, "instructions": "unfinished"}}}
        with self.assertRaises(RuntimeError):
            verify_diagnostics_snapshot([incomplete], incomplete)


def live_process(pid):
    """Independently inspect a fixture PID, treating a zombie as exited."""
    try:
        stat = Path(f"/proc/{pid}/stat").read_text()
    except FileNotFoundError:
        return False
    return stat.rsplit(")", 1)[1].split()[0] not in ("Z", "X")


class InertProbe(probe["Probe"]):
    """Exercise the real verdict and cleanup paths with only inert processes."""

    def __init__(self, root, port):
        self.root = root
        self.port = port
        self.args = SimpleNamespace(cases=("registration", "read", "handoff"))
        self.interruption = probe["Interruption"]()
        self.server = None

    def prepare(self):
        pass

    def start(self, phase):
        with self.interruption.defer():
            self.server = subprocess.Popen(
                [sys.executable, "-c", "import time; time.sleep(15)"],
                start_new_session=True,
            )

    def registration(self):
        return None

    def read_case(self):
        print(self.server.pid, flush=True)
        time.sleep(10)

    def handoff(self):
        raise AssertionError("Dispatched another case after interruption")


def run_interruption_fixture(root, port):
    """Run the real interruption handler in a process the test can signal."""
    fixture = InertProbe(Path(root), int(port))
    for signum in (signal.SIGTERM, signal.SIGINT):
        signal.signal(signum, fixture.interruption.receive)
    return probe["run_probe"](fixture)


@unittest.skipUnless(sys.platform == "linux", "requires Linux process groups and procfs")
class OwnedShutdown(unittest.TestCase):
    def test_child_survives_leader_with_listener_already_closed(self):
        with tempfile.TemporaryDirectory() as root, socket.socket() as reserved:
            reserved.bind(("127.0.0.1", 0))
            fixture = InertProbe(Path(root), reserved.getsockname()[1])
            # The child has no listener and survives both its leader and SIGTERM.
            child_code = (
                "import os, signal, time; signal.signal(signal.SIGTERM, signal.SIG_IGN); "
                "print(os.getpid(), flush=True); time.sleep(20)"
            )
            fixture.server = subprocess.Popen(
                [sys.executable, "-c",
                 "import subprocess, sys; subprocess.Popen([sys.executable, '-c', sys.argv[1]])",
                 child_code],
                stdout=subprocess.PIPE, text=True, start_new_session=True,
            )
            try:
                with fixture.server.stdout as output:
                    child = int(output.readline())
                leader = fixture.server.pid
                self.assertEqual(os.waitid(os.P_PID, leader, os.WEXITED | os.WNOWAIT).si_status, 0)
                self.assertEqual(os.getpgid(child), leader)
                self.assertTrue(live_process(child))
                with socket.socket() as client:
                    self.assertEqual(client.connect_ex(reserved.getsockname()), errno.ECONNREFUSED)

                fixture.close("cleanup")
                receipt = json.loads((Path(root) / "cleanup.json").read_text())
                self.assertEqual(receipt, {"pid": leader, "port": fixture.port, "exit": 0,
                                           "listenerClosed": True, "processGroupClosed": True, "errors": []})
                self.assertFalse(live_process(child))
                self.assertFalse(Path(f"/proc/{leader}").exists())
            finally:
                fixture.close("fallback-cleanup")

    def test_external_interruption_retains_prior_verdict_and_cleanup(self):
        for signum in (signal.SIGTERM, signal.SIGINT):
            with self.subTest(signal=signum), tempfile.TemporaryDirectory() as root, socket.socket() as reserved:
                reserved.bind(("127.0.0.1", 0))
                command = (
                    "import runpy, sys; "
                    "fixture = runpy.run_path(sys.argv[1]); "
                    "sys.exit(fixture['run_interruption_fixture'](*sys.argv[2:]))"
                )
                with subprocess.Popen(
                    [sys.executable, "-B", "-c", command, __file__, root, str(reserved.getsockname()[1])],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                ) as runner:
                    with selectors.DefaultSelector() as selector:
                        selector.register(runner.stdout, selectors.EVENT_READ)
                        self.assertTrue(selector.select(timeout=5), "Fixture never entered its active case")
                    leader = int(runner.stdout.readline())
                    self.assertTrue(live_process(leader))
                    runner.send_signal(signum)
                    stdout, stderr = runner.communicate(timeout=5)

                self.assertEqual(runner.returncode, 1, stderr)
                results = json.loads((Path(root) / "results.json").read_text())
                self.assertEqual(results, {"registration": {"status": "pass"},
                                           "interruption": {"status": "fail", "signal": signum.name}})
                self.assertEqual(json.loads(stdout), results)
                cleanup = json.loads((Path(root) / "cleanup.json").read_text())
                self.assertEqual(cleanup["pid"], leader)
                self.assertEqual(cleanup["exit"], -signal.SIGTERM)
                self.assertIs(cleanup["listenerClosed"], True)
                self.assertIs(cleanup["processGroupClosed"], True)
                self.assertFalse(Path(f"/proc/{leader}").exists())

    def test_reaped_leader_cannot_authorize_group_signaling(self):
        with tempfile.TemporaryDirectory() as root, socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            listener.listen()
            fixture = InertProbe(Path(root), listener.getsockname()[1])
            fixture.server = subprocess.Popen(
                [sys.executable, "-c", "pass"], start_new_session=True,
            )
            self.assertEqual(fixture.server.wait(timeout=5), 0)
            with patch.object(os, "killpg") as killpg:
                with self.assertRaisesRegex(RuntimeError, "Could not verify ownership"):
                    fixture.close("cleanup")
                killpg.assert_not_called()
            receipt = json.loads((Path(root) / "cleanup.json").read_text())
            self.assertIsNone(receipt["processGroupClosed"])
            self.assertIsNone(receipt["exit"])
            self.assertIs(receipt["listenerClosed"], False)
            with socket.create_connection(listener.getsockname(), timeout=.5):
                pass

    def test_listener_error_is_unknown_with_group_cleanup_confirmed(self):
        with tempfile.TemporaryDirectory() as root:
            fixture = InertProbe(Path(root), 1)
            fixture.start("fixture")
            leader = fixture.server.pid
            try:
                with patch.object(socket.socket, "connect_ex", return_value=errno.ETIMEDOUT):
                    with self.assertRaisesRegex(RuntimeError, "Listener observation inconclusive"):
                        fixture.close("cleanup")
                receipt = json.loads((Path(root) / "cleanup.json").read_text())
                self.assertIsNone(receipt["listenerClosed"])
                self.assertIs(receipt["processGroupClosed"], True)
                self.assertFalse(Path(f"/proc/{leader}").exists())
            finally:
                fixture.close("fallback-cleanup")


if __name__ == "__main__":
    unittest.main()
