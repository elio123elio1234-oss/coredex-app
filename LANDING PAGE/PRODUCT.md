# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: **seed-stage investors** (angels, early-stage VCs, medtech funds, programme
managers) meeting CYPHIX for the first time, usually from a link in an intro e-mail,
a one-pager or a pitch deck. Their job on this page: decide in under a minute whether
the company is worth a meeting, then ask for the deck.

Clinicians and patients are not this page's audience (confirmed 2026-10-19). The
product apps (web + phone) serve them separately.

## Product Purpose

CYPHIX is a wearable **6-lead ECG acquisition system**: a module on the strap of the
watch a person already wears captures clinically relevant cardiac signals when
symptoms occur and transmits them directly to the clinician, without adhesive patches,
wires or professional setup.

Success for this page: an investor understands the product and its stage, believes
the mechanism is real, and submits the contact form.

## Positioning

Today a patient gets *wearable ease* (a single-lead smartwatch) **or** *clinical depth*
(patches, Holter, 12-lead in a clinic). CYPHIX delivers both, on the watch people
already wear — "the crowded market is our installed base". Tagline: **Clinical Depth.
Wearable Ease.**

## Operating Context

- The page is opened cold from a link, on a laptop or a phone, often between meetings.
- It sits beside the PDF one-pager and the pitch deck and must read as the same company.
- The primary action is the existing "Request access" form, re-labelled for
  investors: it posts a lead to the CYPHIX API (`POST /api/v1/leads`, `source:
  "landing"`), the server e-mails the team. Bot protection (Turnstile) appears only
  when the server's policy names a provider.

## Capabilities and Constraints

- **Acquisition, never interpretation.** CYPHIX records and displays ECG data; it does
  not interpret, diagnose or "detect" conditions. No copy may claim AI diagnosis,
  arrhythmia detection or any clinical verdict.
- 6-lead = the limb leads I, II, III, aVR, aVL, aVF.
- Stage: working prototype; technological & algorithmic proof of feasibility; patent
  pending on the core technology; Israel Innovation Authority · Tnufa programme.
  Next step: a wearable strap ready for its first trial.
- Product renderings are concept renderings (electrodes shown in coral) and must be
  labelled as such. The device is in development and not for sale.
- Language: English first. A Hebrew/RTL version was planned in LAUNCH_PLAN (L4) and is
  still open.
- Stack: existing Vite + React + TypeScript SPA in this folder, deployed to Vercel by
  the user (`vercel --prod` is the user's call).

## Brand Commitments

- Name: **CYPHIX** (wordmark in `src/components/Logo.tsx`, mirrors `@cyphix/shared`
  `brand/wordmark.ts`). The user allows the wordmark in red on this page.
- The PDF one-pager (`Cyphix-One-Pager-phone-test-3.pdf`, 2026-10) is the binding visual
  reference: the user asked for the page to be "minimalistic as in my one-pager".
- Voice: calm, precise, clinical-grade, confident; short declarative sentences.

## Evidence on Hand

Public (all confirmed for the website on 2026-10-19):
- Seed ask **$1.9M**. TAM **$4.53B** global mobile ECG market; SAM **$2.76B** home
  healthcare segment.
- "1 in 3 deaths worldwide is cardiovascular."
- Patent pending on the core technology; Israel Innovation Authority · Tnufa.
- Team: **Elio El Hassrouny**, Founder & CEO, ex-Samsung R&D; **Dr. Tamir Wolf, MD**,
  External Clinical Advisor. Portraits from the one-pager.
- Contact: elio123elio1234@gmail.com · +972 54-398-9698 · Kiryat Ono, Israel.
- Assets: two concept renders (module side, watch-face side), the phone app's
  "Limb Leads" screen, both portraits (all extracted from the one-pager PDF).

Absent — never fabricate: customers, pilots, clinical results, accuracy figures,
regulatory clearances, investors, press, testimonials, revenue, pricing.

## Product Principles

1. Show the mechanism, not adjectives: the six leads, the module, the watch.
2. Honest stage: every claim is one the one-pager already makes.
3. Data, never verdicts.
4. One company across the PDF, the deck and the page.
<!-- v0.6.0 — product truth for the investor page (Impeccable init, 2026-10-19) -->
