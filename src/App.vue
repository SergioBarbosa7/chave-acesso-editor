<script setup>
import { computed, reactive, ref } from "vue";
import {
  ACCESS_KEY_LENGTH,
  FIELD_LENGTHS,
  buildAccessKeyWithRecalculatedCheckDigit,
  fieldsFromPartialKey,
  fieldsFromParsedAccessKey,
  findDocumentModelByCode,
  findUfByCode,
  issuerDocumentMeta,
  makeEmptyFields,
  normalizeAccessKey,
  parseAccessKey,
  sanitizeFieldValue,
  sanitizeFields,
  validateAccessKey
} from "./lib/accessKey";

const accessKeyInput = ref("");
const fields = reactive(makeEmptyFields());

const normalizedAccessKey = computed(() => normalizeAccessKey(accessKeyInput.value));

const issuerMeta = computed(() => issuerDocumentMeta(fields.issuerDocument));

const validationResult = computed(() => validateAccessKey(accessKeyInput.value));

const parsedAccessKey = computed(() => {
  if (normalizedAccessKey.value.length !== ACCESS_KEY_LENGTH) {
    return null;
  }

  try {
    return parseAccessKey(normalizedAccessKey.value);
  } catch {
    return null;
  }
});

const statusVariant = computed(() => {
  if (!normalizedAccessKey.value) {
    return "bg-light border";
  }

  if (validationResult.value.hasLengthError || !validationResult.value.valid) {
    return "bg-danger-subtle border border-danger-subtle";
  }

  return "bg-success-subtle border border-success-subtle";
});

const statusTitle = computed(() => {
  if (!normalizedAccessKey.value) {
    return "Aguardando entrada";
  }

  if (validationResult.value.hasLengthError) {
    return "Tamanho invalido";
  }

  if (!validationResult.value.valid) {
    return "Campos invalidos encontrados";
  }

  return "Chave valida";
});

const validationMessages = computed(() => {
  if (!normalizedAccessKey.value) {
    return [];
  }

  if (validationResult.value.hasLengthError) {
    return ["A chave deve possuir exatamente 44 digitos apos remover a mascara."];
  }

  const messages = Object.values(validationResult.value.fieldErrors);
  if (messages.length > 0) {
    return messages;
  }

  const uf = parsedAccessKey.value ? findUfByCode(parsedAccessKey.value.ufCode) : null;
  return uf ? [`UF identificada: ${uf.abbreviation} - ${uf.name}`] : [];
});

const fieldErrorMap = computed(() => {
  const errors = {};
  if (validationResult.value.hasLengthError) {
    return errors;
  }

  if (validationResult.value.fieldErrors.ufCode) {
    errors.ufCode = validationResult.value.fieldErrors.ufCode;
  }

  if (validationResult.value.fieldErrors.issueYearMonth) {
    errors.issueYear = validationResult.value.fieldErrors.issueYearMonth;
    errors.issueMonth = validationResult.value.fieldErrors.issueYearMonth;
  }

  if (validationResult.value.fieldErrors.checkDigit) {
    errors.checkDigit = validationResult.value.fieldErrors.checkDigit;
  }

  return errors;
});

const fieldDescriptors = [
  { name: "ufCode", label: "UF", cols: "col-md-2" },
  { name: "issueYear", label: "Ano", cols: "col-md-2" },
  { name: "issueMonth", label: "Mes", cols: "col-md-2" },
  { name: "issuerDocument", label: () => issuerMeta.value.label, cols: "col-md-6" },
  { name: "documentModel", label: "Modelo", cols: "col-md-2" },
  { name: "series", label: "Serie", cols: "col-md-2" },
  { name: "documentNumber", label: "Numero", cols: "col-md-3" },
  { name: "emissionType", label: "Tipo de emissao", cols: "col-md-2" },
  { name: "numericCode", label: "Codigo numerico", cols: "col-md-3" },
  { name: "checkDigit", label: "DV", cols: "col-md-2" }
];

function syncFieldsFromKey(rawValue) {
  const normalized = normalizeAccessKey(rawValue);
  accessKeyInput.value = normalized;

  if (!normalized) {
    Object.assign(fields, makeEmptyFields());
    return;
  }

  if (normalized.length === ACCESS_KEY_LENGTH) {
    Object.assign(fields, fieldsFromParsedAccessKey(parseAccessKey(normalized)));
    return;
  }

  Object.assign(fields, sanitizeFields(fieldsFromPartialKey(normalized)));
}

function syncKeyFromFields(changedFieldName) {
  fields[changedFieldName] = sanitizeFieldValue(changedFieldName, fields[changedFieldName]);
  const sanitized = sanitizeFields(fields);

  if (changedFieldName !== "checkDigit") {
    try {
      const rebuiltKey = buildAccessKeyWithRecalculatedCheckDigit(sanitized);
      accessKeyInput.value = rebuiltKey;
      Object.assign(fields, fieldsFromParsedAccessKey(parseAccessKey(rebuiltKey)));
      return;
    } catch {
      // Fall through to partial reconstruction while the key is incomplete.
    }
  }

  Object.assign(fields, sanitized);
  accessKeyInput.value = Object.values(sanitized).join("");
}
</script>

