/**
 * Canvas interaction probe (excluded from run.ts by the "_" prefix).
 *
 *   SCRATCH=<dir> ../node_modules/.bin/tsx clips/_probe-canvas.ts <which>
 *
 * Modes: base | menu | shortcuts | ctx | empty | undo
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const which = process.argv[2] ?? "base";
const T2 = "6a4adad69a876dea0d2d112e"; // masai maara (busy)
const T0 = "6a4ada4b9a876dea0d2d1126"; // Untitled (empty)

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
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
        handles: el.querySelectorAll(".react-flow__handle").length,
      });
    });
    return out;
  });
  console.log("node count:", nodes.length);
  for (const n of nodes.slice(0, 30)) console.log(JSON.stringify(n));
}

async function openCanvas(id: string, settleMs = 6000) {
  await page.goto(`${BASE}/editor/${id}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(settleMs);
  // dismiss first-run overlay if present
  const skip = page.getByRole("button", { name: "Skip for now" });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(800);
    console.log("dismissed first-run overlay");
  }
}

if (which === "base") {
  await openCanvas(T2);
  await nodesReport();
  await shot("p-base-initial");
  // zoom to fit
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await shot("p-base-fit");
  await nodesReport();
  const zoomPill = page.getByRole("button", { name: /Zoom level/ });
  console.log("zoom pill:", await zoomPill.textContent().catch(() => "?"));
} else if (which === "menu") {
  await openCanvas(T2);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(1000);
  await shot("p-menu-open");
  const snap = await page.locator("body").ariaSnapshot();
  const i = snap.indexOf("Add a node");
  console.log(snap.slice(Math.max(0, i - 200), i + 3500));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  // reopen with N
  await page.keyboard.press("n");
  await page.waitForTimeout(900);
  await shot("p-menu-n");
} else if (which === "shortcuts") {
  await openCanvas(T2);
  await page.keyboard.press("Shift+?");
  await page.waitForTimeout(1200);
  await shot("p-shortcuts");
  const dlg = page.getByRole("dialog");
  console.log("dialogs:", await dlg.count());
  const snap = await page.locator("body").ariaSnapshot();
  const i = snap.indexOf("hortcut");
  console.log(snap.slice(Math.max(0, i - 300), i + 2500));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await shot("p-shortcuts-closed");
} else if (which === "ctx") {
  await openCanvas(T2);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await nodesReport();
  // right-click the center of an image node that has a generated result
  const img = page
    .locator(".react-flow__node")
    .filter({ has: page.locator("img[alt='Generated result']") })
    .first();
  const box = await img.boundingBox();
  console.log("image node box:", box);
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
    await page.waitForTimeout(1000);
    await shot("p-ctx-menu");
    const snap = await page.locator("body").ariaSnapshot();
    const i = snap.indexOf("Tools");
    console.log(snap.slice(Math.max(0, i - 2500), i + 1200));
    // hover Tools to open submenu
    const tools = page.getByRole("menuitem", { name: "Tools" }).first();
    const tb = await tools.boundingBox().catch(() => null);
    console.log("tools item box:", tb);
    if (tb) {
      await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
      await page.waitForTimeout(1200);
      await shot("p-ctx-tools");
      const s2 = await page.locator("body").ariaSnapshot();
      const j = s2.indexOf("Image tools");
      console.log(s2.slice(Math.max(0, j - 200), j + 1500));
    }
  }
} else if (which === "empty") {
  await openCanvas(T0, 5000);
  await shot("p-empty-initial");
  await nodesReport();
  // add a Text node from the add-node menu
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(900);
  const snap = await page.locator("body").ariaSnapshot();
  const i = snap.indexOf("Add a node");
  console.log(snap.slice(Math.max(0, i - 100), i + 2500));
  await page.getByRole("button", { name: /^Text/ }).first().click();
  await page.waitForTimeout(1200);
  await shot("p-empty-text-added");
  await nodesReport();
  // type into it
  const ta = page.locator("textarea[aria-label='Text node content']").first();
  console.log("textarea visible:", await ta.isVisible().catch(() => false));
  if (await ta.isVisible().catch(() => false)) {
    await ta.click();
    await page.keyboard.type("A misty forest at dawn", { delay: 20 });
    await page.waitForTimeout(500);
  }
  await shot("p-empty-text-typed");
  // add an Image node
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Image/ }).first().click();
  await page.waitForTimeout(1200);
  await shot("p-empty-image-added");
  await nodesReport();
  // handle positions on both nodes
  const handles = await page.evaluate(() => {
    const out: Array<Record<string, unknown>> = [];
    document.querySelectorAll(".react-flow__handle").forEach((el) => {
      const r = el.getBoundingClientRect();
      const node = el.closest(".react-flow__node");
      out.push({
        node: node?.getAttribute("data-id"),
        cls: el.className,
        x: Math.round(r.x + r.width / 2),
        y: Math.round(r.y + r.height / 2),
        w: Math.round(r.width),
      });
    });
    return out;
  });
  for (const h of handles) console.log("handle:", JSON.stringify(h));
  // undo everything
  for (let k = 0; k < 8; k++) {
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(800);
  await nodesReport();
  await shot("p-empty-after-undo");
} else if (which === "undo") {
  await openCanvas(T2);
  const undoBtn = page.getByRole("button", { name: "Undo" });
  console.log("undo disabled:", await undoBtn.isDisabled().catch(() => "?"));
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  await shot("p-undo-before");
  await undoBtn.click().catch((e) => console.log("undo click failed:", e.message));
  await page.waitForTimeout(2500);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  await shot("p-undo-after");
  console.log("undo disabled now:", await undoBtn.isDisabled().catch(() => "?"));
} else if (which === "cleanup2text") {
  // Remove any text nodes that a clip added to the busy T2 canvas (its
  // seeded content has none), via right-click → Delete → confirm.
  await openCanvas(T2);
  for (let i = 0; i < 4; i++) {
    const tn = page.locator(".react-flow__node-textBlock").first();
    if ((await tn.count()) === 0) break;
    // Bring the node into view: select it and zoom to selection.
    await page.keyboard.press("Shift+Digit1");
    await page.waitForTimeout(1200);
    const fitBox = await tn.boundingBox();
    if (!fitBox) break;
    await page.mouse.click(fitBox.x + fitBox.width / 2, fitBox.y + 2);
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Shift+Digit2");
    await page.waitForTimeout(1200);
    const box = await tn.boundingBox();
    if (!box) break;
    await page.mouse.click(box.x + box.width / 2, box.y + 10, { button: "right" });
    await page.waitForTimeout(800);
    await shot(`p-cleanup2text-menu-${i}`);
    const del = page.getByRole("button", { name: /^Delete/ }).first();
    if (await del.isVisible().catch(() => false)) {
      await del.click();
      await page.waitForTimeout(900);
      const dlg = page.getByRole("dialog");
      if (await dlg.count()) {
        const btn = dlg.getByRole("button", { name: /Delete/ }).last();
        if (await btn.isVisible().catch(() => false)) await btn.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log("no delete item found");
      break;
    }
  }
  console.log("text nodes remaining:", await page.locator(".react-flow__node-textBlock").count());
  console.log("total nodes:", await page.locator(".react-flow__node").count());
} else if (which === "nkey") {
  await openCanvas(T2);
  await page.keyboard.press("Shift+?");
  await page.getByRole("dialog", { name: "Keyboard shortcuts" }).waitFor({ state: "visible" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Close keyboard shortcuts" }).click();
  await page.waitForTimeout(900);
  console.log("active after close:", await page.evaluate(() => `${document.activeElement?.tagName}.${(document.activeElement as HTMLElement | null)?.className ?? ""}`));
  await page.keyboard.press("n");
  await page.waitForTimeout(900);
  const menuVisible = await page.locator('[aria-label="Node selection"]').isVisible().catch(() => false);
  console.log("menu visible after n:", menuVisible);
  if (!menuVisible) {
    await page.mouse.click(640, 400);
    await page.waitForTimeout(400);
    await page.keyboard.press("n");
    await page.waitForTimeout(900);
    console.log("menu visible after click+n:", await page.locator('[aria-label="Node selection"]').isVisible().catch(() => false));
  }
  const search = page.locator('[aria-label="Node selection"] input');
  console.log("search value:", await search.inputValue().catch(() => "?"));
  await shot("p-nkey");
} else if (which === "groupflow") {
  await openCanvas(T2);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const posOf = async () =>
    page.evaluate(() => {
      const m: Record<string, string> = {};
      document.querySelectorAll(".react-flow__node").forEach((el) => {
        m[el.getAttribute("data-id") ?? ""] = (el as HTMLElement).style.transform;
      });
      return m;
    });
  const p0 = await posOf();
  console.log("base count:", Object.keys(p0).length);
  // marquee over the bottom-left person images
  await page.mouse.move(150, 505, { steps: 8 });
  await page.mouse.down();
  await page.mouse.move(330, 745, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await shot("p-group-selected");
  await page.keyboard.press("Meta+g");
  await page.waitForTimeout(1200);
  await shot("p-group-grouped");
  const p1 = await posOf();
  console.log("count after group:", Object.keys(p1).length);
  const groupIds = Object.keys(p1).filter((k) => !(k in p0));
  console.log("new nodes:", groupIds);
  await page.keyboard.press("Meta+Shift+g");
  await page.waitForTimeout(1200);
  await shot("p-group-ungrouped");
  const p2 = await posOf();
  console.log("count after ungroup:", Object.keys(p2).length);
  let same = 0;
  let diff = 0;
  const diffs: string[] = [];
  for (const k of Object.keys(p0)) {
    if (p0[k] === p2[k]) same++;
    else {
      diff++;
      diffs.push(`${k}: ${p0[k]} -> ${p2[k]}`);
    }
  }
  console.log("positions same:", same, "diff:", diff);
  for (const d of diffs.slice(0, 8)) console.log(d);
} else if (which === "sticky") {
  await openCanvas(T2);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const baseCount = await page.locator(".react-flow__node").count();
  console.log("base count:", baseCount);
  // zoom in a bit around an empty area: use cmd+wheel at a spot
  await page.getByRole("button", { name: "Sticky note" }).click();
  await page.waitForTimeout(500);
  await page.mouse.click(300, 250);
  await page.waitForTimeout(900);
  await shot("p-sticky-placed");
  console.log("count after place:", await page.locator(".react-flow__node").count());
  console.log("active element:", await page.evaluate(() => document.activeElement?.tagName));
  await page.keyboard.type("Ship it 🚀", { delay: 40 });
  await page.waitForTimeout(600);
  await shot("p-sticky-typed");
  // blur to empty pane, settle, then toolbar-undo until gone
  await page.mouse.click(1100, 650);
  await page.waitForTimeout(1500);
  const undoBtn = page.getByRole("button", { name: "Undo" });
  for (let k = 0; k < 6; k++) {
    if ((await page.locator(".react-flow__node").count()) <= baseCount) break;
    if (await undoBtn.isDisabled()) break;
    await undoBtn.click();
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1000);
  console.log("count after undo:", await page.locator(".react-flow__node").count());
  console.log("undo disabled:", await undoBtn.isDisabled());
  await shot("p-sticky-cleaned");
} else if (which === "typeflow") {
  await openCanvas(T0, 5000);
  await nodesReport();
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Text/ }).first().click();
  await page.waitForTimeout(1200);
  await page.keyboard.type("A misty forest at dawn", { delay: 25 });
  await page.waitForTimeout(600);
  await shot("p-type-immediate");
  // blur by clicking empty pane far from the node
  await page.mouse.click(1050, 620);
  await page.waitForTimeout(500);
  console.log("active element:", await page.evaluate(() => document.activeElement?.tagName));
  await shot("p-type-blurred");
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(800);
  await nodesReport();
  // if the typing was undone but node remains, undo again
  for (let k = 0; k < 4 && (await page.locator(".react-flow__node").count()) > 0; k++) {
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(600);
  }
  await nodesReport();
  await shot("p-type-cleaned");
} else if (which === "undostate") {
  await openCanvas(T0, 5000);
  await nodesReport();
  const undoBtn = page.getByRole("button", { name: "Undo" });
  console.log("undo disabled at open:", await undoBtn.isDisabled());
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Text/ }).first().click();
  await page.waitForTimeout(1200);
  await nodesReport();
  console.log("undo disabled after add:", await undoBtn.isDisabled());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  console.log("active element:", await page.evaluate(() => document.activeElement?.tagName));
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(1000);
  await nodesReport();
  console.log("undo disabled after ⌘Z:", await undoBtn.isDisabled());
  // if node still there, click the toolbar Undo button directly
  if ((await page.locator(".react-flow__node").count()) > 0) {
    await undoBtn.click();
    await page.waitForTimeout(1000);
    await nodesReport();
    console.log("undo disabled after button click:", await undoBtn.isDisabled());
  }
} else if (which === "connect") {
  await openCanvas(T0, 5000);
  // add Text node
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Text/ }).first().click();
  await page.waitForTimeout(1000);
  const textNode = page.locator(".react-flow__node-textBlock").first();
  const tb = await textNode.boundingBox();
  console.log("text node:", tb);
  // click into the node content to select + focus
  if (tb) {
    await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height * 0.4);
    await page.waitForTimeout(600);
    const ta = page.locator("textarea[aria-label='Text node content']").first();
    console.log("textarea visible after click:", await ta.isVisible().catch(() => false));
    await shot("p-conn-selected");
    if (await ta.isVisible().catch(() => false)) {
      await ta.click();
      await page.keyboard.type("A misty forest at dawn", { delay: 15 });
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  await shot("p-conn-typed");
  // add Image node
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Image/ }).first().click();
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // find handles
  const handles = await page.evaluate(() => {
    const out: Array<Record<string, unknown>> = [];
    document.querySelectorAll(".react-flow__handle").forEach((el) => {
      const r = el.getBoundingClientRect();
      out.push({
        node: el.closest(".react-flow__node")?.getAttribute("data-id"),
        source: el.classList.contains("source"),
        x: Math.round(r.x + r.width / 2),
        y: Math.round(r.y + r.height / 2),
      });
    });
    return out;
  });
  console.log(JSON.stringify(handles, null, 0));
  const src = handles.find((h) => String(h.node).startsWith("text_") && h.source) as
    | { x: number; y: number }
    | undefined;
  const dst = handles.find((h) => String(h.node).startsWith("image_") && !h.source) as
    | { x: number; y: number }
    | undefined;
  if (src && dst) {
    await page.mouse.move(src.x, src.y, { steps: 10 });
    await page.waitForTimeout(300);
    await page.mouse.down();
    await page.mouse.move(dst.x, dst.y, { steps: 25 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(1000);
  }
  await shot("p-conn-connected");
  // cleanup: escape then undo repeatedly
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  for (let k = 0; k < 10; k++) {
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(800);
  await nodesReport();
  await shot("p-conn-cleaned");
} else if (which === "cleanup0") {
  await openCanvas(T0, 5000);
  await nodesReport();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.press("Meta+a");
  await page.waitForTimeout(600);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(1000);
  const dlg = page.getByRole("dialog");
  if (await dlg.count()) {
    console.log("confirm dialog appeared");
    await shot("p-cleanup0-dialog");
    const btn = dlg.getByRole("button", { name: /Delete/ }).last();
    if (await btn.isVisible().catch(() => false)) await btn.click();
    await page.waitForTimeout(1200);
  }
  await nodesReport();
  await shot("p-cleanup0-done");
} else if (which === "undo2") {
  await openCanvas(T2);
  const undoBtn = page.getByRole("button", { name: "Undo" });
  console.log("undo disabled at open:", await undoBtn.isDisabled());
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  // drag a node by ~150px
  const node = page.locator(".react-flow__node-staticImageBlock").first();
  const b = await node.boundingBox();
  console.log("node before:", b);
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
    await page.mouse.down();
    await page.waitForTimeout(150);
    await page.mouse.move(b.x + b.width / 2 + 150, b.y + b.height / 2 + 80, { steps: 20 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(800);
  }
  const b2 = await node.boundingBox();
  console.log("node after drag:", b2);
  console.log("undo disabled after drag:", await undoBtn.isDisabled());
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(1200);
  const b3 = await node.boundingBox();
  console.log("node after undo:", b3);
  console.log("undo disabled after undo:", await undoBtn.isDisabled());
} else if (which === "layout3") {
  await openCanvas(T2);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1200);
  const posOf = async () =>
    page.evaluate(() => {
      const m: Record<string, string> = {};
      document.querySelectorAll(".react-flow__node").forEach((el) => {
        const r = el.getBoundingClientRect();
        void r;
        m[el.getAttribute("data-id") ?? ""] = (el as HTMLElement).style.transform;
      });
      return m;
    });
  const compare = (a: Record<string, string>, b: Record<string, string>, tag: string) => {
    let same = 0;
    let diff = 0;
    for (const k of Object.keys(a)) (a[k] === b[k] ? same++ : diff++);
    console.log(tag, "same:", same, "diff:", diff);
  };
  const p0 = await posOf();
  // drag one node off-kilter
  const node = page.locator(".react-flow__node-staticImageBlock").first();
  const b = await node.boundingBox();
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 120, b.y + b.height / 2 + 60, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(700);
  }
  const p1 = await posOf();
  compare(p0, p1, "after drag");
  await page.keyboard.press("Shift+o");
  await page.waitForTimeout(4500);
  const p2 = await posOf();
  compare(p0, p2, "after re-layout vs original");
  await shot("p-layout3-relayout");
  // try undo of the layout
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(1500);
  const p3 = await posOf();
  compare(p1, p3, "after undo vs dragged-state");
  compare(p0, p3, "after undo vs original");
  // restore canonical: run layout again
  await page.keyboard.press("Shift+o");
  await page.waitForTimeout(4500);
  const p4 = await posOf();
  compare(p0, p4, "final vs original");
  await shot("p-layout3-final");
} else if (which === "layout") {
  await openCanvas(T2);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await shot("p-layout-before");
  const before = await page.evaluate(() => {
    const m: Record<string, string> = {};
    document.querySelectorAll(".react-flow__node").forEach((el) => {
      const r = el.getBoundingClientRect();
      m[el.getAttribute("data-id") ?? ""] = `${Math.round(r.x)},${Math.round(r.y)}`;
    });
    return m;
  });
  await page.keyboard.press("Shift+o");
  await page.waitForTimeout(4000);
  await shot("p-layout-after");
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await shot("p-layout-after-fit");
  // undo
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  await shot("p-layout-undone");
  const after = await page.evaluate(() => {
    const m: Record<string, string> = {};
    document.querySelectorAll(".react-flow__node").forEach((el) => {
      const r = el.getBoundingClientRect();
      m[el.getAttribute("data-id") ?? ""] = `${Math.round(r.x)},${Math.round(r.y)}`;
    });
    return m;
  });
  let same = 0;
  let diff = 0;
  for (const k of Object.keys(before)) {
    if (before[k] === after[k]) same++;
    else diff++;
  }
  console.log("positions same after undo:", same, "diff:", diff);
} else if (which === "toolsmenu") {
  // Full dry-run of the image-tools-menu clip: select an image node, check the
  // bottom Tools pill, right-click → hover Tools submenu → hover items → click
  // Levels → verify a tool node spawns → undo it back out.
  await openCanvas(T2);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1500);
  const baseCount = await page.locator(".react-flow__node").count();
  console.log("base count:", baseCount);
  const img = page
    .locator(".react-flow__node")
    .filter({ has: page.locator("img[alt='Generated result']") })
    .first();
  let box = await img.boundingBox();
  if (!box) throw new Error("no image node");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(600);
  await page.keyboard.press("Shift+Digit2");
  await page.waitForTimeout(1400);
  // zoom out one notch for margin
  await page.keyboard.down("Meta");
  await page.mouse.wheel(0, 120);
  await page.keyboard.up("Meta");
  await page.waitForTimeout(600);
  box = await img.boundingBox();
  console.log("framed image box:", box);
  // bottom Tools pill on the selected node?
  const pill = page.locator("button[title='Tools']");
  console.log("tools pill count:", await pill.count(), "visible:", await pill.first().isVisible().catch(() => false));
  const pb = await pill.first().boundingBox().catch(() => null);
  console.log("tools pill box:", pb);
  await shot("p-tm-selected");
  // right-click node center
  if (!box) throw new Error("no box after frame");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  await page.waitForTimeout(900);
  await shot("p-tm-ctx");
  const tools = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
  const tb = await tools.boundingBox().catch(() => null);
  console.log("tools trigger box:", tb);
  if (!tb) throw new Error("no tools trigger");
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
  await page.waitForTimeout(900);
  const panel = page.getByRole("menu", { name: "Image tools" });
  const pnb = await panel.boundingBox().catch(() => null);
  console.log("panel box:", pnb);
  await shot("p-tm-submenu");
  if (!pnb) throw new Error("no submenu panel");
  // straight horizontal move into the panel, then hover items
  await page.mouse.move(pnb.x + 20, tb.y + tb.height / 2, { steps: 10 });
  await page.waitForTimeout(400);
  for (const name of ["Levels", "Crop", "Upscale", "Inpaint", "Remove Background"]) {
    const item = panel.getByRole("button", { name, exact: false }).first();
    const ib = await item.boundingBox().catch(() => null);
    console.log("item", name, ib ? "ok" : "MISSING", ib);
    if (ib) {
      await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 6 });
      await page.waitForTimeout(350);
    }
  }
  await shot("p-tm-hover-items");
  // click Levels
  const levels = panel.getByRole("button", { name: "Levels" }).first();
  const lb = await levels.boundingBox().catch(() => null);
  if (!lb) throw new Error("levels vanished");
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2, { steps: 6 });
  await page.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await page.waitForTimeout(2000);
  const afterCount = await page.locator(".react-flow__node").count();
  console.log("count after Levels:", afterCount);
  await shot("p-tm-levels-added");
  await nodesReport();
  // undo it back out
  const undoBtn = page.getByRole("button", { name: "Undo" });
  for (let i = 0; i < 5; i++) {
    const c = await page.locator(".react-flow__node").count();
    if (c <= baseCount) break;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await undoBtn.click().catch((e) => console.log("undo failed:", e.message));
    await page.waitForTimeout(900);
  }
  const finalCount = await page.locator(".react-flow__node").count();
  console.log("final count:", finalCount, "(base", baseCount, ")");
  await shot("p-tm-after-undo");
}

await browser.close();
