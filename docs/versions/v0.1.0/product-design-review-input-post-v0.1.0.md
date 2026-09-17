# Syllab — Post-v0.1.0 Product Design Review Input

Status: **PRODUCT REVIEW INPUT · NOT DECIDED**  
Baseline: **v0.1.0 IMPLEMENTED · GATE D PASS**  
Date: 2026-09-17

## 1. Purpose and authority

This document carries product-design questions exposed by the real Gate D run without rewriting the accepted v0.1.0 baseline. It is an input to Product review, not a PRD delta, Decision Log entry, Interaction / IA change, Technical Design change or Coding handoff.

Until Product records a later decision:

- D-001–D-015 remain the implemented v0.1.0 baseline;
- every candidate direction below is `NOT DECIDED`;
- KR-07, KR-08 and E3 remain patch candidates, separate from the product-design questions here;
- no implementation work is authorized by this document.

Evidence authority: `final-acceptance-v0.1.0.md` and `gate-d-consolidated-acceptance.md`.

## 2. Review order

Product should resolve the subjects in this order because later surfaces depend on earlier identity and category decisions:

1. Canonical Assessment identity.
2. Important Rules purpose and boundary.
3. Review and Course Brief information architecture.
4. Scan orchestration, action semantics and navigation.
5. Product mark.

## 3. Canonical Assessment identity

### Observed problem

The same real Assessment can enter Review under multiple names and semantic keys. Relationship is part of candidate identity, so spelling variants become separate possible parents instead of aliases of one Assessment.

### Real evidence

In MA6081, one Important Date candidate produced fifteen `Applies to` controls plus `Course-level`. Those controls represented only three real Assessments; two names did not correspond to any Assessment in the course. The correct parent appeared more than once and was not distinguishable from wrong options.

### User impact

- The user must perform entity resolution rather than confirm course facts.
- Choosing an alias can create a second Brief Assessment for the same real assessment.
- Child facts can be attached to the wrong parent even when the correct real-world Assessment is known elsewhere in the Brief.
- The relationship control becomes less usable as extraction produces more name variants.

### Existing decision affected

D-014 defines Assessment-specific Date / Rule ownership and makes relationship part of candidate identity. That decision remains in force. Product must decide whether a later decision supersedes only its parent-identity mechanism or a wider portion of D-014.

### Candidate direction — `NOT DECIDED`

Resolve candidate parent references to a canonical Assessment identity before Review. Keep source names as aliases/evidence, expose only canonical Assessments as relationship choices, and send genuinely unresolved identity conflicts to a dedicated ambiguity path rather than expanding the button list.

### Product questions

1. What evidence is sufficient to merge two Assessment names automatically?
2. Can a model-proposed Assessment create a new canonical Assessment, or must another source corroborate it?
3. When identity remains ambiguous, should the user select among canonical Assessments, defer the fact, or create a new one?
4. Should canonicalization happen before candidate identity and deduplication are computed?

### Explicit non-goals

- Do not redesign all course taxonomy.
- Do not add a general entity-management screen.
- Do not silently merge ambiguous Assessments.
- Do not modify D-014 before a formal Product decision.

## 4. Important Rules purpose and boundary

### Observed problem

The current Grade-Impact Boundary admits reading instructions, assessment parameters, format specifications and submission mechanics that either belong to an Assessment or do not function as a useful course-level rule category.

### Real evidence

Real candidates included instructions to view course videos, presentation time limits, slide/page limits and Turnitin submission mechanics. These passed or approached the current boundary even when their natural owner was an Assessment rather than the course-level Important Rules section.

### User impact

- Important Rules becomes a catch-all instead of a small set of high-value course conditions.
- Assessment-owned requirements are separated from the Assessment where the student needs them.
- High-impact rules become harder to notice among logistics and format detail.

### Existing decision affected

D-015 defines the v0.1.0 Grade-Impact Boundary. It remains in force. A new Product decision must state whether it narrows the course-level category, changes ownership precedence, or supersedes another specific part of D-015.

### Candidate direction — `NOT DECIDED`

Treat Important Rules as course-level conditions that cannot naturally be owned by one Assessment and whose omission creates a direct, material academic consequence. Keep Assessment parameters, format and submission requirements with their owning Assessment even when they affect marks.

### Product questions

1. Is the category for every grade-impacting condition, or only exceptional course-level conditions a student may otherwise miss?
2. Does Assessment ownership always take precedence over the Important Rules category?
3. Which consequences are direct enough: lost marks, invalid submission, loss of eligibility, mandatory attendance, or disciplinary risk?
4. How should policy boilerplate with a course-specific consequence be handled?

### Explicit non-goals

- Do not reopen the whole PRD.
- Do not remove Important Rules without a replacement product decision.
- Do not make Review a garbage-collection layer for obvious policy boilerplate.
- Do not turn a candidate definition into a prompt or deterministic filter before approval.

## 5. Review and Course Brief information architecture

### Observed problem

Course Brief is the payoff surface but renders complex values as raw JSON, repeats ownership on each row, interleaves dates from different Assessments and does not consolidate semantically identical deadlines. Review opens with a high volume of near-duplicate candidates and asks the user to resolve category, identity, relationship and fact accuracy together.

### Real evidence

- MA6084 Review opened with 29 candidates; roughly half restated facts already confirmed in the Brief.
- Confirmed Assessment values appeared as raw object text.
- Assessment ownership labels repeated on child rows.
- Different Assessment dates appeared under one `Other Important Dates` group.
- One real deadline produced three calendar entries.

