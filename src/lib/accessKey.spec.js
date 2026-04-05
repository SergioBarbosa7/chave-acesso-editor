import { describe, expect, test } from "vitest";
import {
  appendCheckDigit,
  buildAccessKeyWithRecalculatedCheckDigit,
  calculateCheckDigit,
  fieldsFromParsedAccessKey,
  findDocumentModelByCode,
  findUfByCode,
  issuerDocumentMeta,
  normalizeAccessKey,
  parseAccessKey,
  validateAccessKey
} from "./accessKey";

describe("UF dictionary", () => {
  test("resolves Sao Paulo by UF code", () => {
    expect(findUfByCode("35")).toEqual({ code: "35", abbreviation: "SP", name: "Sao Paulo" });
  });

  test("returns null for unknown UF code", () => {
    expect(findUfByCode("00")).toBeNull();
  });
});

describe("document model dictionary", () => {
  test("resolves known document models by code", () => {
    expect(findDocumentModelByCode("55")).toEqual({ code: "55", name: "NFe" });
    expect(findDocumentModelByCode("65")).toEqual({ code: "65", name: "NFCe" });
    expect(findDocumentModelByCode("57")).toEqual({ code: "57", name: "CTe" });
    expect(findDocumentModelByCode("67")).toEqual({ code: "67", name: "CTeOS" });
    expect(findDocumentModelByCode("58")).toEqual({ code: "58", name: "MDFe" });
    expect(findDocumentModelByCode("63")).toEqual({ code: "63", name: "BPe" });
    expect(findDocumentModelByCode("64")).toEqual({ code: "64", name: "GTVe" });
    expect(findDocumentModelByCode("59")).toEqual({ code: "59", name: "CFeSAT" });
    expect(findDocumentModelByCode("62")).toEqual({ code: "62", name: "NFCom" });
    expect(findDocumentModelByCode("66")).toEqual({ code: "66", name: "NF3e" });
  });

  test("returns null for an unknown document model code", () => {
    expect(findDocumentModelByCode("00")).toBeNull();
  });
});

describe("check digit calculator", () => {
  test("calculates the manual example check digit", () => {
    expect(calculateCheckDigit("4224111708156200010055003000005181139472620")).toBe(5);
  });

  test("appends the calculated check digit to the base key", () => {
    expect(appendCheckDigit("4224111708156200010055003000005181139472620"))
      .toBe("42241117081562000100550030000051811394726205");
  });
});

describe("normalization and parsing", () => {
  test("removes mask characters from an access key", () => {
    expect(normalizeAccessKey("4224.1117.0815.6200.0100.5500.3000.0051.8113.9472.6205"))
      .toBe("42241117081562000100550030000051811394726205");
  });

  test("parses access key into fixed fields", () => {
    const parsed = parseAccessKey("42241117081562000100550030000051811394726205");

    expect(parsed.ufCode).toBe("42");
    expect(parsed.issueYear).toBe("24");
    expect(parsed.issueMonth).toBe("11");
    expect(parsed.issuerDocument).toBe("17081562000100");
    expect(parsed.numericCode).toBe("39472620");
    expect(parsed.issuerDocumentLabel).toBe("CNPJ Emitente");
  });
});

describe("builder and document interpretation", () => {
  test("rebuilds access key from editable fields with recalculated check digit", () => {
    expect(buildAccessKeyWithRecalculatedCheckDigit({
      ufCode: "42",
      issueYear: "24",
      issueMonth: "11",
      issuerDocument: "17081562000100",
      documentModel: "55",
      series: "003",
      documentNumber: "000005181",
      emissionType: "1",
      numericCode: "39472620",
      checkDigit: "0"
    })).toBe("42241117081562000100550030000051811394726205");
  });

  test("creates editable fields from a parsed key", () => {
    expect(fieldsFromParsedAccessKey(parseAccessKey("42241117081562000100550030000051811394726205")))
      .toEqual({
        ufCode: "42",
        issueYear: "24",
        issueMonth: "11",
        issuerDocument: "17081562000100",
        documentModel: "55",
        series: "003",
        documentNumber: "000005181",
        emissionType: "1",
        numericCode: "39472620",
        checkDigit: "5"
      });
  });

  test("detects CPF emitter using right padding", () => {
    expect(issuerDocumentMeta("12345678901000")).toEqual({
      usesCpf: true,
      label: "CPF Emitente",
      displayValue: "12345678901"
    });
  });
});

describe("validation", () => {
  test("accepts a valid access key", () => {
    expect(validateAccessKey("42241117081562000100550030000051811394726205")).toEqual({
      valid: true,
      hasLengthError: false,
      fieldErrors: {}
    });
  });

  test("returns a length error before field validation", () => {
    expect(validateAccessKey("1234")).toEqual({
      valid: false,
      hasLengthError: true,
      fieldErrors: {}
    });
  });

  test("reports invalid UF, month, and check digit", () => {
    expect(validateAccessKey("00241317081562000100550030000051811394726204")).toEqual({
      valid: false,
      hasLengthError: false,
      fieldErrors: {
        ufCode: "Codigo da UF invalido",
        issueYearMonth: "Ano/mes de emissao invalido",
        checkDigit: "Digito verificador invalido"
      }
    });
  });
});
