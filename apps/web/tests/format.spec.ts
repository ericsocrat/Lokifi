import { expect, test } from "@playwright/test";
import { money, units } from "../src/api";

test("decimal presentation preserves large cents and half-even rounding", () => {
  expect(money("9007199254740993.12")).toBe("€9,007,199,254,740,993.12");
  expect(money("0.005")).toBe("€0.00");
  expect(money("0.015")).toBe("€0.02");
  expect(money("0.0251")).toBe("€0.03");
  expect(money(null)).toBe("—");
  expect(units("0.0000000001")).toBe("0.0000000001");
  expect(units("100.0000000000")).toBe("100");
});
