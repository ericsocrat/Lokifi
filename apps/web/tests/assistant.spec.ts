import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";

test("Assistant simulated stream: responsive entry, safe formatting and keyboard dismissal", async ({
  page,
  baseURL,
}, info) => {
  const registration = await page.request.post("/api/v1/auth/register", {
    headers: { Origin: baseURL! },
    data: {
      name: "Synthetic assistant viewer",
      email: `assistant-${randomUUID()}@example.com`,
      password: "Synthetic+browser+password",
    },
  });
  expect(registration.status()).toBe(201);
  const portfolio = await page.request.post("/api/v1/portfolios", {
    headers: { Origin: baseURL! },
    data: { name: "Assistant browser fixture" },
  });
  expect(portfolio.status()).toBe(201);
  const portfolioId = (await portfolio.json()).id;
  const conversation = {
    id: randomUUID(),
    title: "Synthetic conversation",
    portfolio_id: portfolioId,
    created_at: new Date().toISOString(),
  };
  let sent = false;
  const answer =
    "**Recorded value: €1000.01**\n\nThis is a synthetic browser fixture.\n\n<script>alert('unsafe')</script>\n\n[unsafe](javascript:alert(1))";
  await page.route("**/api/v1/chat/status", (route) =>
    route.fulfill({
      json: { configured: true, verified: true, consented: true, remaining_turns: 5, research_enabled: false },
    }),
  );
  await page.route("**/api/v1/chat/conversations**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/messages")) {
      sent = true;
      const events = [
        { type: "started", data: {} },
        { type: "text", data: { text: answer } },
        { type: "complete", data: { status: "complete" } },
      ]
        .map((event) => "data: " + JSON.stringify({ ...event, run_id: "synthetic-run" }) + "\n\n")
        .join("");
      await route.fulfill({ contentType: "text/event-stream", body: events });
    } else if (path.endsWith("/conversations")) {
      await route.fulfill({ json: request.method() === "POST" ? conversation : sent ? [conversation] : [] });
    } else {
      await route.fulfill({
        json: {
          ...conversation,
          messages: sent ? [{ id: "synthetic-answer", role: "assistant", content: answer }] : [],
          proposals: [],
          runs: [],
        },
      });
    }
  });
  await page.goto(`/portfolio?id=${portfolioId}`);
  await page.getByRole("button", { name: "Ask about this portfolio" }).click();
  if (info.project.name === "mobile") await expect(page).toHaveURL(new RegExp(`/assistant\\?portfolio=${portfolioId}`));
  else await expect(page.getByRole("dialog", { name: "Portfolio assistant" })).toBeVisible();
  await page.getByLabel("Message the assistant").fill("Explain the recorded value");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Recorded value: €1000.01", { exact: true })).toBeVisible();
  await expect(page.locator(".chat-message script")).toHaveCount(0);
  await expect(page.locator('.chat-message a[href^="javascript:"]')).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("assistant.png"), fullPage: true });
  if (info.project.name === "desktop") {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Portfolio assistant" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ask about this portfolio" })).toBeFocused();
  }
});
