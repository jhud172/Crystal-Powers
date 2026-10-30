# Company email setup for Crystal Powers 2.0

## Routing source deployed — 30 October 2026

The reviewed department-routing source/config/tests are included in62f933c, deployed live in Render dep-dbi5kkbm8hqs73aptnsg. Full backend test task passes283tests,0failures/errors/skips. Existing destinations and reply addresses remain the defaults when department overrides are unset. No provider/DNS/new-mailbox/invitation enablement was performed, and no new delivery/receipt test was sent. Mailbox/provider acceptance below remains separate from this code deployment.

## Live Lark setup checkpoint — 25 October 2026

- James completed Lark registration and Cloudflare sign-in, authorised continuing on the free plan, and confirmed that the new organisation has no linked third-party mail to preserve. All provider browser work uses ChatGPT's in-app browser at his request.
- Lark organisation `Crystal Powers` uses `rjpzzlgkgit0.jp.larksuite.com`. The actual dashboard identifies the included plan as Standard F3 with100GB storage and no purchased-seat product entries. No upgrade, paid order or trial was selected. Advertised free-plan capacity is20 users; the live quota screen does not expose an independent member-seat counter.
- Downloaded the original8-record Cloudflare zone before mutation. Added Lark's ownership TXT, its exact SPF policy, MX `mx1.larksuite.com` priority1, `mx2` priority5 and `mx3` priority10, provider-issued2048-bit DKIM at `lark2610251155._domainkey`, and DMARC `p=none` with aggregate reports to `james@crystal-powers.com`; each added record has600-second TTL. Original website CNAMEs, sending-service CNAMEs, Resend DKIM and verification records remain. Lark reports domain Enabled and DKIM On; public1.1.1.1 queries return the MX and DMARC records.
- `james@crystal-powers.com` is assigned to the founder's existing active member and is accessible through the actual Lark webmail session. Gmail-to-Lark test `CP-20261025-01` arrived. Lark-to-Gmail test `CP-20261025-02` arrived with SPF, DKIM and DMARC all passing. **Gmail classified this first outgoing test as Spam**; authentication success is not an inbox-placement guarantee. Existing sign-in/recovery identities were not deliberately reset or migrated.
- `hello@crystal-powers.com` exists as a separate member mailbox; Lark currently lists it as Inactive pending first sign-in. `support@crystal-powers.com` is prepared in the member form and awaits the owner's password entry and submission. Lark requires a password when the work address equals its hosted business address. Browser credential handoff rules reserve new-password entry and submission for the user; do not generate, read, log, reuse or submit passwords on the owner's behalf.
- Created `studio`, `notifications`, `postmaster` and `abuse` as monitored hosted aliases on the existing founder mailbox. These are supplementary sender/mail-operations identities, not substitutes for the separate support/admin/sales team accounts. Do not create duplicate member mailboxes with those four addresses. Info/contact and accounts/invoices aliases remain pending on their intended hello/billing mailboxes. Distinct Gmail-to-alias tests `CP-20261025-04` through07 all arrived in the actual refreshed Lark inbox. A folder switch initially displayed cached data; a full mail-page refresh confirmed all four receipts. This does not confirm the separately pending Resend notification.
- Prepared a local, ignored copy of Lark's official XLSX new-member template for `admin`, `sales`, `billing`, `projects`, `careers`, `partnerships`, `privacy` and `security`. Password cells H3:H10 are intentionally blank and highlighted. Work and business addresses match; the optional login-method column is blank and its comment requires confirming business-email login in Lark's import review. The owner must fill passwords locally and upload/submit the workbook directly using **Batch import new members**, not the existing-member edit mode. No bulk import has been attempted or accepted; its final validation and account creation remain pending. Do not reopen the password-completed workbook in agent tools. Support is excluded because its separate form is already prepared; hello and the existing founder are excluded to prevent duplicates. The final eight-row workbook supersedes the earlier ten-row blank workbook, which must not be imported because studio/notifications are now aliases. The attempted existing-member export did not produce a confirmed download; do not infer a successful export or imported account from it.
- Verified the existing Render service and its non-secret mail settings: `MAIL_PROVIDER=resend`, `APP_MAIL_FROM=studio@crystal-powers.com`, previous `APP_MAIL_TO=jhud172@gmail.com`. Changed only `APP_MAIL_TO` and newly added `APP_MAIL_REPLY_TO` to `james@crystal-powers.com`. Preserved the existing sender and all secret values. Save and deploy reused existing build `fd9c5ef`; deployment `dep-dbev13t9fdbs73afjecg` became live at12:06:27UTC. The existing website hosting plan is unchanged; there is no new email subscription.
- The department-routing source changes and their283 passing tests remain local/uncommitted and are **not yet deployed**. Department-specific environment variables are not activated until their receiving inboxes and access are verified. Current production enquiries therefore use the verified founder address. Live website test `CP-20261025-03` saved request `6b957418-c471-4e12-8993-c53f813b2c71` and returned the existing saved-and-notified success state. Resend's real record `01a172f6-c2a8-765a-b638-1b4d03b8a197` confirms the destination, existing studio sender, escaped message and visitor Reply-To. Its latest observed status is Sent, without a Delivered/bounce event, and Lark's corresponding subject search returned no matching receiving log. This is provider acceptance, **not confirmed inbox receipt**. Do not resend the same request merely to obtain a green check.

