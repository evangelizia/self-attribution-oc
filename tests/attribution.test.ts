import { describe, expect, test } from "bun:test";
import {
  COAUTHOR_EMAIL,
  COAUTHOR_TRAILER,
  hasCoauthorTrailer,
} from "../src/attribution.ts";

describe("attribution", () => {
  test("uses the hard-coded evangelizia trailer", () => {
    expect(COAUTHOR_EMAIL).toBe(
      "19894018+evangelizia@users.noreply.github.com",
    );
    expect(COAUTHOR_TRAILER).toBe(
      "Co-authored-by: evangelizia <19894018+evangelizia@users.noreply.github.com>",
    );
  });

  test("detects an existing trailer in any casing", () => {
    expect(
      hasCoauthorTrailer(
        `feat: test\n\nco-authored-by: EVANGELIZIA <${COAUTHOR_EMAIL}>`,
      ),
    ).toBe(true);
  });
});
