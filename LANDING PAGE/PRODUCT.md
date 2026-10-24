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
  "landing"`). Leads land in the web cockpit's `/admin/leads`; the server sends no
  e-mail until a Resend key is configured, so the page never promises one. Bot
  protection (Turnstile) appears only when the server's policy names a provider.

## Capabilities and Constraints

- **Acquisition, never interpretation.** CYPHIX records and displays ECG data; it does
  not interpret, diagnose or "detect" conditions. No copy may claim AI diagnosis,
  arrhythmia detection or any clinical verdict.
- 6-lead = the limb leads I, II, III, aVR, aVL, aVF.
- Stage: working prototype; technological & algorithmic proof of feasibility; patent
  pending on the core technology; Israel Innovation Authority · Tnufa programme.
  Next step: a wearable strap ready for its first trial.
- Product renderings are concept renderings and must be labelled as such. The device is
  in development and not for sale. Since v0.8.0 every product image is rendered from the
  team's own 3D model (three-d-stage export `cyphix-ecg-straps (1).obj`, 2026-09-27:
  smartwatch + strap, strap alone, analog watch + strap, a "Contour" watch), shipped as
  `public/models/cyphix.glb`; its electrodes are steel, not coral.
- Language: English first. A Hebrew/RTL version was planned in LAUNCH_PLAN (L4) and is
  still open.
- Stack: existing Vite + React + TypeScript SPA in this folder, live on Vercel at
  https://cyphix-landing.vercel.app (project `cyphix-landing`).

## Brand Commitments

- Name: **CYPHIX** (wordmark in `src/components/Logo.tsx`, mirrors `@cyphix/shared`
  `brand/wordmark.ts`). The user allows the wordmark in red on this page.
- The PDF one-pager (`Cyphix-One-Pager-phone-test-3.pdf`, 2026-10) is the binding visual
  reference: the user asked for the page to be "minimalistic as in my one-pager".
- Voice: calm, precise, clinical-grade, confident; short declarative sentences.
- **Professional canon (standing, 2026-10-22).** The user rejected v0.6's scroll-driven
  ECG display as "over simulation … doesn't seem like a professional company did it".
  The page plays a medtech company's homepage straight, at the craft level of Withings
  ScanWatch, Neko Health and Apple Watch pages: real renders and the real app screen
  lead, and nothing simulates a live signal. On 2026-10-23 the user still found v0.7
  unprofessional. They asked for one product-driven motion of their own: near the end,
  the watch rotates as you scroll, becomes only the strap, then an analog watch ("one
  strap on any watch").
- **Four ways to wear it (the user, 2026-10-23).** In the team's order:
  1. on a smartwatch;
  2. the strap on its own, **closed like a bracelet**, never shown open with
     adapters;
  3. on an analog watch, "turning an analog watch into a smart one";
  4. the **Cyphix watch** (the model's `contour_*` assembly), with Cyphix's own
     screen and the electrodes built into its band.

  Every place that lists the configurations lists all four.
- **The dark moment (the user, 2026-10-24).**
  - **What the user wants:** emotion and a story, the product large,
    Apple's language ("clean, professional, emotional, elegant", after
    apple.com/iphone-duo). The scroll should carry it, with the whole screen
    going dark for a moment; no clicks between the variations.
  - **What the user rejected:**
    - lines over the product (the six-lead axes over the analog dial,
      v0.27–v0.28);
    - theatrical scenes (the camera's falls, cranes and slide-outs);
    - the white pool of light under the product ("looks like a shadow");
    - v0.29–v0.32 as a whole (2026-10-25): centred, Apple-style copy over
      the product, with dissolves, a column at scroll speed, then light dips,
      and the clinician's iPad on the navy. "It does not match the rest of
      the page's design, it does not look professional."
  - **The shape (v0.33.0): the v0.27.0 journey, reset.** The one version the
    user called "really beautiful":
    - left-aligned copy in the page's own type, the product large on the
      right, the chapters along the foot;
    - the product moves physically: the smartwatch unclips and rises out,
      the strap closes into a bracelet, the analog comes down and clicks in,
      the Cyphix watch rises in as the others leave;
    - day opens out of the watch, with the clinician's tablet.

    On top of it, only the user's own notes: nothing drawn over the product,
    no pool under it, each move given more scroll.
  - **One sanctioned live trace (the user, 2026-10-24):** "in the final scene
    with the iPad, let's make the ECG signals be created live, in a gentle
    loop, not too fast."
    - The clinician's tablet at the end writes its illustrative recording
      like a monitor, in real time on the strip's own time base: a 10 s
      strip in 10 s at 75 beats a minute.
    - A pen rides the head of each lead, and a heart beats on every R peak
      (the user: the plain wipe "had no real rhythm").
    - It is labelled "Illustrative recording." and nothing reads it.
    - Everywhere else the canon holds: no simulated live signals.
- **Sensors in the module** (all in the team's model):
  - steel ECG electrodes, two on the wrist side and three on the outer face,
    plus one on the strap: the 6 limb leads;
  - a PPG optical sensor with green LEDs, for continuous heart rate;
  - a skin-temperature sensor.

  The page has no section of its own for them since v0.13.0, when the user
  removed "More than an ECG". If they return, they are shown as measurements,
  never as a reading of a real person or a verdict.

## Evidence on Hand

Public (all confirmed for the website on 2026-10-19):
- Seed ask **$1.9M**. TAM **$4.53B** global mobile ECG market; SAM **$2.76B** home
  healthcare segment.
- "1 in 3 deaths worldwide is cardiovascular."
- Patent pending on the core technology; Israel Innovation Authority · Tnufa.
- Team: **Elio El Hassrouny**, Founder & CEO, ex-Samsung R&D; **Dr. Tamir Wolf, MD**,
  External Clinical Advisor. Portraits from the one-pager.
- Contact: elio123elio1234@gmail.com · +972 54-398-9698 · Kiryat Ono, Israel.
- Assets: the team's 3D model of the strap (see above), the phone app's "Limb Leads"
  screen, both portraits. The one-pager's two flat concept renders are retired.

From the user's t:invent investor deck (2026-10-04), published on the Technology and
Investors pages at the user's request (2026-10-25):
- **The innovation:** each contact point is an array of elements, each read by its own
  ADC; the processing weights them in real time by the quality of their actual contact.
  The skin–electrode noise is "solved in hardware". Multi-element array, **patent filed in
  Israel**. The prototype's band: the left-leg contact as two elements (LL 1, LL 2) beside
  the reference, RLD.
- **The need:** 17.9M deaths a year from cardiovascular disease (WHO); the need for an
  ECG comes after discharge, between appointments, at the moment of a symptom.
- **Today's compromise:** clinical depth (Holter, 12-lead devices), monitoring over time
  (patches), comfort (smartwatches). The page names the categories, not the competitors.
- **Business model:** health systems pay (health funds, public clinics), for a follow-up
  programme, as a fixed monthly fee per active patient.
- **What comes next:** the next stage's preparation; a wearable product ready for a trial;
  a feasibility trial with 20 to 50 patients; regulatory validation (beta series, safety
  and usability, a multi-centre trial, an FDA submission).
- **Kept off the public pages, on purpose:**
  - the medical centre the deck names for a first trial (no agreement is public);
  - the deck's market figures, $4.97B TAM and $3.03B SAM for 2026. The site keeps the
    one-pager's $4.53B and $2.76B so it never contradicts itself; the user decides if they
    change everywhere;
  - the deck's sample ECG report, which carries an interpretation line.

Absent — never fabricate: customers, pilots, clinical results, accuracy figures,
regulatory clearances, investors, press, testimonials, revenue, pricing.

## Product Principles

1. Show the mechanism, not adjectives: the six leads, the module, the watch.
2. Honest stage: every claim is one the one-pager already makes.
3. Data, never verdicts.
4. One company across the PDF, the deck and the page.
<!-- v0.13.0 — the sensors section removed at the user's request -->
<!-- v0.12.0 — the sensors as illustrative charts -->
<!-- v0.35.0 — the Technology and Investors pages' evidence, from the investor deck; what stays off them -->
<!-- v0.33.0 — the journey reset to v0.27.0 with only the user's notes -->
<!-- v0.32.0 — the clinician's screen lit the same way -->
<!-- v0.31.0 — the product lit out of the dark, in place, on the navy stage -->
<!-- v0.30.0 — the dark moment as plain scroll; the monitor's pens and heart -->
<!-- v0.29.0 — the dark moment, calm (lines and theatrics withdrawn; the scroll, not clicks) -->
<!-- v0.28.0 — the one sanctioned live trace (the journey's last tablet) -->
<!-- v0.27.0 — the closing journey and its six-leads idea -->
<!-- v0.10.0 — the four configurations and the module's sensors -->
<!-- v0.8.0 — the 3D model is the product imagery; the user's "one strap, any watch" scene -->
<!-- v0.7.0 — the professional-canon commitment; lead delivery and hosting brought up to date -->
<!-- v0.6.0 — product truth for the investor page (Impeccable init, 2026-10-19) -->
