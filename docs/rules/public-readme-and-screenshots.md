# Public README and screenshot rules

These rules define the current GitHub project homepage and its durable screenshot assets. They
apply to every Syllab version.

## Root README

The root `README.md` always represents the latest current version and is the GitHub repository
homepage. It remains unversioned while current.

Write it for someone seeing Syllab for the first time. It should explain what Syllab is, why it
exists, its core features, product screenshots, demo or usage, current version, a concise technology
overview, local setup, project status and License / Contribution information when those policies
exist.

Describe the current product only. Do not keep appending the complete content of old versions;
historical public descriptions belong in their versioned README snapshots. The snapshot and archive
procedure is defined in [`product-version-archives.md`](product-version-archives.md).

For this repository, present the complete Chinese introduction first and the English version after
it. Screenshots must show the actual Syllab interface; acceptance-output screenshots or unrelated
application screenshots do not substitute for the product UI.

Whenever a change affects the public description, installation path, feature scope or current
version status, explicitly check whether the root README must be updated in the same change.

## Screenshot collection

Collect README screenshots during development and acceptance as pages and flows reach a
display-ready state. Do not wait until version closeout and rerun the complete product flow solely
to fill README screenshot gaps.

Keep only the display-ready evidence needed to communicate the product:

- core pages;
- important states;
- primary user flows.

Do not create or retain large screenshot sets for ordinary development intermediate states.

Store each released version's README screenshots under
`docs/versions/vX.X.X/images/` and use clear, stable filenames. The current root README may point to
the latest version's assets. At version closeout, reuse the collected images whenever they still
represent the released product; recapture only images that have become outdated. Never overwrite an
older version's screenshot assets when preparing a later release.
