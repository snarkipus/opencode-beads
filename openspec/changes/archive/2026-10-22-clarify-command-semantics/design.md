# Design

## Context

See proposal.md for motivation. The accepted plan and S1 READY recheck are recorded in Bead `opencode-beads-ghq`; source baseline is e2f1152141ce6ffb3c500e4cb3b3ec9d2bb47859. This packet captures that bounded decision, without reopening planning.

## Goals / Non-Goals

**Goals:** Change the package diagnostic name and six approved descriptions, preserve callback mechanics and remaining descriptions, and align current guidance and regression evidence.

**Non-Goals:** No issue-count status command, alias, config migration, upstream repair, new administration mode/manager, live qualification, canonical spec update, archive or release.

## Decisions

- Replace the diagnostic registration name and callback parameter only. Keeping an old status alias would preserve the demonstrated ambiguity; repurposing it would silently add store reads. Keep payload keys, safe probes and lifecycle unchanged, with only the approved host liveQualification wording correction.
- Keep compact as the semantic issue workflow. Link its existing TROUBLESHOOTING resource for analyze/apply, separate auto/external-AI and dolt/GC authority, and explicit actor. Do not infer an operation from ambiguous approval or stale upstream examples.
- Preserve all other workflow mechanics, 29 stems, 17 supporting links and native user overrides. Use central workflow-not-argv guidance rather than invent native decision/template/workflow commands.
- Exercise real prompt bodies, native registration callbacks and packed callbacks, retaining existing scope, context, unavailable-state and unload assertions. Keep raw RED/GREEN logs in the authorized scratch directory and append evidence directly to the Bead.

## Risks / Trade-offs

- [Opt-in beta command rename] → Document old package-name removal, stats/diagnostics destinations and preservation of user-owned old-name overrides; do not edit configuration.
- [Upstream admin help has stale examples and conflicting recovery wording] → Explain uncertainty without running administration or promising reversibility.
- [Fixtures do not qualify another live host/model] → Reuse accepted exact OpenCode 2.1.1 evidence and retain admission/qualification limits; no new universal or 2.1.2 claim.

## Migration Plan

Source changes are reviewable without publication or activation. Parent reviews source and owns task acceptance, canonical sync/archive and any later separately authorized publication. Implementation task acceptance stays unchecked during this worker pass; execution progress belongs in the Bead.
