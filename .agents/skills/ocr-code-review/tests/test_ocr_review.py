import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_ROOT / "scripts" / "ocr_review.py"


class OcrReviewCliTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.state = self.root / "state"
        self.repo.mkdir()
        self.git("init")
        self.git("config", "user.email", "review@example.com")
        self.git("config", "user.name", "Review Test")

    def tearDown(self):
        self.temp.cleanup()

    def git(self, *args):
        return subprocess.run(
            ["git", *args],
            cwd=self.repo,
            text=True,
            encoding="utf-8",
            capture_output=True,
            check=True,
        ).stdout.strip()

    def write(self, relative, content):
        path = self.repo / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def commit_all(self, message="fixture"):
        self.git("add", ".")
        self.git("commit", "-m", message)

    def cli(self, *args, expect=0, stdin=None):
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), *map(str, args)],
            cwd=self.repo,
            input=stdin,
            text=True,
            encoding="utf-8",
            capture_output=True,
        )
        self.assertEqual(
            expect,
            proc.returncode,
            msg=f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}",
        )
        stream = proc.stdout if proc.returncode == 0 else proc.stderr
        return json.loads(stream)

    def init_scan(self):
        result = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "scan",
            "--session-id",
            "scan-test",
            "--state-root",
            self.state,
        )
        return Path(result["session_dir"])

    def start_task(self, session, task_id):
        return self.cli("task-start", "--session", session, "--task", task_id)

    def coverage_file(self, name="coverage.json", context_paths=None):
        path = self.root / name
        path.write_text(
            json.dumps(
                {
                    "primary_target_complete": True,
                    "symbols": ["Charge"],
                    "ranges": [],
                    "dimensions": ["correctness"],
                    "skipped": [],
                    "blind_spots": [],
                    "pending_questions": [],
                    "context_paths": context_paths or [],
                }
            ),
            encoding="utf-8",
        )
        return path

    def test_scan_manifest_uses_ocr_primary_target_filters(self):
        self.write("payment.go", "package pay\n\nfunc Charge() error { return nil }\n")
        self.write("payment_test.go", "package pay\n")
        self.write("account.go", "package pay\n")
        self.write("vendor/generated.go", "package vendor\n")
        self.write("logo.png", "not actually an image")
        self.write("client.gen.go", "package pay\n")
        (self.repo / "binary.go").write_bytes(b"package pay\x00binary")
        self.commit_all()

        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        paths = {task["path"] for task in manifest["tasks"].values()}

        self.assertEqual({"account.go", "payment.go"}, paths)
        self.assertTrue(all(task["status"] == "pending" for task in manifest["tasks"].values()))
        self.assertEqual("auto", manifest["scheduling"]["concurrency"])
        session_json = json.loads((session / "session.json").read_text(encoding="utf-8"))
        self.assertIsInstance(session_json["stack_card"], dict)
        self.assertGreaterEqual(session_json["stack_card"]["languages"][".go"], 2)

    def test_project_rule_file_reference_resolves_from_repository_root(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.write("review_rules/go.md", "PROJECT ROOT RULE\n")
        self.write(
            ".opencodereview/rule.json",
            json.dumps(
                {
                    "rules": [
                        {"path": "**/*.go", "rule": "review_rules/go.md"}
                    ]
                }
            ),
        )
        self.commit_all()

        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task = next(task for task in manifest["tasks"].values() if task["path"] == "payment.go")

        self.assertEqual("project", task["rule"]["source"])
        self.assertEqual("**/*.go", task["rule"]["pattern"])

    def test_user_include_is_admission_override_not_whitelist(self):
        self.write("payment.go", "package pay\n")
        self.write("client.gen.go", "package pay\n")
        self.write(
            ".opencodereview/rule.json",
            json.dumps({"include": ["client.gen.go"], "rules": []}),
        )
        self.commit_all()

        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        paths = {task["path"] for task in manifest["tasks"].values()}

        self.assertTrue({"client.gen.go", "payment.go"}.issubset(paths))
        self.assertIn(".opencodereview/rule.json", paths)

    def test_review_task_hash_changes_when_diff_base_changes(self):
        self.write("payment.go", "package pay\nfunc Charge() { oldA() }\n")
        self.commit_all("base-a")
        base_a = self.git("rev-parse", "HEAD")
        self.write("payment.go", "package pay\nfunc Charge() { middleC() }\n")
        self.commit_all("base-c")
        base_c = self.git("rev-parse", "HEAD")
        self.write("payment.go", "package pay\nfunc Charge() { currentB() }\n")
        self.commit_all("head-b")

        first = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "review",
            "--base",
            base_a,
            "--session-id",
            "review-a",
            "--state-root",
            self.state,
        )
        second = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "review",
            "--base",
            base_c,
            "--session-id",
            "review-c",
            "--state-root",
            self.state,
        )
        first_manifest = json.loads(
            (Path(first["session_dir"]) / "manifest.json").read_text(encoding="utf-8")
        )
        second_manifest = json.loads(
            (Path(second["session_dir"]) / "manifest.json").read_text(encoding="utf-8")
        )
        first_hash = next(iter(first_manifest["tasks"].values()))["input_hash"]
        second_hash = next(iter(second_manifest["tasks"].values()))["input_hash"]

        self.assertNotEqual(first_hash, second_hash)

    def test_submit_derives_path_and_lines_from_unique_existing_code(self):
        self.write(
            "payment.go",
            "package pay\n\nfunc Charge() error {\n\tresult, _ := charge()\n\treturn use(result)\n}\n",
        )
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        payload = self.root / "finding.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "扣款错误被忽略",
                    "claim": "charge 返回的错误被丢弃，失败仍继续使用 result",
                    "severity": "high",
                    "category": "bug",
                    "existing_code": "\tresult, _ := charge()\n\treturn use(result)",
                    "expected": "扣款失败时终止并传播错误",
                    "actual": "错误被丢弃后继续处理结果",
                    "impact": "可能把失败扣款当成成功",
                    "evidence": ["charge 的第二个返回值被 `_` 丢弃"],
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        result = self.cli(
            "submit", "--session", session, "--task", task_id, "--input", payload
        )
        finding = json.loads(Path(result["finding_file"]).read_text(encoding="utf-8"))

        self.assertEqual("payment.go", finding["location"]["path"])
        self.assertEqual(4, finding["location"]["start_line"])
        self.assertEqual(5, finding["location"]["end_line"])
        self.assertNotIn("path", finding["model_input"])

    def test_submit_rejects_ambiguous_anchor(self):
        self.write(
            "payment.go",
            "package pay\n\nfunc A() { ignored() }\nfunc B() { ignored() }\n",
        )
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        payload = self.root / "finding.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "ambiguous",
                    "claim": "ignored call",
                    "severity": "medium",
                    "category": "bug",
                    "existing_code": "ignored()",
                    "expected": "handle it",
                    "actual": "ignored",
                    "impact": "unknown result",
                    "evidence": ["direct call"],
                }
            ),
            encoding="utf-8",
        )

        error = self.cli(
            "submit",
            "--session",
            session,
            "--task",
            task_id,
            "--input",
            payload,
            expect=2,
        )

        self.assertEqual("LOCATION_AMBIGUOUS", error["error"])
        self.assertEqual("resubmit_with_larger_existing_code", error["next_action"])

    def test_complete_requires_resolved_verifier_and_records_coverage(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        finding_dir = session / "findings" / task_id
        finding_dir.mkdir(parents=True, exist_ok=True)
        (finding_dir / "f-high.json").write_text(
            json.dumps(
                {
                    "id": "f-high",
                    "task_id": task_id,
                    "severity": "high",
                    "verification": {"required": True, "status": "pending"},
                    "state": "candidate",
                }
            ),
            encoding="utf-8",
        )
        coverage = self.root / "coverage.json"
        coverage.write_text(
            json.dumps(
                {
                    "primary_target_complete": True,
                    "symbols": ["Charge"],
                    "ranges": [],
                    "dimensions": ["correctness"],
                    "skipped": [],
                    "blind_spots": [],
                    "pending_questions": [],
                }
            ),
            encoding="utf-8",
        )

        error = self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            coverage,
            expect=2,
        )
        self.assertEqual("VERIFIER_PENDING", error["error"])

        self.cli(
            "verify",
            "--session",
            session,
            "--finding",
            "f-high",
            "--decision",
            "confirm",
            "--reason",
            "No counter-evidence found",
        )
        done = self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            coverage,
        )
        self.assertEqual("complete", done["status"])

    def test_finalize_never_calls_material_blind_spots_clean(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        coverage = self.root / "coverage.json"
        coverage.write_text(
            json.dumps(
                {
                    "primary_target_complete": True,
                    "symbols": ["Charge"],
                    "ranges": [],
                    "dimensions": ["correctness"],
                    "skipped": [],
                    "blind_spots": [
                        {
                            "area": "external integration",
                            "reason": "credentials unavailable",
                            "scope": "external-integration",
                            "material": False,
                        }
                    ],
                    "pending_questions": [],
                }
            ),
            encoding="utf-8",
        )
        self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            coverage,
        )

        result = self.cli("finalize", "--session", session)
        report = json.loads(Path(result["result_json"]).read_text(encoding="utf-8"))

        self.assertEqual("complete", report["completion_status"])
        self.assertEqual("limited", report["assurance"])
        self.assertFalse(report["clean"])
        self.assertIn("覆盖限制", report["conclusion"])

    def test_invalid_coverage_shape_returns_json_error(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        invalid = self.root / "coverage-list.json"
        invalid.write_text("[]", encoding="utf-8")

        error = self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            invalid,
            expect=2,
        )
        self.assertEqual("INVALID_COVERAGE", error["error"])

    def test_resume_marks_changed_completed_task_stale(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        coverage = self.root / "coverage.json"
        coverage.write_text(
            json.dumps(
                {
                    "primary_target_complete": True,
                    "symbols": ["Charge"],
                    "ranges": [],
                    "dimensions": ["correctness"],
                    "skipped": [],
                    "blind_spots": [],
                    "pending_questions": [],
                }
            ),
            encoding="utf-8",
        )
        self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            coverage,
        )
        self.write("payment.go", "package pay\nfunc Charge() { changed() }\n")

        resumed = self.cli("resume", "--session", session)
        self.assertEqual([task_id], resumed["stale_tasks"])
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual("stale", manifest["tasks"][task_id]["status"])

    def test_resume_marks_task_stale_when_context_dependency_changes(self):
        self.write("payment.go", "package pay\nfunc Charge() { ReadAccount() }\n")
        self.write("account.go", "package pay\nfunc ReadAccount() {}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        payment_task = next(
            task_id for task_id, task in manifest["tasks"].items() if task["path"] == "payment.go"
        )
        self.start_task(session, payment_task)
        coverage = self.root / "coverage-context.json"
        coverage.write_text(
            json.dumps(
                {
                    "primary_target_complete": True,
                    "symbols": ["Charge"],
                    "ranges": [],
                    "dimensions": ["correctness"],
                    "skipped": [],
                    "blind_spots": [],
                    "pending_questions": [],
                    "context_paths": ["account.go"],
                }
            ),
            encoding="utf-8",
        )
        self.cli(
            "complete",
            "--session",
            session,
            "--task",
            payment_task,
            "--coverage",
            coverage,
        )
        self.write("account.go", "package pay\nfunc ReadAccount() { changed() }\n")

        resumed = self.cli("resume", "--session", session)

        self.assertIn(payment_task, resumed["stale_tasks"])
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual("stale", manifest["tasks"][payment_task]["status"])

    def test_finalize_rechecks_task_input_without_explicit_resume(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        coverage = self.root / "coverage-finalize.json"
        coverage.write_text(
            json.dumps(
                {
                    "primary_target_complete": True,
                    "symbols": ["Charge"],
                    "ranges": [],
                    "dimensions": ["correctness"],
                    "skipped": [],
                    "blind_spots": [],
                    "pending_questions": [],
                }
            ),
            encoding="utf-8",
        )
        self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            coverage,
        )
        self.write("payment.go", "package pay\nfunc Charge() { changed() }\n")

        finalized = self.cli("finalize", "--session", session)
        report = json.loads(Path(finalized["result_json"]).read_text(encoding="utf-8"))

        self.assertEqual("partial", report["completion_status"])
        self.assertFalse(report["clean"])
        self.assertIn(task_id, report["stale_tasks"])

    def test_scan_resume_adds_new_tasks_and_marks_deleted_tasks_removed(self):
        self.write("old.go", "package pay\nfunc Old() {}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        old_task = next(iter(manifest["tasks"]))
        (self.repo / "old.go").unlink()
        self.write("new.go", "package pay\nfunc New() {}\n")

        resumed = self.cli("resume", "--session", session)
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))

        self.assertEqual([old_task], resumed["removed_tasks"])
        self.assertEqual(1, len(resumed["added_tasks"]))
        self.assertEqual("removed", manifest["tasks"][old_task]["status"])
        new_task = manifest["tasks"][resumed["added_tasks"][0]]
        self.assertEqual("new.go", new_task["path"])
        self.assertEqual("pending", new_task["status"])

        new_task_id = resumed["added_tasks"][0]
        self.start_task(session, new_task_id)
        self.cli(
            "complete",
            "--session",
            session,
            "--task",
            new_task_id,
            "--coverage",
            self.coverage_file("coverage-new.json"),
        )
        finalized = self.cli("finalize", "--session", session)
        result = json.loads(Path(finalized["result_json"]).read_text(encoding="utf-8"))
        self.assertEqual("complete", result["completion_status"])
        self.assertNotIn(old_task, result["stale_tasks"])

    def test_parallel_task_start_preserves_every_manifest_update(self):
        for index in range(12):
            self.write(f"file{index}.go", f"package pay\nfunc F{index}() {{}}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        processes = [
            subprocess.Popen(
                [
                    sys.executable,
                    str(SCRIPT),
                    "task-start",
                    "--session",
                    str(session),
                    "--task",
                    task_id,
                ],
                cwd=self.repo,
                text=True,
                encoding="utf-8",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            for task_id in manifest["tasks"]
        ]
        outputs = [process.communicate(timeout=20) + (process.returncode,) for process in processes]
        self.assertTrue(all(code == 0 for _stdout, _stderr, code in outputs), outputs)
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        self.assertTrue(all(task["status"] == "running" for task in manifest["tasks"].values()))

    def test_superseded_finding_can_be_resubmitted_for_new_task_revision(self):
        self.write(
            "payment.go",
            "package pay\nfunc Charge() error {\n\tresult, _ := charge()\n\treturn use(result)\n}\n",
        )
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        payload = self.root / "revision-finding.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "扣款错误被忽略",
                    "claim": "charge 错误被忽略",
                    "severity": "high",
                    "category": "bug",
                    "existing_code": "\tresult, _ := charge()\n\treturn use(result)",
                    "expected": "传播错误",
                    "actual": "继续执行",
                    "impact": "状态错误",
                    "evidence": ["错误值被丢弃"],
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        first = self.cli(
            "submit", "--session", session, "--task", task_id, "--input", payload
        )
        self.write(
            "payment.go",
            "package pay\n// revision two\nfunc Charge() error {\n\tresult, _ := charge()\n\treturn use(result)\n}\n",
        )
        self.cli("resume", "--session", session)
        self.start_task(session, task_id)

        invalid = self.cli(
            "verify",
            "--session",
            session,
            "--finding",
            first["finding_id"],
            "--decision",
            "confirm",
            "--reason",
            "late result",
            expect=2,
        )
        self.assertEqual("INVALID_FINDING_STATE", invalid["error"])

        second = self.cli(
            "submit", "--session", session, "--task", task_id, "--input", payload
        )
        self.assertNotEqual(first["finding_id"], second["finding_id"])
        self.assertFalse(second.get("duplicate", False))

    def test_superseded_pending_verifier_does_not_block_new_completion(self):
        self.write("payment.go", "package pay\nfunc Charge() { risky() }\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        finding_dir = session / "findings" / task_id
        finding_dir.mkdir(parents=True, exist_ok=True)
        (finding_dir / "old-pending.json").write_text(
            json.dumps(
                {
                    "id": "old-pending",
                    "task_id": task_id,
                    "state": "candidate",
                    "verification": {"required": True, "status": "pending"},
                }
            ),
            encoding="utf-8",
        )
        self.write("payment.go", "package pay\nfunc Charge() { safe() }\n")
        self.cli("resume", "--session", session)
        self.start_task(session, task_id)

        completed = self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            self.coverage_file("coverage-superseded.json"),
        )
        self.assertEqual("complete", completed["status"])

    def test_submit_is_rejected_after_task_completion(self):
        self.write("payment.go", "package pay\nfunc Charge() { risky() }\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            self.coverage_file("coverage-state.json"),
        )
        payload = self.root / "late-finding.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "late",
                    "claim": "late claim",
                    "severity": "medium",
                    "category": "bug",
                    "existing_code": "risky()",
                    "expected": "safe",
                    "actual": "risky",
                    "impact": "late",
                    "evidence": ["late"],
                }
            ),
            encoding="utf-8",
        )

        error = self.cli(
            "submit",
            "--session",
            session,
            "--task",
            task_id,
            "--input",
            payload,
            expect=2,
        )
        self.assertEqual("INVALID_TASK_STATE", error["error"])

    def test_review_workspace_includes_tracked_and_untracked_current_changes(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.commit_all()
        self.write("payment.go", "package pay\nfunc Charge() { changed() }\n")
        self.write("helper.go", "package pay\nfunc Helper() {}\n")
        self.write("helper_test.go", "package pay\n")

        initialized = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "review",
            "--base",
            "HEAD",
            "--workspace",
            "--session-id",
            "workspace-review",
            "--state-root",
            self.state,
        )
        session = Path(initialized["session_dir"])
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        session_json = json.loads((session / "session.json").read_text(encoding="utf-8"))
        paths = {task["path"] for task in manifest["tasks"].values()}

        self.assertEqual({"helper.go", "payment.go"}, paths)
        self.assertEqual("WORKTREE", session_json["head"])

    def test_project_rule_rejects_absolute_or_missing_reference(self):
        self.write("payment.go", "package pay\n")
        external = self.root / "external-rule.md"
        external.write_text("secret outside rule", encoding="utf-8")
        self.write(
            ".opencodereview/rule.json",
            json.dumps({"rules": [{"path": "**/*.go", "rule": str(external)}]}),
        )
        self.commit_all()

        error = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "scan",
            "--session-id",
            "unsafe-rule",
            "--state-root",
            self.state,
            expect=2,
        )
        self.assertEqual("INVALID_RULE", error["error"])

        self.write(
            ".opencodereview/rule.json",
            json.dumps({"rules": [{"path": "**/*.go", "rule": "missing/rule.md"}]}),
        )
        error = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "scan",
            "--session-id",
            "missing-rule",
            "--state-root",
            self.state,
            expect=2,
        )
        self.assertEqual("INVALID_RULE", error["error"])

    def test_resume_persists_replacement_custom_rule_and_task_metadata(self):
        self.write("payment.go", "package pay\n")
        self.commit_all()
        first_rule = self.root / "first-rule.json"
        second_rule = self.root / "second-rule.json"
        first_rule.write_text(
            json.dumps({"rules": [{"path": "**/*.go", "rule": "FIRST INLINE RULE"}]}),
            encoding="utf-8",
        )
        second_rule.write_text(
            json.dumps({"rules": [{"path": "**/*.go", "rule": "SECOND INLINE RULE"}]}),
            encoding="utf-8",
        )
        initialized = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "scan",
            "--rule",
            first_rule,
            "--session-id",
            "rule-resume",
            "--state-root",
            self.state,
        )
        session = Path(initialized["session_dir"])
        before = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        before_sha = next(iter(before["tasks"].values()))["rule"]["sha256"]

        self.cli("resume", "--session", session, "--rule", second_rule)
        session_json = json.loads((session / "session.json").read_text(encoding="utf-8"))
        after = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task = next(iter(after["tasks"].values()))

        self.assertEqual(str(second_rule.resolve()), session_json["custom_rule_path"])
        self.assertEqual("custom", task["rule"]["source"])
        self.assertNotEqual(before_sha, task["rule"]["sha256"])

    def test_delivery_impact_is_validated_and_published(self):
        self.write("payment.go", "package pay\nfunc Charge() { risky() }\n")
        self.commit_all()
        initialized = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "scan",
            "--profile",
            "production-readiness",
            "--session-id",
            "delivery-impact",
            "--state-root",
            self.state,
        )
        session = Path(initialized["session_dir"])
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        payload = self.root / "delivery-finding.json"
        finding = {
            "title": "fake success",
            "claim": "operation always reports success",
            "severity": "medium",
            "category": "bug",
            "existing_code": "risky()",
            "expected": "propagate failure",
            "actual": "reports success",
            "impact": "misleading production state",
            "evidence": ["failure result is ignored"],
            "delivery_impact": "P1",
        }
        invalid_finding = dict(finding)
        invalid_finding["delivery_impact"] = "P3"
        payload.write_text(json.dumps(invalid_finding), encoding="utf-8")
        error = self.cli(
            "submit",
            "--session",
            session,
            "--task",
            task_id,
            "--input",
            payload,
            expect=2,
        )
        self.assertEqual("INVALID_DELIVERY_IMPACT", error["error"])

        payload.write_text(json.dumps(finding), encoding="utf-8")
        submitted = self.cli(
            "submit", "--session", session, "--task", task_id, "--input", payload
        )
        self.assertEqual("confirmed", submitted["state"])
        self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            self.coverage_file("coverage-delivery.json"),
        )
        finalized = self.cli("finalize", "--session", session)
        result = json.loads(Path(finalized["result_json"]).read_text(encoding="utf-8"))
        self.assertEqual("P1", result["findings"][0]["delivery_impact"])

    def test_anchor_ending_with_newline_does_not_extend_end_line(self):
        self.write("payment.go", "package pay\nfunc Charge() {\n\trisky()\n}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        payload = self.root / "newline-finding.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "risky",
                    "claim": "risky call",
                    "severity": "medium",
                    "category": "bug",
                    "existing_code": "\trisky()\n",
                    "expected": "safe",
                    "actual": "risky",
                    "impact": "failure",
                    "evidence": ["direct call"],
                }
            ),
            encoding="utf-8",
        )

        submitted = self.cli(
            "submit", "--session", session, "--task", task_id, "--input", payload
        )
        stored = json.loads(Path(submitted["finding_file"]).read_text(encoding="utf-8"))
        self.assertEqual(3, stored["location"]["start_line"])
        self.assertEqual(3, stored["location"]["end_line"])

    def test_review_rejects_invented_deletion_evidence_outside_diff(self):
        self.write(
            "payment.go",
            "package pay\nfunc Charge() {\n\tguard()\n\trisky()\n}\n",
        )
        self.commit_all("base")
        base = self.git("rev-parse", "HEAD")
        self.write(
            "payment.go",
            "package pay\nfunc Charge() {\n\tguard()\n\trisky()\n}\n// unrelated change\n",
        )
        self.commit_all("head")
        initialized = self.cli(
            "init",
            "--repo",
            self.repo,
            "--mode",
            "review",
            "--base",
            base,
            "--session-id",
            "invented-deletion",
            "--state-root",
            self.state,
        )
        session = Path(initialized["session_dir"])
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        payload = self.root / "invented-deletion.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "guard removed",
                    "claim": "a required guard was removed",
                    "severity": "medium",
                    "category": "bug",
                    "existing_code": "\trisky()",
                    "expected": "guard remains",
                    "actual": "guard removed",
                    "impact": "unsafe call",
                    "evidence": ["claimed deletion"],
                    "change_kind": "deletion",
                    "change_evidence": "guardWasActuallyDeleted()",
                }
            ),
            encoding="utf-8",
        )

        error = self.cli(
            "submit",
            "--session",
            session,
            "--task",
            task_id,
            "--input",
            payload,
            expect=2,
        )
        self.assertEqual("INVALID_DELETION_EVIDENCE", error["error"])

    def test_review_accepts_verbatim_deleted_hunk_evidence(self):
        self.write(
            "payment.go",
            "package pay\nfunc Charge() {\n\tguard()\n\trisky()\n}\n",
        )
        self.commit_all("base")
        base = self.git("rev-parse", "HEAD")
        self.write("payment.go", "package pay\nfunc Charge() {\n\trisky()\n}\n")
        self.commit_all("head")
        initialized = self.cli(
            "init", "--repo", self.repo, "--mode", "review", "--base", base,
            "--session-id", "real-deletion", "--state-root", self.state,
        )
        session = Path(initialized["session_dir"])
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        payload = self.root / "real-deletion.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "guard removed",
                    "claim": "a required guard was removed",
                    "severity": "medium",
                    "category": "bug",
                    "existing_code": "\trisky()",
                    "expected": "guard remains",
                    "actual": "guard removed",
                    "impact": "unsafe call",
                    "evidence": ["guard call is deleted"],
                    "change_kind": "deletion",
                    "change_evidence": "\tguard()",
                }
            ),
            encoding="utf-8",
        )

        submitted = self.cli(
            "submit", "--session", session, "--task", task_id, "--input", payload
        )
        self.assertEqual("confirmed", submitted["state"])

    def test_review_rejects_partial_line_deletion_evidence(self):
        self.write(
            "payment.go",
            "package pay\nfunc Charge() {\n\tguard()\n\trisky()\n}\n",
        )
        self.commit_all("base")
        base = self.git("rev-parse", "HEAD")
        self.write("payment.go", "package pay\nfunc Charge() {\n\trisky()\n}\n")
        self.commit_all("head")
        initialized = self.cli(
            "init", "--repo", self.repo, "--mode", "review", "--base", base,
            "--session-id", "partial-deletion", "--state-root", self.state,
        )
        session = Path(initialized["session_dir"])
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        payload = self.root / "partial-deletion.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "guard removed",
                    "claim": "a required guard was removed",
                    "severity": "medium",
                    "category": "bug",
                    "existing_code": "\trisky()",
                    "expected": "guard remains",
                    "actual": "guard removed",
                    "impact": "unsafe call",
                    "evidence": ["guard call is deleted"],
                    "change_kind": "deletion",
                    "change_evidence": "g",
                }
            ),
            encoding="utf-8",
        )

        error = self.cli(
            "submit", "--session", session, "--task", task_id, "--input", payload,
            expect=2,
        )
        self.assertEqual("INVALID_DELETION_EVIDENCE", error["error"])

    def test_task_plan_dimensions_must_be_covered_or_explicitly_skipped(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.commit_all()
        session = self.init_scan()
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        plan = self.root / "task-plan.json"
        plan.write_text(
            json.dumps(
                {
                    "dimensions": ["correctness", "authorization"],
                    "signals": [
                        {"name": "auth-boundary", "evidence": "Charge is called after auth middleware"}
                    ],
                }
            ),
            encoding="utf-8",
        )
        planned = self.cli(
            "task-plan", "--session", session, "--task", task_id, "--input", plan
        )
        self.assertEqual(["correctness", "authorization"], planned["dimensions"])
        self.start_task(session, task_id)

        incomplete = self.cli(
            "complete",
            "--session",
            session,
            "--task",
            task_id,
            "--coverage",
            self.coverage_file("coverage-plan-incomplete.json"),
            expect=2,
        )
        self.assertEqual("DIMENSION_COVERAGE_MISSING", incomplete["error"])

        coverage = self.root / "coverage-plan-complete.json"
        coverage.write_text(
            json.dumps(
                {
                    "primary_target_complete": True,
                    "symbols": ["Charge"],
                    "ranges": [],
                    "dimensions": ["correctness"],
                    "skipped": [
                        {"dimension": "authorization", "reason": "No authorization decision in target"}
                    ],
                    "blind_spots": [],
                    "pending_questions": [],
                }
            ),
            encoding="utf-8",
        )
        completed = self.cli(
            "complete", "--session", session, "--task", task_id, "--coverage", coverage
        )
        self.assertEqual("complete", completed["status"])

    def test_argparse_errors_are_json(self):
        error = self.cli("task-start", "--session", self.state, expect=2)
        self.assertEqual("INVALID_ARGUMENTS", error["error"])
        self.assertIn("--task", error["message"])

    def test_coverage_ranges_require_positive_ordered_line_pairs(self):
        self.write("payment.go", "package pay\nfunc Charge() {}\n")
        self.commit_all()
        initialized = self.cli(
            "init", "--repo", self.repo, "--mode", "scan", "--session-id", "range-shape",
            "--state-root", self.state, "--segment-threshold", "1",
        )
        session = Path(initialized["session_dir"])
        manifest = json.loads((session / "manifest.json").read_text(encoding="utf-8"))
        task_id = next(iter(manifest["tasks"]))
        self.start_task(session, task_id)
        coverage = self.root / "coverage-invalid-range.json"
        coverage.write_text(
            json.dumps(
                {
                    "primary_target_complete": True,
                    "symbols": [],
                    "ranges": [None],
                    "dimensions": ["correctness"],
                    "skipped": [],
                    "blind_spots": [],
                    "pending_questions": [],
                }
            ),
            encoding="utf-8",
        )

        error = self.cli(
            "complete", "--session", session, "--task", task_id, "--coverage", coverage,
            expect=2,
        )
        self.assertEqual("INVALID_COVERAGE", error["error"])


if __name__ == "__main__":
    unittest.main()
