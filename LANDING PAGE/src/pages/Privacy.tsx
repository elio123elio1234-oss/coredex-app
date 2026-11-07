import LegalPage, { Clause, Mail } from "../components/LegalPage";

/* The privacy policy. Written from what the site and its server actually do (audited 2026-11-07):
   no cookies, no browser storage, no analytics; the "Request the deck" form sends its fields to the
   Cyphix server (Render, Frankfurt), which stores them with the sender's IP address and browser
   type (Neon, Frankfurt) and sends two e-mails through Resend. A draft for a lawyer to review. */

export default function Privacy() {
  return (
    <LegalPage
      page="privacy"
      title="Privacy Policy"
      updated="7 November 2026"
      intro={
        <p>
          This policy explains what personal information Cyphix collects through cyphix.co, why,
          who receives it, and the rights you have. In short: we collect only what you choose to
          send us, we use it only to answer you, and this site does not use cookies or trackers.
        </p>
      }
    >
      <Clause n={1} title="Who we are">
        <p>
          Cyphix (“Cyphix”, “we”, “us”) is developing a wearable electrocardiogram device. We are
          responsible for the personal information described in this policy. You can reach us at{" "}
          <Mail />.
        </p>
      </Clause>

      <Clause n={2} title="What we collect">
        <p>
          <strong>What you send us.</strong> When you use the “Request the deck” form we receive
          your name and work e-mail address, and, if you fill them in, your fund or company and your
          message. Giving us these details is voluntary, but without a name and an e-mail address we
          cannot answer you. If you write to us by e-mail, we receive your address and what you
          write.
        </p>
        <p>
          <strong>Technical information.</strong> When the form is sent, our server records the IP
          address and the browser type (user agent) it was sent from, to protect the form from
          abuse. The providers that host this site and our server keep standard server logs (such as
          IP address, time and the page requested) for security and operation.
        </p>
        <p>
          We do not ask for, and this site does not collect, any health information. Please do not
          send us medical information about yourself or anyone else.
        </p>
      </Clause>

      <Clause n={3} title="Cookies and tracking">
        <p>
          This site does not use cookies, does not store anything in your browser (such as local
          storage), and does not use analytics, advertising or social-media tracking tools. Fonts and
          images are served from our own site. If the form shows a security check (Cloudflare
          Turnstile), Cloudflare processes technical information to tell people from automated
          programs, under its own privacy policy. If we ever add cookies or analytics, we will update
          this policy and ask for your consent where the law requires it.
        </p>
      </Clause>

      <Clause n={4} title="Why we use it">
        <ul>
          <li>To answer your request, send you the materials you asked for and correspond with you about it.</li>
          <li>To continue a conversation about Cyphix, including investment discussions, that you started.</li>
          <li>To keep the site and the form secure and to prevent spam and misuse.</li>
          <li>To comply with the law.</li>
        </ul>
        <p>
          We do not sell your information, we do not build marketing lists from it, and we will not
          send you advertising without your prior consent. If you are in the European Economic Area
          or the United Kingdom, we rely on taking steps at your request and on our legitimate
          interest in answering you and protecting our services, and on your consent where we ask
          for it.
        </p>
      </Clause>

      <Clause n={5} title="Who receives it">
        <p>
          We share your information only with service providers that process it for us, under their
          own obligations to protect it, and only as far as they need to:
        </p>
        <ul>
          <li>Vercel, which hosts this website;</li>
          <li>Render, which runs our server (Frankfurt, Germany);</li>
          <li>Neon, which provides our database (Frankfurt, Germany);</li>
          <li>Resend, which sends the e-mail confirming your request and the e-mail notifying us of it;</li>
          <li>Google, which provides our e-mail inbox;</li>
          <li>Cloudflare, if the form's security check is active.</li>
        </ul>
        <p>
          Some of these providers may process information outside Israel and the European Economic
          Area, including in the United States; where they do, we rely on their contractual and
          legal safeguards. We may also disclose information when the law requires it, or to
          protect our rights.
        </p>
      </Clause>

      <Clause n={6} title="How long we keep it">
        <p>
          We keep your information only as long as we need it for the purposes above, or as long as
          the law requires, and then delete it. You can ask us to delete it sooner at any time.
        </p>
      </Clause>

      <Clause n={7} title="Your rights">
        <p>
          You may ask to see the information we hold about you, to correct it, or to delete it,
          under Israel’s Protection of Privacy Law, 5741-1981. If the European or UK data-protection
          rules apply to you, you also have the rights they give, including to object to or restrict
          our use of your information and to receive a copy of it. Write to us at <Mail /> and we will
          answer within the time the law sets. You may also complain to Israel’s Privacy Protection
          Authority or to your local data-protection authority.
        </p>
      </Clause>

      <Clause n={8} title="Security">
        <p>
          The site and the form use encrypted connections (HTTPS), and access to the information you
          send is limited to the people at Cyphix who need it. No system is perfectly secure, but we
          take reasonable measures to protect your information.
        </p>
      </Clause>

      <Clause n={9} title="Children">
        <p>This site is meant for adults. We do not knowingly collect information from anyone under 18.</p>
      </Clause>

      <Clause n={10} title="Changes to this policy">
        <p>
          If we change this policy, we will publish the new version here with a new date. If a change
          is significant, we will make it clear on the site.
        </p>
      </Clause>

      <Clause n={11} title="Contact">
        <p>
          Questions or requests about your information: <Mail />.
        </p>
      </Clause>
    </LegalPage>
  );
}

// v0.38.23 — the privacy policy, written from the site's audited behaviour (no cookies; the form's data, its processors)
