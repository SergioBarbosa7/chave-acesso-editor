<script setup>
import { computed, reactive, ref } from "vue";
import {
  ACCESS_KEY_LENGTH,
  FIELD_LENGTHS,
  UF_DICTIONARY,
  buildAccessKeyWithRecalculatedCheckDigit,
  fieldsFromPartialKey,
  fieldsFromParsedAccessKey,
  findDocumentModelByCode,
  findUfByCode,
  issuerDocumentMeta,
  makeEmptyFields,
  normalizeAccessKey,
  normalizeSearchText,
  parseAccessKey,
  sanitizeFieldValue,
  sanitizeFields,
  serializeFields,
  validateFields,
  validateAccessKey
} from "./lib/accessKey";

const accessKeyInput = ref("");
const ufPickerOpen = ref(false);
const ufQuery = ref("");
const fields = reactive(makeEmptyFields());

const normalizedAccessKey = computed(() => normalizeAccessKey(accessKeyInput.value));

const issuerMeta = computed(() => issuerDocumentMeta(fields.issuerDocument));
const ufOptions = Object.values(UF_DICTIONARY);
const selectedUf = computed(() => findUfByCode(fields.ufCode));
const filteredUfOptions = computed(() => {
  const query = normalizeSearchText(ufQuery.value.trim());

  if (!query) {
    return ufOptions;
  }

  return ufOptions.filter((uf) => {
    const label = normalizeSearchText(`${uf.abbreviation} ${uf.name} ${uf.code}`);
    return label.includes(query);
  });
});

const validationResult = computed(() => validateAccessKey(accessKeyInput.value));
const fieldValidationResult = computed(() => validateFields(fields));
const hasFieldValidationErrors = computed(() => Object.keys(fieldValidationResult.value.fieldErrors).length > 0);

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

  if (validationResult.value.hasLengthError || !validationResult.value.valid || hasFieldValidationErrors.value) {
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

  if (!validationResult.value.valid || hasFieldValidationErrors.value) {
    return "Campos inválidos encontrados";
  }

  return "Chave válida";
});

const validationMessages = computed(() => {
  if (!normalizedAccessKey.value) {
    return [];
  }

  if (validationResult.value.hasLengthError) {
    return ["A chave deve possuir exatamente 44 dígitos após remover a máscara."];
  }

  const messages = Object.values({
    ...validationResult.value.fieldErrors,
    ...fieldValidationResult.value.fieldErrors
  });
  if (messages.length > 0) {
    return messages;
  }
  
  return [];
});

const fieldErrorMap = computed(() => {
  const errors = {};

  if (fieldValidationResult.value.fieldErrors.ufCode) {
    errors.ufCode = fieldValidationResult.value.fieldErrors.ufCode;
  }

  if (fieldValidationResult.value.fieldErrors.issueYearMonth) {
    errors.issueYear = fieldValidationResult.value.fieldErrors.issueYearMonth;
    errors.issueMonth = fieldValidationResult.value.fieldErrors.issueYearMonth;
  }

  if (fieldValidationResult.value.fieldErrors.checkDigit) {
    errors.checkDigit = fieldValidationResult.value.fieldErrors.checkDigit;
  }

  return errors;
});

const fieldDescriptors = [
  { name: "ufCode", label: "UF" },
  { name: "issueYear", label: "Ano" },
  { name: "issueMonth", label: "Mês" },
  { name: "issuerDocument", label: () => issuerMeta.value.label },
  { name: "documentModel", label: "Modelo" },
  { name: "series", label: "Série" },
  { name: "documentNumber", label: "Número" },
  { name: "emissionType", label: "Tipo de emissão" },
  { name: "numericCode", label: "Código numérico" },
  { name: "checkDigit", label: "DV" }
];

function syncFieldsFromKey(rawValue) {
  const normalized = normalizeAccessKey(rawValue);
  accessKeyInput.value = normalized;

  if (!normalized) {
    Object.assign(fields, makeEmptyFields());
    ufQuery.value = "";
    return;
  }

  if (normalized.length === ACCESS_KEY_LENGTH) {
    Object.assign(fields, fieldsFromParsedAccessKey(parseAccessKey(normalized)));
    syncUfQueryFromCode();
    return;
  }

  Object.assign(fields, sanitizeFields(fieldsFromPartialKey(normalized)));
  syncUfQueryFromCode();
}

function syncKeyFromFields(changedFieldName) {
  fields[changedFieldName] = sanitizeFieldValue(changedFieldName, fields[changedFieldName]);
  const sanitized = sanitizeFields(fields);

  if (changedFieldName === "ufCode") {
    syncUfQueryFromCode(sanitized.ufCode);
  }

  if (changedFieldName !== "checkDigit") {
    try {
      const rebuiltKey = buildAccessKeyWithRecalculatedCheckDigit(sanitized);
      accessKeyInput.value = rebuiltKey;
      return;
    } catch {
      // Fall through to partial reconstruction while the key is incomplete.
    }
  }

  Object.assign(fields, sanitized);
  accessKeyInput.value = Object.values(serializeFields(sanitized)).join("");
}

