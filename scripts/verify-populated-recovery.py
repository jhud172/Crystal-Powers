"""Guarded local recovery lab: real HTTP identities/media/business data, synthetic financial snapshots.

Creates fresh databases only on 127.0.0.1 at guarded QA ports 55432 or 55447. Never loads .env or uses real provider credentials.
Passwords and enrolment secrets exist only in process memory; reports contain checks and hashes.
"""
import argparse
import base64
import hashlib
import hmac
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import socket
import struct
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import build_opener, HTTPCookieProcessor, ProxyHandler, Request
import uuid
import zlib

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:8084"
SETUP = "synthetic-populated-recovery-setup-only"
KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="


def canonical(value):
    return str(uuid.UUID(str(value)))


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def totp(secret):
    raw = base64.b32decode(secret + "=" * ((8 - len(secret) % 8) % 8))
    result = hmac.new(raw, struct.pack(">Q", int(time.time()) // 30), hashlib.sha1).digest()
    offset = result[-1] & 15
    return str((struct.unpack(">I", result[offset:offset + 4])[0] & 0x7fffffff) % 1000000).zfill(6)


def image():
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    pixels = (b"\0" + bytes([30, 100, 150]) * 128) * 96
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 128, 96, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b"")


class Http:
    def __init__(self):
        self.opener = build_opener(ProxyHandler({}), HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, method, path, data=None, expected=200, binary=False, content_type=None):
        headers = {}
        if method not in ("GET", "HEAD"):
            proof = self.call("GET", "/api/admin/auth/csrf")
            headers[proof["headerName"]] = proof["token"]
        if data is not None:
            if not isinstance(data, bytes):
                data = json.dumps(data).encode()
                content_type = "application/json"
            headers["Content-Type"] = content_type or "application/octet-stream"
        try:
            with self.opener.open(Request(BASE + path, data=data, headers=headers, method=method), timeout=20) as response:
                status, body = response.status, response.read()
        except HTTPError as failure:
            status, body = failure.code, failure.read()
        if status != expected:
            raise AssertionError(f"Local HTTP {method} {path}: expected {expected}, received {status}")
        return body if binary else json.loads(body) if body else None


class Lab:
    def __init__(self, args):
        self.args, self.process, self.log = args, None, None
        self.output = (ROOT / ".codex-runtime/qa" / args.run).resolve()
        self.output.mkdir(exist_ok=False)
        self.env = dict(os.environ, PGHOST="127.0.0.1", PGPORT=str(args.pg_port), PGUSER="crystal_qa",
                        PGPASSWORD="synthetic-local-fixture-only", PG_BIN=str(args.pg_bin))
        self.env.pop("PGSERVICE", None)
        self.report = {"checks": [], "scope": "Disposable local real HTTP/PG/media recovery; financial/provider states explicitly seeded, no provider calls"}

    def check(self, name, value):
        if not value:
            raise AssertionError(name)
        self.report["checks"].append(name)

    def sql(self, database, statement):
        if database not in ("postgres", self.args.source, self.args.target):
            raise ValueError("SQL target is outside this disposable recovery run.")
        result = subprocess.run([str(self.args.pg_bin / "psql.exe"), "-h", "127.0.0.1", "-p", str(self.args.pg_port),
                                 "-U", "crystal_qa", "-d", database, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"],
                                input=statement, text=True, capture_output=True, env=self.env)
        if result.returncode:
            with (self.output / "sql-errors.log").open("a", encoding="utf-8") as log:
                log.write(result.stderr)
            raise RuntimeError("Disposable SQL failed; inspect the local SQL error log.")
        return result.stdout.strip()

    def script(self, name, *args, database=None):
        environment = dict(self.env, PGDATABASE=database or self.args.source)
        with (self.output / (name.replace(".py", "") + ".log")).open("a", encoding="utf-8") as log:
            result = subprocess.run(["python", str(ROOT / "scripts" / name), *map(str, args)],
                                    cwd=ROOT, env=environment, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            raise RuntimeError(f"Recovery helper failed: {name}")

    def start(self, candidate, database, media, phase):
        self.stop()
        with socket.socket() as probe:
            probe.settimeout(.3)
            if probe.connect_ex(("127.0.0.1", self.args.app_port)) == 0:
                raise RuntimeError(f"Port {self.args.app_port} is occupied; no existing process will be stopped.")
        self.log = (self.output / ("app-" + phase + ".log")).open("w", encoding="utf-8")
        command = ["java", "-Xmx256m", "-jar", str(candidate),
                   "--spring.config.additional-location=file:src/test/resources/application.properties", "--spring.config.import=",
                   "--server.address=127.0.0.1", f"--server.port={self.args.app_port}",
                   f"--spring.datasource.url=jdbc:postgresql://127.0.0.1:{self.args.pg_port}/" + database,
                   "--spring.datasource.username=crystal_qa", "--spring.datasource.password=synthetic-local-fixture-only",
                   "--app.media.directory=" + str(media), "--app.media.provider=local", "--app.public-url=" + BASE,
                   "--app.owner.setup-token=" + SETUP, "--app.security.encryption-key=" + KEY,
                   "--app.mail.provider=disabled", "--app.mail.invitation-enabled=false",
                   "--PRISM_AI_ENABLED=false", "--PRISM_OPENAI_API_KEY=", "--PRISM_PRICING_VERIFIED=false",
                   "--app.billing.enabled=false", "--app.billing.stripe-secret=", "--app.billing.stripe-webhook-secret=", "--app.billing.event-recovery-enabled=false",
                   "--app.billing.invoice-recovery-enabled=false", "--crystal.billing.refunds-enabled=false"]
        self.process = subprocess.Popen(command, cwd=ROOT, stdout=self.log, stderr=subprocess.STDOUT,
                                        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                raise RuntimeError("Owned QA app exited; inspect its phase log.")
            try:
                Http().call("GET", "/api/admin/auth/session")
                print("RECOVERY_APP_READY " + phase, flush=True)
                return
            except (URLError, OSError):
                time.sleep(.3)
        raise RuntimeError("Owned QA app readiness timed out.")

    def stop(self):
        if self.process is not None:
            if self.process.poll() is None:
                self.process.terminate()
                try:
                    self.process.wait(timeout=20)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                    self.process.wait(timeout=10)
            self.process = None
        if self.log is not None:
            self.log.close()
            self.log = None

    def login_owner(self, recovery=None):
        owner = Http()
        owner.call("POST", "/api/admin/auth/login", {"email": self.owner_email, "password": self.password})
        proof = recovery if recovery else totp(self.owner_secret)
        owner.call("POST", "/api/admin/auth/verify", {"code": proof})
        self.check("Restored owner credentials and second factor authenticate", owner.call("GET", "/api/admin/auth/session")["authenticated"])
        return owner

    def wait_period(self):
        if int(time.time()) // 30 <= self.last_step:
            print("RECOVERY_WAIT_NEXT_SYNTHETIC_TOTP_PERIOD", flush=True)
        while int(time.time()) // 30 <= self.last_step:
            time.sleep(.2)

    def seed(self):
        self.password = secrets.token_urlsafe(24) + "Aa1!"
        self.owner_email, self.client_email, self.team_email = "recovery-owner@example.invalid", "recovery-client@example.invalid", "recovery-team@example.invalid"
        owner = Http()
        owner.call("POST", "/api/admin/auth/setup", {"token": SETUP, "email": self.owner_email, "password": self.password})
        self.owner_secret = owner.call("GET", "/api/admin/auth/enrolment")["secret"]
        verified = owner.call("POST", "/api/admin/auth/verify", {"code": totp(self.owner_secret)})
        self.recovery_codes = verified["recoveryCodes"]
        self.owner_id = canonical(verified["principal"]["id"])
        owner.call("GET", "/api/team/workspace")
        self.workspace = canonical(self.sql(self.args.source, "SELECT id FROM team_workspace WHERE owner_id=" + quote(self.owner_id) + ";"))
        created = owner.call("POST", "/api/admin/projects", {"slug": "synthetic-recovery-private", "content": {
            "title": "Synthetic private recovery project", "category": "WEBSITE", "summary": "Synthetic recovery record",
            "overview": "Recovery fixture only", "approach": "Private media round trip", "outcome": "No public claims",
            "liveUrl": "", "technologies": ["Synthetic"], "displayDevice": "laptop", "coverMediaId": None,
            "coverAlt": "Synthetic private image", "gallery": []}})
        self.project, self.content = canonical(created["id"]), created["content"]
        business = owner.call("POST", "/api/team/projects", {"submissionKey": str(uuid.uuid4()),
                              "slug": "synthetic-workflow-contract", "content": {**created["content"], "title": "Synthetic workflow contract project"}})
        self.business_project = canonical(business["id"])
        boundary = "RecoveryFixtureBoundary"
        multipart = ("--" + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="synthetic.png"\r\nContent-Type: image/png\r\n\r\n').encode() + image() + ("\r\n--" + boundary + "--\r\n").encode()
        media = owner.call("POST", "/api/admin/projects/" + self.project + "/media", multipart,
                           content_type="multipart/form-data; boundary=" + boundary)
        self.media = canonical(media["id"])
        self.content["coverMediaId"] = self.media
        self.project_version = owner.call("PUT", "/api/admin/projects/" + self.project, {"expectedVersion": created["version"], "content": self.content})["version"]
        self.media_bytes = owner.call("GET", "/api/admin/media/" + self.media, binary=True)
        self.check("Actual private image upload is sanitised to JPEG", self.media_bytes[:2] == b"\xff\xd8")
        member = owner.call("POST", "/api/team/members", {"email": self.team_email, "displayName": "Synthetic recovery moderator", "role": "MODERATOR"})
        team = Http()
        token = unquote(urlsplit(member["invitationPath"]).fragment.split("token=", 1)[1])
        team.call("POST", "/api/team/auth/activate", {"token": token, "password": self.password})
        team.call("POST", "/api/team/auth/login", {"email": self.team_email, "password": self.password})
        self.team_secret = team.call("POST", "/api/team/auth/enrolment")["secret"]
        team.call("POST", "/api/team/auth/verify", {"code": totp(self.team_secret)})
        self.channel = canonical(owner.call("POST", "/api/team/channels", {"name": "synthetic-recovery", "description": "Private fixture", "category": "Recovery", "audience": "TEAM"})["id"])
        self.message_id = int(team.call("POST", "/api/team/channels/" + self.channel + "/messages", {"body": "Synthetic retained team message", "submissionKey": str(uuid.uuid4())})["id"])
        self.request, self.file, self.refund = map(str, (uuid.uuid4(), uuid.uuid4(), uuid.uuid4()))
        self.file_bytes = b"%PDF-1.4\nSynthetic private recovery fixture\n%%EOF"
        self.sql(self.args.source, "INSERT INTO support_request(id,submission_key,fingerprint,workspace_id,client_name,client_email,intent,subject,source_label,payload,notification_state) VALUES (" +
                 ",".join(map(quote, [self.request, str(uuid.uuid4()), "0" * 64, self.workspace, "Synthetic recovery client", self.client_email, "website", "Synthetic retained request", "RECOVERY FIXTURE", '{"message":"Synthetic private brief"}', "FAILED"])) + ");" +
                 "INSERT INTO support_attachment(id,request_id,filename,content_type,size_bytes,content,review_state,scan_state) VALUES (" +
                 ",".join(map(quote, [self.file, self.request, "synthetic-private.pdf", "application/pdf"])) + "," + str(len(self.file_bytes)) + ",decode(" + quote(self.file_bytes.hex()) + ",'hex'),'APPROVED','CLEAN');")
        invitation = owner.call("POST", "/api/team/support/requests/" + self.request + "/client-access", {"expectedLinked": False, "expectedVersion": None})
        self.client_id = canonical(invitation["id"])
        client = Http()
        client.call("POST", "/api/client/auth/activate", {"token": invitation["invitationToken"], "password": self.password})
        client.call("POST", "/api/client/auth/login", {"email": self.client_email, "password": self.password})
        shared = owner.call("POST", "/api/team/support/requests/" + self.request + "/messages", {"submissionKey": str(uuid.uuid4()), "kind": "CLIENT", "body": "Synthetic retained client update"})
        owner.call("POST", "/api/team/support/requests/" + self.request + "/messages/" + shared["id"] + "/share")
        owner.call("POST", "/api/team/support/requests/" + self.request + "/messages", {"submissionKey": str(uuid.uuid4()), "kind": "INTERNAL", "body": "Synthetic confidential internal note"})
        client.call("POST", "/api/client/projects/" + self.request + "/messages", {"submissionKey": str(uuid.uuid4()), "body": "Synthetic retained client reply"})
        bill = owner.call("POST", "/api/team/support/requests/" + self.request + "/billing", {"submissionKey": str(uuid.uuid4()), "purpose": "MONTHLY", "title": "Synthetic retained support", "amountPence": 2500, "terms": "Explicitly seeded recovery terms; no provider transaction"})
        self.bill = canonical(bill["id"])
        # These are imported synthetic financial snapshots, not a payment/refund execution test.
        self.sql(self.args.source, f"""
INSERT INTO billing_customer(account_id,live_mode,customer_id) VALUES ({quote(self.client_id)},false,'cus_RecoveryFixture');
INSERT INTO billing_intent(bill_id,account_id,live_mode,payment_state,subscription_id,subscription_state,cancel_at_period_end,period_end,accepted_at)
VALUES ({quote(self.bill)},{quote(self.client_id)},false,'PAID','sub_RecoveryFixture','active',true,2000000000,CURRENT_TIMESTAMP);
INSERT INTO billing_provider_payment(payment_id,kind,customer_id,live_mode,state,amount_pence,received_pence,charge_id,captured_pence,refunded_pence,disputed,receipt_url)
VALUES ('pi_RecoveryFixture','PAYMENT_INTENT','cus_RecoveryFixture',false,'succeeded',2500,2500,'ch_RecoveryFixture',2500,100,false,'https://pay.stripe.com/receipts/recovery-fixture');
INSERT INTO billing_payment_link(allocation_reference,bill_id,payment_id,invoice_id,allocated_pence)
VALUES ('RECOVERY_FIXTURE',{quote(self.bill)},'pi_RecoveryFixture','in_RecoveryFixture',2500);
INSERT INTO billing_provider_adjustment(provider_id,payment_id,kind,state,amount_pence) VALUES ('re_RecoveryFixture','pi_RecoveryFixture','REFUND','succeeded',100);
INSERT INTO billing_invoice_sync(invoice_id,bill_id,fingerprint,state,failure_count,retry_after)
VALUES ('in_RecoveryFixture',{quote(self.bill)},'synthetic-recovery','ERROR',3,CURRENT_TIMESTAMP+INTERVAL '1 hour');
INSERT INTO billing_refund_request(id,submission_key,bill_id,payment_id,charge_id,live_mode,amount_pence,reason,note,state,captured_pence,refunded_pence,linked_bills,actor_owner_id,provider_id,provider_state,confirmation_owner_id,confirmed_at,first_submission_at,ledger_reconciled)
VALUES ({quote(self.refund)},{quote(uuid.uuid4())},{quote(self.bill)},'pi_RecoveryFixture','ch_RecoveryFixture',false,100,'requested_by_customer','Synthetic recovery snapshot','SUCCEEDED',2500,0,1,{quote(self.owner_id)},'re_RecoveryFixture','succeeded',{quote(self.owner_id)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,true);
INSERT INTO billing_observation(bill_id,live_mode,category,provider_reference,state,amount_pence,detail,fingerprint)
VALUES ({quote(self.bill)},false,'RECOVERY_FIXTURE','re_RecoveryFixture','succeeded',100,'Synthetic imported snapshot, no real provider operation','{"0"*64}');
INSERT INTO billing_stripe_event(event_id,event_type,object_id,event_created,live_mode,state,attempts,retry_after)
VALUES ('evt_RecoveryFixture','invoice.paid','in_RecoveryFixture',100,false,'PENDING',3,2000000000);
""")
        tracking = owner.call("GET", "/api/team/support/requests/" + self.request + "/overview")["request"]
        owner.call("PATCH", "/api/team/support/requests/" + self.request,
                   {"expectedVersion": tracking["version"], "state": "IN_PROGRESS", "progress": 35,
                    "nextStep": "Review the confirmed scope", "assignedMemberId": None,
                    "projectScope": "Synthetic confirmed scope retained through recovery"})
        self.has_assistant_budget = self.sql(self.args.source, "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='assistant_budget';") == "1"
        if self.has_assistant_budget:
            self.sql(self.args.source, "INSERT INTO assistant_budget(month_key,reserved_pence) VALUES ('2026-10',37);")
        self.last_step = int(time.time()) // 30
        self.check("Populated fixture has real owner/team/client identities and private records", True)
        tables = ["admin_account", "project", "project_media", "team_account", "team_message", "support_request", "support_attachment", "support_message", "client_account", "client_reply", "billing_intent", "billing_provider_payment", "billing_invoice_sync", "billing_refund_request"]
        counts = {table: int(self.sql(self.args.source, f"SELECT count(*) FROM public.{table};")) for table in tables}
        self.check("Every required business fixture collection is populated", all(counts.values()))
        self.report["businessRowsBeforeBackup"] = counts

    def prove(self, phase):
        self.wait_period()
        owner = self.login_owner()
        team = Http()
        team.call("POST", "/api/team/auth/login", {"email": self.team_email, "password": self.password})
        team.call("POST", "/api/team/auth/verify", {"code": totp(self.team_secret)})
        self.check(phase + " decrypts retained team MFA and reads its channel", any(channel["id"] == self.channel for channel in team.call("GET", "/api/team/workspace")["channels"]))
        client = Http()
        client.call("POST", "/api/client/auth/login", {"email": self.client_email, "password": self.password})
        self.prove_workflow_contracts(phase, owner, team, client)
        self.check(phase + " preserves private JPEG bytes", owner.call("GET", "/api/admin/media/" + self.media, binary=True) == self.media_bytes)
        self.check(phase + " preserves client-authorised attachment bytes", client.call("GET", "/api/client/projects/files/" + self.file, binary=True) == self.file_bytes)
        conversation = client.call("GET", "/api/client/projects/" + self.request + "/conversation")
        text = json.dumps(conversation)
        if self.has_assistant_budget:
            self.check(phase + " preserves assistant spend reservations without provider activation",
                       self.sql(self.args.target, "SELECT reserved_pence FROM assistant_budget WHERE month_key='2026-10';") == "37")
        self.check(phase + " preserves confirmed scope through current or previous-candidate writes",
                   self.sql(self.args.target, "SELECT project_scope FROM support_request WHERE id=" + quote(self.request) + ";") == "Synthetic confirmed scope retained through recovery")
        self.check(phase + " retains shared messages and excludes internal notes", "Synthetic retained client update" in text and "Synthetic retained client reply" in text and "Synthetic confidential internal note" not in text)
        bills = client.call("GET", "/api/client/billing/page")["bills"]
        self.check(phase + " retains exact financial and cancellation state", any(row["id"] == self.bill and row["amountPence"] == 2500 and row["paymentState"] == "PAID" and row["cancelAtPeriodEnd"] for row in bills))
        jobs = owner.call("GET", "/api/team/support/requests/" + self.request + "/billing/" + self.bill + "/invoices")["items"]
        self.check(phase + " retains interrupted invoice recovery", any(job["invoiceId"] == "in_RecoveryFixture" and job["state"] == "ERROR" and job["failures"] == 3 for job in jobs))
        records = owner.call("GET", "/api/team/support/requests/" + self.request + "/billing/" + self.bill + "/records")["items"]
        history = owner.call("GET", "/api/team/support/requests/" + self.request + "/billing/" + self.bill + "/history")["items"]
        events = owner.call("GET", "/api/team/billing/events")["events"]
        self.check(phase + " reads retained financial records and pending events through real owner authority", bool(records) and bool(history) and any(event["id"] == "evt_RecoveryFixture" for event in events))
        for endpoint in ("/api/team/unread", "/api/team/groups", "/api/team/mentions", "/api/team/settings", "/api/team/projects/page", "/api/team/uploads/queue"):
            owner.call("GET", endpoint)
        self.check(phase + " supports owner-backed workspace read endpoints", True)
        refunds = owner.call("GET", "/api/team/support/requests/" + self.request + "/billing/" + self.bill + "/refunds")["items"]
        self.check(phase + " retains provider reference and ledger reconciliation", any(row["id"] == self.refund and row["providerId"] == "re_RecoveryFixture" and row["ledgerReconciled"] for row in refunds))
        client.call("GET", "/api/admin/projects", expected=403)
        client.call("GET", "/api/team/workspace", expected=403)
        anonymous = Http()
        anonymous.call("GET", "/api/admin/media/" + self.media, expected=401)
        anonymous.call("GET", "/api/media/" + self.media, expected=404)
        self.check(phase + " keeps synthetic studio content unpublished", "synthetic-recovery-private" not in json.dumps(anonymous.call("GET", "/api/projects")))
        self.check(phase + " retains role separation and draft-media privacy", True)
        posted = team.call("POST", "/api/team/channels/" + self.channel + "/messages", {"submissionKey": str(uuid.uuid4()), "body": "Synthetic post-" + phase + " write"})
        self.check(phase + " can append beyond the restored message sequence", int(posted["id"]) > self.message_id)
        project = owner.call("GET", "/api/admin/projects/" + self.project)
        updated = dict(project["content"], summary="Synthetic " + phase + " revision")
        saved = owner.call("PUT", "/api/admin/projects/" + self.project, {"expectedVersion": project["version"], "content": updated})
        self.check(phase + " retains versioned owner edits and media references", saved["version"] == project["version"] + 1 and saved["content"]["coverMediaId"] == self.media)
        client.call("POST", "/api/client/projects/" + self.request + "/messages", {"submissionKey": str(uuid.uuid4()), "body": "Synthetic " + phase + " client write"})
        self.check(phase + " permits authorised client replies after recovery", "Synthetic " + phase + " client write" in json.dumps(client.call("GET", "/api/client/projects/" + self.request + "/conversation")))
        owner.call("POST", "/api/admin/auth/logout")
        client.call("POST", "/api/client/auth/logout")
        team.call("POST", "/api/team/auth/logout")
        anonymous.call("GET", "/api/admin/projects", expected=401)
        self.check(phase + " supports logout and protected subsequent reads", True)
        self.last_step = int(time.time()) // 30

    def prove_workflow_contracts(self, phase, owner, moderator, client):
        """Exercise final private-UI contracts over real HTTP and persisted state."""
        endpoint = "/api/team/projects/" + self.business_project
        original = owner.call("GET", endpoint)
        presentation = {"featured": original["featured"], "archived": original["archived"],
                        "sortOrder": 17 if original["sortOrder"] != 17 else 18,
                        "expectedUpdatedAt": original["updatedAt"]}
        invalid = dict(presentation, sortOrder=10001)
        owner.call("PATCH", endpoint + "/presentation", invalid, expected=400)
        self.check(phase + " rejects invalid display order without changing the project",
                   owner.call("GET", endpoint)["updatedAt"] == original["updatedAt"])
        saved = owner.call("PATCH", endpoint + "/presentation", presentation)
        owner.call("PATCH", endpoint + "/presentation", dict(presentation, sortOrder=-12), expected=409)
        moderator.call("PATCH", endpoint + "/presentation", dict(presentation, expectedUpdatedAt=saved["updatedAt"]), expected=403)
        self.check(phase + " persists order and rejects stale or unauthorised overwrites",
                   owner.call("GET", endpoint)["sortOrder"] == presentation["sortOrder"])
        Http().call("GET", endpoint, expected=401)
        Http().call("GET", "/api/projects/synthetic-workflow-contract", expected=404)
        self.check(phase + " keeps the business draft private", saved["publishedVersion"] is None)

        request_path = "/api/team/support/requests/" + self.request
        before = owner.call("GET", request_path + "/overview")["request"]
        tracking = {"expectedVersion": before["version"], "state": "IN_PROGRESS", "progress": 45,
                    "nextStep": "Synthetic confirmed mobile review", "assignedMemberId": None}
        owner.call("PATCH", request_path, tracking)
        owner.call("PATCH", request_path, dict(tracking, nextStep="Stale overwrite"), expected=409)
        staff = owner.call("GET", request_path + "/overview")["request"]
        customer = client.call("GET", "/api/client/projects/" + self.request + "/overview")["project"]
        self.check(phase + " exposes the same confirmed progress to staff and linked client",
                   all(staff[key] == customer[key] == tracking[key] for key in ("state", "progress", "nextStep")))
        client.call("GET", "/api/client/projects/" + str(uuid.uuid4()) + "/overview", expected=404)
        self.check(phase + " rejects unrelated client project references", True)

        preferences = client.call("GET", "/api/client/auth/preferences")
        choice = "PORTAL_AND_EMAIL" if preferences["contactPreference"] == "PORTAL_ONLY" else "PORTAL_ONLY"
        changed = client.call("PATCH", "/api/client/auth/preferences",
                              {"version": preferences["version"], "contactPreference": choice})
        client.call("PATCH", "/api/client/auth/preferences",
                    {"version": preferences["version"], "contactPreference": preferences["contactPreference"]}, expected=409)
        self.check(phase + " persists contact preference without accepting stale form saves",
                   changed["version"] == preferences["version"] + 1 and
                   client.call("GET", "/api/client/auth/preferences")["contactPreference"] == choice)

    def run(self):
        identity = self.sql("postgres", "SELECT current_user||'|'||host(inet_server_addr())||'|'||inet_server_port();")
        self.check("Disposable server identity verified", identity == f"crystal_qa|127.0.0.1|{self.args.pg_port}")
        self.sql("postgres", "CREATE DATABASE " + self.args.source + " OWNER crystal_qa;")
        source_media, restored_media = self.output / "source-media", self.output / "restored-media"
        self.start(self.args.candidate, self.args.source, source_media, "seed")
        self.seed()
        self.stop()
        self.check("All source writers stopped before backup", self.sql(self.args.source, "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid();") == "0")
        backup = self.output / "backup"
        self.script("portfolio_backup.py", "backup", backup, "--writes-paused", "--media-directory", source_media)
        self.sql("postgres", "CREATE DATABASE " + self.args.target + " OWNER crystal_qa;")
        self.script("portfolio_backup.py", "restore-local", backup, "--media-directory", restored_media, database=self.args.target)
        self.script("verify-postgres-restore.py", backup, "--target", self.args.target, "--media-directory", restored_media)
        self.script("verify-postgres-isolation.py", database=self.args.target)
        self.check("Populated rows/schema/sequences/media match before resumed writes", True)
        self.start(self.args.candidate, self.args.target, restored_media, "restored-current")
        self.prove("restored-current")
        self.start(self.args.rollback_candidate, self.args.target, restored_media, "previous-candidate")
        self.prove("previous-candidate")
        recovered = self.login_owner(self.recovery_codes[0])
        recovered.call("POST", "/api/admin/auth/logout")
        retry = Http()
        retry.call("POST", "/api/admin/auth/login", {"email": self.owner_email, "password": self.password})
        retry.call("POST", "/api/admin/auth/verify", {"code": self.recovery_codes[0]}, expected=401)
        retry.call("POST", "/api/admin/auth/verify", {"code": self.recovery_codes[1]})
        retry.call("POST", "/api/admin/auth/logout")
        self.check("Restored owner recovery codes remain usable once and reject replay", True)
        self.check("Two distinct local candidates verified", self.args.candidate.read_bytes() != self.args.rollback_candidate.read_bytes())
        self.report["candidateSha256"] = hashlib.sha256(self.args.candidate.read_bytes()).hexdigest()
        self.report["previousCandidateSha256"] = hashlib.sha256(self.args.rollback_candidate.read_bytes()).hexdigest()


def main():
    global BASE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--rollback-candidate", type=Path, required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--run", required=True)
    parser.add_argument("--pg-bin", type=Path, default=Path("C:/Program Files/PostgreSQL/17/bin"))
    parser.add_argument("--pg-port", type=int, choices=(55432, 55447), default=55432)
    parser.add_argument("--app-port", type=int, choices=(8084, 18084), default=8084)
    args = parser.parse_args()
    BASE = f"http://127.0.0.1:{args.app_port}"
    if not re.fullmatch(r"crystal_rebuild_test_recovery_[a-z0-9_]+", args.source):
        raise ValueError("Use a fresh crystal_rebuild_test_recovery_* source on the guarded loopback QA server.")
    if not re.fullmatch(r"crystal_restore_[a-z0-9_]+", args.target):
        raise ValueError("Use a fresh crystal_restore_* target on the guarded loopback QA server.")
    if not re.fullmatch(r"populated-recovery-[a-z0-9-]+", args.run):
        raise ValueError("Use a simple populated-recovery-* evidence directory name.")
    for field in ("candidate", "rollback_candidate"):
        value = getattr(args, field).resolve()
        if not (value.is_relative_to(ROOT) and value.suffix == ".jar" and value.is_file()):
            raise ValueError("Candidate must be an existing JAR inside this checkout.")
        setattr(args, field, value)
    lab = Lab(args)
    try:
        lab.run()
        lab.report["result"] = "POPULATED_RECOVERY_PASS"
    except Exception as failure:
        lab.report["failure"] = str(failure)
        raise
    finally:
        lab.stop()
        (lab.output / "report.json").write_text(json.dumps(lab.report, indent=2), encoding="utf-8")
    print("POPULATED_RECOVERY_PASS: " + str(len(lab.report["checks"])) + " checks", flush=True)


if __name__ == "__main__":
    main()
