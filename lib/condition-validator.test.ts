import { describe, expect, it } from "vitest";
import {
  preValidateConditionExpression,
  sanitizeForDisplay,
  validateConditionExpression,
} from "./condition-validator";

describe("validateConditionExpression", () => {
  describe("valid expressions", () => {
    it("accepts simple equality comparison", () => {
      expect(validateConditionExpression("__v0 === 'active'")).toEqual({
        valid: true,
      });
    });

    it("accepts numeric comparison", () => {
      expect(validateConditionExpression("__v0 > 100")).toEqual({
        valid: true,
      });
    });

    it("accepts logical AND", () => {
      expect(
        validateConditionExpression("__v0 === true && __v1 !== null")
      ).toEqual({ valid: true });
    });

    it("accepts logical OR", () => {
      expect(
        validateConditionExpression("__v0 === 'a' || __v0 === 'b'")
      ).toEqual({ valid: true });
    });

    it("accepts negation with !", () => {
      expect(validateConditionExpression("!__v0")).toEqual({ valid: true });
    });

    it("accepts grouped expression with parens", () => {
      expect(
        validateConditionExpression("(__v0 === 1 || __v0 === 2) && __v1 > 0")
      ).toEqual({ valid: true });
    });

    it("accepts string literal comparisons", () => {
      expect(validateConditionExpression('__v0 === "hello"')).toEqual({
        valid: true,
      });
    });

    it("accepts null/undefined/boolean literals", () => {
      expect(validateConditionExpression("__v0 !== null")).toEqual({
        valid: true,
      });
      expect(validateConditionExpression("__v0 !== undefined")).toEqual({
        valid: true,
      });
      expect(validateConditionExpression("__v0 === true")).toEqual({
        valid: true,
      });
      expect(validateConditionExpression("__v0 === false")).toEqual({
        valid: true,
      });
    });

    it("accepts allowed string method calls", () => {
      expect(validateConditionExpression("__v0.includes('foo')")).toEqual({
        valid: true,
      });
      expect(validateConditionExpression("__v0.startsWith('pre')")).toEqual({
        valid: true,
      });
      expect(validateConditionExpression("__v0.endsWith('suf')")).toEqual({
        valid: true,
      });
    });

    it("accepts property access on variable", () => {
      expect(validateConditionExpression("__v0.status === 'active'")).toEqual({
        valid: true,
      });
    });

    it("accepts numeric bracket access on variable", () => {
      expect(validateConditionExpression("__v0[0] === 'first'")).toEqual({
        valid: true,
      });
    });

    it("accepts string bracket access on variable", () => {
      expect(validateConditionExpression("__v0['key'] === 42")).toEqual({
        valid: true,
      });
    });

    it("accepts .length property access", () => {
      expect(validateConditionExpression("__v0.length > 0")).toEqual({
        valid: true,
      });
    });
  });

  describe("invalid - empty/blank expressions", () => {
    it("rejects empty string", () => {
      const result = validateConditionExpression("");
      expect(result.valid).toBe(false);
    });

    it("rejects whitespace-only string", () => {
      const result = validateConditionExpression("   ");
      expect(result.valid).toBe(false);
    });
  });

  describe("invalid - dangerous patterns", () => {
    it("rejects eval()", () => {
      const result = validateConditionExpression("eval('code')");
      expect(result.valid).toBe(false);
    });

    it("rejects Function()", () => {
      const result = validateConditionExpression("Function('return 1')()");
      expect(result.valid).toBe(false);
    });

    it("rejects process access", () => {
      const result = validateConditionExpression("process.env.SECRET === 'x'");
      expect(result.valid).toBe(false);
    });

    it("rejects while loop", () => {
      const result = validateConditionExpression("while(true){}");
      expect(result.valid).toBe(false);
    });

    it("rejects prototype access", () => {
      const result = validateConditionExpression("__v0.__proto__ === null");
      expect(result.valid).toBe(false);
    });

    it("rejects assignment operator =", () => {
      const result = validateConditionExpression("__v0 = 'hack'");
      expect(result.valid).toBe(false);
    });

    it("rejects compound assignment +=", () => {
      const result = validateConditionExpression("__v0 += 1");
      expect(result.valid).toBe(false);
    });

    it("rejects template literal with expression", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal injection detection
      const result = validateConditionExpression("`${eval('1')}`");
      expect(result.valid).toBe(false);
    });
  });

  describe("invalid - disallowed method calls", () => {
    it("rejects arbitrary method call", () => {
      const result = validateConditionExpression("__v0.exec('x')");
      expect(result.valid).toBe(false);
    });

    it("rejects map() call", () => {
      const result = validateConditionExpression("__v0.map(x => x)");
      expect(result.valid).toBe(false);
    });
  });

  describe("invalid - bracket expressions", () => {
    it("rejects array literal", () => {
      const result = validateConditionExpression("[1, 2, 3].includes(__v0)");
      expect(result.valid).toBe(false);
    });

    it("rejects dynamic bracket content", () => {
      const result = validateConditionExpression("__v0[eval('0')]");
      expect(result.valid).toBe(false);
    });
  });

  describe("invalid - unbalanced parens", () => {
    it("rejects unmatched opening paren", () => {
      const result = validateConditionExpression("(__v0 === 1");
      expect(result.valid).toBe(false);
    });

    it("rejects extra closing paren", () => {
      const result = validateConditionExpression("__v0 === 1)");
      expect(result.valid).toBe(false);
    });
  });
});

describe("preValidateConditionExpression", () => {
  it("accepts a safe expression", () => {
    expect(preValidateConditionExpression("__v0 > 5")).toEqual({ valid: true });
  });

  it("rejects eval keyword", () => {
    const result = preValidateConditionExpression("eval('x')");
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("eval");
  });

  it("rejects process keyword", () => {
    const result = preValidateConditionExpression("process.exit(1)");
    expect(result.valid).toBe(false);
  });

  it("rejects empty / non-string input", () => {
    expect(preValidateConditionExpression("").valid).toBe(false);
    // @ts-expect-error testing bad input
    expect(preValidateConditionExpression(null).valid).toBe(false);
  });
});

describe("sanitizeForDisplay", () => {
  it("escapes HTML special characters", () => {
    expect(sanitizeForDisplay("<script>")).toBe("&lt;script&gt;");
    expect(sanitizeForDisplay('"quoted"')).toBe("&quot;quoted&quot;");
    expect(sanitizeForDisplay("it's")).toBe("it&#39;s");
  });

  it("leaves safe characters unchanged", () => {
    expect(sanitizeForDisplay("__v0 === 1")).toBe("__v0 === 1");
  });
});
