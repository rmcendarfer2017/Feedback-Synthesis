---
date: 2026-04-22
source: support-ticket
sentiment: 1
tags: [onboarding, bug, back-button]
---

Ticket #4690 — Multiple reports of form inputs clearing on back navigation.

3 separate users in the same week reported that hitting the browser back button during onboarding clears previously entered data. They have to re-enter name, company, and sometimes billing info.

This appears to be a state management issue — form state is not persisted to session storage. Users who use the in-app back button (step X of Y) are not affected; only those using the browser back button.

Status: filed as bug. Engineering estimate: 1 sprint to fix.
