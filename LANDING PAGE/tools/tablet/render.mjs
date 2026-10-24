// Renders screen.html at 2x (1330 x 888 CSS px) with headless Chrome.
// usage: node tools/tablet/render.mjs <out.png>
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../package.json"));
const puppeteer = require("puppeteer-core");
const out = process.argv[2];
const chrome = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--allow-file-access-from-files", "--force-color-profile=srgb"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.setViewport({ width: 1330, height: 888, deviceScaleFactor: 2 });
await p.goto(pathToFileURL(join(here, "screen.html")).href, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 400));
console.log(JSON.stringify(await p.evaluate(() => window.__ready)));
await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1330, height: 888 } });
await b.close();
// v0.18.0 — renders the hero tablet's screen
