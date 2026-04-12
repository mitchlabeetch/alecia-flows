import { describe, expect, it } from "vitest";
import {
  extractTemplateVariables,
  formatTemplateForDisplay,
  hasTemplateVariables,
  type NodeOutputs,
  processTemplate,
} from "./template";

describe("processTemplate", () => {
  const outputs: NodeOutputs = {
    node1: {
      label: "GetUser",
      data: { firstName: "Alice", lastName: "Smith", age: 30 },
    },
    node2: {
      label: "FetchOrder",
      data: { id: "ord-99", items: ["book", "pen"], total: 49.99 },
    },
    node3: {
      label: "Compute",
      data: { success: true, data: { result: "ok", score: 7 } },
    },
  };

  describe("@nodeId:DisplayName format", () => {
    it("resolves a top-level field", () => {
      expect(
        processTemplate("Hello {{@node1:GetUser.firstName}}", outputs)
      ).toBe("Hello Alice");
    });

    it("resolves the full node data when no field is given", () => {
      const result = processTemplate("{{@node1:GetUser}}", outputs);
      // Should return a JSON representation of the data object
      expect(result).toContain("Alice");
    });

    it("resolves an array element via bracket notation", () => {
      expect(
        processTemplate("Item: {{@node2:FetchOrder.items[0]}}", outputs)
      ).toBe("Item: book");
    });

    it("keeps placeholder when node is missing", () => {
      expect(processTemplate("{{@missing:Ghost.field}}", outputs)).toBe(
        "{{@missing:Ghost.field}}"
      );
    });

    it("unwraps standardized output format { success, data } automatically", () => {
      // node3.data has { success: true, data: { result: "ok", score: 7 } }
      // Accessing .result should unwrap automatically
      expect(processTemplate("{{@node3:Compute.result}}", outputs)).toBe("ok");
    });

    it("allows explicit access to success field in standardized output", () => {
      expect(processTemplate("{{@node3:Compute.success}}", outputs)).toBe(
        "true"
      );
    });
  });

  describe("$nodeId format (legacy)", () => {
    it("resolves a top-level field by node ID", () => {
      expect(processTemplate("Age: {{$node1.age}}", outputs)).toBe("Age: 30");
    });

    it("resolves entire node data when no field given", () => {
      const result = processTemplate("{{$node1}}", outputs);
      expect(result).toContain("Alice");
    });

    it("keeps placeholder for unknown node ID", () => {
      expect(processTemplate("{{$unknown.field}}", outputs)).toBe(
        "{{$unknown.field}}"
      );
    });
  });

  describe("label format (legacy)", () => {
    it("resolves by label (case-insensitive)", () => {
      expect(processTemplate("{{GetUser.firstName}}", outputs)).toBe("Alice");
      expect(processTemplate("{{getuser.firstName}}", outputs)).toBe("Alice");
    });

    it("resolves entire node data for a label", () => {
      const result = processTemplate("{{FetchOrder}}", outputs);
      expect(result).toContain("ord-99");
    });

    it("keeps placeholder when label not found", () => {
      expect(processTemplate("{{Unknown.field}}", outputs)).toBe(
        "{{Unknown.field}}"
      );
    });
  });

  describe("multiple replacements", () => {
    it("replaces all occurrences in a single string", () => {
      const result = processTemplate(
        "{{@node1:GetUser.firstName}} {{@node1:GetUser.lastName}}",
        outputs
      );
      expect(result).toBe("Alice Smith");
    });

    it("mixes formats in one string", () => {
      const result = processTemplate(
        "Order {{@node2:FetchOrder.id}} by {{$node1.firstName}}",
        outputs
      );
      expect(result).toBe("Order ord-99 by Alice");
    });
  });

  describe("non-string inputs", () => {
    it("returns non-string template unchanged", () => {
      // @ts-expect-error testing bad input
      expect(processTemplate(null, outputs)).toBe(null);
      // @ts-expect-error testing bad input
      expect(processTemplate(undefined, outputs)).toBe(undefined);
      // @ts-expect-error testing bad input
      expect(processTemplate(42, outputs)).toBe(42);
    });
  });

  describe("empty outputs", () => {
    it("returns placeholder when outputs is empty", () => {
      expect(processTemplate("{{@node1:GetUser.firstName}}", {})).toBe(
        "{{@node1:GetUser.firstName}}"
      );
    });
  });

  describe("numeric and boolean formatting", () => {
    it("formats numbers as strings", () => {
      expect(
        processTemplate("Total: {{@node2:FetchOrder.total}}", outputs)
      ).toBe("Total: 49.99");
    });

    it("formats booleans as strings", () => {
      expect(
        processTemplate("Status: {{@node3:Compute.success}}", outputs)
      ).toBe("Status: true");
    });
  });
});

describe("hasTemplateVariables", () => {
  it("returns true when template variables exist", () => {
    expect(hasTemplateVariables("Hello {{name}}")).toBe(true);
    expect(hasTemplateVariables("{{@nodeId:Label.field}}")).toBe(true);
  });

  it("returns false when no template variables exist", () => {
    expect(hasTemplateVariables("Hello world")).toBe(false);
    expect(hasTemplateVariables("")).toBe(false);
  });
});

describe("extractTemplateVariables", () => {
  it("extracts all variable expressions", () => {
    const vars = extractTemplateVariables(
      "{{@node1:Label.field}} and {{$node2.other}}"
    );
    expect(vars).toHaveLength(2);
    expect(vars[0]).toBe("@node1:Label.field");
    expect(vars[1]).toBe("$node2.other");
  });

  it("returns empty array for string without variables", () => {
    expect(extractTemplateVariables("no variables here")).toEqual([]);
  });

  it("handles empty / non-string input gracefully", () => {
    expect(extractTemplateVariables("")).toEqual([]);
    // @ts-expect-error testing bad input
    expect(extractTemplateVariables(null)).toEqual([]);
  });
});

describe("formatTemplateForDisplay", () => {
  it("strips nodeId from @nodeId:DisplayName patterns", () => {
    expect(formatTemplateForDisplay("{{@abc123:GetUser.firstName}}")).toBe(
      "{{GetUser.firstName}}"
    );
  });

  it("leaves non-@ patterns unchanged", () => {
    expect(formatTemplateForDisplay("{{name}}")).toBe("{{name}}");
    expect(formatTemplateForDisplay("{{$nodeId.field}}")).toBe(
      "{{$nodeId.field}}"
    );
  });

  it("handles non-string input gracefully", () => {
    // @ts-expect-error testing bad input
    expect(formatTemplateForDisplay(null)).toBe(null);
  });
});