function recalculateCheckDigit() {
  try {
    const rebuiltKey = buildAccessKeyWithRecalculatedCheckDigit(fields);
    accessKeyInput.value = rebuiltKey;
    Object.assign(fields, fieldsFromParsedAccessKey(parseAccessKey(rebuiltKey)));
    syncUfQueryFromCode();
  } catch {
    Object.assign(fields, sanitizeFields(fields));
    accessKeyInput.value = Object.values(serializeFields(fields)).join("");
  }
}

function syncUfFromSelect(value) {
  fields.ufCode = value;
  ufPickerOpen.value = false;
  syncUfQueryFromCode(value);
  syncKeyFromFields("ufCode");
}

function formatUfOption(uf) {
  return `${uf.abbreviation} - ${uf.name} (${uf.code})`;
}

function syncUfQueryFromCode(code = fields.ufCode) {
  const uf = findUfByCode(code);
  ufQuery.value = uf ? formatUfOption(uf) : "";
}

function openUfPicker() {
  ufPickerOpen.value = true;
  ufQuery.value = selectedUf.value ? formatUfOption(selectedUf.value) : "";
}

function handleUfQueryInput(value) {
  ufQuery.value = value;
  ufPickerOpen.value = true;
}

function closeUfPicker() {
  ufPickerOpen.value = false;
  syncUfQueryFromCode();
}

function selectFirstFilteredUf() {
  if (filteredUfOptions.value.length > 0) {
    syncUfFromSelect(filteredUfOptions.value[0].code);
  } else {
    closeUfPicker();
  }
}
</script>

<template>
  <main class="container py-5 editor-shell">
    <div class="glass-card card shadow-sm border-0">
      <div class="card-body p-4 p-lg-5">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
          <div>
            <h1 class="h3 mb-2">Editor de Chave de Acesso</h1>
            <p class="text-secondary mb-0">
              Interface única para colar, editar, validar e reconstruir a chave em tempo real.
            </p>
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
            Aceita entrada com ou sem máscara. Ao colar ou digitar, caracteres não numéricos são removidos automaticamente.
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
          <div class="mb-3">
            <h2 class="h5 mb-0">Campos da chave</h2>
          </div>

          <div class="field-list rounded-4 border overflow-hidden">
            <div
              v-for="descriptor in fieldDescriptors"
              :key="descriptor.name"
              class="field-list-item"
            >
              <label class="field-list-label fw-semibold" :for="descriptor.name">
                {{ typeof descriptor.label === "function" ? descriptor.label() : descriptor.label }}
              </label>
              <div class="field-list-value">
                <template v-if="descriptor.name === 'ufCode'">
                  <div class="uf-row">
                    <input
                      :id="descriptor.name"
                      v-model="fields[descriptor.name]"
                      class="form-control monospace-value uf-code-input"
                      :class="{ 'is-invalid': fieldErrorMap[descriptor.name] }"
                      inputmode="numeric"
                      :maxlength="FIELD_LENGTHS[descriptor.name]"
                      @input="syncKeyFromFields(descriptor.name)"
                    >
                    <div
                      class="uf-picker"
                      tabindex="0"
                      @focusout="closeUfPicker"
                    >
                      <input
                        class="form-control uf-picker-input"
                        :value="ufQuery"
                        placeholder="Digite a UF"
                        @focus="openUfPicker"
                        @input="handleUfQueryInput($event.target.value)"
                        @keydown.enter.prevent="selectFirstFilteredUf"
                      >
                      <div v-if="ufPickerOpen" class="uf-picker-menu">
                        <button
                          v-for="uf in filteredUfOptions"
                          :key="uf.code"
                          type="button"
                          class="uf-picker-option"
                          :class="{ 'is-active': fields.ufCode === uf.code }"
                          @click="syncUfFromSelect(uf.code)"
                        >
                          {{ formatUfOption(uf) }}
                        </button>
                        <div v-if="filteredUfOptions.length === 0" class="uf-picker-empty">
                          Nenhuma UF encontrada
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div
                  v-else
                  :class="descriptor.name === 'checkDigit' ? 'check-digit-row' : ''"
                >
                  <input
                    :id="descriptor.name"
                    v-model="fields[descriptor.name]"
                    class="form-control monospace-value"
                    :class="{ 'is-invalid': fieldErrorMap[descriptor.name] }"
                    inputmode="numeric"
                    :maxlength="FIELD_LENGTHS[descriptor.name]"
                    @input="syncKeyFromFields(descriptor.name)"
                  >
                  <button
                    v-if="descriptor.name === 'checkDigit'"
                    type="button"
                    class="btn btn-outline-secondary"
                    @click="recalculateCheckDigit"
                  >
                    Recalcular DV
                  </button>
                </div>
                <div class="invalid-feedback d-block" v-if="fieldErrorMap[descriptor.name]">
                  {{ fieldErrorMap[descriptor.name] }}
                </div>
                <div
                  v-if="descriptor.name === 'issuerDocument'"
                  class="form-text mb-0"
                >
                  <template v-if="issuerMeta.usesCpf">
                    Informe apenas os 11 dígitos do CPF. O padding será aplicado somente na chave.
                  </template>
                  <template v-else>
                    Informe 14 dígitos para CNPJ ou 11 dígitos para CPF.
                  </template>
                </div>
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
                <div class="small text-secondary">Código numérico</div>
                <div class="fw-semibold monospace-value">{{ parsedAccessKey.numericCode }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
