import { describe, expect, it } from "vitest";
import { decodeExportSample, exportMagicMatches } from "./reportExportUtils";

describe("reportExportUtils", () => {
  it("detects PDF magic bytes", () => {
    const bytes = decodeExportSample("", "pdf");
    expect(exportMagicMatches(bytes, "pdf")).toBe(true);
    expect(exportMagicMatches(bytes, "excel")).toBe(false);
  });

  it("detects PK zip for excel", () => {
    const bytes = decodeExportSample("", "excel");
    expect(exportMagicMatches(bytes, "excel")).toBe(true);
    expect(exportMagicMatches(bytes, "pdf")).toBe(false);
  });
});
