/**
 * Studio interaction probe (excluded from run.ts by "_" prefix).
 *
 *   SCRATCH=<dir> ../node_modules/.bin/tsx clips/studio/_probe.ts <which> [projectId]
 *
 * which: comp | inspector | media | plugins | pexels | pexopen | build | props
 *        | addfx | reset | trans | export | ai
 */
import { chromium, type Locator, type Page } from "playwright";
import { STATE_PATH } from "../../lib/auth.ts";
import { BASE_URL as BASE } from "../../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const which = process.argv[2] ?? "comp";
const PROJECT = process.argv[3] ?? "6a4b636d1263d94b3dfbdd2a";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();
const insp = () => page.locator('aside[aria-label="Properties"]');

async function snap(name: string, lines = 220) {
  await page.screenshot({ path: `${SCRATCH}/${name}.png` });
  const s = await page.locator("body").ariaSnapshot();
  console.log(`\n===== ${name} =====`);
  console.log(s.split("\n").slice(0, lines).join("\n"));
}

async function ensureComposition(p: Page) {
  const newComp = p.getByRole("button", { name: "Create new composition" });
  if (await newComp.isVisible().catch(() => false)) {
    await newComp.click();
    await p.waitForTimeout(3500);
  }
}

async function openPexels() {
  const i = insp();
  await i.getByRole("button", { name: "Plugins" }).click().catch(() => {});
  await page.waitForTimeout(700);
  await i.getByRole("button", { name: "Pexels" }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  const install = i.getByRole("button", { name: "Install plugin" });
  if (await install.isVisible().catch(() => false)) { await install.click(); await page.waitForTimeout(2500); }
  await i.getByRole("button", { name: /^Open$/ }).click().catch(() => {});
  await page.waitForTimeout(1500);
}

async function placeClips(n: number, term = "ocean") {
  const i = insp();
  await openPexels();
  const box = i.getByRole("textbox", { name: "Search stock media…" });
  await box.click();
  await page.keyboard.type(term, { delay: 25 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(6000);
  const tiles = i.locator("img");
  for (let k = 0; k < n; k++) {
    await tiles.nth(k).dblclick();
    await page.waitForTimeout(2500);
  }
}

function clipNodes(): Locator {
  return insp().getByRole("button", { name: /Image clip|Video clip/ });
}

async function selectFirstClip() {
  const i = insp();
  await i.getByRole("button", { name: "Nodes" }).click().catch(() => {});
  await page.waitForTimeout(600);
  await clipNodes().first().click();
  await page.waitForTimeout(1200);
}

await page.goto(`${BASE}/editor/${PROJECT}/studio`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 3000 }).catch(() => {});
await page.getByRole("button", { name: "Not now" }).click({ timeout: 2000 }).catch(() => {});

if (which === "comp") {
  await snap("s-before-comp");
  await ensureComposition(page);
  await snap("s-after-comp", 300);
} else {
  await ensureComposition(page);
  await page.waitForTimeout(1500);

  if (which === "seed") {
    // ensure N clips exist in this project
    const have = await clipNodes().count().catch(() => 0);
    console.log("existing clips:", have);
    if (have < 2) await placeClips(2 - have);
    await snap("s-seed", 40);
    console.log("clip count now:", await clipNodes().count().catch(() => 0));
  } else if (which === "addfx") {
    await selectFirstClip();
    const i = insp();
    await i.getByRole("button", { name: /^Effects$/ }).click();
    await page.waitForTimeout(800);
    // pick Vignette from the dropdown then Add
    const combo = i.locator("select, [role='combobox']").first();
    await combo.selectOption({ label: "Vignette" }).catch(async () => {
      await combo.click();
      await page.getByRole("option", { name: "Vignette" }).click().catch(() => {});
    });
    await page.waitForTimeout(400);
    await i.getByRole("button", { name: /^Add$/ }).click();
    await page.waitForTimeout(1200);
    await snap("s-fx-added", 90);
    console.log("\n--- effects buttons ---\n", JSON.stringify(await i.getByRole("button").allInnerTexts()));
    console.log("\n--- effects text ---\n", (await i.innerText()).slice(0, 1600));
    // dump the effect card HTML
    console.log("\n--- fx html ---\n", (await i.evaluate((el) => el.innerHTML.slice(0, 5000)).catch(() => "n/a")));
  } else if (which === "reset") {
    await selectFirstClip();
    const i = insp();
    await i.getByRole("button", { name: /^Color$/ }).click();
    await page.waitForTimeout(600);
    // find the Exposure value field bounding box
    const map = await i.evaluate((el) => {
      const out: any[] = [];
      el.querySelectorAll("input, [contenteditable], span, div").forEach((n) => {
        const t = (n.textContent || "").trim();
        if (/^-?\d+(\.\d+)?$/.test(t) && t.length < 6) {
          const r = n.getBoundingClientRect();
          if (r.width > 10 && r.width < 120)
            out.push({ tag: n.tagName, t, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
        }
      });
      return out.slice(0, 12);
    });
    console.log("\n--- color value fields ---\n", JSON.stringify(map));
    await snap("s-color-fields", 40);
  } else if (which === "trans") {
    // Study timeline structure: dump clip bars + look for transition affordances
    await snap("s-trans-before", 30);
    const bars = await page.evaluate(() => {
      const out: any[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        const cls = (el.className || "").toString();
        if (r.y > 630 && r.x > 200 && r.height > 25 && r.height < 90 && r.width > 30 && /clip|track|bar|segment/i.test(cls)) {
          out.push({ cls: cls.slice(0, 45), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
        }
      });
      return out.slice(0, 30);
    });
    console.log("\n--- timeline bars ---\n", JSON.stringify(bars));
  } else if (which === "tl") {
    // Dump timeline DOM in the y>630 band with useful attrs
    const els = await page.evaluate(() => {
      const out: any[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.y >= 630 && r.y < 800 && r.x > 195 && r.width > 25 && r.height > 20 && r.height < 100) {
          const cls = (el.className || "").toString();
          const style = (el.getAttribute("style") || "");
          out.push({ tag: el.tagName, cls: cls.slice(0, 40), draggable: el.getAttribute("draggable"), title: el.getAttribute("title") || el.getAttribute("aria-label") || "", x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cursor: getComputedStyle(el).cursor });
        }
      });
      return out.slice(0, 40);
    });
    console.log("\n--- timeline els ---\n", JSON.stringify(els, null, 0));
    // right-click the first clip bar (approx x=245,y=660)
    await page.mouse.click(245, 660, { button: "right" });
    await page.waitForTimeout(900);
    await snap("s-tl-ctx", 80);
    console.log("\n--- ctx menu ---\n", JSON.stringify(await page.getByRole("menuitem").allInnerTexts().catch(() => [])));
  } else if (which === "same-track") {
    // Move clip2 (track2, y~716) up onto track1 right after clip1 (clip1 ends ~x291)
    await page.mouse.move(245, 716, { steps: 6 });
    await page.mouse.down();
    await page.mouse.move(300, 690, { steps: 20 });
    await page.mouse.move(338, 661, { steps: 25 });
    await page.mouse.move(340, 661, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await snap("s-same-track", 30);
    // dump clip bar positions after move
    const bars = await page.evaluate(() => {
      const out: any[] = [];
      document.querySelectorAll('[title^="Timeline clip"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        out.push({ title: el.getAttribute("title"), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) });
      });
      return out;
    });
    console.log("\n--- bars after move ---\n", JSON.stringify(bars));
    // hover the cut boundary and look for a transition affordance
    if (bars.length >= 2) {
      const cut = Math.round((bars[0].x + bars[0].w));
      await page.mouse.move(cut, 661, { steps: 10 });
      await page.waitForTimeout(1000);
      await snap("s-cut-hover", 30);
      const near = await page.evaluate(() => {
        const out: any[] = [];
        document.querySelectorAll("button, [role='button'], [title]").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.y >= 630 && r.y < 760 && r.x > 200 && r.x < 700 && r.width > 6 && r.width < 80) {
            out.push({ tag: el.tagName, title: el.getAttribute("title") || el.getAttribute("aria-label") || "", txt: (el.textContent||"").trim().slice(0,20), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
          }
        });
        return out.slice(0, 30);
      });
      console.log("\n--- near cut ---\n", JSON.stringify(near));
    }
  } else if (which === "cut") {
    // clips already adjacent on track1. Probe the boundary for a transition affordance.
    const bars = await page.evaluate(() => {
      const out: any[] = [];
      document.querySelectorAll('[title^="Timeline clip"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        out.push({ title: el.getAttribute("title"), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
      });
      return out;
    });
    console.log("\n--- bars ---\n", JSON.stringify(bars));
    const cx = bars.length >= 2 ? bars[0].x + bars[0].w : 291;
    const cy = bars.length ? bars[0].y + bars[0].h / 2 : 661;
    await page.mouse.move(cx - 30, cy, { steps: 8 });
    await page.waitForTimeout(400);
    await page.mouse.move(cx, cy, { steps: 8 });
    await page.waitForTimeout(1200);
    await snap("s-cut-hover", 20);
    // right-click the boundary
    await page.mouse.click(cx, cy, { button: "right" });
    await page.waitForTimeout(900);
    await snap("s-cut-rmb", 40);
    // dump everything near the cut
    const near = await page.evaluate((cxv) => {
      const out: any[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.y >= 630 && r.y < 760 && Math.abs(r.x - cxv) < 60 && r.width > 4 && r.width < 90 && r.height > 4) {
          const t = el.getAttribute("title") || el.getAttribute("aria-label") || "";
          const txt = (el.textContent || "").trim().slice(0, 24);
          if (t || (txt && txt.length < 24) || el.tagName === "BUTTON" || el.tagName === "svg")
            out.push({ tag: el.tagName, title: t, txt, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cursor: getComputedStyle(el).cursor });
      }
      });
      return out.slice(0, 40);
    }, cx);
    console.log("\n--- near cut ---\n", JSON.stringify(near));
  } else if (which === "ai") {
    await snap("s-ai", 300);
    // open modes menu
    await page.locator('aside[aria-label="AI Sidebar"]').getByRole("button", { name: "Flowy AI" }).click().catch(() => {});
    await page.waitForTimeout(1000);
    await snap("s-ai-modes", 60);
  } else if (which === "export") {
    await page.getByRole("button", { name: /^Export$/ }).first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await snap("s-export", 200);
    const dlg = page.locator('[role="dialog"], aside, [class*="panel"]');
    console.log("\n--- export text ---\n", (await page.locator("body").innerText()).slice(0, 2500));
  }
}

await browser.close();
