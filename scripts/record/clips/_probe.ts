/**
 * Interaction probe (excluded from run.ts by the "_" prefix): project card
 * menu, assets new-folder dialog + upload input, community template modal,
 * billing dialogs, canvas toolbar.
 *
 *   SCRATCH=<dir> ../node_modules/.bin/tsx clips/_probe.ts <which>
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const which = process.argv[2] ?? "projects";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();

async function snap(name: string, lines = 90) {
  await page.screenshot({ path: `${SCRATCH}/${name}.png` });
  const s = await page.locator("body").ariaSnapshot();
  console.log(`\n===== ${name} =====`);
  console.log(s.split("\n").slice(0, lines).join("\n"));
}

if (which === "projects") {
  await page.goto(`${BASE}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);
  const card = page.locator("a[href^='/editor/']").first();
  await card.hover();
  await page.waitForTimeout(400);
  await card.getByRole("button", { name: "More options" }).click();
  await page.waitForTimeout(800);
  await snap("projects-menu", 140);
} else if (which === "assets") {
  await page.goto(`${BASE}/dashboard/assets`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);
  const inputs = await page.locator("input[type=file]").count();
  console.log("file inputs on page:", inputs);
  await page.getByRole("button", { name: "New folder" }).click();
  await page.waitForTimeout(800);
  await snap("assets-newfolder", 120);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const asset = page.getByRole("button", { name: /Uploaded/ }).first();
  await asset.hover();
  await page.waitForTimeout(400);
  await asset.getByRole("button", { name: "More options" }).click();
  await page.waitForTimeout(700);
  await snap("assets-menu", 120);
} else if (which === "templates") {
  await page.goto(`${BASE}/dashboard/community`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.waitForTimeout(2500);
  await snap("templates-tab", 100);
  await page.getByRole("button", { name: /Preview TNF/ }).click();
  await page.waitForTimeout(2500);
  await snap("template-modal", 140);
} else if (which === "modal30") {
  await page.goto(`${BASE}/dashboard/community`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Preview 30-Second Social Ad" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SCRATCH}/modal30.png` });
  const s = await page.locator("body").ariaSnapshot();
  const i = s.indexOf("30-Second");
  console.log(s.slice(Math.max(0, i - 2000), i + 800));
  const remixBtns = page.getByRole("button", { name: "Remix" });
  console.log("remix buttons:", await remixBtns.count());
  for (let k = 0; k < (await remixBtns.count()); k++) {
    console.log(k, await remixBtns.nth(k).boundingBox(), await remixBtns.nth(k).isVisible());
  }
} else if (which === "remixtest") {
  page.on("console", (m) => {
    if (m.type() === "error") console.log("console err:", m.text().slice(0, 200));
  });
  page.on("response", (r) => {
    if (r.url().includes("remix") || r.url().includes("community"))
      console.log("resp:", r.status(), r.url().slice(0, 120));
  });
  await page.goto(`${BASE}/dashboard/community`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Preview Model Showdown" }).click();
  await page.waitForTimeout(2500);
  const remix = page.getByRole("button", { name: "Remix" }).first();
  console.log("remix visible:", await remix.isVisible());
  await remix.click();
  for (let k = 0; k < 12; k++) {
    await page.waitForTimeout(5000);
    console.log("t+", (k + 1) * 5, "url:", page.url());
    if (/\/editor\//.test(page.url())) break;
  }
  await page.screenshot({ path: `${SCRATCH}/remixtest.png` });
} else if (which === "remixapi") {
  // Remix a template via the app's own API (no editor open), then inspect the
  // resulting project's canvas for nodes. argv[3] = template name substring.
  const wanted = process.argv[3] ?? "TNF";
  await page.goto(`${BASE}/dashboard/community`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.waitForTimeout(2500);
  // open the detail modal and sniff the template id from its API fetches
  let templateId = "";
  page.on("response", (r) => {
    const mm = r.url().match(/api\/community\/templates\/([a-f0-9]{24})/);
    if (mm) templateId = mm[1];
  });
  await page.getByRole("button", { name: new RegExp(`Preview .*${wanted}`) }).first().click();
  await page.waitForTimeout(3000);
  console.log("template id:", templateId);
  if (!templateId) throw new Error("no template id sniffed");
  const m = [null, templateId] as const;
  const wsId = "6a4ad8079a876dea0d2d111a";
  const out = await page.evaluate(
    async ({ tid, ws }) => {
      const sess = await fetch("/api/auth/session").then((r) => r.json());
      const token =
        sess?.accessToken ?? sess?.access_token ?? sess?.user?.accessToken ?? "";
      const res = await fetch(`/api/community/templates/${tid}/remix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ workspace_id: ws }),
      });
      return { status: res.status, body: await res.text(), hadToken: Boolean(token) };
    },
    { tid: m[1], ws: wsId },
  );
  console.log("remix result:", out.status, out.body.slice(0, 300));
  const pid = out.body.match(/[a-f0-9]{24}/)?.[0];
  console.log("new project:", pid);
  if (pid) {
    await page.waitForTimeout(8000);
    await page.goto(`${BASE}/editor/${pid}/canvas`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(9000);
    const nodes = await page.getByRole("button", { name: "Node options" }).count();
    console.log("node option buttons:", nodes);
    await page.screenshot({ path: `${SCRATCH}/remixapi-${wanted.replace(/\W+/g, "")}.png` });
  }
} else if (which === "billing") {
  await page.goto(`${BASE}/dashboard/settings/billing`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "View plans" }).click();
  await page.waitForTimeout(2000);
  await snap("billing-plans", 160);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Buy credits" }).click();
  await page.waitForTimeout(2000);
  await snap("billing-topup", 160);
} else if (which === "topup") {
  // Genuine-Free workspaces are routed to the plans page instead of the
  // top-up dialog; flip is_custom in the subscription response so the real
  // CreditPurchaseDialog opens (display-only, no backend mutation).
  await context.route("**/api/subscriptions/current*", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.is_custom = true;
    await route.fulfill({ response, json });
  });
  await page.goto(`${BASE}/dashboard/settings/billing`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Buy credits" }).click();
  await page.waitForTimeout(2500);
  console.log("after click url:", page.url());
  const dialog = page.getByRole("dialog");
  console.log("dialog count:", await dialog.count());
  await snap("billing-topup2", 160);
} else if (which === "create-trash") {
  await page.goto(`${BASE}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);
  const before = await page.locator("a[href^='/editor/']").count();
  await page.getByRole("button", { name: "Create a new project" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Start creating" }).click();
  await page.waitForURL(/\/editor\//, { timeout: 30_000 });
  console.log("editor url:", page.url());
  await page.waitForTimeout(5000);
  await page.goto(`${BASE}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  const after = await page.locator("a[href^='/editor/']").count();
  console.log("cards before/after:", before, after);
  // newest project should be first
  const first = page.locator("a[href^='/editor/']").first();
  console.log("first card:", await first.getAttribute("href"), await first.innerText());
  await first.hover();
  await first.getByRole("button", { name: "More options" }).click();
  await page.waitForTimeout(600);
  await page.getByRole("menuitem", { name: "Move to trash" }).click();
  await page.waitForTimeout(1200);
  await snap("trash-confirm", 60);
  // if a confirm dialog appeared, confirm it
  const confirmBtn = page.getByRole("button", { name: /Move to trash|Trash|Confirm/ }).last();
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
    await page.waitForTimeout(1200);
  }
  // open trash tab
  await page.getByRole("link", { name: "Trash" }).click();
  await page.waitForTimeout(2000);
  await snap("trash-view", 80);
  const trashCard = page.locator("main, body").locator("a[href^='/editor/'], article").first();
  await trashCard.hover().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCRATCH}/trash-hover.png` });
  const snapshot2 = await page.locator("body").ariaSnapshot();
  console.log(snapshot2.split("\n").filter((l) => /Restore|Delete|More options|button/.test(l)).join("\n"));
} else if (which === "trash2") {
  await page.goto(`${BASE}/dashboard/projects/all?tab=trash`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  const card = page.getByText("Silver Prism").first();
  const box = await card.boundingBox();
  console.log("card box:", box);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y - 80, { steps: 8 });
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `${SCRATCH}/trash2-hover.png` });
  const s = await page.locator("body").ariaSnapshot();
  const start = s.indexOf("Trash");
  console.log(s.slice(Math.max(0, start), start + 1500));
} else if (which === "trash3") {
  await page.goto(`${BASE}/dashboard/projects/all?tab=trash`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  const card = page.locator("a").filter({ hasText: "Silver Prism" }).first();
  await card.hover();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SCRATCH}/trash3-hover.png` });
  const more = card.getByRole("button", { name: "More options" });
  console.log("more visible:", await more.isVisible(), "disabled attr:", await more.getAttribute("disabled"), await more.getAttribute("aria-disabled"));
  await more.click({ force: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCRATCH}/trash3-menu.png` });
  const menu = await page.locator("body").ariaSnapshot();
  console.log(menu.split("\n").filter((l) => /menu|Restore|Delete/.test(l)).join("\n"));
  // restore it to leave clean state
  const restore = page.getByRole("menuitem", { name: "Restore" });
  if (await restore.isVisible().catch(() => false)) {
    await restore.click();
    await page.waitForTimeout(1500);
    console.log("restored");
  }
} else if (which === "cleanup-silver") {
  // Trash + permanently delete the probe project "Silver Prism".
  await page.goto(`${BASE}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  const card = page.locator("a[href^='/editor/']").filter({ hasText: "Silver Prism" }).first();
  if (await card.isVisible().catch(() => false)) {
    await card.hover();
    await card.getByRole("button", { name: "More options" }).click();
    await page.waitForTimeout(600);
    await page.getByRole("menuitem", { name: "Move to trash" }).click();
    await page.waitForTimeout(1500);
  }
  await page.goto(`${BASE}/dashboard/projects/all?tab=trash`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const tcard = page.locator("a").filter({ hasText: "Silver Prism" }).first();
  if (await tcard.isVisible().catch(() => false)) {
    await tcard.hover();
    await tcard.getByRole("button", { name: "More options" }).click({ force: true });
    await page.waitForTimeout(600);
    await page.getByRole("menuitem", { name: "Delete permanently" }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCRATCH}/perm-delete.png` });
    // possible confirm dialog
    const dlg = page.getByRole("dialog");
    if (await dlg.count()) {
      const btn = dlg.getByRole("button", { name: /Delete/ }).last();
      if (await btn.isVisible().catch(() => false)) await btn.click();
      await page.waitForTimeout(1500);
    }
    console.log("permanently deleted");
  } else {
    console.log("no Silver Prism in trash");
  }
} else if (which === "cleanup-autonamed") {
  // Trash + permanently delete leftover auto-named projects from failed runs.
  for (let round = 0; round < 4; round++) {
    await page.goto(`${BASE}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);
    const card = page
      .locator("a[href^='/editor/']")
      .filter({ hasText: /· Jul 6/ })
      .first();
    if (!(await card.isVisible().catch(() => false))) break;
    console.log("trashing:", await card.locator("h3").innerText());
    await card.hover();
    await card.getByRole("button", { name: "More options" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("menuitem", { name: "Move to trash" }).click();
    await page.waitForTimeout(4500); // let the deferred commit fire
  }
  for (let round = 0; round < 4; round++) {
    await page.goto(`${BASE}/dashboard/projects/all?tab=trash`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);
    const tcard = page.locator("a").filter({ hasText: /· Jul 6/ }).first();
    if (!(await tcard.isVisible().catch(() => false))) break;
    console.log("deleting:", await tcard.locator("h3").innerText());
    await tcard.hover();
    await tcard.getByRole("button", { name: "More options" }).click({ force: true });
    await page.waitForTimeout(500);
    await page.getByRole("menuitem", { name: "Delete permanently" }).click();
    await page.waitForTimeout(800);
    const dlg = page.getByRole("dialog");
    if (await dlg.count()) {
      const btn = dlg.getByRole("button", { name: /Delete/ }).last();
      if (await btn.isVisible().catch(() => false)) await btn.click();
    }
    await page.waitForTimeout(4500); // let the deferred commit fire
  }
  console.log("cleanup done");
} else if (which === "cleanup-remixes") {
  // Trash + permanently delete junk remix projects created while probing.
  const junk = /(30-Second Social Ad|TNF - Outfit Try-Ons) \(Remix\)/;
  for (let round = 0; round < 4; round++) {
    await page.goto(`${BASE}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);
    const card = page.locator("a[href^='/editor/']").filter({ hasText: junk }).first();
    if (!(await card.isVisible().catch(() => false))) break;
    console.log("trashing:", await card.locator("h3").innerText());
    await card.hover();
    await card.getByRole("button", { name: "More options" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("menuitem", { name: "Move to trash" }).click();
    await page.waitForTimeout(4500);
  }
  for (let round = 0; round < 4; round++) {
    await page.goto(`${BASE}/dashboard/projects/all?tab=trash`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);
    const tcard = page.locator("a").filter({ hasText: junk }).first();
    if (!(await tcard.isVisible().catch(() => false))) break;
    console.log("deleting:", await tcard.locator("h3").innerText());
    await tcard.hover();
    await tcard.getByRole("button", { name: "More options" }).click({ force: true });
    await page.waitForTimeout(500);
    await page.getByRole("menuitem", { name: "Delete permanently" }).click();
    await page.waitForTimeout(4500);
  }
  console.log("remix cleanup done");
} else if (which === "cleanup-assets") {
  await page.goto(`${BASE}/dashboard/assets`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  const folder = page.getByRole("button", { name: /Brand shots/ }).first();
  if (await folder.isVisible().catch(() => false)) {
    await folder.click({ button: "right" });
    await page.waitForTimeout(800);
    const del = page.getByRole("menuitem", { name: /Delete/ }).or(page.getByRole("button", { name: "Delete", exact: true })).last();
    if (await del.isVisible().catch(() => false)) {
      await del.click();
      await page.waitForTimeout(1000);
      const dlg = page.getByRole("dialog");
      if (await dlg.count()) {
        const btn = dlg.getByRole("button", { name: /Delete/ }).last();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      }
      await page.waitForTimeout(4000);
      console.log("brand shots folder deleted:", !(await folder.isVisible().catch(() => false)));
    }
  } else {
    console.log("no Brand shots folder at root");
  }
  // loose hero asset at root?
  const hero = page.getByRole("button", { name: /hero/i }).first();
  if (await hero.isVisible().catch(() => false)) {
    await hero.hover();
    await hero.getByRole("button", { name: "More options" }).click().catch(() => {});
    await page.waitForTimeout(500);
    const delBtn = hero.getByRole("button", { name: "Delete" });
    if (await delBtn.isVisible().catch(() => false)) {
      await delBtn.click();
      await page.waitForTimeout(1000);
      const dlg = page.getByRole("dialog");
      if (await dlg.count()) {
        const btn = dlg.getByRole("button", { name: /Delete/ }).last();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      }
      await page.waitForTimeout(4000);
      console.log("hero asset deleted");
    }
  } else {
    console.log("no loose hero asset at root");
  }
} else if (which === "delete-hero-node") {
  await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Add a node" }).waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(5000);
  const label = page.getByText("hero.png").first();
  if (await label.isVisible().catch(() => false)) {
    await label.click();
    await page.waitForTimeout(600);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(1500);
    console.log("hero node deleted:", !(await page.getByText("hero.png").first().isVisible().catch(() => false)));
    await page.waitForTimeout(4000); // let the doc persist
  } else {
    console.log("no hero node found");
  }
} else if (which === "assetlib2") {
  const ctx2 = await browser.newContext({
    storageState: STATE_PATH,
    viewport: { width: 1920, height: 1080 },
    colorScheme: "dark",
  });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, {
    waitUntil: "domcontentloaded",
  });
  await p2.getByRole("button", { name: "Add a node" }).waitFor({ state: "visible", timeout: 60_000 });
  await p2.waitForTimeout(4000);
  // coordinate click like h.click
  const addBtn = p2.getByRole("button", { name: "Add a node" });
  let b = await addBtn.boundingBox();
  console.log("add box:", b);
  await p2.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 20 });
  await p2.waitForTimeout(300);
  await p2.mouse.down(); await p2.waitForTimeout(90); await p2.mouse.up();
  await p2.waitForTimeout(700);
  const entry = p2.getByRole("button", { name: "Asset Library" }).first();
  console.log("entry visible:", await entry.isVisible().catch(() => false));
  b = await entry.boundingBox().catch(() => null);
  console.log("entry box:", b);
  await p2.screenshot({ path: `${SCRATCH}/assetlib2-menu.png` });
  if (b) {
    await p2.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 32 });
    await p2.waitForTimeout(300);
    await p2.screenshot({ path: `${SCRATCH}/assetlib2-hover.png` });
    await p2.mouse.down(); await p2.waitForTimeout(90); await p2.mouse.up();
    await p2.waitForTimeout(1500);
  }
  console.log("dialogs:", await p2.getByRole("dialog").count());
  for (let i = 0; i < (await p2.getByRole("dialog").count()); i++) {
    console.log(i, await p2.getByRole("dialog").nth(i).getAttribute("aria-label"));
  }
  await p2.screenshot({ path: `${SCRATCH}/assetlib2-after.png` });
  await ctx2.close();
} else if (which === "assetlib") {
  await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Add a node" }).waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Add a node" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCRATCH}/assetlib-menu.png` });
  const entry = page.getByRole("button", { name: "Asset Library" });
  console.log("entry count:", await entry.count(), "visible:", await entry.first().isVisible().catch(() => false));
  const box = await entry.first().boundingBox().catch(() => null);
  console.log("entry box:", box);
  await entry.first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCRATCH}/assetlib-after.png` });
  const dialogs = page.getByRole("dialog");
  console.log("dialogs:", await dialogs.count());
  for (let i = 0; i < (await dialogs.count()); i++) {
    console.log(i, await dialogs.nth(i).getAttribute("aria-label"));
  }
  const overlay = page.locator("[role=dialog]");
  console.log("role=dialog:", await overlay.count());
  console.log((await page.locator("body").ariaSnapshot()).split("\n").filter((l) => /dialog|Asset|Add to Canvas|Upload/i.test(l)).slice(0, 20).join("\n"));
} else if (which === "folderflow") {
  await page.goto(`${BASE}/dashboard/assets`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "New folder" }).click();
  await page.waitForTimeout(600);
  await page.keyboard.type("probe-tmp", { delay: 30 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);
  await snap("folder-created", 60);
  // enter the folder
  const folder = page.getByRole("button", { name: /probe-tmp/ }).first();
  await folder.dblclick().catch(async () => folder.click());
  await page.waitForTimeout(2000);
  console.log("url now:", page.url());
  await snap("folder-inside", 60);
} else if (which === "folderdel") {
  await page.goto(`${BASE}/dashboard/assets`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);
  const folder = page.getByRole("button", { name: /probe-tmp/ }).first();
  if (!(await folder.isVisible().catch(() => false))) {
    console.log("no probe-tmp folder");
  } else {
    await folder.click({ button: "right" });
    await page.waitForTimeout(800);
    await snap("folder-menu", 60);
    const del = page.getByRole("menuitem", { name: /Delete/ });
    if (await del.isVisible().catch(() => false)) {
      await del.click();
      await page.waitForTimeout(800);
      const dlg = page.getByRole("dialog");
      if (await dlg.count()) {
        const btn = dlg.getByRole("button", { name: /Delete/ }).last();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      }
      await page.waitForTimeout(1500);
      console.log("folder deleted:", !(await folder.isVisible().catch(() => false)));
    }
  }
} else if (which === "signin") {
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
  await p2.waitForLoadState("networkidle").catch(() => {});
  await p2.waitForTimeout(2000);
  console.log("url:", p2.url());
  await p2.screenshot({ path: `${SCRATCH}/signin.png` });
  console.log((await p2.locator("body").ariaSnapshot()).slice(0, 3000));
  await p2.getByRole("button", { name: "Sign in with email" }).click();
  await p2.waitForTimeout(1500);
  console.log("after email click url:", p2.url());
  await p2.screenshot({ path: `${SCRATCH}/signin-email.png` });
  console.log((await p2.locator("body").ariaSnapshot()).slice(0, 2500));
  console.log("inputs:", await p2.locator("input").evaluateAll((els) => els.map((e) => `${e.tagName}#${e.id}.${e.getAttribute("name")}[${e.getAttribute("type")}] ph=${e.getAttribute("placeholder")}`)));
  await ctx2.close();
} else if (which === "canvas2") {
  await page.goto(`${BASE}/editor/${process.argv[3] ?? "6a4adad69a876dea0d2d112e"}/canvas`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `${SCRATCH}/canvas-${process.argv[3] ?? "masai"}.png` });
  const s = await page.locator("body").ariaSnapshot();
  console.log(s.split("\n").filter((l) => /button|dialog|tab /.test(l)).slice(0, 50).join("\n"));
} else if (which === "assets2") {
  await page.goto(`${BASE}/dashboard/assets`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);
  console.log("file inputs:", await page.locator("input[type=file]").count());
  await snap("assets-state", 80);
} else if (which === "tnf-card") {
  await page.goto(`${BASE}/dashboard/community`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.waitForTimeout(2500);
  for (const nm of ["TNF", "Nike Air", "JPG La Belle", "Model Showdown", "30-Second"]) {
    const card = page.getByRole("button", { name: new RegExp(`Preview.*${nm}`) }).first();
    const box = await card.boundingBox().catch(() => null);
    console.log(nm, box);
    if (box)
      await page.screenshot({
        path: `${SCRATCH}/card-${nm.replace(/\W+/g, "")}.png`,
        clip: { x: box.x, y: Math.max(0, box.y), width: box.width, height: Math.min(box.height, 800 - Math.max(0, box.y)) },
      }).catch((e) => console.log("clip fail", e.message));
  }
} else if (which === "canvas") {
  await page.goto(`${BASE}/editor/6a4ada4b9a876dea0d2d1126/canvas`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(6000);
  await snap("canvas-toolbar", 160);
}

await browser.close();
