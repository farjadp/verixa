import { describe, expect, it } from "vitest";
import { REPORT_EXAMPLES } from "../../../../worker/src/report-examples";
import { workerReportSchema } from "../engine";

// Guards against drift between worker/src/types.ts and the server's workerReportSchema.
describe("worker report contract", () => {
  it("covers every report type in the schema", () => {
    const schemaTypes = workerReportSchema.options.map((o) => o.shape.type.value).sort();
    const exampleTypes = [...new Set(REPORT_EXAMPLES.map((r) => r.type))].sort();
    expect(exampleTypes).toEqual(schemaTypes);
  });

  it.each(REPORT_EXAMPLES.map((r, i) => [`${r.type} #${i}`, r] as const))("%s parses against workerReportSchema", (_n, example) => {
    const parsed = workerReportSchema.safeParse(example);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
  });
});
