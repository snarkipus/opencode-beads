import json
from pathlib import Path
import runpy
import unittest


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


if __name__ == "__main__":
    unittest.main()
