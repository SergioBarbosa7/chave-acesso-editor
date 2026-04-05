export const ACCESS_KEY_LENGTH = 44;
export const BASE_KEY_LENGTH = 43;

export const UF_DICTIONARY = Object.freeze({
  "11": { code: "11", abbreviation: "RO", name: "Rondonia" },
  "12": { code: "12", abbreviation: "AC", name: "Acre" },
  "13": { code: "13", abbreviation: "AM", name: "Amazonas" },
  "14": { code: "14", abbreviation: "RR", name: "Roraima" },
  "15": { code: "15", abbreviation: "PA", name: "Pará" },
  "16": { code: "16", abbreviation: "AP", name: "Amapa" },
  "17": { code: "17", abbreviation: "TO", name: "Tocantins" },
  "21": { code: "21", abbreviation: "MA", name: "Maranhão" },
  "22": { code: "22", abbreviation: "PI", name: "Piauí" },
  "23": { code: "23", abbreviation: "CE", name: "Ceará" },
  "24": { code: "24", abbreviation: "RN", name: "Rio Grande do Norte" },
  "25": { code: "25", abbreviation: "PB", name: "Paraíba" },
  "26": { code: "26", abbreviation: "PE", name: "Pernambuco" },
  "27": { code: "27", abbreviation: "AL", name: "Alagoas" },
  "28": { code: "28", abbreviation: "SE", name: "Sergipe" },
  "29": { code: "29", abbreviation: "BA", name: "Bahia" },
  "31": { code: "31", abbreviation: "MG", name: "Minas Gerais" },
  "32": { code: "32", abbreviation: "ES", name: "Espírito Santo" },
  "33": { code: "33", abbreviation: "RJ", name: "Rio de Janeiro" },
  "35": { code: "35", abbreviation: "SP", name: "São Paulo" },
  "41": { code: "41", abbreviation: "PR", name: "Paraná" },
  "42": { code: "42", abbreviation: "SC", name: "Santa Catarina" },
  "43": { code: "43", abbreviation: "RS", name: "Rio Grande do Sul" },
  "50": { code: "50", abbreviation: "MS", name: "Mato Grosso do Sul" },
  "51": { code: "51", abbreviation: "MT", name: "Mato Grosso" },
  "52": { code: "52", abbreviation: "GO", name: "Goiás" },
  "53": { code: "53", abbreviation: "DF", name: "Distrito Federal" }
});

