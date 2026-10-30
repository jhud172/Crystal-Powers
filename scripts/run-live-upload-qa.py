"""Disposable loopback HTTP attachment acceptance with the actual ClamAV engine.

Requires the prepared portable QA PostgreSQL/ClamAV runtimes. No real account,
provider, credential file, public upload or antivirus exclusion is used.
"""
import argparse
import copy
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import time
import threading
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import unquote, urlsplit
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("recovery_lab", ROOT / "scripts/verify-populated-recovery.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.BASE = "http://127.0.0.1:18084"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--unavailable", action="store_true", help="Keep the dedicated scanner stopped and verify HTTP quarantine")
parser.add_argument("--browser", action="store_true", help="Also exercise the actual reviewer/member browser UI using memory-only synthetic sessions")
options = parser.parse_args()
stamp = time.strftime("%Y%m%d%H%M%S")
args = SimpleNamespace(candidate=ROOT / "build/libs/crystal-power-website-2.0.0.jar",
    source="crystal_rebuild_test_recovery_scanner_" + stamp, target="crystal_restore_scanner_" + stamp,
    run="populated-recovery-scanner-" + stamp,
    pg_bin=Path(os.environ.get("PG_BIN", ROOT / ".codex-runtime/tools/postgresql-17/pgsql/bin")),
    pg_port=55447, app_port=18084)
lab = module.Lab(args)
lab.report["scope"] = "Disposable PostgreSQL/HTTP private attachment acceptance; actual loopback ClamAV or explicitly stopped scanner; synthetic identities; no external providers"
lab.report["scannerUnavailable"] = options.unavailable
lab.report["candidateSha256"] = hashlib.sha256(args.candidate.read_bytes()).hexdigest()
lab.report["workspaceQuotaBytes"] = 2 * len(module.image())
daemon, daemon_log = None, None


def scanner_ready():
    try:
        with socket.create_connection(("127.0.0.1", 13310), timeout=1) as connection:
            connection.sendall(b"zPING\0")
            return connection.recv(100) == b"PONG\0"
    except OSError:
        return False


def multipart(name, content=None):
    boundary = "CrystalScannerAcceptanceBoundary"
    body = ("--" + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="' + name
        + '"\r\nContent-Type: image/png\r\n\r\n').encode() + (module.image() if content is None else content)
    body += ("\r\n--" + boundary + "--\r\n").encode()
    return body, "multipart/form-data; boundary=" + boundary


def upload(http, endpoint, name="synthetic.png", content=None, key=None, expected=200):
    body, content_type = multipart(name, content)
    return http.call("POST", endpoint + "?submissionKey=" + str(key or uuid.uuid4()), body,
        expected=expected, content_type=content_type)


def jar(http):
    jars = [handler.cookiejar for handler in http.opener.handlers if isinstance(handler, module.HTTPCookieProcessor)]
    assert len(jars) == 1
    return jars[0]


def race(http, method, requests):
    """Start two actual mutations together, with independent cookie jars."""
    barrier = threading.Barrier(2)
    def execute(values):
        client = module.Http()
        for cookie in jar(http):
            jar(client).set_cookie(copy.copy(cookie))
        proof = client.call("GET", "/api/admin/auth/csrf")
        path, data, content_type = values
        if not isinstance(data, bytes):
            data = json.dumps(data).encode()
        request = module.Request(module.BASE + path, data=data, method=method,
            headers={proof["headerName"]: proof["token"], "Content-Type": content_type})
        barrier.wait(timeout=15)
        try:
            with client.opener.open(request, timeout=30) as response:
                status, body = response.status, response.read()
        except module.HTTPError as failure:
            status, body = failure.code, failure.read()
        return status, json.loads(body)
    with ThreadPoolExecutor(max_workers=2) as executor:
        pending = [executor.submit(execute, values) for values in requests]
        return [future.result(timeout=45) for future in pending]


try:
    with socket.socket() as probe:
        probe.settimeout(.3)
        if probe.connect_ex(("127.0.0.1", 13310)) == 0:
            raise RuntimeError("Dedicated scanner port is occupied; no existing daemon will be used or stopped.")
    if not options.unavailable:
        runtime = ROOT / ".codex-runtime/tools/clamav/clamav-1.5.4.win.x64"
        configuration = lab.output / "clamd.conf"
        configuration.write_text(
            'DatabaseDirectory "' + (ROOT / ".codex-runtime/qa/clamav-definitions").as_posix() + '"\n'
            'TCPSocket 13310\nTCPAddr 127.0.0.1\nMaxThreads 2\nConcurrentDatabaseReload no\n'
            'StreamMaxLength 20M\nForeground yes\n', encoding="utf-8")
        daemon_log = (lab.output / "owned-clamd.log").open("w", encoding="utf-8")
        daemon = subprocess.Popen([str(runtime / "clamd.exe"), "--config-file=" + str(configuration)],
            stdout=daemon_log, stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        deadline = time.monotonic() + 90
        while not scanner_ready():
            if daemon.poll() is not None or time.monotonic() >= deadline:
                raise RuntimeError("Owned QA scanner did not become ready.")
            time.sleep(.5)
        lab.check("Actual owned loopback ClamAV responds", True)
        with socket.create_connection(("127.0.0.1", 13310), timeout=3) as connection:
            connection.sendall(b"zVERSION\0")
            lab.report["scannerVersion"] = connection.recv(1024).rstrip(b"\0").decode("ascii")
    lab.check("Disposable database identity verified", lab.sql("postgres",
        "SELECT current_user||'|'||host(inet_server_addr())||'|'||inet_server_port();") == "crystal_qa|127.0.0.1|55447")
    lab.sql("postgres", "CREATE DATABASE " + args.source + " OWNER crystal_qa;")
    scanner_config = json.dumps({"app": {"upload-scan": {"enabled": True, "host": "127.0.0.1", "port": 13310},
        "team-upload": {"max-workspace-bytes": lab.report["workspaceQuotaBytes"]}}})
    with patch.dict(os.environ, SPRING_APPLICATION_JSON=scanner_config):
        lab.start(args.candidate, args.source, lab.output / "media", "scanner")
    owner, member = module.Http(), module.Http()
    password = secrets.token_urlsafe(24) + "Aa1!"
    owner.call("POST", "/api/admin/auth/setup", {"token": module.SETUP, "email": "scanner-owner@example.invalid", "password": password})
    secret = owner.call("GET", "/api/admin/auth/enrolment")["secret"]
    owner.call("POST", "/api/admin/auth/verify", {"code": module.totp(secret)})
    owner.call("GET", "/api/team/workspace")
    invitation = owner.call("POST", "/api/team/members", {"email": "scanner-member@example.invalid", "displayName": "Synthetic scanner recipient", "role": "MEMBER"})
    token = unquote(urlsplit(invitation["invitationPath"]).fragment.split("token=", 1)[1])
    member.call("POST", "/api/team/auth/activate", {"token": token, "password": password})
    member.call("POST", "/api/team/auth/login", {"email": "scanner-member@example.invalid", "password": password})
    member_secret = member.call("POST", "/api/team/auth/enrolment")["secret"]
    member.call("POST", "/api/team/auth/verify", {"code": module.totp(member_secret)})
    channel = owner.call("POST", "/api/team/channels", {"name": "scanner-acceptance", "description": "Disposable scanner acceptance", "category": "QA", "audience": "TEAM"})["id"]
    message = owner.call("POST", "/api/team/channels/" + channel + "/messages", {"body": "Synthetic private scanner attachment", "submissionKey": str(uuid.uuid4())})["id"]
    endpoint = f"/api/team/channels/{channel}/messages/{message}/attachments"
    upload(module.Http(), endpoint, expected=401)
    upload(member, endpoint, expected=403)
    lab.check("Anonymous uploads and attaching to another author's message are denied", True)
    submission = uuid.uuid4()
    file = upload(owner, endpoint, key=submission)
    item = endpoint + "/" + file["id"]
    lab.check("New actual HTTP upload remains quarantined", file["scanState"] == "UNSCANNED" and file["reviewState"] == "PENDING")
    lab.check("Configured scanner is reported to its authorised reviewer", owner.call("GET", endpoint)["scannerConfigured"])
    lab.check("Recipient cannot discover unapproved attachment metadata", member.call("GET", endpoint)["files"] == [])
    for http in (owner, member):
        http.call("GET", item + "/download", expected=403)
    module.Http().call("GET", item + "/download", expected=401)
    lab.check("Unscanned bytes are denied to reviewer, recipient and anonymous requests", True)
    member.call("POST", item + "/scan", {"version": file["version"]}, expected=403)
    member.call("PATCH", item + "/review", {"version": file["version"], "state": "APPROVED", "note": "Synthetic review"}, expected=403)
    lab.check("Ordinary member cannot scan or approve", True)
    owner.call("PATCH", item + "/review", {"version": file["version"], "state": "APPROVED", "note": "Synthetic review"}, expected=409)
    lab.check("Human approval cannot bypass scanning", True)
    lab.check("Exact upload retry retains the original attachment", upload(owner, endpoint, key=submission)["id"] == file["id"])
    quota_channel = owner.call("POST", "/api/team/channels", {"name": "scanner-quota", "description": "Cross-channel quota fixture", "category": "QA", "audience": "TEAM"})["id"]
    quota_message = owner.call("POST", "/api/team/channels/" + quota_channel + "/messages", {"body": "Synthetic cross-channel quota", "submissionKey": str(uuid.uuid4())})["id"]
    quota_endpoint = f"/api/team/channels/{quota_channel}/messages/{quota_message}/attachments"
    quota_names = ["quota-a.png", "quota-b.png"]
    quota_keys = [uuid.uuid4(), uuid.uuid4()]
    quota_results = race(owner, "POST", [(quota_endpoint + "?submissionKey=" + str(key), *multipart(name))
        for name, key in zip(quota_names, quota_keys)])
    lab.check("Simultaneous cross-channel uploads cannot overcommit the explicit small workspace quota", sorted(status for status, _ in quota_results) == [200, 409])
    winner = next(body for status, body in quota_results if status == 200)
    loser = next(index for index, (status, _) in enumerate(quota_results) if status == 409)
    owner.call("POST", quota_endpoint + "/" + winner["id"] + "/remove", {"version": winner["version"]})
    retried = upload(owner, quota_endpoint, name=quota_names[loser], key=quota_keys[loser])
    owner.call("POST", quota_endpoint + "/" + retried["id"] + "/remove", {"version": retried["version"]})
    lab.check("Removal frees quota and a previously refused upload key can safely retry", True)
    upload(owner, endpoint, name="different.png", key=submission, expected=409)
    upload(owner, endpoint, name="../unsafe.png", expected=400)
    upload(owner, endpoint, content=b"This is not an image.", expected=400)
    lab.check("Changed retry, unsafe filename and mismatched content are rejected", True)
    oversized = module.image() + b"\0" * (15 * 1024 * 1024 + 1 - len(module.image()))
    upload(owner, endpoint, content=oversized, expected=413)
    del oversized
    lab.check("Actual multipart request rejects a file over 15 MB", True)
    owner.call("POST", item + "/scan", {"version": file["version"] + 1}, expected=409)
    scan_results = race(owner, "POST", [(item + "/scan", {"version": file["version"]}, "application/json")] * 2)
    lab.check("Concurrent scan requests grant only one current lease", sorted(status for status, _ in scan_results) == [200, 409])
    scanned = next(body for status, body in scan_results if status == 200)
    if options.unavailable:
        lab.check("Actual unavailable scanner persists ERROR and PENDING quarantine", scanned["scanState"] == "ERROR" and scanned["reviewState"] == "PENDING")
        owner.call("PATCH", item + "/review", {"version": scanned["version"], "state": "APPROVED", "note": "Synthetic review"}, expected=409)
        for http in (owner, member):
            http.call("GET", item + "/download", expected=403)
        lab.check("Unavailable scanner cannot be overridden into approval or download", True)
    else:
        lab.check("Actual ClamAV clean result persists through HTTP scan lease", scanned["scanState"] == "CLEAN" and scanned["reviewState"] == "PENDING")
        member.call("GET", item + "/download", expected=403)
        lab.check("Clean scan alone does not release bytes to an ordinary member", True)
        owner.call("PATCH", item + "/review", {"version": file["version"], "state": "APPROVED", "note": "Stale review"}, expected=409)
        reviews = race(owner, "PATCH", [(item + "/review", {"version": scanned["version"], "state": "APPROVED", "note": "Synthetic local acceptance only"}, "application/json")] * 2)
        lab.check("Concurrent human reviews cannot overwrite the same saved version", sorted(status for status, _ in reviews) == [200, 409])
        approved = next(body for status, body in reviews if status == 200)
        lab.check("Explicit current human approval releases exactly the original bytes", member.call("GET", item + "/download", binary=True) == module.image())
        lab.check("Recipient discovers only the approved clean attachment", [f["id"] for f in member.call("GET", endpoint)["files"]] == [file["id"]])
        with member.opener.open(module.BASE + item + "/download", timeout=20) as response:
            lab.check("Private download is attachment-only, uncached and sandboxed", response.headers.get("X-Content-Type-Options") == "nosniff" and response.headers.get("Content-Security-Policy") == "sandbox" and "no-store" in response.headers.get("Cache-Control", "") and "attachment" in response.headers.get("Content-Disposition", ""))
        owner.call("POST", item + "/remove", {"version": approved["version"]})
        member.call("GET", item + "/download", expected=404)
        owner.call("GET", item + "/download", expected=404)
        lab.check("Removal revokes existing reviewer and recipient download URLs", True)
        lab.check("Removal clears retained attachment bytes", lab.sql(args.source, "SELECT content IS NULL FROM team_message_attachment WHERE id=" + module.quote(file["id"]) + ";") == "t")
    if options.browser:
        browser_file = file if options.unavailable else upload(owner, endpoint, name="browser.png")
        def cookies(http):
            return [{"name": cookie.name, "value": cookie.value, "url": module.BASE, "httpOnly": True,
                     "secure": cookie.secure, "sameSite": "Lax"} for cookie in jar(http)]
        payload = dict(base=module.BASE, ownerCookies=cookies(owner), memberCookies=cookies(member),
            channel=channel, message=message, id=browser_file["id"], filename=browser_file["filename"],
            digest=hashlib.sha256(module.image()).hexdigest(), output=str(lab.output), unavailable=options.unavailable)
        result = subprocess.run(["node", "scripts/verify-live-upload-browser.cjs"], input=json.dumps(payload),
            text=True, cwd=ROOT)
        if result.returncode:
            raise RuntimeError("Actual upload browser acceptance failed; inspect its sanitised report.")
        lab.report["browserChecks"] = len(json.loads((lab.output / "actual-upload-browser-report.json").read_text())["checks"])
        lab.check("Actual reviewer/member browser attachment acceptance passes", True)
    lab.check("Private scanner acceptance never publishes a public project", module.Http().call("GET", "/api/projects") == [])
    lab.report["result"] = "LIVE_UPLOAD_HTTP_PASS"
    print("LIVE_UPLOAD_HTTP_PASS: " + str(len(lab.report["checks"])) + " checks", flush=True)
except Exception as failure:
    lab.report["failure"] = str(failure)
    raise
finally:
    lab.stop()
    if daemon is not None:
        if daemon.poll() is None:
            daemon.terminate()
        try:
            daemon.wait(timeout=20)
        except subprocess.TimeoutExpired:
            daemon.kill()
            daemon.wait(timeout=10)
    if daemon_log is not None:
        daemon_log.close()
    (lab.output / "report.json").write_text(json.dumps(lab.report, indent=2), encoding="utf-8")
