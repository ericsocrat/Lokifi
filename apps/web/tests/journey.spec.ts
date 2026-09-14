import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";

test("account → portfolio → holding → import → export → second session", async ({ page, browser }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `journey-${randomUUID()}@example.com`;
  const password = "Correct+horse+sample+42";
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your portfolio starts here." })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("empty.png"), fullPage: true });
  await page.getByRole("button", { name: "Create your first portfolio" }).click();
  await page.getByLabel("Portfolio name").fill("Long-term investments");
  await page.getByRole("button", { name: "Save portfolio" }).click();
  await expect(page.getByRole("heading", { name: "Long-term investments" })).toBeVisible();
  await page.getByRole("button", { name: "Add holding", exact: true }).click();
  await page.getByRole("button", { name: "Enter manually", exact: true }).click();
  await page.getByLabel("Asset name").fill("Global equity fund");
  await page.getByLabel("Instrument identifier").fill("IE00TEST00001");
  await page.getByLabel("Exchange, network or account").fill("XETRA");
  await page.getByLabel("Quantity / cash balance").fill("100");
  await page.getByLabel("Unit price (EUR)").fill("112.5");
  await page.getByLabel("Record source").fill("September statement");
  await page.getByRole("button", { name: "Save holding" }).click();
  await expect(page.getByRole("link", { name: "Global equity fund", exact: true })).toBeVisible();
  const portfolioUrl = page.url();
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  const today = new Date().toISOString().slice(0, 10);
  const headers =
    "name,category,identifier,venue,currency,quantity,acquired_at,acquisition_price,acquisition_source,price,valued_at,valuation_observed_at,source,fx_rate,fx_at,fx_source\n";
  const csv =
    headers +
    `Technology shares,stock,TECH,NASDAQ,USD,25,,,,180,${today},,Statement,0.9,${today},Statement FX\nCash reserve,cash,EUR-CASH,BANK,EUR,2000,,,,1,${today},,Account statement,,,\nUnvalued fund,etf,UNKNOWN,XETRA,EUR,10,,,,,,,Manual entry,,,\n`;
  await page
    .getByLabel("Holdings CSV", { exact: true })
    .setInputFiles({ name: "holdings.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByRole("heading", { name: "3 holdings ready to import" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByText("Holdings imported.", { exact: true })).toBeVisible();
  await expect(page.getByText("Missing price", { exact: true })).toBeVisible();
  await expect(page.getByText("Your total is incomplete.", { exact: false })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("portfolio.png"), fullPage: true });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    nodes: Array.from(document.querySelectorAll("body *"))
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest(".table-wrap"))
      .map((e) => ({ tag: e.tagName, cls: e.className, right: e.getBoundingClientRect().right }))
      .slice(0, 20),
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("Tab");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export holdings CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("lokifi-holdings.csv");
  await page.getByRole("link", { name: "Global equity fund", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Global equity fund", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Watch instrument" }).click();
  await expect(page.getByText("Added to watchlist.", { exact: true })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Watchlist", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Global equity fund", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Global equity fund", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  const context = await browser.newContext();
  const second = await context.newPage();
  await second.goto(new URL("/login", portfolioUrl).href);
  await second.getByLabel("Email address").fill(email);
  await second.getByLabel("Password", { exact: true }).fill(password);
  await second.getByRole("button", { name: "Sign in", exact: true }).click();
  await second.waitForURL("**/dashboard");
  await second.goto(portfolioUrl);
  await expect(second.getByRole("link", { name: "Technology shares", exact: true })).toBeVisible();
  await context.close();
  expect(errors).toEqual([]);
});

test("unavailable storage shows a useful error; demo remains labeled", async ({ page }, testInfo) => {
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Storage is temporarily unavailable." }),
    }),
  );
  await page.goto("/login");
  await expect(page.getByRole("alert").filter({ hasText: "Storage is temporarily unavailable" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("unavailable.png"), fullPage: true });
  await page.unroute("**/api/v1/auth/me");
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Example Viewer");
  await page.getByLabel("Email address").fill(`demo-${randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("Example+safe+password+42");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByRole("button", { name: "Open example" }).click();
  await expect(page.getByText("Synthetic example", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add holding", exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("demo.png"), fullPage: true });
});

test("BTC symbol and purchase date fill the holding automatically", async ({ page }, testInfo) => {
  const purchaseDate = "2024-01-01";
  await page.route("**/api/v1/market-data/assets**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/holding")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          instrument: {
            name: "Bitcoin",
            category: "crypto",
            identifier: "BTC",
            venue: "COINBASE EXCHANGE",
            currency: "EUR",
          },
          acquisition: {
            product_id: "BTC-EUR",
            price: "40090.38",
            date: purchaseDate,
            observed_at: "2024-01-02T00:00:00Z",
            kind: "daily_close",
            source: "Coinbase Exchange BTC-EUR UTC daily close",
          },
          valuation: {
            product_id: "BTC-EUR",
            price: "67436.81",
            date: new Date().toISOString().slice(0, 10),
            observed_at: new Date().toISOString(),
            kind: "latest_trade",
            source: "Coinbase Exchange BTC-EUR latest trade",
          },
        }),
      });
    } else {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          {
            symbol: "BTC",
            name: "Bitcoin",
            category: "crypto",
            product_id: "BTC-EUR",
            venue: "Coinbase Exchange",
            currency: "EUR",
            source: "Coinbase Exchange public market data",
          },
        ]),
      });
    }
  });
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Automatic Entry");
  await page.getByLabel("Email address").fill(`auto-${randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("Automatic+safe+password+42");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByRole("button", { name: "Create your first portfolio" }).click();
  await page.getByLabel("Portfolio name").fill("Crypto holdings");
  await page.getByRole("button", { name: "Save portfolio" }).click();
  await page.getByRole("button", { name: "Add holding", exact: true }).click();
  await page.getByLabel("Asset symbol or name").fill("BTC");
  await expect(page.getByText("Bitcoin", { exact: true })).toBeVisible();
  await page.getByLabel("Quantity", { exact: true }).fill("0.25");
  await page.getByLabel("Purchase date", { exact: true }).fill(purchaseDate);
  await expect(page.getByText("€40,090.38", { exact: true })).toBeVisible();
  await expect(page.getByText("€67,436.81", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("automatic-btc.png"), fullPage: true });
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  await page.getByRole("button", { name: "Add holding", exact: true }).last().click();
  await expect(page.getByRole("link", { name: "Bitcoin", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Bitcoin", exact: true }).click();
  await expect(page.getByText("2024-01-01", { exact: true })).toBeVisible();
  await expect(page.getByText("€40,090.38", { exact: true })).toBeVisible();
  await expect(page.getByText("Coinbase Exchange BTC-EUR UTC daily close", { exact: true })).toBeVisible();
  await expect(page.getByText(/UTC$/)).toBeVisible();
});
