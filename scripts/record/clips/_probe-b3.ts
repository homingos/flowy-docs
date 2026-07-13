/**
 * Batch-3 probe (excluded from run.ts by the "_" prefix).
 *
 *   SCRATCH=<dir> ../node_modules/.bin/tsx clips/_probe-b3.ts <which>
 *
 * Modes: state | imgnode | gen | gen2 | tool <name> | cleanup
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const which = process.argv[2] ?? "state";
const arg2 = process.argv[3];
const T0 = "6a4ada4b9a876dea0d2d1126"; // sandbox (empty)

const browser = await chromium.launch({ headless: true });
const big = which === "dry1080" || which === "dry2" || which === "dry3";
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: big ? { width: 1920, height: 1080 } : { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();

async function shot(name: string) {
  await page.screenshot({ path: `${SCRATCH}/${name}.png` });
  console.log("shot:", name);
}

async function nodesReport() {
  const nodes = await page.evaluate(() => {
    const out: Array<Record<string, unknown>> = [];
    document.querySelectorAll(".react-flow__node").forEach((el) => {
      const r = el.getBoundingClientRect();
      out.push({
        id: el.getAttribute("data-id"),
        cls: Array.from(el.classList)
          .filter((c) => c.startsWith("react-flow__node-"))
          .join(","),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    });
    return out;
  });
  console.log("node count:", nodes.length);
  for (const n of nodes.slice(0, 30)) console.log(JSON.stringify(n));
}

async function creditsReport() {
  const snap = await page.locator("body").ariaSnapshot();
  for (const line of snap.split("\n")) {
    if (/credit/i.test(line)) console.log("credits-line:", line.trim());
  }
}

async function openCanvas(id: string, settleMs = 6000) {
  await page.goto(`${BASE}/editor/${id}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(settleMs);
  const skip = page.getByRole("button", { name: "Skip for now" });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(800);
    console.log("dismissed first-run overlay");
  }
}

if (which === "state") {
  await openCanvas(T0);
  await nodesReport();
  await creditsReport();
  await shot("b3-state");
} else if (which === "imgnode") {
  await openCanvas(T0);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Image/ }).click();
  await page.waitForTimeout(1500);
  await nodesReport();
  await shot("b3-imgnode-added");
  // aria snapshot of the whole page to find prompt bar / inspector
  const snap = await page.locator("body").ariaSnapshot();
  console.log("==== SNAPSHOT ====");
  console.log(snap);
  // is there an inspector with Aspect ratio / Size selects?
  const ar = page.locator("select[aria-label='Aspect ratio']");
  const sz = page.locator("select[aria-label='Size']");
  console.log("aspect select count:", await ar.count(), "size select count:", await sz.count());
  if (await ar.count()) {
    console.log("aspect box:", await ar.first().boundingBox());
    console.log("size box:", await sz.first().boundingBox());
  }
  // node footer pills
  const nodeEl = page.locator(".react-flow__node-emptyImageBlock").first();
  console.log("node box:", await nodeEl.boundingBox());
  // prompt textarea
  const ta = page.locator("textarea").first();
  console.log("textarea count:", await page.locator("textarea").count());
  for (let i = 0; i < (await page.locator("textarea").count()); i++) {
    const t = page.locator("textarea").nth(i);
    console.log(
      `ta[${i}]`,
      await t.getAttribute("placeholder"),
      await t.getAttribute("aria-label"),
      JSON.stringify(await t.boundingBox()),
    );
  }
  void ta;
  // don't keep the node — undo
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  for (let k = 0; k < 4 && (await page.locator(".react-flow__node").count()) > 0; k++) {
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(500);
  }
  await nodesReport();
} else if (which === "gen") {
  // Full generation dry-run in sandbox. LEAVES the generated image in place
  // (seed material for tool clips).
  await openCanvas(T0);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Image/ }).click();
  await page.waitForTimeout(1200);
  const node = page.locator(".react-flow__node-emptyImageBlock").first();
  const ta = node.locator("textarea").first();
  await ta.click();
  await page.keyboard.type(
    arg2 ?? "product shot of a matte ceramic coffee mug on a walnut table, soft window light",
    { delay: 5 },
  );
  await page.waitForTimeout(400);
  await shot("b3-gen-typed");
  const t0 = Date.now();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);
  await shot("b3-gen-generating");
  await page
    .locator(".react-flow__node img[alt='Generated result']")
    .first()
    .waitFor({ state: "visible", timeout: 240_000 });
  console.log("generation took", ((Date.now() - t0) / 1000).toFixed(1), "s");
  await page.waitForTimeout(2000);
  await nodesReport();
  await creditsReport();
  await shot("b3-gen-done");
} else if (which === "tool") {
  // Spawn a tool from the context menu on the sandbox's generated image and
  // dump the inspector controls. Does NOT run the tool. Cleans up after.
  const name = arg2 ?? "Upscale";
  await openCanvas(T0);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const baseCount = await page.locator(".react-flow__node").count();
  console.log("base count:", baseCount);
  const img = page
    .locator(".react-flow__node")
    .filter({ has: page.locator("img[alt='Generated result']") })
    .first();
  const box = await img.boundingBox();
  if (!box) throw new Error("no generated image in sandbox");
  // right-click near the TOP of the node so the menu has downward room
  await page.mouse.click(box.x + box.width / 2, box.y + 30, { button: "right" });
  await page.waitForTimeout(900);
  const tools = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
  const tb = await tools.boundingBox();
  if (!tb) throw new Error("no Tools trigger");
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
  await page.waitForTimeout(900);
  const panel = page.getByRole("menu", { name: "Image tools" });
  const pnb = await panel.boundingBox();
  if (!pnb) throw new Error("no Image tools submenu");
  // slide straight horizontally into the panel first (curved path drops hover)
  await page.mouse.move(pnb.x + 24, tb.y + tb.height / 2, { steps: 10 });
  await page.waitForTimeout(400);
  const item = panel.getByRole("button", { name, exact: true }).first();
  let ib = await item.boundingBox();
  if (!ib) throw new Error(`missing tool: ${name}`);
  const vh = page.viewportSize()?.height ?? 800;
  if (ib.y + ib.height / 2 > vh - 60) {
    // scroll the submenu's inner list until the item is comfortably visible
    for (let k = 0; k < 6; k++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(250);
      ib = await item.boundingBox();
      if (ib && ib.y + ib.height / 2 <= vh - 60) break;
    }
  }
  if (!ib) throw new Error(`item lost after scroll: ${name}`);
  console.log("item box before click:", JSON.stringify(ib));
  // vertical move within the panel, then click
  await page.mouse.move(pnb.x + 24, ib.y + ib.height / 2, { steps: 8 });
  await page.waitForTimeout(250);
  await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 4 });
  await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
  await page.waitForTimeout(2500);
  await nodesReport();
  await shot(`b3-tool-${name.replace(/\s+/g, "-").toLowerCase()}`);
  const snap = await page.locator("body").ariaSnapshot();
  console.log("==== SNAPSHOT ====");
  console.log(snap);
  // cleanup: undo until back to base
  const undoBtn = page.getByRole("button", { name: "Undo" });
  for (let i = 0; i < 5; i++) {
    const c = await page.locator(".react-flow__node").count();
    if (c <= baseCount) break;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await undoBtn.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  console.log("final count:", await page.locator(".react-flow__node").count());
} else if (which === "submenu") {
  // Open the Tools submenu and dump every item's geometry + a screenshot.
  await openCanvas(T0);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const img = page
    .locator(".react-flow__node")
    .filter({ has: page.locator("img[alt='Generated result']") })
    .first();
  const box = await img.boundingBox();
  if (!box) throw new Error("no image");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  await page.waitForTimeout(900);
  const tools = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
  const tb = await tools.boundingBox();
  if (!tb) throw new Error("no Tools trigger");
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
  await page.waitForTimeout(900);
  const panel = page.getByRole("menu", { name: "Image tools" });
  const pnb = await panel.boundingBox();
  console.log("panel box:", pnb);
  if (!pnb) throw new Error("no panel");
  await page.mouse.move(pnb.x + 24, tb.y + tb.height / 2, { steps: 10 });
  await page.waitForTimeout(400);
  const items = await panel.getByRole("button").all();
  for (const it of items) {
    const t = (await it.textContent())?.trim();
    const b = await it.boundingBox();
    console.log("item:", JSON.stringify({ t, x: b?.x, y: b?.y, w: b?.width, h: b?.height }));
  }
  await shot("b3-submenu");
  // is the panel scrollable?
  const sc = await panel.evaluate((el) => ({
    sh: el.scrollHeight,
    ch: el.clientHeight,
    oy: getComputedStyle(el).overflowY,
  }));
  console.log("panel scroll:", JSON.stringify(sc));
} else if (which === "dry1080") {
  // Dry-run of the node-image walkthrough at 1920x1080 — everything except
  // pressing Generate. Cleans up after itself.
  await openCanvas(T0);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Image/ }).click();
  await page.waitForTimeout(1500);
  const node = page.locator(".react-flow__node-emptyImageBlock").first();
  console.log("node1 box:", await node.boundingBox());
  const ta = node.locator("textarea").first();
  await ta.click();
  await page.keyboard.type("studio product shot of retro sneakers", { delay: 5 });
  await page.waitForTimeout(400);
  await shot("b3-dry-typed");
  // footer pill "1:1" → inspector flash
  const arPill = node.getByRole("button", { name: "1:1" });
  console.log("ar pill box:", await arPill.boundingBox());
  await arPill.click();
  await page.waitForTimeout(900);
  await shot("b3-dry-arflash");
  const arSel = page.locator("select[aria-label='Aspect ratio']");
  console.log("ar select box:", await arSel.boundingBox());
  await arSel.selectOption("4:3");
  await page.waitForTimeout(900);
  console.log("node1 box after 4:3:", await node.boundingBox());
  await shot("b3-dry-ar43");
  // size pill
  const szPill = node.getByRole("button", { name: "1K", exact: true });
  console.log("size pill box:", await szPill.boundingBox());
  await szPill.click();
  await page.waitForTimeout(900);
  const szSel = page.locator("select[aria-label='Size']");
  await szSel.selectOption("2K");
  await page.waitForTimeout(600);
  await szSel.selectOption("1K");
  await page.waitForTimeout(400);
  await shot("b3-dry-size");
  // Generate button
  const gen = node.getByRole("button", { name: "Generate" });
  console.log("generate btn box:", await gen.boundingBox());
  // add a SECOND image node while first exists — where does it land?
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Image/ }).click();
  await page.waitForTimeout(1500);
  await nodesReport();
  await shot("b3-dry-two");
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  await nodesReport();
  await shot("b3-dry-two-fit");
  // hover node1 right edge to reveal handles, log handle geometry
  const b1 = await page.locator(".react-flow__node").first().boundingBox();
  if (b1) {
    await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2, { steps: 5 });
    await page.waitForTimeout(600);
    const handles = await page.evaluate(() => {
      const out: Array<Record<string, unknown>> = [];
      document.querySelectorAll(".react-flow__handle").forEach((el) => {
        const r = el.getBoundingClientRect();
        out.push({
          node: el.closest(".react-flow__node")?.getAttribute("data-id")?.slice(0, 12),
          source: el.classList.contains("source"),
          x: Math.round(r.x + r.width / 2),
          y: Math.round(r.y + r.height / 2),
          w: Math.round(r.width),
        });
      });
      return out;
    });
    for (const hh of handles) console.log("handle:", JSON.stringify(hh));
  }
  // cleanup both nodes
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  for (let k = 0; k < 2; k++) {
    const el = page.locator(".react-flow__node").first();
    if ((await el.count()) === 0) break;
    const b = await el.boundingBox();
    if (!b) break;
    await page.mouse.click(b.x + b.width / 2, b.y + 10);
    await page.waitForTimeout(400);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(700);
    const dlg = page.getByRole("dialog");
    if (await dlg.count()) {
      const btn = dlg.getByRole("button", { name: /Delete/ }).last();
      if (await btn.isVisible().catch(() => false)) await btn.click();
      await page.waitForTimeout(800);
    }
  }
  await nodesReport();
} else if (which === "dry2") {
  // Shift+I placement + image→image connect at 1920x1080. Cleans up.
  await openCanvas(T0);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Image/ }).click();
  await page.waitForTimeout(1200);
  const n1 = page.locator(".react-flow__node").first();
  console.log("n1:", await n1.boundingBox());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  // click empty space to deselect, then Shift+I at cursor
  await page.mouse.click(1500, 850);
  await page.waitForTimeout(400);
  await page.mouse.move(1400, 500, { steps: 5 });
  await page.keyboard.press("Shift+I");
  await page.waitForTimeout(1200);
  await nodesReport();
  await shot("b3-dry2-placed");
  // connect n1 (right, source) → n2 (left, target)
  const boxes = await page.evaluate(() => {
    const out: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
    document.querySelectorAll(".react-flow__node").forEach((el) => {
      const r = el.getBoundingClientRect();
      out.push({
        id: el.getAttribute("data-id") ?? "",
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
      });
    });
    return out;
  });
  const a = boxes[0];
  const b = boxes[1];
  if (a && b) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    // SELECT the left node (click its header strip) so its handles get
    // pointer-events, then read exact positions
    await page.mouse.click(left.x + left.w / 2, left.y + 8);
    await page.waitForTimeout(700);
    const srcH = page.locator(
      `.react-flow__node[data-id="${left.id}"] .react-flow__handle.source`,
    );
    const dstH = page.locator(
      `.react-flow__node[data-id="${right.id}"] .react-flow__handle.target`,
    );
    console.log("src handle count:", await srcH.count(), "dst:", await dstH.count());
    const sb = await srcH.first().boundingBox();
    const db = await dstH.first().boundingBox();
    console.log("src handle:", sb, "dst handle:", db);
    if (sb && db) {
      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 8 });
      await page.waitForTimeout(300);
      await page.mouse.down();
      await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 25 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(900);
    }
    console.log("edges:", await page.locator(".react-flow__edge").count());
    await shot("b3-dry2-connected");
  }
  // cleanup
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  for (let k = 0; k < 3; k++) {
    const el = page.locator(".react-flow__node").first();
    if ((await el.count()) === 0) break;
    const bb = await el.boundingBox();
    if (!bb) break;
    await page.mouse.click(bb.x + bb.w / 2 || bb.x + bb.width / 2, bb.y + 10);
    await page.waitForTimeout(400);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(700);
    const dlg = page.getByRole("dialog");
    if (await dlg.count()) {
      const btn = dlg.getByRole("button", { name: /Delete/ }).last();
      if (await btn.isVisible().catch(() => false)) await btn.click();
      await page.waitForTimeout(800);
    }
  }
  await nodesReport();
} else if (which === "dry3") {
  // Upload an image (source content) then test: (a) handle-click radial menu,
  // (b) manual handle→handle drag to a fresh empty image node. Cleans up.
  await openCanvas(T0);
  const fileInput = page.locator("input[type=file]").first();
  await fileInput.setInputFiles(`${SCRATCH}/probe-src.png`);
  await page.waitForTimeout(4000);
  await nodesReport();
  const srcNode = page.locator(".react-flow__node-staticImageBlock").first();
  await srcNode.waitFor({ state: "visible", timeout: 20000 });
  let sBox = await srcNode.boundingBox();
  console.log("uploaded node:", sBox);
  if (!sBox) throw new Error("no uploaded node");
  // (a) select node, click its right handle → radial menu?
  await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + 8);
  await page.waitForTimeout(700);
  const srcH = srcNode.locator(".react-flow__handle.source").first();
  let hb = await srcH.boundingBox();
  console.log("src handle:", hb);
  if (hb) {
    await page.mouse.click(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.waitForTimeout(1000);
    await shot("b3-dry3-radial");
    const snap = await page.locator("body").ariaSnapshot();
    const i = snap.indexOf("Image");
    console.log(snap.slice(Math.max(0, i - 600), i + 600));
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  // (b) manual drag to a fresh empty image node
  await page.mouse.click(1500, 300);
  await page.waitForTimeout(300);
  await page.mouse.move(1450, 520, { steps: 5 });
  await page.keyboard.press("Shift+I");
  await page.waitForTimeout(1200);
  await nodesReport();
  const empty = page.locator(".react-flow__node-emptyImageBlock").first();
  const eBox = await empty.boundingBox();
  sBox = await srcNode.boundingBox();
  console.log("src:", sBox, "empty:", eBox);
  if (sBox && eBox) {
    await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + 8);
    await page.waitForTimeout(600);
    hb = await srcH.boundingBox();
    const dstH = empty.locator(".react-flow__handle.target").first();
    const db = await dstH.boundingBox();
    console.log("handles:", hb, db);
    if (hb && db) {
      await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>;
        w.__evt = [] as string[];
        for (const t of ["pointerdown", "pointermove", "pointerup", "mouseup", "mousedown"]) {
          window.addEventListener(
            t,
            (e) => {
              const arr = w.__evt as string[];
              if (arr.length < 60)
                arr.push(`${t}@${Math.round((e as MouseEvent).clientX)},${Math.round((e as MouseEvent).clientY)}`);
            },
            true,
          );
        }
      });
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2, { steps: 8 });
      await page.waitForTimeout(300);
      await page.mouse.down();
      await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 25 });
      await page.waitForTimeout(400);
      await page.mouse.up();
      await page.waitForTimeout(900);
      const evt = await page.evaluate(() => (window as unknown as Record<string, unknown>).__evt);
      console.log("events:", JSON.stringify(evt));
      console.log(
        "connectionline present:",
        await page.locator(".react-flow__connectionline, .react-flow__connection").count(),
      );
      console.log("edges after handle drop:", await page.locator(".react-flow__edge").count());
      const snap2 = await page.locator("body").ariaSnapshot();
      const j = snap2.toLowerCase().indexOf("connect");
      if (j >= 0) console.log("post-drop snap:", snap2.slice(Math.max(0, j - 200), j + 400));
      await shot("b3-dry3-connected");
    }
  }
  // cleanup everything
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Meta+a");
  await page.waitForTimeout(500);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(800);
  const dlg = page.getByRole("dialog");
  if (await dlg.count()) {
    const btn = dlg.getByRole("button", { name: /Delete/ }).last();
    if (await btn.isVisible().catch(() => false)) await btn.click();
    await page.waitForTimeout(1000);
  }
  await nodesReport();
} else if (which === "seed") {
  // Upload the two seed images and arrange them side by side. Prints ids.
  await openCanvas(T0);
  const fileInput = page.locator("input[type=file]").first();
  await fileInput.setInputFiles(`${SCRATCH}/seed-sneaker.png`);
  const first = page.locator(".react-flow__node-staticImageBlock").first();
  await first.waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(3000);
  // drag it to the left
  let b = await first.boundingBox();
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + 8, { steps: 10 });
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 330, b.y + 8, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(800);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await fileInput.setInputFiles(`${SCRATCH}/seed-leaves.png`);
  await page
    .locator(".react-flow__node-staticImageBlock")
    .nth(1)
    .waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(3000);
  // drag the new one to the right if overlapping
  const second = page.locator(".react-flow__node-staticImageBlock").nth(1);
  b = await second.boundingBox();
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + 8, { steps: 10 });
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 330, b.y + 8, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(800);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await nodesReport();
  await shot("b3-seeded");
  // wait for uploads to settle (asset URL swap)
  await page.waitForTimeout(5000);
} else if (which === "cleanup") {
  // Remove every non-image node from the sandbox (tool nodes etc.), keeping
  // generated image nodes as seed material. arg2 = "all" wipes everything.
  await openCanvas(T0);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  await nodesReport();
  const keep = arg2 === "all" ? [] : ["react-flow__node-staticImageBlock"];
  const ids: string[] = await page.evaluate((keepCls) => {
    const out: string[] = [];
    document.querySelectorAll(".react-flow__node").forEach((el) => {
      const isKeep = keepCls.some((c: string) => el.classList.contains(c));
      if (!isKeep) out.push(el.getAttribute("data-id") ?? "");
    });
    return out.filter(Boolean);
  }, keep);
  console.log("deleting:", ids.length, "nodes");
  for (const id of ids) {
    const el = page.locator(`.react-flow__node[data-id="${id}"]`);
    if ((await el.count()) === 0) continue;
    await page.keyboard.press("Shift+Digit1");
    await page.waitForTimeout(700);
    const b = await el.boundingBox();
    if (!b) continue;
    await page.mouse.click(b.x + b.width / 2, b.y + Math.min(12, b.height / 2));
    await page.waitForTimeout(400);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(700);
    const dlg = page.getByRole("dialog");
    if (await dlg.count()) {
      const btn = dlg.getByRole("button", { name: /Delete/ }).last();
      if (await btn.isVisible().catch(() => false)) await btn.click();
      await page.waitForTimeout(800);
    }
  }
  await page.waitForTimeout(1000);
  await nodesReport();
  await shot("b3-cleanup-done");
}

await browser.close();
