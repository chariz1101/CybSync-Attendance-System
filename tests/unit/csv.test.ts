import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses quoted cells with commas, quotes and line breaks", () => {
    expect(parseCsv('a,b\n"Santos, Jr.","say ""hi"""\n"two\nlines",x')).toEqual([
      ["a", "b"],
      ["Santos, Jr.", 'say "hi"'],
      ["two\nlines", "x"],
    ]);
  });

  it("handles a BOM, Windows line endings and blank lines", () => {
    expect(parseCsv("﻿id,name\r\n1,Ana\r\n\r\n,\r\n2,Ben\r\n")).toEqual([
      ["id", "name"],
      ["1", "Ana"],
      ["2", "Ben"],
    ]);
  });

  it("detects semicolon and tab separators", () => {
    expect(parseCsv("id;name\n1;Ana")).toEqual([["id", "name"], ["1", "Ana"]]);
    expect(parseCsv("id\tname\n1\tAna")).toEqual([["id", "name"], ["1", "Ana"]]);
  });
});
