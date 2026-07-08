import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)". Joining voice never mutates the
// board; the runner launches Chromium with a fake mic device.
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "collab/voice-rooms",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h, context, baseUrl }) => {
    await context.grantPermissions(["microphone"], { origin: baseUrl }).catch(() => {});
    await context.grantPermissions(["microphone"]).catch(() => {});
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(700);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    h.mark();

    // Open the collaborators dropdown from the header.
    await h.click(page.getByRole("button", { name: "Collaborators" }));
    await h.beat(1200);

    // Turn on the mic — connects to the project's voice room.
    const mic = page.getByRole("button", { name: "Turn on mic" }).first();
    await h.click(mic);
    // Wait for the floating voice bar to appear.
    const leave = page.getByRole("button", { name: "Leave voice chat" });
    await h.skip(async () => {
      await leave.waitFor({ state: "visible", timeout: 45_000 });
      await page.waitForTimeout(800);
    });
    await h.beat(900);

    // Close the dropdown so the voice bar is unobstructed.
    await page.keyboard.press("Escape");
    await h.beat(700);

    // Rest on the bar, then mute from it. (Skip the audio-settings popover —
    // it would show the recorder's fake device names.)
    await h.moveTo(page.getByRole("button", { name: "Audio settings" }));
    await h.beat(1100);
    await h.click(page.getByRole("button", { name: "Mute microphone" }));
    await h.beat(1800);

    // Leave the room so the canvas returns to normal.
    await h.click(leave);
    await h.beat(1000);
  },
};

export default clip;
