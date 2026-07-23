import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * P0 Forma smoke: seed project → Timeline → drag move + resize Intro.
 * Asserts via inspector tick readout (stable) rather than pixel deltas alone.
 */

async function createSeededProject(page: Page): Promise<string> {
  const res = await page.request.post("/api/projects", {
    data: { name: "E2E Forma Smoke" },
  });
  expect(res.ok(), `create project HTTP ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { id: string; forma?: { clips: unknown[] } };
  expect(body.id).toBeTruthy();
  return body.id;
}

async function readFormaSpan(
  page: Page,
): Promise<{ start: number; length: number }> {
  const text = await page
    .locator('aside[aria-label="Właściwości"]')
    .getByText(/start \d+, długość \d+ ticks/)
    .textContent();
  expect(text).toBeTruthy();
  const m = text!.match(/start (\d+), długość (\d+) ticks/);
  expect(m, `unexpected inspector text: ${text}`).toBeTruthy();
  return { start: Number(m![1]), length: Number(m![2]) };
}

async function dragClip(
  page: Page,
  clip: Locator,
  from: { x: number; y: number },
  dx: number,
): Promise<void> {
  await clip.scrollIntoViewIfNeeded();
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y, { steps: 16 });
  await page.mouse.up();
}

test.describe("Forma lane smoke", () => {
  test("opens Timeline with seeded Forma clips and drag-moves / resizes Intro", async ({
    page,
  }) => {
    const projectId = await createSeededProject(page);

    await page.goto(`/timeline/${projectId}`);

    // Track row + lane cell both carry data-track="forma".
    await expect(page.locator('[data-track="forma"]').first()).toBeVisible();

    const intro = page.locator('[data-clip-id="forma-intro"]');
    const countdown = page.locator('[data-clip-id="forma-cd"]');
    await expect(intro).toBeVisible();
    await expect(countdown).toBeVisible();

    // Basic interaction: select → inspector shows seed span (Intro @ 0, 2 bars).
    await intro.click();
    await expect(page.getByLabel("Nazwa sekcji")).toHaveValue("Intro");
    let span = await readFormaSpan(page);
    expect(span).toEqual({ start: 0, length: 7680 });

    // Move: body drag (~1.5 bars at default 48px/bar → snap ≥ 1 bar).
    const box = await intro.boundingBox();
    expect(box, "Intro clip bounding box").toBeTruthy();
    await dragClip(
      page,
      intro,
      { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
      72,
    );

    await expect
      .poll(async () => (await readFormaSpan(page)).start)
      .toBeGreaterThan(0);
    span = await readFormaSpan(page);
    expect(span.length).toBe(7680);

    // Resize: right-edge drag outward (~1+ bar).
    const boxAfterMove = await intro.boundingBox();
    expect(boxAfterMove).toBeTruthy();
    await dragClip(
      page,
      intro,
      {
        x: boxAfterMove!.x + boxAfterMove!.width - 4,
        y: boxAfterMove!.y + boxAfterMove!.height / 2,
      },
      60,
    );

    await expect
      .poll(async () => (await readFormaSpan(page)).length)
      .toBeGreaterThan(7680);
    const afterResize = await readFormaSpan(page);
    expect(afterResize.start).toBe(span.start);
  });
});
