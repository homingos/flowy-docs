/**
 * Setup / probe for image-tools clips.
 *   ../node_modules/.bin/tsx <this> <mode>
 * modes: probe-empty | gen-base | probe-tools | probe-tool <toolName>
 */
import { chromium, type Page } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const mode = process.argv[2] ?? "probe-empty";
const arg = process.argv[3];
const PROJECT = process.env.PROJECT ?? "6a4b63bc1263d94b3dfbdd3b";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();

async function shot(name: string) {
  await page.screenshot({ path: `${SCRATCH}/${name}.png` });
  console.log("shot:", `${SCRATCH}/${name}.png`);
}
async function snap(name: string, lines = 200) {
  await shot(name);
  const s = await page.locator("body").ariaSnapshot();
  console.log(`===== ${name} =====`);
  console.log(s.split("\n").slice(0, lines).join("\n"));
}
async function openCanvas(id: string, settle = 6000) {
  await page.goto(`${BASE}/editor/${id}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(settle);
  await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 8000 }).catch(() => {});
  await page.getByRole("button", { name: "Not now" }).click({ timeout: 2000 }).catch(() => {});
}
async function nodesReport() {
  const nodes = await page.evaluate(() => {
    const out: Array<Record<string, unknown>> = [];
    document.querySelectorAll(".react-flow__node").forEach((el) => {
      const r = el.getBoundingClientRect();
      out.push({
        id: el.getAttribute("data-id"),
        cls: Array.from(el.classList).filter((c) => c.startsWith("react-flow__node-")).join(","),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      });
    });
    return out;
  });
  console.log("node count:", nodes.length);
  for (const n of nodes) console.log(JSON.stringify(n));
}

async function addImageNode(p: Page) {
  await p.getByRole("button", { name: "Add a node" }).click();
  await p.waitForTimeout(900);
  const menu = p.locator('[aria-label="Node selection"]');
  await menu.getByRole("button", { name: /^Image/ }).first().click();
  await p.locator(".react-flow__node-emptyImageBlock").first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(1000);
}

if (mode === "probe-empty") {
  await openCanvas(PROJECT);
  await nodesReport();
  await addImageNode(page);
  await snap("s-empty-image", 220);
  await nodesReport();
} else if (mode === "gen-base") {
  await openCanvas(PROJECT);
  const prompt = arg ?? "a red sports car on a coastal road, golden hour";
  await addImageNode(page);
  // type the prompt into the node's prompt box
  const ta = page.locator(".react-flow__node-emptyImageBlock textarea, .react-flow__node-emptyImageBlock [contenteditable='true']").first();
  await ta.click();
  await page.keyboard.type(prompt, { delay: 8 });
  await page.waitForTimeout(400);
  await shot("s-base-typed");
  // plain Enter to generate
  await page.keyboard.press("Enter");
  console.log("submitted; waiting for result…");
  const ok = await page
    .locator(".react-flow__node img[alt='Generated result']")
    .first()
    .waitFor({ state: "visible", timeout: 240_000 })
    .then(() => true)
    .catch(() => false);
  console.log("generated:", ok);
  await page.waitForTimeout(1500);
  await snap("s-base-done", 60);
  await nodesReport();
} else if (mode === "probe-tools") {
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await nodesReport();
  const img = page.locator(".react-flow__node").filter({ has: page.locator("img[alt='Generated result']") }).first();
  const box = await img.boundingBox();
  if (!box) throw new Error("no generated image node");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  await page.waitForTimeout(900);
  await snap("s-ctx", 80);
  const tools = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
  const tb = await tools.boundingBox().catch(() => null);
  console.log("tools trigger:", tb);
  if (tb) {
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(900);
    const panel = page.getByRole("menu", { name: "Image tools" });
    await snap("s-tools-submenu", 120);
    const items = await panel.getByRole("button").allInnerTexts().catch(() => []);
    console.log("submenu items:", JSON.stringify(items));
  }
} else if (mode === "probe-tool") {
  // Spawn a specific tool node and dump its inspector controls.
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  const baseCount = await page.locator(".react-flow__node").count();
  const img = page.locator(".react-flow__node").filter({ has: page.locator("img[alt='Generated result']") }).first();
  const box = await img.boundingBox();
  if (!box) throw new Error("no generated image node");
  // right-click near the TOP of the node so the tall context menu + submenu
  // have maximum downward room.
  const rcx = box.x + box.width / 2;
  const rcy = box.y + 24;
  await page.mouse.click(rcx, rcy, { button: "right" });
  await page.waitForTimeout(900);
  const tools = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
  const tb = await tools.boundingBox();
  if (!tb) throw new Error("no tools trigger");
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
  await page.waitForTimeout(900);
  const panel = page.getByRole("menu", { name: "Image tools" });
  const pnb = await panel.boundingBox();
  if (!pnb) throw new Error("no submenu");
  await page.mouse.move(pnb.x + 20, tb.y + tb.height / 2, { steps: 10 });
  await page.waitForTimeout(400);
  const name = arg ?? "Crop";
  const item = panel.getByRole("button", { name, exact: false }).first();
  // reveal it: scroll the submenu with the wheel until the item is inside the viewport
  let ib = await item.boundingBox();
  console.log(`item ${name} initial:`, ib);
  for (let i = 0; i < 8 && ib && ib.y > 720; i++) {
    await page.mouse.move(pnb.x + pnb.width / 2, 700, { steps: 4 });
    await page.mouse.wheel(0, 160);
    await page.waitForTimeout(200);
    ib = await item.boundingBox();
  }
  console.log(`item ${name} after scroll:`, ib);
  if (!ib) throw new Error(`no item ${name}`);
  await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 6 });
  await page.waitForTimeout(300);
  await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
  await page.waitForTimeout(2500);
  const afterCount = await page.locator(".react-flow__node").count();
  console.log(`nodes: base=${baseCount} after=${afterCount} (spawned=${afterCount > baseCount})`);
  const credBefore = await page.getByRole("button", { name: /credits available/ }).textContent().catch(() => "?");
  console.log("credits:", credBefore);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  await snap(`s-tool-${name.replace(/\s+/g, "")}`, 250);
  await nodesReport();
} else if (mode === "probe-all") {
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  const img = page.locator(".react-flow__node").filter({ has: page.locator("img[alt='Generated result']") }).first();
  const tools = ["Crop", "Levels", "Blur", "Upscale", "Remove Background", "Inpaint", "Outpaint", "Change Angle", "Layered"];
  for (const name of tools) {
    const before = await page.locator(".react-flow__node").count();
    const box = await img.boundingBox();
    if (!box) { console.log(name, "-> no img box"); continue; }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
    await page.waitForTimeout(700);
    const trg = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
    const tb = await trg.boundingBox().catch(() => null);
    if (!tb) { console.log(name, "-> no Tools trigger"); await page.keyboard.press("Escape"); continue; }
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(700);
    const panel = page.getByRole("menu", { name: "Image tools" });
    const pnb = await panel.boundingBox().catch(() => null);
    if (!pnb) { console.log(name, "-> no submenu"); await page.keyboard.press("Escape"); continue; }
    await page.mouse.move(pnb.x + 20, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(300);
    const item = panel.getByRole("button", { name, exact: false }).first();
    const ib = await item.boundingBox().catch(() => null);
    if (!ib) { console.log(name, "-> item MISSING"); await page.keyboard.press("Escape"); continue; }
    await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 5 });
    await page.waitForTimeout(200);
    await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
    await page.waitForTimeout(1800);
    const after = await page.locator(".react-flow__node").count();
    console.log(`${name} -> before=${before} after=${after} SPAWNED=${after > before}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    for (let i = 0; i < 3; i++) {
      if ((await page.locator(".react-flow__node").count()) <= before) break;
      await page.keyboard.press("Meta+z");
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(300);
  }
  console.log("final node count:", await page.locator(".react-flow__node").count());
} else if (mode === "reset") {
  const BASE_ID = process.env.BASE_ID ?? "image_10a6b80a2de84d8b990816ff9e30f073";
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  for (let pass = 0; pass < 12; pass++) {
    const ids: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".react-flow__node")).map((el) => el.getAttribute("data-id") ?? ""),
    );
    const extra = ids.filter((id) => id && id !== BASE_ID);
    if (extra.length === 0) break;
    const target = extra[0];
    const box = await page.locator(`.react-flow__node[data-id="${target}"]`).boundingBox().catch(() => null);
    if (!box) break;
    await page.mouse.click(box.x + box.width / 2, box.y + 12, { button: "right" });
    await page.waitForTimeout(500);
    const del = page.getByRole("button", { name: /^Delete/ }).first();
    if (await del.isVisible().catch(() => false)) {
      await del.click();
      await page.waitForTimeout(700);
      const dlg = page.getByRole("dialog");
      if (await dlg.count()) {
        const btn = dlg.getByRole("button", { name: /Delete/ }).last();
        if (await btn.isVisible().catch(() => false)) await btn.click();
        await page.waitForTimeout(700);
      }
    } else {
      await page.keyboard.press("Escape");
      await page.mouse.click(box.x + box.width / 2, box.y + 12);
      await page.waitForTimeout(300);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(700);
      const dlg = page.getByRole("dialog");
      if (await dlg.count()) {
        const btn = dlg.getByRole("button", { name: /Delete/ }).last();
        if (await btn.isVisible().catch(() => false)) await btn.click();
        await page.waitForTimeout(700);
      }
    }
  }
  await page.waitForTimeout(500);
  await nodesReport();
} else if (mode === "costs") {
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const img = page.locator(".react-flow__node").filter({ has: page.locator("img[alt='Generated result']") }).first();
  const tools = ["Upscale", "Remove Background", "Outpaint", "Change Angle", "Layered", "Inpaint"];
  for (const name of tools) {
    const before = await page.locator(".react-flow__node").count();
    const box = await img.boundingBox();
    if (!box) break;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
    await page.waitForTimeout(600);
    const trg = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
    const tb = await trg.boundingBox().catch(() => null);
    if (!tb) { await page.keyboard.press("Escape"); continue; }
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(600);
    const panel = page.getByRole("menu", { name: "Image tools" });
    const pnb = await panel.boundingBox().catch(() => null);
    if (!pnb) { await page.keyboard.press("Escape"); continue; }
    await page.mouse.move(pnb.x + 20, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(300);
    const item = panel.getByRole("button", { name, exact: false }).first();
    const ib = await item.boundingBox().catch(() => null);
    if (!ib) { console.log(name, "-> item MISSING"); await page.keyboard.press("Escape"); continue; }
    await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
    await page.waitForTimeout(1600);
    const after = await page.locator(".react-flow__node").count();
    // read inspector text for cost
    const insp = await page.locator('[aria-label$="settings"], complementary').first().innerText().catch(() => "");
    const m = insp.match(/Cost[^\n]*|~\s*\d+\s*credits|\d+\s*credits/i);
    // also gather run-button labels
    const btns = await page.locator('complementary button, [class*="settings"] button').allInnerTexts().catch(() => []);
    console.log(`${name}: spawned=${after > before} cost="${m ? m[0].trim() : "n/a"}" buttons=${JSON.stringify(btns.filter(Boolean).slice(0, 12))}`);
    // undo spawn
    await page.keyboard.press("Escape");
    for (let i = 0; i < 3; i++) {
      if ((await page.locator(".react-flow__node").count()) <= before) break;
      await page.keyboard.press("Meta+z");
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(300);
  }
} else if (mode === "chain") {
  // Can a tool node itself spawn a downstream tool via its context menu?
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const img = page.locator(".react-flow__node").filter({ has: page.locator("img[alt='Generated result']") }).first();
  const spawnTool = async (target: import("playwright").Locator, name: string) => {
    const box = await target.boundingBox();
    if (!box) throw new Error("no target box");
    await page.mouse.click(box.x + box.width / 2, box.y + 24, { button: "right" });
    await page.waitForTimeout(700);
    const trg = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
    const tb = await trg.boundingBox().catch(() => null);
    if (!tb) { console.log(`  [${name}] no Tools trigger`); await page.keyboard.press("Escape"); return false; }
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(700);
    const panel = page.getByRole("menu", { name: "Image tools" });
    const pnb = await panel.boundingBox().catch(() => null);
    if (!pnb) { console.log(`  [${name}] no submenu`); await page.keyboard.press("Escape"); return false; }
    await page.mouse.move(pnb.x + 20, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(300);
    const item = panel.getByRole("button", { name, exact: false }).first();
    let ib = await item.boundingBox().catch(() => null);
    for (let i = 0; i < 8 && ib && ib.y > 720; i++) {
      await page.mouse.move(pnb.x + pnb.width / 2, 700, { steps: 3 });
      await page.mouse.wheel(0, 160);
      await page.waitForTimeout(180);
      ib = await item.boundingBox().catch(() => null);
    }
    if (!ib) { console.log(`  [${name}] item missing`); await page.keyboard.press("Escape"); return false; }
    const before = await page.locator(".react-flow__node").count();
    await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
    await page.waitForTimeout(1500);
    const after = await page.locator(".react-flow__node").count();
    console.log(`  [${name}] spawned=${after > before} (${before}->${after})`);
    return after > before;
  };
  await spawnTool(img, "Crop");
  const crop = page.locator(".react-flow__node-toolBlock").first();
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(800);
  await spawnTool(crop, "Levels");
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1000);
  await snap("s-chain", 40);
  await nodesReport();
} else if (mode === "dom") {
  await openCanvas(PROJECT);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const img = page.locator(".react-flow__node").filter({ has: page.locator("img[alt='Generated result']") }).first();
  const which = arg ?? "Crop";
  const box = await img.boundingBox();
  if (!box) throw new Error("no img");
  await page.mouse.click(box.x + box.width / 2, box.y + 24, { button: "right" });
  await page.waitForTimeout(700);
  const trg = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
  const tb = await trg.boundingBox();
  await page.mouse.move(tb!.x + tb!.width / 2, tb!.y + tb!.height / 2, { steps: 8 });
  await page.waitForTimeout(700);
  const panel = page.getByRole("menu", { name: "Image tools" });
  const pnb = await panel.boundingBox();
  await page.mouse.move(pnb!.x + 20, tb!.y + tb!.height / 2, { steps: 8 });
  await page.waitForTimeout(300);
  const item = panel.getByRole("button", { name: which, exact: false }).first();
  const ib = await item.boundingBox();
  await page.mouse.click(ib!.x + ib!.width / 2, ib!.y + ib!.height / 2);
  await page.waitForTimeout(1800);
  // select the tool node and zoom to it
  const tool = page.locator(".react-flow__node-toolBlock").first();
  const tbx = await tool.boundingBox();
  if (tbx) { await page.mouse.click(tbx.x + tbx.width / 2, tbx.y + 12); await page.waitForTimeout(300); }
  await page.keyboard.press("Shift+Digit2");
  await page.waitForTimeout(1200);
  await shot(`s-dom-${which.replace(/\s+/g, "")}`);
  // dump range inputs, sliders, and small handle-like elements
  const info = await page.evaluate(() => {
    const out: Record<string, unknown> = {};
    const ranges = Array.from(document.querySelectorAll('input[type=range]')).map((el) => {
      const r = el.getBoundingClientRect();
      return { aria: el.getAttribute("aria-label"), min: (el as HTMLInputElement).min, max: (el as HTMLInputElement).max, val: (el as HTMLInputElement).value, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
    });
    out.ranges = ranges;
    const sliders = Array.from(document.querySelectorAll('[role=slider]')).map((el) => {
      const r = el.getBoundingClientRect();
      return { aria: el.getAttribute("aria-label"), now: el.getAttribute("aria-valuenow"), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
    out.sliders = sliders;
    const toolImg = document.querySelector(".react-flow__node-toolBlock img");
    if (toolImg) { const r = toolImg.getBoundingClientRect(); out.toolImg = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }
    // elements inside tool node that look like drag handles (small abs-positioned divs)
    const node = document.querySelector(".react-flow__node-toolBlock");
    const handles: Array<Record<string, number | string>> = [];
    if (node) node.querySelectorAll("div").forEach((d) => {
      const r = d.getBoundingClientRect();
      const cs = getComputedStyle(d);
      if ((cs.cursor.includes("resize") || d.className.toLowerCase().includes("handle")) && r.width < 40 && r.width > 2) {
        handles.push({ cls: d.className.slice(0, 40), cursor: cs.cursor, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width) });
      }
    });
    out.handles = handles.slice(0, 16);
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
} else if (mode === "gen-second") {
  await openCanvas(PROJECT);
  const prompt = arg ?? "a glossy blue ceramic coffee mug on a white background, studio lighting";
  await addImageNode(page);
  const ta = page.locator(".react-flow__node-emptyImageBlock textarea, .react-flow__node-emptyImageBlock [contenteditable='true']").first();
  await ta.click();
  await page.keyboard.type(prompt, { delay: 8 });
  await page.waitForTimeout(400);
  await page.keyboard.press("Enter");
  const ok = await page
    .locator(".react-flow__node img[alt='Generated result']")
    .nth(1)
    .waitFor({ state: "visible", timeout: 240_000 })
    .then(() => true)
    .catch(() => false);
  console.log("second generated:", ok);
  await page.waitForTimeout(1200);
  await nodesReport();
}

await browser.close();