### User impact

- The final Brief is difficult to scan and understand.
- Review cost is disproportionate to the value of new information.
- Duplicate or fragmented facts can reach the calendar.
- Users must understand internal data shape and relationship mechanics.

### Existing decision affected

The four-surface model, flat Review categories, Course Brief ownership rules, D-014 and Calendar consumption rules are all relevant. None is changed by this document.

### Candidate direction — `NOT DECIDED`

Make each canonical Assessment a readable Brief unit containing its summary, dates and requirements. Express ownership once through grouping, render typed facts rather than JSON, consolidate event-equivalent dates before Calendar selection, and reduce Review to material confirmations that the system cannot safely resolve.

### Product questions

1. What is the minimum readable Assessment summary?
2. Which facts remain course-level outside Assessment groups?
3. When do multiple source facts represent one calendar event?
4. Which duplicate and relationship decisions must be completed before Review?
5. What uncertainty still deserves explicit user review?

### Explicit non-goals

- Do not treat this as a CSS-only restyle.
- Do not hide unresolved facts or source evidence.
- Do not let AI write directly into the confirmed Brief.
- Do not add new surfaces before the existing four-surface model is reviewed.

## 6. Scan orchestration, action semantics and navigation

### Observed problem

A first scan requires repeated manual continuation through internal stages before reviewable value appears. The action vocabulary contains near-synonyms with materially different consequences. The four-surface strip is a status rail, not navigation, and Active Scan entry priority can prevent a direct return to an existing Brief.

### Real evidence

- A first scan required six user actions before Review.
- The product exposed more than ten variants of Continue, Retry, Restart and Scan again.
- A saved checkpoint displayed `Scan in progress` while no work was running.
- From Scan there was no direct route to the existing Course Brief; the real acceptance run had to re-enter through Saved Courses.
- Choosing the wrong recovery action could discard or replace a checkpoint containing 399 normalized units.

### User impact

- Users must understand implementation stages to make ordinary progress.
- Recovery and paid re-extraction risks are not legible from action labels.
- Existing confirmed value becomes harder to reach while another scan is recoverable.
- The system appears busy when it is actually waiting for a decision.

### Existing decision affected

Entry priority, explicit permission gesture, resumable checkpoints, four primary surfaces, Cancel semantics and Scan again protection are all v0.1.0 baseline behavior. Exact-origin permission must still require an explicit user gesture.

### Candidate direction — `NOT DECIDED`

Automatically advance through safe internal stages, pause only for permissions or meaningful user choices, reduce actions to a small consequence-based vocabulary, distinguish active work from a saved checkpoint, and provide explicit access to the existing Brief while a scan is recoverable.

### Product questions

1. Which stages, if any, deserve manual continuation?
2. Should opening a course with both an old Brief and a recoverable scan default to Brief, Scan, or a combined status choice?
3. What exact promises do Continue, Retry, Restart and Scan again make about checkpoint reuse, cost and preserved facts?
4. Are the four surfaces navigable destinations, workflow states, or both?

### Explicit non-goals

- Do not remove the explicit exact-origin permission gesture.
- Do not add background monitoring or automatic Change Detection.
- Do not weaken checkpoint persistence or old-Brief protection.
- Do not implement KR-08 by redesigning the whole flow before the patch decision.

## 7. Product mark

### Observed problem

The extension has no product mark. Chrome shows a generic puzzle-piece placeholder, while the popup uses a letter `S` tile that carries no product meaning.

### Real evidence

The manifest declares neither extension icons nor an action icon. The popup `.brand-mark` is a typographic initial rather than a designed identity.

### User impact

- Syllab is not identifiable in browser chrome.
- The product has no reusable asset for a README, store listing or future distribution surface.
- The popup and toolbar do not form one recognizable identity family.

### Existing decision affected

The visual system requires flat forms, no gradient, no shadow and accent green. No prior decision defines a logo or icon family.

### Candidate direction — `NOT DECIDED`

Design a one-ink mark with an invertible ground, legible at 16px, supplied as 16/32/48/128 extension assets plus a lighter popup treatment.

### Product questions

1. What idea should the mark represent beyond the initial `S`?
2. Should the popup use the full mark or a lighter related monogram?
3. Which light/dark and store-listing contexts must be validated?

### Explicit non-goals

- Do not start a broader brand redesign.
- Do not introduce gradient, shadow or fine-detail artwork that fails at 16px.
- Do not generate final assets before Product selects a direction.

## 8. Patch candidates kept separate

The following findings do not require a new product model and should be decided in the release-treatment discussion rather than this design review:

- KR-07: Calendar can silently omit a confirmed date when prose `when` shadows a parseable `date`.
- KR-08: `Retry extraction` can appear after successful extraction and rerun a paid request.
- E3: Saved Courses and exported calendar files can fall back to internal Blackboard ids.

E4 and E5 remain engineering robustness findings with no observed user incident. None authorizes implementation until Product chooses the release treatment.

## 9. Required Product outputs

For each design subject, Product must return:

1. A formal decision, not only commentary.
2. The relationship to existing decisions: retained, narrowed or explicitly superseded.
3. Acceptance criteria observable by a user.
4. Explicit exclusions.
5. A narrow Product Alignment Handoff for a later technical-design delta.

Only after those outputs exist should the project create D-016 or later decisions and update the next-version PRD / Interaction / IA.
