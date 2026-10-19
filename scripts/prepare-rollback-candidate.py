"""Backport the reviewed authority/transaction fixes into a previous local QA candidate.

Original JARs remain untouched. Dependencies and migrations must match, and all changed
backend classes must belong to the explicit transaction-hotfix allowlist.
"""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SERVICES = ("BillingDraftService", "BillingEventRecoveryService", "BillingHistoryService",
            "BillingInvoiceStore", "BillingLedgerService", "ClientAccessService",
            "InvitationEmailStore", "OwnerService", "RefundDraftService",
            "SupportModerationService", "SupportRequestService", "TeamAccessService",
            "TeamAttachmentStore", "TeamChannelService", "TeamGroupService",
            "TeamMemberService", "TeamMentionService", "TeamProjectService",
            "TeamRoleProfileService", "TeamSettingsService", "UploadScanStore")
PREFIX = "BOOT-INF/classes/com/crystalpower/website/service/"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def allowed(name):
    return any(name == PREFIX + service + ".class" or name.startswith(PREFIX + service + "$")
               for service in SERVICES)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--previous", type=Path, required=True)
    parser.add_argument("--fixed", type=Path, required=True)
    args = parser.parse_args()
    old, fixed = args.previous.resolve(), args.fixed.resolve()
    if not all(path.is_relative_to(ROOT) and path.is_file() and path.suffix == ".jar" for path in (old, fixed)):
        raise ValueError("Both inputs must be existing local checkout JARs.")
    old_hash, fixed_hash = digest(old), digest(fixed)
    folder = ROOT / ".codex-runtime/qa/candidates"
    folder.mkdir(exist_ok=True)
    output = folder / ("rollback-hotfix-" + old_hash[:12] + "-" + fixed_hash[:12] + ".jar")
    with ZipFile(old) as previous, ZipFile(fixed) as current:
        def inventory(archive, prefix):
            return {name: hashlib.sha256(archive.read(name)).hexdigest()
                    for name in archive.namelist() if name.startswith(prefix)}
        if inventory(previous, "BOOT-INF/lib/") != inventory(current, "BOOT-INF/lib/"):
            raise ValueError("Dependencies changed; automatic local hotfix backport refused.")
        if inventory(previous, "BOOT-INF/classes/db/") != inventory(current, "BOOT-INF/classes/db/"):
            raise ValueError("Migrations changed; automatic local hotfix backport refused.")
        before, after = inventory(previous, "BOOT-INF/classes/com/"), inventory(current, "BOOT-INF/classes/com/")
        if before.keys() != after.keys():
            raise ValueError("Backend class inventory changed; backport refused.")
        changed = [name for name in after if before[name] != after[name]]
        if not changed or not all(allowed(name) for name in changed):
            raise ValueError("Changes extend beyond the reviewed transaction hotfix.")
        required = {PREFIX + service + ".class" for service in SERVICES}
        if not required.issubset(changed):
            raise ValueError("The complete transaction hotfix is missing.")
        with output.open("xb") as handle, ZipFile(handle, "w") as result:
            for entry in previous.infolist():
                result.writestr(entry, current.read(entry.filename) if entry.filename in changed else previous.read(entry.filename))
    with ZipFile(output) as result, ZipFile(old) as previous, ZipFile(fixed) as current:
        for name in result.namelist():
            expected = current if name in changed else previous
            if result.read(name) != expected.read(name):
                raise RuntimeError("Backport verification failed.")
    metadata = {"scope": "Previous local frontend with explicit backend authority/transaction fixes; not an untouched prior release",
                "previousSha256": old_hash, "fixedSha256": fixed_hash, "outputSha256": digest(output),
                "path": str(output.relative_to(ROOT)), "patchedClasses": changed,
                "dependenciesUnchanged": True, "migrationsUnchanged": True}
    output.with_suffix(".json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("LOCAL_ROLLBACK_HOTFIX_PREPARED " + json.dumps(metadata))


if __name__ == "__main__":
    main()
