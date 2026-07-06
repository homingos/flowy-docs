/**
 * Probe (excluded from run.ts by "_" prefix): explore add-node menu entries,
 * video node anatomy, brand-kit page + node, image download menu.
 *
 *   SCRATCH=<dir> ../node_modules/.bin/tsx clips/_probe-ag6.ts <which> [projectId]
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";
import { makeHelpers } from "../lib/human.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const which = process.argv[2] ?? "addnode";
const PROJECT = process.argv[3] ?? "6a4b63e51263d94b3dfbdd47";
const arg2 = process.argv[4];

const browser = await chromium.launch({ headless: process.env.HEADFUL ? false : true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();

async function snap(name: string, lines = 160) {
  await page.screenshot({ path: `${SCRATCH}/${name}.png` });
  const s = await page.locator("body").ariaSnapshot();
  console.log(`\n===== ${name} =====`);
  console.log(s.split("\n").slice(0, lines).join("\n"));
}

async function openCanvas(id: string) {
  await page.goto(`${BASE}/editor/${id}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 3000 }).catch(() => {});
  await page.getByRole("button", { name: "Not now" }).click({ timeout: 2000 }).catch(() => {});
}

if (which === "addnode") {
  await openCanvas(PROJECT);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(1000);
  await snap("ag6-addnode", 200);
} else if (which === "video") {
  await openCanvas(PROJECT);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  const menu = page.locator('[aria-label="Node selection"]');
  await menu.getByRole("button", { name: /^Video/ }).click();
  await page.waitForTimeout(1800);
  console.log("node classes:", await page.locator(".react-flow__node").evaluateAll((els) => els.map((e) => e.className)));
  await snap("ag6-video-node", 220);
  // dump textareas
  const n = await page.locator("textarea").count();
  console.log("textarea count:", n);
  for (let i = 0; i < n; i++) {
    const t = page.locator("textarea").nth(i);
    console.log(`ta[${i}]`, await t.getAttribute("placeholder"), JSON.stringify(await t.boundingBox()));
  }
} else if (which === "brandnode") {
  await openCanvas(PROJECT);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  const search = page.locator('input[placeholder="Search nodes…"]');
  if (await search.count()) {
    await search.fill("brand");
    await page.waitForTimeout(700);
  }
  await snap("ag6-brand-search", 120);
} else if (which === "brandpage") {
  await page.goto(`${BASE}/dashboard/brandkit`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Not now" }).click({ timeout: 2000 }).catch(() => {});
  await snap("ag6-brandpage", 220);
} else if (which === "gendownload") {
  // Generate ONE image in the given project (leaves it), then dump the
  // right-click context menu + Export as… submenu.
  await openCanvas(PROJECT);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Image/ }).click();
  await page.waitForTimeout(1200);
  const node = page.locator(".react-flow__node-emptyImageBlock").first();
  await node.waitFor({ state: "visible", timeout: 10000 }).catch(() => console.log("no emptyImageBlock"));
  const ta = page.locator("textarea").first();
  await ta.click();
  await page.keyboard.type(arg2 ?? "low-angle vintage red convertible on a coastal road, golden hour", { delay: 4 });
  await page.waitForTimeout(300);
  const before = (await page.getByRole("button", { name: /credits available/ }).first().textContent())?.trim();
  console.log("credits before:", before);
  const t0 = Date.now();
  await page.keyboard.press("Enter");
  await page.locator(".react-flow__node img[alt='Generated result']").first().waitFor({ state: "visible", timeout: 240_000 });
  console.log("image gen took", ((Date.now() - t0) / 1000).toFixed(1), "s");
  await page.waitForTimeout(2000);
  const after = (await page.getByRole("button", { name: /credits available/ }).first().textContent())?.trim();
  console.log("credits after:", after);
  // right-click the image node
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const img = page.locator(".react-flow__node").filter({ has: page.locator("img[alt='Generated result']") }).first();
  const box = await img.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
    await page.waitForTimeout(900);
    await snap("ag6-gd-ctx", 60);
    const exportTrigger = page.getByRole("button", { name: "Export as…" }).first();
    const eb = await exportTrigger.boundingBox();
    console.log("Export as… trigger box:", JSON.stringify(eb));
    if (eb) {
      await page.mouse.move(eb.x + eb.width / 2, eb.y + eb.height / 2, { steps: 8 });
      await page.waitForTimeout(700);
      const panel = page.getByRole("menu", { name: "Export as" });
      console.log("export panel box:", JSON.stringify(await panel.boundingBox()));
      await snap("ag6-gd-exportas", 60);
    }
  }
} else if (which === "imgcost") {
  await openCanvas(PROJECT);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Image/ }).click();
  await page.waitForTimeout(1500);
  const snap2 = await page.locator("body").ariaSnapshot();
  for (const line of snap2.split("\n")) if (/cost|credit/i.test(line)) console.log("cost-line:", line.trim());
  await snap("ag6-imgcost", 80);
} else if (which === "connmenu") {
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+T");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const sb = await page.locator(".react-flow__node-textBlock").first().boundingBox();
  if (sb) { await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 10 }); await page.waitForTimeout(300); }
  const srcH = await page.locator(".react-flow__node-textBlock .react-flow__handle.source").first().boundingBox();
  if (srcH) {
    await page.mouse.click(srcH.x + srcH.width / 2, srcH.y + srcH.height / 2);
    await page.waitForTimeout(900);
  }
  const snap = await page.locator("body").ariaSnapshot();
  console.log("==== CONNMENU SNAPSHOT ====");
  console.log(snap);
  // dump buttons near the handle
  const btns = await page.evaluate(() => {
    return [...document.querySelectorAll("button")].map((b) => ({ name: b.getAttribute("aria-label") || b.title || (b.textContent || "").trim().slice(0, 24), x: Math.round(b.getBoundingClientRect().x), y: Math.round(b.getBoundingClientRect().y) })).filter((b) => b.x > 780 && b.y < 340 && b.y > 80);
  });
  console.log("MENU BTNS:", JSON.stringify(btns));
  await page.screenshot({ path: `${SCRATCH}/ag6-connmenu.png` });
} else if (which === "connbuild") {
  // Build Text->Image->Video via the connection menu; verify persistence.
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+T");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1000);
  const pickFrom = async (nodeSel: string, item: string) => {
    const nb = await page.locator(nodeSel).first().boundingBox();
    if (nb) { await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2, { steps: 10 }); await page.waitForTimeout(300); }
    const h = await page.locator(`${nodeSel} .react-flow__handle.source`).first().boundingBox();
    if (!h) throw new Error("no source handle for " + nodeSel);
    await page.mouse.click(h.x + h.width / 2, h.y + h.height / 2);
    await page.waitForTimeout(800);
    const opt = page.getByRole("button", { name: item, exact: true }).first();
    await opt.waitFor({ state: "visible", timeout: 5000 });
    await opt.click();
    await page.waitForTimeout(1200);
  };
  await pickFrom(".react-flow__node-textBlock", arg2 || "Image");
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1000);
  console.log("after 1st: node classes", await page.locator(".react-flow__node").evaluateAll((e) => e.map((n) => (n.className.match(/node-(\w+)/) || [])[1])));
  await pickFrom(".react-flow__node-emptyImageBlock", "Video");
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1000);
  console.log("after 2nd: node classes", await page.locator(".react-flow__node").evaluateAll((e) => e.map((n) => (n.className.match(/node-(\w+)/) || [])[1])));
  await page.screenshot({ path: `${SCRATCH}/ag6-connbuild-A.png` });
  // reload to verify persistence
  await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 3000 }).catch(() => {});
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCRATCH}/ag6-connbuild-B.png` });
  console.log("reload node classes", await page.locator(".react-flow__node").evaluateAll((e) => e.map((n) => (n.className.match(/node-(\w+)/) || [])[1])));
} else if (which === "clickconnect") {
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+T");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+I");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const sb = await page.locator(".react-flow__node-textBlock").first().boundingBox();
  if (sb) { await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 10 }); await page.waitForTimeout(300); }
  const srcH = await page.locator(".react-flow__node-textBlock .react-flow__handle.source").first().boundingBox();
  const db = await page.locator(".react-flow__node-emptyImageBlock").first().boundingBox();
  if (db) { await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 10 }); await page.waitForTimeout(300); }
  const dstH = await page.locator(".react-flow__node-emptyImageBlock .react-flow__handle.target").first().boundingBox();
  console.log("srcH", JSON.stringify(srcH), "dstH", JSON.stringify(dstH));
  if (srcH && dstH) {
    await page.mouse.click(srcH.x + srcH.width / 2, srcH.y + srcH.height / 2);
    await page.waitForTimeout(600);
    await snap("ag6-click-mid", 6);
    await page.mouse.click(dstH.x + dstH.width / 2, dstH.y + dstH.height / 2);
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: `${SCRATCH}/ag6-click-A.png` });
  // reload to test persistence
  await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 3000 }).catch(() => {});
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCRATCH}/ag6-click-B.png` });
  console.log("reloaded screenshot saved");
} else if (which === "edgesel") {
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const gs = [...document.querySelectorAll("svg g, g")];
    const edgeish = gs
      .map((g) => (g.getAttribute("class") || "") + "|" + (g.getAttribute("data-id") || ""))
      .filter((c) => /edge/i.test(c));
    return {
      reactFlowEdge: document.querySelectorAll(".react-flow__edge").length,
      edgeish: [...new Set(edgeish)].slice(0, 10),
      pathsInEdges: document.querySelectorAll(".react-flow__edges path").length,
      anyPathStroke: [...document.querySelectorAll("path")].filter((p) => p.getAttribute("class")?.includes("edge")).length,
    };
  });
  console.log("EDGESEL:", JSON.stringify(info));
} else if (which === "hdrag") {
  const log = { t0: Date.now(), contentStart: 0, skips: [] as Array<{ start: number; end: number }> };
  const h = makeHelpers(page, log);
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+T");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+I");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const src = page.locator(".react-flow__node-textBlock .react-flow__handle.source").first();
  const dst = page.locator(".react-flow__node-emptyImageBlock .react-flow__handle.target").first();
  // hover source node first
  const sb = await page.locator(".react-flow__node-textBlock").first().boundingBox();
  if (sb) { await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 10 }); await page.waitForTimeout(300); }
  await h.drag(src, dst);
  await page.waitForTimeout(800);
  console.log("edge count (react-flow__edge):", await page.locator(".react-flow__edge").count());
  await snap("ag6-hdrag", 8);
} else if (which === "placewire") {
  // Fresh project: place Text+Image, wire them, screenshot + dump edge DOM.
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+T");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+I");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const src = await page.locator(".react-flow__node-textBlock").first().boundingBox();
  const dst = await page.locator(".react-flow__node-emptyImageBlock").first().boundingBox();
  console.log("src node", JSON.stringify(src), "dst node", JSON.stringify(dst));
  if (src && dst) {
    // hover source to reveal handle
    await page.mouse.move(src.x + src.width - 6, src.y + src.height / 2, { steps: 12 });
    await page.waitForTimeout(400);
    const srcHandle = await page.locator(".react-flow__node-textBlock .react-flow__handle.source").first().boundingBox();
    const dstHandle = await page.locator(".react-flow__node-emptyImageBlock .react-flow__handle.target").first().boundingBox();
    console.log("srcHandle", JSON.stringify(srcHandle), "dstHandle", JSON.stringify(dstHandle));
    if (srcHandle && dstHandle) {
      await page.mouse.move(srcHandle.x + srcHandle.width / 2, srcHandle.y + srcHandle.height / 2, { steps: 8 });
      await page.waitForTimeout(200);
      await page.mouse.down();
      await page.waitForTimeout(200);
      await page.mouse.move(srcHandle.x + 40, srcHandle.y, { steps: 6 });
      await page.mouse.move(dstHandle.x + dstHandle.width / 2, dstHandle.y + dstHandle.height / 2, { steps: 30 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(800);
    }
  }
  const edgeInfo = await page.evaluate(() => {
    const layer = document.querySelector(".react-flow__edges") || document.querySelector(".react-flow__edgelabel-renderer");
    const allPaths = document.querySelectorAll(".react-flow__renderer path, .react-flow__viewport path");
    const gEls = document.querySelectorAll(".react-flow__edge, g[data-id]");
    return {
      edges: document.querySelectorAll(".react-flow__edge").length,
      gWithDataId: [...gEls].map((g) => g.getAttribute("data-id")).slice(0, 6),
      pathCount: allPaths.length,
      edgesLayerHTML: (layer?.innerHTML || "").slice(0, 400),
    };
  });
  console.log("EDGEINFO:", JSON.stringify(edgeInfo));
  await snap("ag6-placewire", 10);
} else if (which === "wire") {
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const dragH = async (fromSel: string, toSel: string) => {
    const src = await page.locator(fromSel).first().boundingBox();
    const dst = await page.locator(toSel).first().boundingBox();
    if (!src || !dst) return;
    // hover source node to reveal handles
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2, { steps: 12 });
    await page.waitForTimeout(300);
    const from = { x: src.x + src.width + 14, y: src.y + src.height / 2 };
    const to = { x: dst.x - 14, y: dst.y + dst.height / 2 };
    console.log("drag", JSON.stringify(from), "->", JSON.stringify(to));
    await page.mouse.move(from.x, from.y, { steps: 10 });
    await page.mouse.down();
    await page.waitForTimeout(150);
    await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2, { steps: 30 });
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(600);
  };
  await dragH(".react-flow__node-textBlock", ".react-flow__node-emptyImageBlock");
  await dragH(".react-flow__node-emptyImageBlock", ".react-flow__node-videoBlock");
  console.log("edge count:", await page.locator(".react-flow__edge").count());
  await page.keyboard.press("Shift+o");
  await page.waitForTimeout(2200);
  console.log("edge count after layout:", await page.locator(".react-flow__edge").count());
  await snap("ag6-wire", 20);
} else if (which === "place") {
  // Place Text/Image/Video via keyboard shortcuts at cursor, fit, dump geometry.
  await openCanvas(PROJECT);
  await page.mouse.move(360, 400, { steps: 6 });
  await page.keyboard.press("Shift+T");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.mouse.move(660, 400, { steps: 6 });
  await page.keyboard.press("Shift+I");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.mouse.move(980, 400, { steps: 6 });
  await page.keyboard.press("Shift+V");
  await page.waitForTimeout(900);
  await page.mouse.click(360, 700);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll(".react-flow__node")].map((el) => {
      const r = el.getBoundingClientRect();
      return { cls: (el.className.match(/node-(\w+)/) || [])[1], x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
    return nodes;
  });
  console.log("NODES:", JSON.stringify(info, null, 0));
  // hover each node to reveal handles then dump handle geometry
  for (const n of info) {
    await page.mouse.move(n.x + n.w / 2, n.y + n.h / 2, { steps: 4 });
    await page.waitForTimeout(400);
  }
  const handles = await page.evaluate(() => {
    return [...document.querySelectorAll(".react-flow__handle")].map((el) => {
      const r = el.getBoundingClientRect();
      return { node: (el.closest(".react-flow__node")?.className.match(/node-(\w+)/) || [])[1], src: el.classList.contains("source"), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
  });
  console.log("HANDLES:", JSON.stringify(handles, null, 0));
  await snap("ag6-place", 40);
} else if (which === "cleanempty") {
  // Delete every empty image/video node in the project, keep generated ones.
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  for (let guard = 0; guard < 12; guard++) {
    const empties = page.locator(".react-flow__node-emptyImageBlock, .react-flow__node-videoBlock");
    const c = await empties.count();
    console.log("empties remaining:", c);
    if (c === 0) break;
    const el = empties.first();
    const b = await el.boundingBox();
    if (!b) break;
    await page.mouse.click(b.x + b.width / 2, b.y + 12);
    await page.waitForTimeout(300);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(600);
    const dlg = page.getByRole("dialog");
    if (await dlg.count()) {
      const btn = dlg.getByRole("button", { name: /Delete/ }).last();
      if (await btn.isVisible().catch(() => false)) await btn.click();
      await page.waitForTimeout(600);
    }
  }
  await page.waitForTimeout(800);
  console.log("final node classes:", await page.locator(".react-flow__node").evaluateAll((els) => els.map((e) => e.className.replace(/react-flow__node ?/, "").split(" ")[0])));
} else if (which === "download") {
  // needs a project that ALREADY has a generated image node
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  const img = page
    .locator(".react-flow__node")
    .filter({ has: page.locator("img[alt='Generated result']") })
    .first();
  const box = await img.boundingBox();
  if (!box) {
    console.log("NO generated image node present");
  } else {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
    await page.waitForTimeout(900);
    await snap("ag6-img-ctx", 160);
  }
}

await browser.close();