export function normalizeSearchText(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export const DOCUMENT_MODEL_DICTIONARY = Object.freeze({
  "55": { code: "55", name: "NFe" },
  "57": { code: "57", name: "CTe" },
  "58": { code: "58", name: "MDFe" },
  "59": { code: "59", name: "CFeSAT" },
  "62": { code: "62", name: "NFCom" },
  "63": { code: "63", name: "BPe" },
  "64": { code: "64", name: "GTVe" },
  "65": { code: "65", name: "NFCe" },
  "66": { code: "66", name: "NF3e" },
  "67": { code: "67", name: "CTeOS" }
});

export const FIELD_LENGTHS = Object.freeze({
  ufCode: 2,
  issueYear: 2,
  issueMonth: 2,
  issuerDocument: 14,
  documentModel: 2,
  series: 3,
  documentNumber: 9,
  emissionType: 1,
  numericCode: 8,
  checkDigit: 1
});

function padLeft(value, length) {
  return value.padStart(length, "0");
}

function padRight(value, length) {
  return value.padEnd(length, "0");
}

function trimLeftPadding(value) {
  if (!value) {
    return "";
  }

  const trimmed = value.replace(/^0+/, "");
  return trimmed || "0";
}

function toIssuerStorageValue(value) {
  const normalized = normalizeAccessKey(value);

  if (normalized.length === 11) {
    return padRight(normalized, 14);
  }

  return normalized.slice(0, 14);
}

function toDisplayFields(fields) {
  const sanitized = sanitizeFields(fields);

  return {
    ...sanitized,
    issuerDocument: sanitized.issuerDocument.length === 14 && sanitized.issuerDocument.endsWith("000")
      ? sanitized.issuerDocument.slice(0, 11)
      : sanitized.issuerDocument,
    series: trimLeftPadding(sanitized.series),
    documentNumber: trimLeftPadding(sanitized.documentNumber)
  };
}

export function normalizeAccessKey(rawValue) {
  return (rawValue ?? "").replace(/\D/g, "");
}

export function findUfByCode(code) {
  return UF_DICTIONARY[code] ?? null;
}

export function findDocumentModelByCode(code) {
  return DOCUMENT_MODEL_DICTIONARY[code] ?? null;
}

export function calculateCheckDigit(baseKey) {
  if (baseKey == null || baseKey.length !== BASE_KEY_LENGTH) {
    throw new Error("Base key must contain exactly 43 digits");
  }

  if (!/^\d+$/.test(baseKey)) {
    throw new Error("Base key must contain only digits");
  }

  let sum = 0;
  let weight = 2;
  for (let index = baseKey.length - 1; index >= 0; index -= 1) {
    sum += Number(baseKey[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const remainder = sum % 11;
  return remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
}

export function appendCheckDigit(baseKey) {
  return baseKey + calculateCheckDigit(baseKey);
}

export function parseAccessKey(normalizedKey) {
  if (normalizedKey == null || normalizedKey.length !== ACCESS_KEY_LENGTH) {
    throw new Error("Access key must contain exactly 44 digits");
  }

  if (!/^\d+$/.test(normalizedKey)) {
    throw new Error("Access key must contain only digits");
  }

  const parsed = {
    normalizedKey,
    ufCode: normalizedKey.slice(0, 2),
    issueYearMonth: normalizedKey.slice(2, 6),
    issuerDocument: normalizedKey.slice(6, 20),
    documentModel: normalizedKey.slice(20, 22),
    series: normalizedKey.slice(22, 25),
    documentNumber: normalizedKey.slice(25, 34),
    emissionType: normalizedKey.slice(34, 35),
    numericCode: normalizedKey.slice(35, 43),
    checkDigit: normalizedKey.slice(43, 44)
  };

  return {
    ...parsed,
    baseKey: normalizedKey.slice(0, BASE_KEY_LENGTH),
    issueYear: parsed.issueYearMonth.slice(0, 2),
    issueMonth: parsed.issueYearMonth.slice(2, 4),
    issuerUsesCpf: parsed.issuerDocument.endsWith("000"),
    issuerDocumentLabel: parsed.issuerDocument.endsWith("000") ? "CPF Emitente" : "CNPJ Emitente",
    issuerDocumentDisplayValue: parsed.issuerDocument.endsWith("000")
      ? parsed.issuerDocument.slice(0, 11)
      : parsed.issuerDocument
  };
}

export function makeEmptyFields() {
  return {
    ufCode: "",
    issueYear: "",
    issueMonth: "",
    issuerDocument: "",
    documentModel: "",
    series: "",
    documentNumber: "",
    emissionType: "",
    numericCode: "",
    checkDigit: ""
  };
}

export function fieldsFromParsedAccessKey(parsed) {
  return toDisplayFields({
    ufCode: parsed.ufCode,
    issueYear: parsed.issueYear,
    issueMonth: parsed.issueMonth,
    issuerDocument: parsed.issuerDocument,
    documentModel: parsed.documentModel,
    series: parsed.series,
    documentNumber: parsed.documentNumber,
    emissionType: parsed.emissionType,
    numericCode: parsed.numericCode,
    checkDigit: parsed.checkDigit
  });
}

export function fieldsFromPartialKey(normalizedKey) {
  return toDisplayFields({
    ufCode: normalizedKey.slice(0, 2),
    issueYear: normalizedKey.slice(2, 4),
    issueMonth: normalizedKey.slice(4, 6),
    issuerDocument: normalizedKey.slice(6, 20),
    documentModel: normalizedKey.slice(20, 22),
    series: normalizedKey.slice(22, 25),
    documentNumber: normalizedKey.slice(25, 34),
    emissionType: normalizedKey.slice(34, 35),
    numericCode: normalizedKey.slice(35, 43),
    checkDigit: normalizedKey.slice(43, 44)
  });
}

export function sanitizeFieldValue(fieldName, value) {
  const normalized = normalizeAccessKey(value);

  if (fieldName === "issuerDocument") {
    return normalized.slice(0, 14);
  }

  if (fieldName === "series") {
    return normalized.slice(0, 3);
  }

  if (fieldName === "documentNumber") {
    return normalized.slice(0, 9);
  }

  const length = FIELD_LENGTHS[fieldName];
  return normalized.slice(0, length);
}

export function sanitizeFields(fields) {
  return Object.fromEntries(
    Object.keys(FIELD_LENGTHS).map((fieldName) => [fieldName, sanitizeFieldValue(fieldName, fields[fieldName] ?? "")])
  );
}

export function serializeFields(fields) {
  const sanitized = sanitizeFields(fields);

  return {
    ...sanitized,
    issuerDocument: toIssuerStorageValue(sanitized.issuerDocument),
    series: padLeft(sanitized.series, FIELD_LENGTHS.series),
    documentNumber: padLeft(sanitized.documentNumber, FIELD_LENGTHS.documentNumber)
  };
}

export function buildBaseKey(fields) {
  const serialized = serializeFields(fields);
  const baseKey = serialized.ufCode
    + serialized.issueYear
    + serialized.issueMonth
    + serialized.issuerDocument
    + serialized.documentModel
    + serialized.series
    + serialized.documentNumber
    + serialized.emissionType
    + serialized.numericCode;

  if (baseKey.length !== BASE_KEY_LENGTH) {
    throw new Error("Base key must contain exactly 43 digits");
  }

  return baseKey;
}

export function buildAccessKeyWithRecalculatedCheckDigit(fields) {
  return appendCheckDigit(buildBaseKey(fields));
}

export function issuerDocumentMeta(issuerDocument) {
  const normalized = sanitizeFieldValue("issuerDocument", issuerDocument);
  const usesCpf = normalized.length > 0 && normalized.length <= 11;
  return {
    usesCpf,
    label: usesCpf ? "CPF Emitente" : "CNPJ Emitente",
    displayValue: normalized
  };
}

export function validateAccessKey(rawValue) {
  const normalizedKey = normalizeAccessKey(rawValue);
  if (normalizedKey.length !== ACCESS_KEY_LENGTH) {
    return { valid: false, hasLengthError: true, fieldErrors: {} };
  }

  const parsed = parseAccessKey(normalizedKey);
  const fieldErrors = {};

  if (!findUfByCode(parsed.ufCode)) {
    fieldErrors.ufCode = "Codigo da UF invalido";
  }

  const month = Number(parsed.issueMonth);
  if (Number.isNaN(month) || month < 1 || month > 12) {
    fieldErrors.issueYearMonth = "Ano/mes de emissao invalido";
  }

  if (parsed.checkDigit !== String(calculateCheckDigit(parsed.baseKey))) {
    fieldErrors.checkDigit = "Digito verificador invalido";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    hasLengthError: false,
    fieldErrors
  };
}

export function validateFields(fields) {
  const sanitized = sanitizeFields(fields);
  const fieldErrors = {};

  if (sanitized.ufCode.length === FIELD_LENGTHS.ufCode && !findUfByCode(sanitized.ufCode)) {
    fieldErrors.ufCode = "Codigo da UF invalido";
  }

  if (
    sanitized.issueYear.length === FIELD_LENGTHS.issueYear
    && sanitized.issueMonth.length === FIELD_LENGTHS.issueMonth
  ) {
    const month = Number(sanitized.issueMonth);
    if (Number.isNaN(month) || month < 1 || month > 12) {
      fieldErrors.issueYearMonth = "Ano/mes de emissao invalido";
    }
  }

  if (sanitized.checkDigit) {
    try {
      const expectedCheckDigit = String(calculateCheckDigit(buildBaseKey(sanitized)));
      if (sanitized.checkDigit !== expectedCheckDigit) {
        fieldErrors.checkDigit = "Digito verificador invalido";
      }
    } catch {
      // Ignore while the base key is incomplete.
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}
