import { describe, expect, it } from "vitest";
import { matchColor } from "@/lib/utils/match-color";

describe("matchColor", () => {
  it("returns brand for scores >= 90", () => {
    expect(matchColor(90)).toBe("brand");
    expect(matchColor(100)).toBe("brand");
  });

  it("returns foreground for scores >= 80 and < 90", () => {
    expect(matchColor(80)).toBe("foreground");
    expect(matchColor(89)).toBe("foreground");
  });

  it("returns text2 for scores below 80", () => {
    expect(matchColor(79)).toBe("text2");
    expect(matchColor(0)).toBe("text2");
  });
});