Private operational evidence and the DNS rollback export are under ignored `.codex-runtime/qa/company-email/`. The final blank-password provisioning workbook is under ignored `.codex-runtime/security/company-email-team-inboxes.xlsx`. No password belongs in this document or Git. The source-preparation notes below are historical where superseded by this checkpoint. Full team provisioning, first sign-ins, remaining aliases, final department deployment and application-notification receipt remain incomplete.

## Current setup request — 25 October 2026

James requested company email on the existing `crystal-powers.com` domain, selected separate team inboxes with their own sign-ins, and confirmed **free only**. Do not start a paid subscription or a trial that later requires payment. Public DNS inspection on this date found Cloudflare nameservers (`irena`/`phil`), no apex incoming MX record and no `_dmarc` TXT record. The deployment guide records existing Resend sending-domain verification; this is not proof of mailbox hosting, and the Resend provider state has not been refreshed in this session. Preserve existing sending-domain records, including any subdomain SPF/DKIM records.

James explicitly rejected forwarding to Gmail/Outlook: real hosted company inboxes remain required. Zoho's UK browser session offers paid plans and trial signup, with no visible free signup route. Its official [subscription guide](https://www.zoho.com/mail/help/adminconsole/subscription.html) limits the five-user free plan to selected data centres.

Further research identified **Lark Starter** as a candidate meeting the free hosted-domain requirement. Its official [email comparison](https://www.larksuite.com/compare/gmail-vs-lark-mail) advertises free custom-domain email for up to20 users. The actual [signup page](https://www.larksuite.com/global/register), opened in the user's browser, displays Free plan, No credit card required, up to20 users, business email and100GB storage. This is plan/signup evidence, not account eligibility, a created mailbox or delivery acceptance. Signup requires acceptance of Customer Terms, User Terms and Privacy Policy, plus the user's authentication/verification. The user must complete that secure onboarding; no registration details or agreement have been submitted by the agent. Cloudflare is also signed out and requires the user's secure sign-in.

Use Lark's own hosted-mail mode, not its integration with an existing third-party mailbox. Core addresses requiring independent sign-ins must be configured as member mailboxes with the correct login method; Lark public/shared mailboxes and aliases do not themselves prove independent credentials. Domain verification and receiving/DKIM records must come from the actual account. Preserve the website's existing Resend sender setup. Confirm the live Starter limits before provisioning the full directory, keep named administrator access separate from department inbox access, and verify real sending/receipt before changing application destinations. No paid plan or trial is authorised.

The directory below is the target plan; use the live checkpoint above for the actual creation and verification state. Do not publish an unverified address or activate an unverified receiving destination. The legal/trading identity, retention and included support terms remain unresolved.

### Address directory

All local parts below use `@crystal-powers.com`. James initially owns each inbox; access can later be delegated to the relevant named staff. Do not share one team password between staff. Provider administrators should use named MFA-protected accounts; an `admin` inbox does not itself need organisation-administrator permissions.

| Address | Purpose | Provisioning stage |
| --- | --- | --- |
| `james` | Founder correspondence and named mailbox owner | Core separate inbox |
| `hello` | General enquiries and main company contact | Core separate inbox |
| `support` | Existing-client issues and replies | Core separate inbox |
| `admin` | Account invitations, operational administration and supplier notices | Core separate inbox |
| `sales` | Website, app and bespoke-system enquiries | Core separate inbox |
| `billing` | Invoices, payment queries and accounts | Separate inbox when plan/budget allows |
| `projects` | Project delivery and coordination | Future separate inbox |
| `careers` | Recruitment enquiries | Future separate inbox |
| `partnerships` | Business partnerships | Future separate inbox |
| `privacy` | Privacy requests, restricted to authorised handlers | Restricted inbox when owner/process is agreed |
| `security` | Vulnerability reports, restricted to authorised handlers | Restricted inbox when owner/process is agreed |
| `notifications` | Automated sending identity with monitored replies | Sender identity; replies to support/admin |
| `info`, `contact` | Familiar alternatives for general enquiries | Optional aliases of hello |
| `accounts`, `invoices` | Familiar billing alternatives | Optional aliases of billing |
| `postmaster`, `abuse` | Mail operations and abuse reports | Provider-supported role addresses routed to admin |

Aliases above are supplementary addresses, not separate sign-ins. Core team addresses must be genuine separate inboxes to match James's selection. Future inboxes should be added when their handlers exist and the selected plan allows them, rather than purchasing unused seats. Do not enable a catch-all by default. Do not forward private security/privacy messages to wider teams automatically.

### Application integration

The existing single verified sending identity (`APP_MAIL_FROM`) remains shared by application email. Department-specific Reply-To addresses route human replies without adding provider credentials per team. Resend remains application transport; the mailbox host handles receiving and staff correspondence.

After the real inboxes are verified, apply these non-secret settings to the existing Render service:

```dotenv
APP_MAIL_TO=admin@crystal-powers.com
APP_MAIL_GENERAL_TO=hello@crystal-powers.com
APP_MAIL_SALES_TO=sales@crystal-powers.com
APP_MAIL_SUPPORT_TO=support@crystal-powers.com
APP_MAIL_REPLY_TO=hello@crystal-powers.com
APP_MAIL_SUPPORT_REPLY_TO=support@crystal-powers.com
APP_MAIL_ADMIN_REPLY_TO=admin@crystal-powers.com
```

Retain the verified `APP_MAIL_FROM` until the provider confirms any proposed replacement such as `notifications@crystal-powers.com`. Retain `MAIL_PROVIDER` and its secret credential. Do not enable invitation delivery simply to test routing.

Support enquiries route to support; website/app/system enquiries route to sales; general enquiries route to hello. Empty department destinations fall back to `APP_MAIL_TO`, so existing installations keep their previous destination. Omitted Reply-To overrides inherit `APP_MAIL_REPLY_TO`; explicitly blank overrides suppress Reply-To. Visitor enquiry notifications retain the visitor's email as Reply-To. Request saving, attachment handling and idempotency keys are unchanged. Owner recovery still targets the stored owner's address; mailbox creation does not change login/recovery identities.

Incoming mail to these inboxes appears in the mailbox provider, **not automatically in the website's Support Inbox**. Two-way ingestion/thread matching requires a separate provider-specific integration and verification; this change does not claim to implement it. Billing/project emails are not generated merely because those addresses exist.

### Provider activation and acceptance

1. Select the receiving provider/region and approve any subscription total. Complete provider sign-up, password entry and MFA through the user's own secure flow.
2. Verify domain ownership using the provider-issued record. Provision the selected inboxes and named owners; document actual access and storage limits.
3. Inspect Cloudflare's current zone. Add only provider-issued receiving MX and verification/DKIM records. Preserve website and Resend records. There must not be competing SPF policies at the same DNS name; reconcile the selected provider's instructions with the existing records. Use provider-issued DKIM selectors, never invented values.
4. Establish DMARC reporting only after the reporting address exists. Start with monitoring and assess alignment before enforcing quarantine/reject. Record the actual policy and domain alignment results.
5. Confirm DNS from public resolvers and send authorised tests to each core inbox. Confirm actual receipt, replies and sender authentication headers; provider acceptance alone is insufficient. Test aliases and denied access to restricted inboxes.
6. Apply the department settings only after receipt succeeds. Deploy the tested routing changes, then verify support/general/project submissions and their existing saved references using James's test details. Confirm replies reach the correct team and failure recovery retains the saved request. No real customer data is needed.
7. Update public contact links and legal/privacy copy only with confirmed operating facts. Migrate business-service notification recipients individually after confirming the new inbox, keeping recovery access available.

Source preparation and test results are recorded in the session handover. Mailbox creation, DNS changes, secure sign-ins, provider spending, production settings/deployment and actual receipt remain uncompleted until verified explicitly.

## Earlier implementation record

James confirmed16October2026 that the legal/trading identity, public company email/domain, retention and included support terms were undecided. Existing Resend/SMTP transports and enquiry contracts remain intact. Do not substitute an invented address or claim that a mailbox, DNS record or invitation delivery is live.

## Setup and acceptance checklist

- [ ] Decide the company domain, real public contact address, mailbox provider, named mailbox owners and shared support access.
- [ ] Create the real mailboxes/aliases and secure administrator accounts with MFA; configure a shared support mailbox without sharing personal passwords.
- [ ] Authorise the actual sender domain with the selected delivery provider. Configure the provider-issued SPF/DKIM records and an appropriate DMARC policy through the domain owner; check existing DNS before changing it.
- [ ] Set production `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `APP_MAIL_FROM` and `APP_MAIL_TO`, or explicitly choose SMTP with `MAIL_PROVIDER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` and TLS/auth options. Store secrets only in deployment settings. `.env.example` is a blank contract; the app does not automatically load `.env`.
- [ ] Configure staff invitation and support-reply templates through the authorised transport. Derive activation URLs from the trusted HTTPS `PUBLIC_URL`; never use a visitor-controlled host or log invitation tokens.
- [ ] Record sender/reply-to handling, bounce/failure behaviour, safe retries, customer-visible delivery status and restricted support access. An internal saved reply is not the same as a delivered email.
- [ ] Complete the privacy/operator/retention/deletion details before public policy/contact publication.
- [ ] After implementation, verify staging delivery and reply routing using an authorised test mailbox, plus provider outage and retry cases. Do not send real customer messages as tests.

Company email setup includes both staff mailbox operations and application delivery. Changing SMTP/Resend settings alone does not create a company mailbox. The local profile disables outgoing mail; production delivery and DNS/provider acceptance require actual supplied details. No provider/DNS/mailbox mutation or outbound message occurred while preparing this file.


### Private invitation delivery backend and activation lock order — source only

Source review found team activation locked invitation then account, while admin replacement/reset locks account then invitation updates. Team activation now first looks up the invitation, locks its actual account, then locks/rechecks the still-live invitation, its account/state and expiry before activation. This aligns activation with replacement and cancellation; concurrency behaviour still requires final verification. Client activation already locks/rechecks its own account/invitation and retains that contract.

V60 adds email claim/state/nonce/timestamps to existing protected team/client invitation tables, with no plaintext token persistence or new data table. InvitationEmailRepository/Store/Service and TeamInvitationEmailController support private status and explicit send operations. Tokens appear only in JSON bodies/server transient mail content, never query/path parameters or stored mail records. Live account state/credential revision, workspace, invitation hash/account/expiry and current member/client permissions are checked under workspace/account/invitation locks. Client flow requires a currently linked support request and READ_SUPPORT/MANAGE_CLIENTS; staff flow requires MANAGE_MEMBERS and prevents sending activation for grants beyond the actor's current effective permissions. Recipients come only from the stored account, never browser fields.

A committed unique invitation claim precedes provider IO. NOT_SENT can claim once; RUNNING/ACCEPTED/UNKNOWN never initiate another provider call for that invitation. Interrupted RUNNING claims become UNKNOWN after five minutes; matching late responses can still record provider acceptance. Real actor audit accompanies claims/outcomes. Accepted means the configured provider accepted the message, not delivery to an inbox or account activation. Failed/uncertain results retain UNKNOWN and require status review or a deliberate replacement invitation rather than blind resends. Replacement/activation during IO can invalidate a previously claimed email's link; this does not undo actual delivery or restore the old invitation.

INVITATION_EMAIL_ENABLED is false by default and was not enabled. A configured existing mail transport and operator-specified HTTPS root PUBLIC_URL are required. Links use that trusted origin and the existing private fragment-token activation routes, escaped server-authored HTML and no attachments. Company mailbox/DNS creation, credentials and real recipient delivery are external setup, still unresolved. Account-screen recipient review/send/status controls remain to implement. Existing transport body-timeout behaviour also needs source/runtime review before final delivery acceptance.

Whitespace/source contract inspection passed. No Java build/tests/migration/email/provider/account operation ran. Full checks remain deferred: matching/foreign/replaced/expired/used invitation tokens, revision/state/root/custom-role/grant boundaries, simultaneous activation/replacement/cancel/send, one-claim/multi-instance/uncertain/late-result/revocation races, provider failure and complete body deadlines, correct stored recipient/origin/escaping/no-secret-log handling, protected schema/backup restore and UI all-width/focus/retry acceptance. No HUB/email/release item was accepted.


### Invitation recipient-review controls and HTTPS response deadline — source only

InvitationEmail is now reused by TeamMembers and ClientAccess for the exact current invitation/account revision. It performs explicit status-only reads with tokens in request bodies, aborts stale status reads, verifies the stored recipient/status/expiry, reports provider acceptance separately from inbox delivery/activation and requires a fresh unchecked recipient-confirmation checkbox before one send. No automatic send or retry occurs. Unconfirmed sends clear the optimistic status and require refresh; RUNNING/UNKNOWN/ACCEPTED states cannot trigger another send for that invitation. The server status view exposes only availability and operator-safe explanation, so disabled/unconfigured/origin-invalid delivery presents no active send control. INVITATION_EMAIL_ENABLED remains false; no settings were enabled by tooling.

Team invitation snapshots now retain the issued member identity/revision for status/send checks. TeamMembers aggregates new-member, invitation, role-profile and delivery dirty/busy guards, and disables creation during account/delivery work. ClientAccess includes delivery busy state in its existing parent guards. Tokens remain transient private-link UI values, never browser storage or reauthentication drafts. Hidden links cannot be closed mid-send through those controls.

EmailTransport HTTPS response parsing now shares the original 15-second monotonic deadline through response-body reads, closes the stream at the remaining deadline using a bounded daemon timer, enforces an 8 KiB receipt cap and checks a textual non-empty provider receipt ID. Timer/stream cleanup is explicit on success/failure. Existing SMTP phase timeouts and provider endpoint/from/reply-to/attachment contracts remain. This is source implementation; blocking-stream cancellation/timer behaviour needs final runtime verification.

Changed TSX syntax and whitespace inspection passed. No Java/frontend build, migration, actual HTTP/provider/SMTP/email/account/browser action or tests ran. Final acceptance includes source compiled contracts, stalled/slow/truncated/oversized/malformed provider receipts, timer/stream cleanup, private account recipient/version/invitation/permission races, disabled settings/origin, checkbox reset, uncertain/status recovery, role-profile/new-member dirty/busy switching, client invitation replacement and all widths/themes/focus/keyboard. Mailbox/DNS/provider facts and real authorised delivery remain external release gates. No audit checkbox was accepted.

## Support reply delivery checkpoint — 16 October 2026

Saved replies, private portal sharing and sending email remain separate actions. Support email claims now have private UUID attempt tokens (V61); only the current unexpired attempt can record accepted/unconfirmed status. Late results cannot overwrite replacement attempts. A result for an already dispatched action can be audited after role revocation, but its response requires current request access. Stored recipient and server-escaped content are used; tokens are not returned in staff message JSON.

FAILED means the provider outcome was not confirmed, not proof that no email arrived. The UI requires staff to check recipient/provider records before deliberately retrying; fresh in-progress attempts cannot retry, and interrupted attempts can be offered after15 minutes. Transport idempotency is not an exactly-once delivery guarantee. No real recipient was contacted.90-test H2/PostgreSQL suites and48 labelled support UI fixture checks pass; real mailbox/DNS/provider delivery, uncertain SMTP/provider recovery, V61 backup/old-writer acceptance and operating facts remain unresolved.

## Enquiry notification recovery — 16 October 2026

V62 gives each public enquiry notification a private attempt token. Stale/reclaimed/expired callbacks cannot overwrite a newer result; unconfirmed outcomes keep the saved request/reference. Identical retries preserve provider identity and do not duplicate requests/files.95-test H2/PostgreSQL suites pass, with deterministic mocked notification callbacks and actual disabled-mail HTTP receipt/recovery checks. Matched V62 token/data/media restoration passes locally. Real mailbox/DNS/provider/bounce/SMTP uncertainty and old-writer acceptance remain open; these checks sent no actual email.
