import { describe, expect, it } from "vitest";
import {
  escapeForDoubleQuote,
  escapeForSingleQuote,
} from "./workflow-codegen-shared";

describe("escapeForSingleQuote", () => {
  it("escapes single quotes, newlines, carriage returns, and backslashes", () => {
    expect(escapeForSingleQuote("a'b\\c\nx\ry")).toBe("a\\'b\\\\c\\nx\\ry");
  });
});

describe("escapeForDoubleQuote", () => {
  it("escapes double quotes, newlines, carriage returns, and backslashes", () => {
    expect(escapeForDoubleQuote('a"b\\c\nx\ry')).toBe('a\\"b\\\\c\\nx\\ry');
  });
});
