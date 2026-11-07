import LegalPage, { Clause, Mail } from "../components/LegalPage";

/* The accessibility statement Israeli law asks a website to publish (Equal Rights for Persons with
   Disabilities (Service Accessibility Adjustments) Regulations, 5773-2013, regulation 35): the
   standard, what was done, what is not yet accessible, and whom to contact. Written from the
   audit of v0.38.23 (axe-core, WCAG 2.1 A/AA, every page, desktop and phone); claims nothing that
   was not checked. */

export default function Accessibility() {
  return (
    <LegalPage
      page="accessibility"
      title="Accessibility Statement"
      updated="7 November 2026"
      intro={
        <p>
          Cyphix wants everyone, including people with disabilities, to be able to use this site.
          This statement describes what we have done, where the site still falls short, and how to
          reach us if something does not work for you.
        </p>
      }
    >
      <Clause n={1} title="The standard">
        <p>
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA, which
          includes the requirements of Israeli Standard 5568 (based on WCAG 2.0, level AA), as
          required by the Equal Rights for Persons with Disabilities Law, 5758-1998, and its
          regulations.
        </p>
      </Clause>

      <Clause n={2} title="What we have done">
        <ul>
          <li>Every page has a clear structure of headings, regions and lists, in a logical reading order.</li>
          <li>The whole site can be used with a keyboard, including the menus, which close with Escape; the focused element is always visible.</li>
          <li>Text and its background meet the required contrast; small coloured labels were darkened to do so.</li>
          <li>The site follows your browser’s zoom and text size: content reflows and nothing is lost up to 200%.</li>
          <li>If you ask your device to reduce motion, the site’s animations are switched off or simplified; nothing flashes.</li>
          <li>If you ask your device for more contrast, every line of “Who it’s for” is shown in full ink.</li>
          <li>Meaningful images have text descriptions; decorative images are hidden from screen readers.</li>
          <li>Form fields have visible labels, optional fields are marked as such, and errors are announced in text.</li>
          <li>There are no time limits, and the site does not use an accessibility “overlay” plugin.</li>
        </ul>
      </Clause>

      <Clause n={3} title="Known limitations">
        <ul>
          <li>
            In “Who it’s for”, the rows not in focus are shown faded as you scroll, below the
            required contrast. Each row is shown in full as it reaches the middle of the screen, and
            in full at all times if you ask your device for more contrast.
          </li>
          <li>
            The “One strap. Any watch.” page shows a 3D animation. Its content is also given as text
            on the page.
          </li>
          <li>
            The ECG traces shown on the site are illustrations, not data; they are not described
            point by point.
          </li>
          <li>
            If the form shows a security check, it is provided by Cloudflare (Turnstile), whose
            accessibility we do not control.
          </li>
        </ul>
        <p>We keep working on these. If any of them stops you from using the site, tell us and we will help.</p>
      </Clause>

      <Clause n={4} title="How we checked">
        <p>
          The site was last reviewed on 7 November 2026, on every page at desktop and phone sizes,
          with automated checks against WCAG 2.1 A and AA (axe-core) and by hand with a keyboard and
          browser zoom.
        </p>
      </Clause>

      <Clause n={5} title="Contact for accessibility">
        <p>
          If you meet an accessibility problem on the site, or need any of its content in another
          form, contact our accessibility coordinator, Elio El Hassrouny, at <Mail />. Please describe
          the problem and the page it is on; we will answer as soon as we can.
        </p>
      </Clause>
    </LegalPage>
  );
}

// v0.38.23 — the accessibility statement (Israeli regulation 35): the standard, what was done, the known limitations, the coordinator
