import LegalPage, { Clause, Mail } from "../components/LegalPage";

/* The terms of use: an informational site about a device in development. What protects most here:
   not medical advice and not a cleared device; not an offer of securities (the site says a seed round
   is being raised); forward-looking statements; generated imagery. A draft for a lawyer to review. */

export default function Terms() {
  return (
    <LegalPage
      page="terms"
      title="Terms of Use"
      updated="7 November 2026"
      intro={
        <p>
          These terms govern your use of cyphix.co. By using the site you agree to them. If you do
          not agree, please do not use the site.
        </p>
      }
    >
      <Clause n={1} title="About this site">
        <p>
          This site is published by Cyphix (“Cyphix”, “we”, “us”) to give general information about
          the company and the wearable electrocardiogram device it is developing. It is provided for
          information only.
        </p>
      </Clause>

      <Clause n={2} title="Not medical advice; a device in development">
        <p>
          The Cyphix device is in development. It is not available for sale, and it has not been
          cleared or approved by any regulatory authority, such as the U.S. Food and Drug
          Administration, a European notified body, or Israel’s Ministry of Health. Nothing on this
          site is medical advice, a diagnosis or a substitute for a qualified healthcare
          professional. ECG traces, readings and screens shown on the site are illustrative.
        </p>
        <p>
          If you have symptoms, see a doctor. In an emergency, call your local emergency number (in
          Israel, 101) at once.
        </p>
      </Clause>

      <Clause n={3} title="Not an offer of securities">
        <p>
          Information on this site about Cyphix’s plans, financing or market is general information.
          It is not an offer to sell, or a solicitation of an offer to buy, any securities, and it is
          not investment, legal or tax advice. Any investment in Cyphix will be made only through
          definitive written agreements and in compliance with the applicable securities laws.
        </p>
      </Clause>

      <Clause n={4} title="Forward-looking statements">
        <p>
          The site contains statements about the future, such as development plans, timelines,
          regulatory steps and market size. They reflect our current expectations and estimates,
          which may prove wrong; actual results may differ materially. We do not undertake to update
          them. Market figures from third-party sources are presented as published by those sources.
        </p>
      </Clause>

      <Clause n={5} title="Images">
        <p>
          Product images on the site are concept renderings or generated images unless they are
          labelled as the working prototype, and photographs of people are concept imagery unless
          labelled otherwise. They illustrate the intended product and its use; the final product may
          differ.
        </p>
      </Clause>

      <Clause n={6} title="Intellectual property">
        <p>
          The site and its content, including the Cyphix name and logo, text, images and design, are
          owned by Cyphix or its licensors and are protected by law. Cyphix technology is the subject
          of a pending patent application. You may view the site for your own information; you may
          not copy, reproduce, distribute or use its content commercially without our written
          permission.
        </p>
      </Clause>

      <Clause n={7} title="What you send us">
        <p>
          When you contact us, please give accurate details and do not send confidential
          information. Information you send is not treated as confidential unless we have agreed so
          in writing (for example, in a non-disclosure agreement). How we handle personal information
          is described in our <a href="/privacy">Privacy Policy</a>.
        </p>
      </Clause>

      <Clause n={8} title="Using the site">
        <p>
          Do not misuse the site: do not try to gain unauthorized access to it or to our systems,
          interfere with its operation, send automated or bulk requests through the form, or use it
          for anything unlawful.
        </p>
      </Clause>

      <Clause n={9} title="Links">
        <p>
          The site may link to other sites, such as our social-media pages. We are not responsible
          for their content or their privacy practices.
        </p>
      </Clause>

      <Clause n={10} title="No warranty; limitation of liability">
        <p>
          The site is provided “as is” and “as available”. We work to keep it accurate and available,
          but we do not warrant that it is complete, current or free of errors or interruptions. To
          the fullest extent permitted by law, Cyphix will not be liable for any damage arising from
          the use of the site or from reliance on its content. Nothing in these terms limits a
          liability that cannot be limited by law.
        </p>
      </Clause>

      <Clause n={11} title="Governing law">
        <p>
          These terms are governed by the laws of the State of Israel. The competent courts in
          Tel Aviv-Jaffa have exclusive jurisdiction over any dispute about them or about the site.
        </p>
      </Clause>

      <Clause n={12} title="Changes and contact">
        <p>
          We may update these terms; the version published here, with its date, applies. Questions:{" "}
          <Mail />.
        </p>
      </Clause>
    </LegalPage>
  );
}

// v0.38.23 — the terms of use: not medical advice, not a cleared device, not an offer of securities, forward-looking statements