<template>
  <main class="container py-5 editor-shell">
    <div class="glass-card card shadow-sm border-0">
      <div class="card-body p-4 p-lg-5">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
          <div>
            <div class="section-label text-secondary mb-2">Vue Frontend</div>
            <h1 class="h3 mb-2">Editor de Chave de Acesso</h1>
            <p class="text-secondary mb-0">
              Interface unica para colar, editar, validar e reconstruir a chave em tempo real.
            </p>
          </div>
          <div class="small text-secondary">
            Bootstrap para layout, Vue para comportamento ao vivo
          </div>
        </div>

        <section class="mb-4">
          <label class="form-label fw-semibold" for="accessKey">Chave de acesso</label>
          <input
            id="accessKey"
            v-model="accessKeyInput"
            class="form-control form-control-lg monospace-value"
            inputmode="numeric"
            autocomplete="off"
            placeholder="Digite ou cole a chave de acesso"
            @input="syncFieldsFromKey(accessKeyInput)"
            @paste="() => requestAnimationFrame(() => syncFieldsFromKey(accessKeyInput))"
          >
          <div class="form-text">
            Aceita entrada com ou sem mascara. Ao colar ou digitar, caracteres nao numericos sao removidos automaticamente.
          </div>
        </section>

        <section class="mb-4">
          <div class="field-card status-panel rounded-4 p-3" :class="statusVariant">
            <div class="section-label text-secondary mb-2">Status</div>
            <div class="fw-semibold">{{ statusTitle }}</div>
            <ul class="mb-0 mt-2 ps-3" v-if="validationMessages.length > 0">
              <li v-for="message in validationMessages" :key="message">{{ message }}</li>
            </ul>
            <div class="small text-secondary mt-3" v-if="normalizedAccessKey">
              {{ normalizedAccessKey.length }} de 44 digitos preenchidos
            </div>
          </div>
        </section>

        <section>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h5 mb-0">Campos da chave</h2>
            <div class="small text-secondary">
              Exibicao e edicao unificadas
            </div>
          </div>

          <div class="row g-3">
            <div
              v-for="descriptor in fieldDescriptors"
              :key="descriptor.name"
              :class="descriptor.cols"
            >
              <label class="form-label" :for="descriptor.name">
                {{ typeof descriptor.label === "function" ? descriptor.label() : descriptor.label }}
              </label>
              <input
                :id="descriptor.name"
                v-model="fields[descriptor.name]"
                class="form-control monospace-value"
                :class="{ 'is-invalid': fieldErrorMap[descriptor.name] }"
                inputmode="numeric"
                :maxlength="FIELD_LENGTHS[descriptor.name]"
                @input="syncKeyFromFields(descriptor.name)"
              >
              <div class="invalid-feedback">
                {{ fieldErrorMap[descriptor.name] }}
              </div>
              <div
                v-if="descriptor.name === 'issuerDocument'"
                class="form-text"
              >
                <template v-if="issuerMeta.usesCpf">
                  CPF detectado. A visualizacao utiliza os 11 digitos significativos.
                </template>
                <template v-else>
                  Use 14 digitos para CNPJ ou 11 digitos + 000 para CPF.
                </template>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-4" v-if="parsedAccessKey">
          <div class="rounded-4 border bg-white p-3">
            <div class="section-label text-secondary mb-2">Resumo interpretado</div>
            <div class="row g-3">
              <div class="col-md-3">
                <div class="small text-secondary">UF</div>
                <div class="fw-semibold">
                  {{ findUfByCode(parsedAccessKey.ufCode)?.abbreviation || parsedAccessKey.ufCode }}
                </div>
              </div>
              <div class="col-md-3">
                <div class="small text-secondary">Documento emitente</div>
                <div class="fw-semibold">
                  {{ parsedAccessKey.issuerDocumentLabel }}: {{ parsedAccessKey.issuerDocumentDisplayValue }}
                </div>
              </div>
              <div class="col-md-3">
                <div class="small text-secondary">Modelo</div>
                <div class="fw-semibold">
                  {{
                    findDocumentModelByCode(parsedAccessKey.documentModel)
                      ? `${findDocumentModelByCode(parsedAccessKey.documentModel).name} (${parsedAccessKey.documentModel})`
                      : parsedAccessKey.documentModel
                  }}
                </div>
              </div>
              <div class="col-md-3">
                <div class="small text-secondary">Codigo numerico</div>
                <div class="fw-semibold monospace-value">{{ parsedAccessKey.numericCode }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
