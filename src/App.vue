<script setup>
import { computed, reactive, ref } from "vue";
import {
  ACCESS_KEY_LENGTH,
  FIELD_LENGTHS,
  UF_DICTIONARY,
  buildAccessKeyWithRecalculatedCheckDigit,
  calculateCheckDigit,
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

const PAGE_EDITOR = "editor";
const PAGE_GUIDE = "guia";
const PAGE_DV = "dv";

const accessKeyInput = ref("");
const ufPickerOpen = ref(false);
const ufQuery = ref("");
const fields = reactive(makeEmptyFields());
const currentPage = ref(resolvePageFromHash());
const dvExampleInput = ref("42241117081562000100550030000051811394726205");

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
    return "Tamanho inválido";
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

const fieldGuideItems = [
  {
    digits: "1-2",
    size: "2 dígitos",
    title: "Código da UF",
    description: "Identifica o estado do emitente. Exemplos comuns: 35 para São Paulo, 41 para Paraná e 42 para Santa Catarina."
  },
  {
    digits: "3-6",
    size: "4 dígitos",
    title: "Ano e mês de emissão",
    description: "Usa o formato AAMM. Exemplo: 2411 representa novembro de 2024."
  },
  {
    digits: "7-20",
    size: "14 dígitos",
    title: "Documento do emitente",
    description: "Normalmente é o CNPJ. Quando o emitente usa CPF, os 11 dígitos são preenchidos com 000 à direita para completar o campo."
  },
  {
    digits: "21-22",
    size: "2 dígitos",
    title: "Modelo do documento",
    description: "Define o tipo do documento fiscal. Exemplos: 55 para NF-e, 65 para NFC-e, 57 para CT-e."
  },
  {
    digits: "23-25",
    size: "3 dígitos",
    title: "Série",
    description: "Agrupa a numeração do documento dentro da emissão."
  },
  {
    digits: "26-34",
    size: "9 dígitos",
    title: "Número do documento",
    description: "Número sequencial da nota ou documento fiscal dentro da série."
  },
  {
    digits: "35",
    size: "1 dígito",
    title: "Tipo de emissão",
    description: "Indica a modalidade de emissão usada pelo documento."
  },
  {
    digits: "36-43",
    size: "8 dígitos",
    title: "Código numérico",
    description: "Valor gerado pelo sistema emissor para compor a chave e evitar colisões."
  },
  {
    digits: "44",
    size: "1 dígito",
    title: "Dígito verificador",
    description: "É calculado sobre os 43 primeiros dígitos com pesos cíclicos e regra de resto."
  }
];

const sampleKey = "42241117081562000100550030000051811394726205";
const sampleFields = [
  ["42", "Código da UF"],
  ["2411", "Ano e mês de emissão"],
  ["17081562000100", "Documento do emitente"],
  ["55", "Modelo do documento"],
  ["003", "Série"],
  ["000005181", "Número do documento"],
  ["1", "Tipo de emissão"],
  ["39472620", "Código numérico"],
  ["5", "Dígito verificador"]
];

const dvManualSteps = [
  {
    title: "1. Separar a base",
    text: "O cálculo sempre ignora o último dígito da chave completa. A base usada é formada pelos 43 primeiros dígitos."
  },
  {
    title: "2. Ler da direita para a esquerda",
    text: "A aplicação começa no último dígito da base e avança em direção ao primeiro. Essa ordem define como os pesos são distribuídos."
  },
  {
    title: "3. Aplicar os pesos em ciclo",
    text: "Cada dígito é multiplicado por um peso. A sequência usada é 2, 3, 4, 5, 6, 7, 8, 9 e depois volta para 2 até o fim da base."
  },
  {
    title: "4. Somar os produtos",
    text: "Todos os resultados das multiplicações são somados. Esse total é a soma ponderada da chave."
  },
  {
    title: "5. Obter o resto",
    text: "Depois da soma ponderada, é calculado o resto da divisão por 11. Esse resto determina o valor final do DV."
  },
  {
    title: "6. Fechar o dígito verificador",
    text: "Se o resto for 0 ou 1, o DV é 0. Nos demais cenários, o DV é obtido subtraindo o resto de 11."
  }
];
const dvWeightPreview = "2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4...";

const dvNormalizedInput = computed(() => normalizeAccessKey(dvExampleInput.value));
const dvBaseKey = computed(() => dvNormalizedInput.value.slice(0, 43));
const dvHasEnoughDigits = computed(() => dvBaseKey.value.length === 43);
const dvProvidedDigit = computed(() => (dvNormalizedInput.value.length >= 44 ? dvNormalizedInput.value[43] : ""));
const dvCalculatedDigit = computed(() => {
  if (!dvHasEnoughDigits.value) {
    return "";
  }

  return String(calculateCheckDigit(dvBaseKey.value));
});
const dvRows = computed(() => {
  if (!dvHasEnoughDigits.value) {
    return [];
  }

  const rows = [];
  let weight = 2;

  for (let index = dvBaseKey.value.length - 1; index >= 0; index -= 1) {
    const digit = Number(dvBaseKey.value[index]);
    rows.push({
      position: index + 1,
      digit,
      weight,
      product: digit * weight
    });
    weight = weight === 9 ? 2 : weight + 1;
  }

  return rows;
});
const dvTotalSum = computed(() => dvRows.value.reduce((sum, row) => sum + row.product, 0));
const dvRemainder = computed(() => (dvHasEnoughDigits.value ? dvTotalSum.value % 11 : null));
const dvFullKeyPreview = computed(() => (dvHasEnoughDigits.value ? `${dvBaseKey.value}${dvCalculatedDigit.value}` : ""));

function resolvePageFromHash() {
  if (typeof window === "undefined") {
    return PAGE_EDITOR;
  }

  if (window.location.hash === "#/guia") {
    return PAGE_GUIDE;
  }

  if (window.location.hash === "#/dv") {
    return PAGE_DV;
  }

  return PAGE_EDITOR;
}

function syncPageFromHash() {
  currentPage.value = resolvePageFromHash();
}

function navigateTo(page) {
  if (page === PAGE_GUIDE) {
    window.location.hash = "/guia";
    return;
  }

  if (page === PAGE_DV) {
    window.location.hash = "/dv";
    return;
  }

  window.location.hash = "/";
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", syncPageFromHash);
}

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
  <main class="editor-shell">
    <nav class="top-nav">
      <button
        type="button"
        class="nav-link-button"
        :class="{ 'is-current': currentPage === PAGE_EDITOR }"
        @click="navigateTo(PAGE_EDITOR)"
      >
        Editor
      </button>
      <button
        type="button"
        class="nav-link-button"
        :class="{ 'is-current': currentPage === PAGE_GUIDE }"
        @click="navigateTo(PAGE_GUIDE)"
      >
        Como a chave é montada
      </button>
      <button
        type="button"
        class="nav-link-button"
        :class="{ 'is-current': currentPage === PAGE_DV }"
        @click="navigateTo(PAGE_DV)"
      >
        Cálculo do DV
      </button>
    </nav>

    <section class="hero-panel" v-if="currentPage === PAGE_EDITOR">
      <div class="hero-copy">
        <div class="eyebrow">Valida, edita e reconstrói</div>
        <h1>Editor de Chave de Acesso</h1>
        <p>
          Interface única para colar, editar, validar e reconstruir a chave em tempo real.
        </p>
      </div>
    </section>

    <section class="hero-panel" v-else-if="currentPage === PAGE_GUIDE">
      <div class="hero-copy">
        <div class="eyebrow">Documentação prática</div>
        <h1>Como a chave de acesso é montada</h1>
        <p>
          Esta página descreve a estrutura dos 44 dígitos, a função de cada bloco e a separação campo a campo.
        </p>
      </div>
    </section>

    <section class="hero-panel" v-else>
      <div class="hero-copy">
        <div class="eyebrow">Dígito verificador</div>
        <h1>Como o DV é calculado</h1>
        <p>
          Esta aba funciona como um manual: explica a lógica do cálculo, mostra a sequência de pesos e detalha o resultado para qualquer chave informada.
        </p>
      </div>
    </section>

    <div class="app-grid" v-if="currentPage === PAGE_EDITOR">
      <section class="panel panel-primary">
        <div class="panel-header">
          <div>
            <div class="section-label">Entrada principal</div>
            <h2>Chave completa</h2>
          </div>
        </div>

        <section class="stack-block">
          <label class="input-label" for="accessKey">Chave de acesso</label>
          <input
            id="accessKey"
            v-model="accessKeyInput"
            class="text-input text-input-large monospace-value"
            inputmode="numeric"
            autocomplete="off"
            placeholder="Digite ou cole a chave de acesso"
            @input="syncFieldsFromKey(accessKeyInput)"
            @paste="() => requestAnimationFrame(() => syncFieldsFromKey(accessKeyInput))"
          >
          <div class="helper-text">
            Aceita entrada com ou sem máscara. Ao colar ou digitar, caracteres não numéricos são removidos automaticamente.
          </div>
        </section>

        <section class="stack-block">
          <div class="status-panel" :class="statusVariant">
            <div class="section-label">Status</div>
            <div class="status-title">{{ statusTitle }}</div>
            <ul class="status-messages" v-if="validationMessages.length > 0">
              <li v-for="message in validationMessages" :key="message">{{ message }}</li>
            </ul>
            <div class="status-meta" v-if="normalizedAccessKey">
              {{ normalizedAccessKey.length }} de 44 dígitos preenchidos
            </div>
          </div>
        </section>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="section-label">Edição detalhada</div>
            <h2>Campos da chave</h2>
          </div>
        </div>

        <div class="field-list">
          <div
            v-for="descriptor in fieldDescriptors"
            :key="descriptor.name"
            class="field-list-item"
          >
            <label class="field-list-label" :for="descriptor.name">
              {{ typeof descriptor.label === "function" ? descriptor.label() : descriptor.label }}
            </label>
            <div class="field-list-value">
              <template v-if="descriptor.name === 'ufCode'">
                <div class="uf-row">
                  <input
                    :id="descriptor.name"
                    v-model="fields[descriptor.name]"
                    class="text-input monospace-value uf-code-input"
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
                      class="text-input uf-picker-input"
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
                  class="text-input monospace-value"
                  :class="{ 'is-invalid': fieldErrorMap[descriptor.name] }"
                  inputmode="numeric"
                  :maxlength="FIELD_LENGTHS[descriptor.name]"
                  @input="syncKeyFromFields(descriptor.name)"
                >
                <button
                  v-if="descriptor.name === 'checkDigit'"
                  type="button"
                  class="action-button"
                  @click="recalculateCheckDigit"
                >
                  Recalcular DV
                </button>
              </div>

              <div class="error-text" v-if="fieldErrorMap[descriptor.name]">
                {{ fieldErrorMap[descriptor.name] }}
              </div>

              <div
                v-if="descriptor.name === 'issuerDocument'"
                class="helper-text"
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
    </div>

    <section class="panel summary-panel" v-if="currentPage === PAGE_EDITOR && parsedAccessKey">
      <div class="panel-header">
        <div>
          <div class="section-label">Leitura da chave</div>
          <h2>Resumo interpretado</h2>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">UF</div>
          <div class="summary-value">
            {{ findUfByCode(parsedAccessKey.ufCode)?.abbreviation || parsedAccessKey.ufCode }}
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Documento emitente</div>
          <div class="summary-value">
            {{ parsedAccessKey.issuerDocumentLabel }}: {{ parsedAccessKey.issuerDocumentDisplayValue }}
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Modelo</div>
          <div class="summary-value">
            {{
              findDocumentModelByCode(parsedAccessKey.documentModel)
                ? `${findDocumentModelByCode(parsedAccessKey.documentModel).name} (${parsedAccessKey.documentModel})`
                : parsedAccessKey.documentModel
            }}
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Código numérico</div>
          <div class="summary-value monospace-value">{{ parsedAccessKey.numericCode }}</div>
        </div>
      </div>
    </section>

    <section class="guide-grid" v-if="currentPage === PAGE_GUIDE">
      <article class="panel guide-wide">
        <div class="panel-header">
          <div>
            <div class="section-label">Montagem</div>
            <h2>Estrutura dos 44 dígitos</h2>
          </div>
        </div>

        <div class="guide-list">
          <div v-for="item in fieldGuideItems" :key="item.digits" class="guide-item">
            <div class="guide-item-meta">
              <span class="guide-badge">{{ item.digits }}</span>
              <span class="guide-size">{{ item.size }}</span>
            </div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </article>

      <article class="panel guide-wide">
        <div class="panel-header">
          <div>
            <div class="section-label">Exemplo prático</div>
            <h2>Separação campo a campo</h2>
          </div>
        </div>

        <div class="formula-card">
          <div class="summary-label">Chave de exemplo</div>
          <div class="formula-value monospace-value">{{ sampleKey }}</div>
        </div>

        <div class="example-grid">
          <div v-for="[value, label] in sampleFields" :key="`${value}-${label}`" class="summary-item">
            <div class="summary-label monospace-value">{{ value }}</div>
            <div class="summary-value">{{ label }}</div>
          </div>
        </div>
      </article>
    </section>

    <section class="guide-grid" v-if="currentPage === PAGE_DV">
      <article class="panel guide-wide">
        <div class="panel-header">
          <div>
            <div class="section-label">Manual</div>
            <h2>Como calcular o DV manualmente</h2>
          </div>
        </div>

        <div class="content-stack">
          <p>
            O dígito verificador existe para confirmar se a chave foi montada de forma consistente. O processo usa a base com 43 dígitos, aplica pesos em ordem fixa, soma todos os produtos e transforma o resto da divisão por 11 no valor final do DV.
          </p>

          <div class="formula-card">
            <div class="summary-label">Sequência de pesos</div>
            <div class="formula-value monospace-value">{{ dvWeightPreview }}</div>
          </div>

          <div class="manual-grid">
            <div v-for="step in dvManualSteps" :key="step.title" class="guide-item">
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
            </div>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <div class="section-label">Exemplo alterável</div>
            <h2>Entrada para cálculo</h2>
          </div>
        </div>

        <div class="content-stack">
          <div>
            <label class="input-label" for="dvExampleInput">Chave base ou chave completa</label>
            <input
              id="dvExampleInput"
              v-model="dvExampleInput"
              class="text-input monospace-value"
              inputmode="numeric"
              autocomplete="off"
              placeholder="Digite 43 ou 44 dígitos"
            >
            <div class="helper-text">
              A página usa os 43 primeiros dígitos para calcular o DV. Se você informar 44 dígitos, o último será tratado como DV informado para comparação.
            </div>
          </div>

          <div class="formula-card" v-if="dvHasEnoughDigits">
            <div class="summary-label">Base usada no cálculo</div>
            <div class="formula-value monospace-value">{{ dvBaseKey }}</div>
          </div>
          <div class="formula-card" v-else>
            <div class="summary-label">Base usada no cálculo</div>
            <div class="formula-value">Preencha ao menos 43 dígitos para ver o cálculo completo.</div>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <div class="section-label">Resultado</div>
            <h2>Resumo do cálculo</h2>
          </div>
        </div>

        <div class="content-stack" v-if="dvHasEnoughDigits">
          <div class="formula-card">
            <div class="summary-label">Soma ponderada</div>
            <div class="formula-value monospace-value">{{ dvTotalSum }}</div>
          </div>
          <div class="formula-card">
            <div class="summary-label">Resto da divisão por 11</div>
            <div class="formula-value monospace-value">{{ dvRemainder }}</div>
          </div>
          <div class="formula-card">
            <div class="summary-label">DV calculado</div>
            <div class="formula-value monospace-value">{{ dvCalculatedDigit }}</div>
          </div>
          <div class="formula-card" v-if="dvProvidedDigit">
            <div class="summary-label">DV informado</div>
            <div class="formula-value monospace-value">{{ dvProvidedDigit }}</div>
          </div>
          <div class="formula-card">
            <div class="summary-label">Chave final com DV calculado</div>
            <div class="formula-value monospace-value">{{ dvFullKeyPreview }}</div>
          </div>
        </div>
      </article>

      <article class="panel guide-wide" v-if="dvHasEnoughDigits">
        <div class="panel-header">
          <div>
            <div class="section-label">Passo a passo</div>
            <h2>Como o cálculo foi feito</h2>
          </div>
        </div>

        <div class="formula-card">
          <div class="summary-label">Leitura da regra</div>
          <div class="formula-code monospace-value">
            base = {{ dvBaseKey }}
            <br>
            soma = {{ dvTotalSum }}
            <br>
            resto = {{ dvTotalSum }} % 11 = {{ dvRemainder }}
            <br>
            <span v-if="dvRemainder === 0 || dvRemainder === 1">como o resto é {{ dvRemainder }}, o DV final é 0</span>
            <span v-else>como o resto é {{ dvRemainder }}, o DV final é 11 - {{ dvRemainder }} = {{ dvCalculatedDigit }}</span>
          </div>
        </div>

        <div class="formula-card">
          <div class="summary-label">Como interpretar a tabela</div>
          <div class="formula-value">
            Cada linha mostra uma posição da base, o dígito encontrado nessa posição, o peso aplicado e o produto gerado. A soma de todos os produtos é o valor usado para encontrar o resto e fechar o DV.
          </div>
        </div>

        <div class="dv-table">
          <div class="dv-table-head">Posição</div>
          <div class="dv-table-head">Dígito</div>
          <div class="dv-table-head">Peso</div>
          <div class="dv-table-head">Produto</div>

          <template v-for="row in dvRows" :key="`${row.position}-${row.weight}`">
            <div class="dv-table-cell monospace-value">{{ row.position }}</div>
            <div class="dv-table-cell monospace-value">{{ row.digit }}</div>
            <div class="dv-table-cell monospace-value">{{ row.weight }}</div>
            <div class="dv-table-cell monospace-value">{{ row.product }}</div>
          </template>
        </div>
      </article>
    </section>
  </main>
</template>
