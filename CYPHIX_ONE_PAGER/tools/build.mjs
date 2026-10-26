// Prints one-pager.html to Cyphix-One-Pager.pdf (one A4 page, links kept) and writes
// preview.jpg beside it. Before printing it checks that the sheet holds everything: nothing
// runs past the page, no line overflows its box, every picture and font has loaded.
// usage: node tools/build.mjs
// Borrows puppeteer-core from ../LANDING PAGE/node_modules; drives the installed Chrome.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "..", "LANDING PAGE", "package.json"));
const puppeteer = require("puppeteer-core");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PDF = join(ROOT, "Cyphix-One-Pager.pdf");
const PREVIEW = join(ROOT, "preview.jpg");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--force-color-profile=srgb", "--allow-file-access-from-files"],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
await page.emulateMediaType("print");
await page.goto(pathToFileURL(join(ROOT, "one-pager.html")).href, { waitUntil: "networkidle0" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode()));
});

const report = await page.evaluate(() => {
  const sheet = document.querySelector(".sheet").getBoundingClientRect();
  const problems = [];
  for (const img of document.images) if (!img.naturalWidth) problems.push(`picture not loaded: ${img.getAttribute("src")}`);
  for (const f of ["Sora", "Geist Mono"]) if (!document.fonts.check(`12px "${f}"`)) problems.push(`font not loaded: ${f}`);
  const foot = document.querySelector(".foot").getBoundingClientRect();
  if (foot.bottom > sheet.bottom + 0.5) problems.push(`the sheet overflows by ${(foot.bottom - sheet.bottom).toFixed(1)} px`);
  for (const el of document.querySelectorAll(".sheet *")) {
    if (el.closest("svg")) continue;
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "hidden" && el.clientWidth > 0)
      problems.push(`overflows its box: <${el.tagName.toLowerCase()} class="${el.className}">`);
  }
  // the room left above the footer, which the sections may use
  const last = document.querySelector(".road").getBoundingClientRect();
  return { problems, spare: +(foot.top - last.bottom).toFixed(1), sheet: [sheet.width, sheet.height] };
});
console.log("sheet", report.sheet.map((n) => n.toFixed(1)).join(" × "), "· room above the footer", report.spare, "px");
if (report.problems.length) {
  console.error(report.problems.join("\n"));
  await browser.close();
  process.exit(1);
}

await page.pdf({ path: PDF, preferCSSPageSize: true, printBackground: true });
const sheet = await page.$(".sheet");
await sheet.screenshot({ path: PREVIEW, type: "jpeg", quality: 86 });
await browser.close();

const pages = (readFileSync(PDF, "latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
console.log(`${PDF} · ${pages} page(s) · ${(readFileSync(PDF).length / 1024).toFixed(0)} KB`);
if (pages !== 1) process.exit(1);

// v1.0.0 — the PDF and its preview, with the sheet's checks before printing
