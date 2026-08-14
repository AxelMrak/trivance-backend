import { toCents, fromCents, Cents } from "@/utils/money";

describe("money utils / Cents", () => {
  describe("toCents", () => {
    it("converts a float amount to cents", () => {
      expect(toCents(10.5)).toBe(1050);
    });

    it("adds 0.1 + 0.2 without floating point drift", () => {
      expect(toCents(0.1) + toCents(0.2)).toBe(30);
      expect(toCents(0.3)).toBe(30);
    });

    it("parses string amounts", () => {
      expect(toCents("1234.56")).toBe(123456);
      expect(toCents("19.90")).toBe(1990);
    });

    it("throws on values with more than two decimal places", () => {
      expect(() => toCents(1.999)).toThrow();
      expect(() => toCents("0.009")).toThrow();
    });

    it("throws on empty or whitespace strings", () => {
      expect(() => toCents("")).toThrow();
      expect(() => toCents("   ")).toThrow();
    });

    it("returns a Cents branded value", () => {
      const cents: Cents = toCents(10.5);
      expect(typeof cents).toBe("number");
    });

    it("throws on NaN", () => {
      expect(() => toCents(NaN)).toThrow();
    });

    it("throws on negative values", () => {
      expect(() => toCents(-5)).toThrow();
      expect(() => toCents("-1.00")).toThrow();
    });
  });

  describe("fromCents", () => {
    it("converts cents back to a float", () => {
      expect(fromCents(toCents(10.5))).toBe(10.5);
      expect(fromCents(toCents(0.1))).toBe(0.1);
    });
  });
});
