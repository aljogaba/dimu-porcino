(function () {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const calc = window.SampleCalculators;
  const inventoryCalc = window.InventoryCalculator;

  const workspace = $("#workspace");
  const studyPanel = $("#study-panel");
  const populationPanel = $("#population-panel");
  const diagnosticPanel = $("#diagnostic-panel");
  const resultsPanel = $("#results-panel");
  const resultsContent = $("#results-content");
  const message = $("#form-message");

  const state = {
    mode: null,
    directRows: [
      { id: 1, selected: true, type: "Etapa", label: "Destete", population: 800 }
    ],
    nextRowId: 2,
    inventoryView: "stage",
    estimatedInventory: null
  };

  const formatInt = value => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
  const formatNumber = (value, decimals = 1) => new Intl.NumberFormat("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(value) || 0);
  const percent = value => `${formatNumber(Number(value) * 100, 1)} %`;
  const valueOf = id => {
    const element = $(`#${id}`);
    return element ? element.value : "";
  };
  const numberOf = id => Number(valueOf(id));
  const checkedValue = name => document.querySelector(`input[name="${name}"]:checked`)?.value;

  function field(id, label, value, options = {}) {
    const { type = "number", min, max, step = "0.1", help = "", placeholder = "" } = options;
    return `<label class="field"><span>${label}</span>${help ? `<small class="field-help">${help}</small>` : ""}<input id="${id}" type="${type}" value="${value ?? ""}" ${min !== undefined ? `min="${min}"` : ""} ${max !== undefined ? `max="${max}"` : ""} step="${step}" placeholder="${placeholder}" /></label>`;
  }

  function selectField(id, label, options, selected, help = "") {
    return `<label class="field"><span>${label}</span>${help ? `<small class="field-help">${help}</small>` : ""}<select id="${id}">${options.map(([value, text]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
  }

  function choice(name, value, title, description, checked = false) {
    return `<label class="choice-card"><input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""}/><strong>${title}</strong><small>${description}</small></label>`;
  }

  function heading(index, label, title, note = "") {
    return `<div class="panel-heading"><div class="panel-heading-group"><div class="panel-step-badge">${index}</div><div><p class="eyebrow">${label}</p><h2>${title}</h2></div></div></div>${note ? `<p class="section-note">${note}</p>` : ""}`;
  }

  function setMode(mode) {
    state.mode = mode;
    $$(".mode-card").forEach(card => card.classList.toggle("active", card.dataset.mode === mode));
    workspace.hidden = false;
    resultsPanel.hidden = true;
    message.hidden = true;
    renderMode();
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderMode() {
    if (state.mode === "territory") renderTerritory();
    if (state.mode === "farm") renderFarm();
    if (state.mode === "sequencing") renderSequencing();
  }

  function renderTerritory() {
    studyPanel.innerHTML = `
      ${heading("01", "Diseño territorial", "¿Qué desea conocer en el territorio?", "La primera etapa calcula unidades de producción. La segunda define cuántos cerdos se examinarán para clasificar cada granja.")}
      <div class="choice-grid">
        ${choice("territoryObjective", "frequency", "Estimar frecuencia de granjas positivas", "Ejemplo: estimar qué proporción de las granjas de una región es positiva.", true)}
        ${choice("territoryObjective", "detection", "Detectar al menos una granja positiva", "Útil para presencia o vigilancia por encima de una frecuencia mínima de diseño.")}
      </div>
      <div class="input-grid four" style="margin-top:16px">
        ${selectField("territoryLevel", "Nivel territorial", [["state","Estado"],["region","Región"],["municipality","Municipio"]], "region")}
        ${field("territoryName", "Nombre del territorio", "", { type: "text", step: "1", placeholder: "Altos Sur, Jalisco" })}
        ${selectField("territorySampling", "Selección de granjas", [["simple","Aleatorio simple"],["stratified","Estratificado proporcional"],["risk","Basado en riesgo / conveniencia"]], "stratified")}
        ${field("territoryLoss", "Pérdidas o no respuesta (%)", 0, { min: 0, max: 90 })}
      </div>`;

    populationPanel.innerHTML = `
      ${heading("02", "Población", "Granjas y población dentro de cada granja")}
      <div class="input-grid four">
        ${field("territoryFarmN", "Granjas en el territorio (N)", 256, { min: 1, step: 1 })}
        <div id="territory-frequency-input">${field("territoryExpected", "Frecuencia esperada de granjas positivas (%)", 46.5, { min: .01, max: 99.99 })}</div>
        <div id="territory-design-input" hidden>${field("territoryDesignPrev", "Frecuencia mínima de granjas positivas (%)", 5, { min: .01, max: 99.99 })}</div>
        <div id="territory-precision-input">${field("territoryPrecision", "Precisión absoluta (± %)", 5, { min: .1, max: 50 })}</div>
        ${selectField("territoryConfidence", "Confianza", [["0.90","90 %"],["0.95","95 %"],["0.99","99 %"]], "0.95")}
      </div>
      <div class="subpanel">
        <h3>Clasificación dentro de cada granja</h3>
        <p>La etapa o caseta la decide el usuario. El número de cerdos se calcula para detectar al menos un positivo en esa población.</p>
        <div class="input-grid four">
          ${field("territoryStageLabel", "Etapa, sitio o caseta", "Destete", { type: "text", step: 1 })}
          ${field("territoryStageN", "Población elegible por granja (N)", 800, { min: 1, step: 1, help: "Puede dejarse vacío si se considera una población grande.", placeholder: "Opcional" })}
          ${field("territoryWithinPrev", "Prevalencia mínima intragranja (%)", 10, { min: .01, max: 99.99 })}
          ${selectField("territoryHerdConfidence", "Probabilidad de clasificar una granja positiva", [["0.90","90 %"],["0.95","95 %"],["0.99","99 %"]], "0.95")}
        </div>
      </div>`;

    diagnosticPanel.innerHTML = `
      ${heading("03", "Diagnóstico", "Prueba y regla de clasificación", "La herramienta no selecciona la prueba ni la etapa con base en la enfermedad. Esas decisiones corresponden al usuario.")}
      <div class="input-grid four">
        ${selectField("territoryTestType", "Tipo de prueba", [["Serología","Serología"],["PCR","PCR"],["qPCR","qPCR"],["RT-qPCR","RT-qPCR"],["Cultivo","Cultivo"],["Otra","Otra"]], "RT-qPCR")}
        ${field("territoryTestSe", "Sensibilidad diagnóstica (%)", 90, { min: .1, max: 100 })}
        ${field("territoryTestSp", "Especificidad diagnóstica (%)", 99.9, { min: .1, max: 100 })}
        ${field("territoryPositiveThreshold", "Positivos para clasificar la granja", 1, { min: 1, step: 1 })}
      </div>`;

    bindTerritoryEvents();
    updateTerritoryObjective();
  }

  function bindTerritoryEvents() {
    $$('input[name="territoryObjective"]').forEach(input => input.addEventListener("change", updateTerritoryObjective));
  }

  function updateTerritoryObjective() {
    const frequency = checkedValue("territoryObjective") === "frequency";
    $("#territory-frequency-input").hidden = !frequency;
    $("#territory-precision-input").hidden = !frequency;
    $("#territory-design-input").hidden = frequency;
  }

  function renderFarm() {
    studyPanel.innerHTML = `
      ${heading("01", "Diseño en una granja", "¿Qué desea concluir sobre la población seleccionada?")}
      <div class="choice-grid">
        ${choice("farmObjective", "detection", "Detectar presencia o sustentar ausencia", "Determina cuántos cerdos examinar para detectar al menos un positivo por encima de una prevalencia de diseño.", true)}
        ${choice("farmObjective", "prevalence", "Estimar prevalencia individual", "Determina cuántos cerdos examinar para estimar una proporción con precisión definida.")}
      </div>
      <div class="subpanel">
        <h3>Alcance de la conclusión</h3>
        <div class="inline-choice">
          <label><input type="radio" name="farmConclusion" value="joint" checked /> Conclusión conjunta para todo lo seleccionado</label>
          <label><input type="radio" name="farmConclusion" value="separate" /> Resultado independiente por etapa o caseta</label>
        </div>
        <p class="field-help">Si selecciona <strong>conclusión conjunta</strong>, la herramienta calcula una sola muestra total y la distribuye proporcionalmente al inventario. Si selecciona <strong>resultado independiente</strong>, calcula una muestra distinta para cada etapa, caseta o lote.</p>
      </div>`;

    populationPanel.innerHTML = `
      ${heading("02", "Población", "Defina el inventario que realmente desea representar", "Puede capturar el inventario real de la fecha de muestreo o estimarlo rápidamente a partir del número de hembras reproductoras.")}
      <div class="choice-grid">
        ${choice("inventorySource", "direct", "Capturar inventario real", "Etapas, sitios, casetas o lotes existentes al momento del muestreo.", true)}
        ${choice("inventorySource", "estimated", "Estimar desde hembras reproductoras", "Calcula un inventario simultáneo promedio mediante un flujo productivo básico.")}
      </div>
      <div id="direct-inventory" class="subpanel"></div>
      <div id="estimated-inventory" class="subpanel" hidden></div>`;

    diagnosticPanel.innerHTML = `
      ${heading("03", "Diagnóstico", "Parámetros del cálculo")}
      <div class="input-grid four">
        ${selectField("farmTestType", "Tipo de prueba", [["Serología","Serología"],["PCR","PCR"],["qPCR","qPCR"],["RT-qPCR","RT-qPCR"],["Cultivo","Cultivo"],["Otra","Otra"]], "qPCR")}
        ${field("farmTestSe", "Sensibilidad diagnóstica (%)", 90, { min: .1, max: 100 })}
        ${field("farmTestSp", "Especificidad diagnóstica (%)", 99.9, { min: .1, max: 100 })}
        ${field("farmPositiveThreshold", "Positivos para declarar presencia", 1, { min: 1, step: 1 })}
      </div>
      <div id="farm-detection-fields" class="subpanel">
        <div class="input-grid three">
          ${field("farmDesignPrev", "Prevalencia mínima de diseño (%)", 5, { min: .01, max: 99.99 })}
          ${selectField("farmDetectionConfidence", "Probabilidad de detección", [["0.90","90 %"],["0.95","95 %"],["0.99","99 %"]], "0.95")}
          ${field("farmInvalid", "Muestras no válidas (%)", 0, { min: 0, max: 90 })}
        </div>
      </div>
      <div id="farm-prevalence-fields" class="subpanel" hidden>
        <div class="input-grid four">
          ${field("farmExpectedPrev", "Prevalencia esperada (%)", 50, { min: .01, max: 99.99 })}
          ${field("farmPrecision", "Precisión absoluta (± %)", 5, { min: .1, max: 50 })}
          ${selectField("farmPrevalenceConfidence", "Confianza", [["0.90","90 %"],["0.95","95 %"],["0.99","99 %"]], "0.95")}
          ${field("farmPrevInvalid", "Muestras no válidas (%)", 0, { min: 0, max: 90 })}
        </div>
      </div>`;

    renderDirectInventory();
    renderEstimatedInventory();
    bindFarmEvents();
    updateFarmObjective();
    updateInventorySource();
  }

  function renderDirectInventory() {
    const container = $("#direct-inventory");
    if (!container) return;
    container.innerHTML = `
      <div class="inventory-toolbar"><div><h3>Inventario real</h3><small class="field-help">Seleccione las unidades que formarán la población de estudio.</small></div><button id="add-inventory-row" class="add-button" type="button">+ Añadir unidad</button></div>
      <table class="inventory-table">
        <thead><tr><th>Incluir</th><th>Tipo</th><th>Nombre</th><th>Inventario (N)</th><th></th></tr></thead>
        <tbody>${state.directRows.map(row => `
          <tr data-row-id="${row.id}">
            <td><input class="row-selected" type="checkbox" ${row.selected ? "checked" : ""}/></td>
            <td><select class="row-type"><option ${row.type === "Etapa" ? "selected" : ""}>Etapa</option><option ${row.type === "Sitio" ? "selected" : ""}>Sitio</option><option ${row.type === "Caseta" ? "selected" : ""}>Caseta</option><option ${row.type === "Lote" ? "selected" : ""}>Lote</option><option ${row.type === "Hembras" ? "selected" : ""}>Hembras</option></select></td>
            <td><input class="row-label" type="text" value="${row.label}" /></td>
            <td><input class="row-population small-input" type="number" min="1" step="1" value="${row.population}" /></td>
            <td><button class="icon-button remove-row" type="button" aria-label="Eliminar">×</button></td>
          </tr>`).join("")}</tbody>
      </table>
      <div class="inventory-summary"><span>Población seleccionada</span><strong id="direct-total">0</strong></div>`;

    $("#add-inventory-row").addEventListener("click", () => {
      state.directRows.push({ id: state.nextRowId++, selected: true, type: "Caseta", label: `Caseta ${state.nextRowId - 1}`, population: 500 });
      renderDirectInventory();
    });
    $$("#direct-inventory tbody tr").forEach(tr => {
      const id = Number(tr.dataset.rowId);
      const row = state.directRows.find(item => item.id === id);
      tr.querySelector(".row-selected").addEventListener("change", event => { row.selected = event.target.checked; updateDirectTotal(); });
      tr.querySelector(".row-type").addEventListener("change", event => { row.type = event.target.value; });
      tr.querySelector(".row-label").addEventListener("input", event => { row.label = event.target.value; });
      tr.querySelector(".row-population").addEventListener("input", event => { row.population = Number(event.target.value); updateDirectTotal(); });
      tr.querySelector(".remove-row").addEventListener("click", () => {
        if (state.directRows.length === 1) return;
        state.directRows = state.directRows.filter(item => item.id !== id);
        renderDirectInventory();
      });
    });
    updateDirectTotal();
  }

  function updateDirectTotal() {
    const total = state.directRows.filter(row => row.selected).reduce((sum, row) => sum + Math.max(0, Number(row.population) || 0), 0);
    const output = $("#direct-total");
    if (output) output.textContent = `${formatInt(total)} animales`;
  }

  function inventoryParametersHtml() {
    return `
      <div class="input-grid four">
        ${field("flowSows", "Hembras reproductoras", 300, { min: 1, step: 1 })}
        ${field("flowFarrowings", "Partos por hembra por año", 2.3, { min: .1, max: 3 })}
        ${field("flowLiveborn", "Nacidos vivos por camada", 11, { min: 1, max: 30 })}
        ${field("flowLactationDays", "Días de lactancia", 21, { min: 1, max: 60, step: 1 })}
      </div>
      <details class="reference-box">
        <summary>Ajustar duración, mortalidad y reemplazos</summary>
        <div class="input-grid four" style="margin-top:14px">
          ${field("flowWeaningWeeks", "Semanas en destete", 7, { min: .1, max: 30 })}
          ${field("flowGrowthWeeks", "Semanas en crecimiento", 4, { min: .1, max: 30 })}
          ${field("flowDevelopmentWeeks", "Semanas en desarrollo", 4, { min: .1, max: 30 })}
          ${field("flowFinishingWeeks", "Semanas en finalización", 4, { min: .1, max: 30 })}
          ${field("flowMortMaternity", "Mortalidad lactancia (%)", 6, { min: 0, max: 100 })}
          ${field("flowMortWeaning", "Mortalidad destete (%)", 5, { min: 0, max: 100 })}
          ${field("flowMortGrowth", "Mortalidad crecimiento (%)", 1, { min: 0, max: 100 })}
          ${field("flowMortDevelopment", "Mortalidad desarrollo (%)", 1, { min: 0, max: 100 })}
          ${field("flowReplacementRate", "Reemplazo anual de hembras (%)", 40, { min: 0, max: 100 })}
          ${field("flowReplacementMonths", "Meses visibles como reemplazo", 1, { min: 0, max: 12 })}
        </div>
      </details>`;
  }

  function renderEstimatedInventory() {
    const container = $("#estimated-inventory");
    if (!container) return;
    container.innerHTML = `
      <h3>Estimación rápida de inventario</h3>
      <p>Se usa solamente la lógica productiva básica necesaria para estimar la población simultánea.</p>
      ${inventoryParametersHtml()}
      <div class="inventory-toolbar" style="margin-top:15px">
        <div class="inline-choice" style="margin:0">
          <label><input type="radio" name="inventoryView" value="stage" checked /> Ver por etapa</label>
          <label><input type="radio" name="inventoryView" value="site" /> Ver por sitios</label>
        </div>
        <button id="refresh-inventory" type="button" class="add-button">Actualizar inventario</button>
      </div>
      <div id="estimated-selection"></div>
      <div class="inventory-summary"><span>Población estimada seleccionada</span><strong id="estimated-total">0</strong></div>
      <p id="inventory-note" class="field-help"></p>`;

    $("#refresh-inventory").addEventListener("click", calculateEstimatedInventory);
    ["flowSows", "flowFarrowings", "flowLiveborn", "flowLactationDays", "flowWeaningWeeks", "flowGrowthWeeks", "flowDevelopmentWeeks", "flowFinishingWeeks", "flowMortMaternity", "flowMortWeaning", "flowMortGrowth", "flowMortDevelopment", "flowReplacementRate", "flowReplacementMonths"].forEach(id => {
      const element = $(`#${id}`);
      if (element) element.addEventListener("change", calculateEstimatedInventory);
    });
    $$('input[name="inventoryView"]').forEach(input => input.addEventListener("change", event => {
      state.inventoryView = event.target.value;
      renderEstimatedSelection();
    }));
    calculateEstimatedInventory();
  }

  function getFlowParameters() {
    return {
      sows: numberOf("flowSows"), farrowingsPerSowYear: numberOf("flowFarrowings"), livebornPerLitter: numberOf("flowLiveborn"), lactationDays: numberOf("flowLactationDays"),
      weaningWeeks: numberOf("flowWeaningWeeks"), growthWeeks: numberOf("flowGrowthWeeks"), developmentWeeks: numberOf("flowDevelopmentWeeks"), finishingWeeks: numberOf("flowFinishingWeeks"),
      mortalityMaternity: numberOf("flowMortMaternity"), mortalityWeaning: numberOf("flowMortWeaning"), mortalityGrowth: numberOf("flowMortGrowth"), mortalityDevelopment: numberOf("flowMortDevelopment"),
      replacementRate: numberOf("flowReplacementRate"), replacementMonths: numberOf("flowReplacementMonths")
    };
  }

  function calculateEstimatedInventory() {
    state.estimatedInventory = inventoryCalc.calculateInventory(getFlowParameters());
    renderEstimatedSelection();
  }

  function renderEstimatedSelection() {
    const container = $("#estimated-selection");
    if (!container || !state.estimatedInventory) return;
    const groups = state.inventoryView === "site" ? state.estimatedInventory.sites : state.estimatedInventory.stages;
    container.innerHTML = `<div class="estimated-grid">${groups.map(group => `
      <label class="estimated-card"><input class="estimated-check" type="checkbox" data-id="${group.id}" checked /><span><strong>${group.label}</strong><span>${formatInt(group.population)}</span><small>animales estimados</small></span></label>`).join("")}</div>`;
    $$(".estimated-check").forEach(input => input.addEventListener("change", updateEstimatedTotal));
    $("#inventory-note").textContent = state.estimatedInventory.note;
    updateEstimatedTotal();
  }

  function selectedEstimatedGroups() {
    if (!state.estimatedInventory) return [];
    const source = state.inventoryView === "site" ? state.estimatedInventory.sites : state.estimatedInventory.stages;
    const selectedIds = $$(".estimated-check:checked").map(input => input.dataset.id);
    return source.filter(group => selectedIds.includes(group.id));
  }

  function updateEstimatedTotal() {
    const total = selectedEstimatedGroups().reduce((sum, group) => sum + group.population, 0);
    const output = $("#estimated-total");
    if (output) output.textContent = `${formatInt(total)} animales`;
  }

  function bindFarmEvents() {
    $$('input[name="farmObjective"]').forEach(input => input.addEventListener("change", updateFarmObjective));
    $$('input[name="inventorySource"]').forEach(input => input.addEventListener("change", updateInventorySource));
  }

  function updateFarmObjective() {
    const detection = checkedValue("farmObjective") === "detection";
    $("#farm-detection-fields").hidden = !detection;
    $("#farm-prevalence-fields").hidden = detection;
  }

  function updateInventorySource() {
    const direct = checkedValue("inventorySource") === "direct";
    $("#direct-inventory").hidden = !direct;
    $("#estimated-inventory").hidden = direct;
  }

  function renderSequencing() {
    studyPanel.innerHTML = `
      ${heading("01", "Secuenciación", "¿Desde qué nivel comienza la planeación?", "La herramienta calculará primero las secuencias utilizables y después retrocederá por las pérdidas del laboratorio y del muestreo.")}
      <div class="choice-grid">
        ${choice("sequenceScope", "territory", "Estado, región o municipio", "Calcula granjas, cerdos por granja y secuencias representativas.", true)}
        ${choice("sequenceScope", "farm", "Una sola granja", "Calcula cerdos o muestras iniciales dentro de una población elegida.")}
        ${choice("sequenceScope", "positive", "Muestras positivas disponibles", "Calcula cuántas muestras positivas deben entrar a amplificación y secuenciación.")}
        ${choice("sequenceScope", "total", "Muestras totales disponibles", "Parte del total de muestras, aplica la frecuencia esperada de positivas y estima la salida molecular.")}
      </div>
      <div class="subpanel">
        <h3>Meta molecular</h3>
        <div class="inline-choice">
          <label><input type="radio" name="sequenceTargetMode" value="variant" checked /> Detectar un linaje o variante</label>
          <label><input type="radio" name="sequenceTargetMode" value="manual" /> Especificar secuencias utilizables</label>
        </div>
        <div id="variant-target-fields" class="input-grid two">
          ${field("variantFrequency", "Frecuencia mínima del linaje (%)", 5, { min: .01, max: 99.99 })}
          ${selectField("variantConfidence", "Probabilidad de detectarlo", [["0.90","90 %"],["0.95","95 %"],["0.99","99 %"]], "0.95")}
        </div>
        <div id="manual-target-fields" hidden>${field("manualSequences", "Secuencias utilizables requeridas", 59, { min: 1, step: 1 })}</div>
      </div>`;

    populationPanel.innerHTML = `
      ${heading("02", "Origen", "Defina la población de la que saldrán las secuencias")}
      <div id="sequence-territory-fields">
        <div class="input-grid four">
          ${selectField("seqTerritoryLevel", "Nivel territorial", [["state","Estado"],["region","Región"],["municipality","Municipio"]], "region")}
          ${field("seqTerritoryName", "Nombre", "", { type: "text", step: 1, placeholder: "Región de Jalisco" })}
          ${field("seqTerritoryFarmN", "Granjas disponibles (N)", 256, { min: 1, step: 1 })}
          ${field("seqFarmPositivity", "Frecuencia esperada de granjas positivas (%)", 46.5, { min: .01, max: 99.99 })}
        </div>
        <div class="subpanel">
          <h3>Muestreo dentro de cada granja</h3>
          <div class="input-grid four">
            ${field("seqStageLabel", "Etapa o caseta", "Destete", { type: "text", step: 1 })}
            ${field("seqStageN", "Población elegible por granja (N)", 800, { min: 1, step: 1 })}
            ${field("seqWithinPrev", "Prevalencia mínima intragranja (%)", 10, { min: .01, max: 99.99 })}
            ${selectField("seqHerdConfidence", "Probabilidad de detectar la granja", [["0.90","90 %"],["0.95","95 %"],["0.99","99 %"]], "0.95")}
          </div>
        </div>
      </div>
      <div id="sequence-farm-fields" hidden>
        <div class="input-grid three">
          ${field("seqFarmPopulation", "Población elegible de la etapa o caseta (N)", 800, { min: 1, step: 1 })}
          ${field("seqFarmStage", "Etapa o caseta", "Destete", { type: "text", step: 1 })}
          ${field("seqAnimalPositivity", "Positividad esperada de los animales (%)", 10, { min: .01, max: 99.99 })}
        </div>
      </div>
      <div id="sequence-positive-fields" hidden>
        <p class="section-note">Se asume que las muestras ya fueron clasificadas como positivas. No se calcula granja ni cerdo hasta que el usuario seleccione otro punto de partida.</p>
      </div>
      <div id="sequence-total-fields" hidden>
        <div class="input-grid three">
          ${field("seqTotalAvailable", "Muestras totales disponibles", 844, { min: 1, step: 1 })}
          ${field("seqTotalPositivity", "Frecuencia esperada de positivas (%)", 46.5, { min: .01, max: 99.99 })}
          ${field("seqTotalLabel", "Tipo de muestra", "Pools", { type: "text", step: 1 })}
        </div>
      </div>`;

    diagnosticPanel.innerHTML = `
      ${heading("03", "Laboratorio", "Rendimiento desde la detección hasta la secuencia utilizable")}
      <div class="input-grid four">
        ${field("seqTestSe", "Sensibilidad de detección (%)", 90, { min: .1, max: 100 })}
        ${field("seqAmplification", "Éxito de amplificación (%)", 90, { min: .1, max: 100 })}
        ${field("seqSequencing", "Éxito de secuenciación (%)", 70, { min: .1, max: 100 })}
        ${field("seqQuality", "Secuencias que pasan calidad (%)", 95, { min: .1, max: 100 })}
      </div>
      <div class="input-grid two" style="margin-top:14px">
        ${selectField("seqPlanningConfidence", "Probabilidad de alcanzar la meta final", [["0.90","90 %"],["0.95","95 %"],["0.99","99 %"]], "0.95")}
        ${selectField("seqIndependence", "Cómo contará las secuencias", [["farm","Una secuencia por granja o evento"],["sample","Cada muestra positiva elegible cuenta por separado"]], "farm", "Si elige una secuencia por granja o evento, la inferencia territorial es más sólida. Si cuenta cada muestra positiva por separado, puede describir diversidad, pero habrá dependencia entre secuencias del mismo origen.")}
      </div>`;

    bindSequencingEvents();
    updateSequenceTargetMode();
    updateSequenceScope();
  }

  function bindSequencingEvents() {
    $$('input[name="sequenceTargetMode"]').forEach(input => input.addEventListener("change", updateSequenceTargetMode));
    $$('input[name="sequenceScope"]').forEach(input => input.addEventListener("change", updateSequenceScope));
  }

  function updateSequenceTargetMode() {
    const variant = checkedValue("sequenceTargetMode") === "variant";
    $("#variant-target-fields").hidden = !variant;
    $("#manual-target-fields").hidden = variant;
  }

  function updateSequenceScope() {
    const scope = checkedValue("sequenceScope");
    $("#sequence-territory-fields").hidden = scope !== "territory";
    $("#sequence-farm-fields").hidden = scope !== "farm";
    $("#sequence-positive-fields").hidden = scope !== "positive";
    $("#sequence-total-fields").hidden = scope !== "total";
    $("#seqTestSe").closest("label").hidden = scope === "positive";
  }

  function validatePositive(value, label) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} debe ser mayor que cero.`);
  }

  function selectedFarmGroups() {
    if (checkedValue("inventorySource") === "direct") {
      return state.directRows.filter(row => row.selected && Number(row.population) > 0).map((row, order) => ({ id: String(row.id), label: row.label || `${row.type} ${row.id}`, population: Number(row.population), order }));
    }
    return selectedEstimatedGroups();
  }

  function calculateTerritory() {
    const objective = checkedValue("territoryObjective");
    const Nfarms = numberOf("territoryFarmN");
    const confidence = Number(valueOf("territoryConfidence"));
    const lossRate = numberOf("territoryLoss");
    const stageN = numberOf("territoryStageN") || null;
    const within = calc.finiteDetectionSample({
      populationSize: stageN,
      designPrevalence: numberOf("territoryWithinPrev"),
      confidence: Number(valueOf("territoryHerdConfidence")),
      testSensitivity: numberOf("territoryTestSe")
    });
    const herdSp = calc.herdSpecificity(numberOf("territoryTestSp"), within.final, numberOf("territoryPositiveThreshold"));
    let farms;
    if (objective === "frequency") {
      farms = calc.prevalenceSample({
        expectedPrevalence: numberOf("territoryExpected"), precision: numberOf("territoryPrecision"), confidence,
        populationSize: Nfarms, lossRate
      });
    } else {
      farms = calc.finiteDetectionSample({
        populationSize: Nfarms, designPrevalence: numberOf("territoryDesignPrev"), confidence,
        testSensitivity: within.achieved * 100, lossRate
      });
    }
    const totalPigs = farms.final * within.final;
    const levelLabel = { state: "estado", region: "región", municipality: "municipio" }[valueOf("territoryLevel")];
    const territoryName = valueOf("territoryName").trim() || `el ${levelLabel}`;
    const warnings = [];
    if (valueOf("territorySampling") === "risk") warnings.push("La selección basada en riesgo o conveniencia no permite interpretar automáticamente el resultado como representativo de todo el territorio.");
    if (valueOf("territorySampling") === "stratified") warnings.push("El total calculado debe asignarse entre los estratos con un marco de muestreo explícito; esta versión utiliza asignación proporcional como criterio general, pero todavía no calcula estratos individuales.");
    if (herdSp < 0.95) warnings.push(`Con la regla de ${numberOf("territoryPositiveThreshold")} positivo(s), la especificidad aproximada a nivel de granja es ${percent(herdSp)}. Considere confirmación o un umbral diferente.`);
    warnings.push(`La clasificación corresponde a la población “${valueOf("territoryStageLabel")}” examinada dentro de cada granja; no representa automáticamente todas las etapas de la unidad productiva.`);

    const report = objective === "frequency"
      ? `Se diseñó un muestreo en dos etapas para estimar la frecuencia de granjas positivas en ${territoryName}. De una población de ${formatInt(Nfarms)} granjas, se recomienda seleccionar ${formatInt(farms.final)} mediante ${valueOf("territorySampling") === "stratified" ? "muestreo estratificado proporcional" : valueOf("territorySampling") === "simple" ? "muestreo aleatorio simple" : "selección basada en riesgo o conveniencia"}. El cálculo utilizó una frecuencia esperada de ${formatNumber(numberOf("territoryExpected"), 1)} %, una precisión absoluta de ±${formatNumber(numberOf("territoryPrecision"), 1)} % y ${formatNumber(confidence * 100, 0)} % de confianza. Dentro de cada granja se recomienda examinar ${formatInt(within.final)} cerdos de la población ${valueOf("territoryStageLabel")}, para alcanzar aproximadamente ${percent(within.achieved)} de probabilidad de detectar al menos un positivo cuando la prevalencia intragranja sea igual o mayor a ${formatNumber(numberOf("territoryWithinPrev"), 1)} % y la sensibilidad de ${valueOf("territoryTestType")} sea ${formatNumber(numberOf("territoryTestSe"), 1)} %. El total operativo es de ${formatInt(totalPigs)} cerdos.`
      : `Se diseñó un muestreo en dos etapas para detectar al menos una granja positiva en ${territoryName}. Se recomienda seleccionar ${formatInt(farms.final)} de ${formatInt(Nfarms)} granjas y examinar ${formatInt(within.final)} cerdos de ${valueOf("territoryStageLabel")} dentro de cada granja. El diseño busca detectar una frecuencia territorial mínima de ${formatNumber(numberOf("territoryDesignPrev"), 1)} % con ${formatNumber(confidence * 100, 0)} % de probabilidad, considerando la sensibilidad alcanzada por el muestreo intragranja.`;

    return {
      primary: farms.final,
      primaryUnit: "granjas",
      explanation: `${formatInt(farms.final)} granjas y ${formatInt(within.final)} cerdos por granja. Total: ${formatInt(totalPigs)} cerdos.`,
      details: [
        ["Nivel territorial", levelLabel], ["Granjas disponibles", formatInt(Nfarms)], ["Granjas a seleccionar", formatInt(farms.final)],
        ["Etapa o caseta", valueOf("territoryStageLabel")], ["Cerdos por granja", formatInt(within.final)], ["Total de cerdos", formatInt(totalPigs)],
        ["Sensibilidad a nivel de granja", percent(within.achieved)], ["Especificidad aprox. a nivel de granja", percent(herdSp)]
      ],
      warnings,
      report,
      allocation: null,
      allocationMode: "joint",
      formulaHtml: territoryFormulaHtml(objective),
      flow: [
        { label: "Territorio", value: `${formatInt(Nfarms)} granjas` },
        { label: "Granjas a muestrear", value: `${formatInt(farms.final)} granjas` },
        { label: "Etapa o caseta", value: valueOf("territoryStageLabel") || "Etapa seleccionada" },
        { label: "Cerdos por granja", value: `${formatInt(within.final)} cerdos` }
      ]
    };
  }

  function calculateFarm() {
    const groups = selectedFarmGroups();
    if (!groups.length) throw new Error("Seleccione al menos una etapa, sitio, caseta o lote con inventario mayor que cero.");
    const objective = checkedValue("farmObjective");
    const conclusion = checkedValue("farmConclusion");
    const totalN = groups.reduce((sum, group) => sum + Number(group.population), 0);
    validatePositive(totalN, "La población seleccionada");
    const warnings = [];
    let totalSample = 0;
    let allocation = [];
    let report;
    let herdSp = null;

    if (conclusion === "separate") {
      allocation = groups.map(group => {
        let result;
        if (objective === "detection") {
          result = calc.finiteDetectionSample({ populationSize: group.population, designPrevalence: numberOf("farmDesignPrev"), confidence: Number(valueOf("farmDetectionConfidence")), testSensitivity: numberOf("farmTestSe"), lossRate: numberOf("farmInvalid") });
        } else {
          result = calc.prevalenceSample({ populationSize: group.population, expectedPrevalence: numberOf("farmExpectedPrev"), precision: numberOf("farmPrecision"), confidence: Number(valueOf("farmPrevalenceConfidence")), lossRate: numberOf("farmPrevInvalid") });
        }
        totalSample += result.final;
        return { ...group, sample: result.final };
      });
      report = `Se calcularon tamaños de muestra independientes para cada población seleccionada. La suma de las muestras requeridas es ${formatInt(totalSample)} cerdos, pero esta cifra no debe interpretarse como una distribución proporcional conjunta. Cada etapa, sitio, caseta o lote conserva su propio tamaño de muestra y su propia conclusión.`;
    } else {
      let result;
      if (objective === "detection") {
        result = calc.finiteDetectionSample({ populationSize: totalN, designPrevalence: numberOf("farmDesignPrev"), confidence: Number(valueOf("farmDetectionConfidence")), testSensitivity: numberOf("farmTestSe"), lossRate: numberOf("farmInvalid") });
        herdSp = calc.herdSpecificity(numberOf("farmTestSp"), result.final, numberOf("farmPositiveThreshold"));
      } else {
        result = calc.prevalenceSample({ populationSize: totalN, expectedPrevalence: numberOf("farmExpectedPrev"), precision: numberOf("farmPrecision"), confidence: Number(valueOf("farmPrevalenceConfidence")), lossRate: numberOf("farmPrevInvalid") });
      }
      totalSample = result.final;
      allocation = calc.proportionalAllocation(totalSample, groups);
      report = objective === "detection"
        ? `La población de estudio comprende ${formatInt(totalN)} cerdos en ${groups.map(group => group.label).join(", ")}. Se recomienda examinar ${formatInt(totalSample)} mediante ${valueOf("farmTestType")} para alcanzar la probabilidad seleccionada de detectar al menos un positivo cuando la prevalencia sea igual o mayor a ${formatNumber(numberOf("farmDesignPrev"), 1)} %, suponiendo una sensibilidad diagnóstica de ${formatNumber(numberOf("farmTestSe"), 1)} %. La muestra se distribuyó proporcionalmente al inventario de las unidades seleccionadas.`
        : `La población de estudio comprende ${formatInt(totalN)} cerdos en ${groups.map(group => group.label).join(", ")}. Se recomienda examinar ${formatInt(totalSample)} para estimar una prevalencia esperada de ${formatNumber(numberOf("farmExpectedPrev"), 1)} % con una precisión absoluta de ±${formatNumber(numberOf("farmPrecision"), 1)} % y ${formatNumber(numberOf("farmPrevalenceConfidence") * 100, 0)} % de confianza. La muestra se distribuyó proporcionalmente al inventario.`;
    }

    if (checkedValue("inventorySource") === "estimated") warnings.push("El inventario proviene de un flujo productivo promedio. En sistemas por lotes o todo dentro/todo fuera debe sustituirse por el inventario real de la fecha de muestreo cuando esté disponible.");
    if (objective === "detection" && herdSp !== null && herdSp < 0.95) warnings.push(`La especificidad aproximada de la clasificación conjunta es ${percent(herdSp)} con la regla de ${numberOf("farmPositiveThreshold")} positivo(s).`);
    if (conclusion === "joint" && groups.length > 1) warnings.push("La conclusión es conjunta para todas las unidades seleccionadas; no demuestra por separado el estatus de cada etapa o caseta.");

    return {
      primary: totalSample,
      primaryUnit: "cerdos",
      explanation: `${formatInt(totalSample)} cerdos de una población seleccionada de ${formatInt(totalN)}.`,
      details: [
        ["Población seleccionada (N)", formatInt(totalN)], ["Tamaño de muestra", formatInt(totalSample)], ["Prueba", valueOf("farmTestType")],
        ["Unidades incluidas", groups.length], ["Tipo de conclusión", conclusion === "joint" ? "Conjunta con distribución proporcional" : "Independiente por unidad"],
        ...(herdSp !== null ? [["Especificidad aprox. de la clasificación", percent(herdSp)]] : [])
      ],
      warnings,
      report,
      allocation,
      allocationMode: conclusion === "joint" ? "joint" : "separate",
      formulaHtml: farmFormulaHtml(objective, conclusion),
      flow: [
        { label: "Población seleccionada", value: `${formatInt(totalN)} animales` },
        { label: "Unidades incluidas", value: `${groups.length}` },
        { label: "Prueba", value: valueOf("farmTestType") },
        { label: "Muestra requerida", value: `${formatInt(totalSample)} cerdos` }
      ]
    };
  }

  function sequencingTarget() {
    if (checkedValue("sequenceTargetMode") === "manual") return Math.max(1, Math.ceil(numberOf("manualSequences")));
    return calc.variantDetection({ variantFrequency: numberOf("variantFrequency"), confidence: Number(valueOf("variantConfidence")) }).usableSequences;
  }

  function calculateSequencing() {
    const scope = checkedValue("sequenceScope");
    const target = sequencingTarget();
    const amp = numberOf("seqAmplification") / 100;
    const seq = numberOf("seqSequencing") / 100;
    const quality = numberOf("seqQuality") / 100;
    const planningConfidence = Number(valueOf("seqPlanningConfidence"));
    const warnings = [];

    if (scope === "positive") {
      const funnel = calc.laboratoryFunnel({ targetSequences: target, startPositivity: 100, amplificationSuccess: numberOf("seqAmplification"), sequencingSuccess: numberOf("seqSequencing"), qualitySuccess: numberOf("seqQuality"), confidence: planningConfidence });
      return {
        primary: funnel.guaranteedInitial,
        primaryUnit: "muestras positivas",
        explanation: `${formatInt(funnel.guaranteedInitial)} muestras positivas para obtener al menos ${formatInt(target)} secuencias utilizables con ${formatNumber(planningConfidence * 100, 0)} % de probabilidad.`,
        details: [["Secuencias utilizables requeridas", formatInt(target)], ["Rendimiento laboratorial global", percent(funnel.overall)], ["Muestras esperadas por promedio", formatInt(funnel.expectedInitial)], ["Muestras con garantía probabilística", formatInt(funnel.guaranteedInitial)]],
        warnings: ["El cálculo supone que las muestras positivas son elegibles para el mismo protocolo y que las pérdidas se comportan aproximadamente de forma independiente."],
        report: `Para obtener al menos ${formatInt(target)} secuencias utilizables se recomienda iniciar con ${formatInt(funnel.guaranteedInitial)} muestras positivas. El cálculo incorpora ${formatNumber(numberOf("seqAmplification"), 1)} % de éxito de amplificación, ${formatNumber(numberOf("seqSequencing"), 1)} % de éxito de secuenciación y ${formatNumber(numberOf("seqQuality"), 1)} % de aceptación por calidad, con ${formatNumber(planningConfidence * 100, 0)} % de probabilidad de alcanzar la meta.`,
        funnel,
        formulaHtml: sequencingFormulaHtml("positive"),
        flow: [
          { label: "Muestras positivas", value: `${formatInt(funnel.guaranteedInitial)}` },
          { label: "Amplificación", value: `${formatNumber(numberOf("seqAmplification"),1)} %` },
          { label: "Secuenciación", value: `${formatNumber(numberOf("seqSequencing"),1)} %` },
          { label: "Meta final", value: `${formatInt(target)} secuencias` }
        ]
      };
    }

    if (scope === "total") {
      const positivity = numberOf("seqTotalPositivity");
      const funnel = calc.laboratoryFunnel({ targetSequences: target, startPositivity: positivity, amplificationSuccess: numberOf("seqAmplification"), sequencingSuccess: numberOf("seqSequencing"), qualitySuccess: numberOf("seqQuality"), confidence: planningConfidence });
      const available = numberOf("seqTotalAvailable");
      const overall = (positivity / 100) * (numberOf("seqAmplification") / 100) * (numberOf("seqSequencing") / 100) * (numberOf("seqQuality") / 100);
      const expectedFromAvailable = available * overall;
      const achievedFromAvailable = calc.probabilityAtLeast(target, Math.max(1, Math.floor(available)), Math.max(1e-9, overall));
      const warnings = [];
      if (available < funnel.guaranteedInitial) warnings.push(`Con ${formatInt(available)} muestras totales disponibles no se alcanza la garantía de ${formatNumber(planningConfidence * 100, 0)} % para obtener ${formatInt(target)} secuencias utilizables.`);
      else warnings.push(`Con ${formatInt(available)} muestras totales disponibles, la meta es alcanzable bajo los supuestos seleccionados.`);
      return {
        primary: funnel.guaranteedInitial,
        primaryUnit: "muestras totales",
        explanation: `${formatInt(funnel.guaranteedInitial)} muestras totales para obtener al menos ${formatInt(target)} secuencias utilizables con ${formatNumber(planningConfidence * 100, 0)} % de probabilidad.`,
        details: [["Muestras totales disponibles", formatInt(available)], ["Frecuencia esperada de positivas", `${formatNumber(positivity,1)} %`], ["Secuencias utilizables requeridas", formatInt(target)], ["Muestras requeridas con garantía", formatInt(funnel.guaranteedInitial)], ["Secuencias esperadas con las disponibles", formatNumber(expectedFromAvailable,1)], ["Probabilidad de alcanzar la meta con las disponibles", percent(achievedFromAvailable)]],
        warnings,
        report: `A partir de ${formatInt(available)} ${valueOf("seqTotalLabel") || "muestras"} totales y una frecuencia esperada de positivas de ${formatNumber(positivity, 1)} %, se espera un rendimiento global de ${percent(funnel.overall)}. Bajo estos supuestos, se requieren ${formatInt(funnel.guaranteedInitial)} muestras totales para alcanzar al menos ${formatInt(target)} secuencias utilizables con ${formatNumber(planningConfidence * 100, 0)} % de probabilidad.`,
        funnel,
        formulaHtml: sequencingFormulaHtml("total"),
        flow: [
          { label: valueOf("seqTotalLabel") || "Muestras totales", value: `${formatInt(available)}` },
          { label: "Positivas esperadas", value: `${formatInt(available * positivity / 100)}` },
          { label: "Meta final", value: `${formatInt(target)} secuencias` },
          { label: "Requeridas", value: `${formatInt(funnel.guaranteedInitial)} muestras` }
        ]
      };
    }

    if (scope === "farm") {
      const N = numberOf("seqFarmPopulation");
      const success = (numberOf("seqAnimalPositivity") / 100) * (numberOf("seqTestSe") / 100) * amp * seq * quality;
      const required = calc.minimumTrialsForTarget(target, success, planningConfidence);
      if (required.trials > N) warnings.push(`El tamaño requerido (${formatInt(required.trials)}) supera la población elegible (${formatInt(N)}). Debe ampliar la población, modificar la meta o aceptar una probabilidad menor.`);
      warnings.push("Varias secuencias de una sola granja pueden representar diversidad intragranja, pero no equivalen a secuencias epidemiológicamente independientes de distintas granjas o eventos.");
      return {
        primary: required.trials,
        primaryUnit: "cerdos o muestras iniciales",
        explanation: `${formatInt(required.trials)} unidades iniciales de ${valueOf("seqFarmStage")} para obtener al menos ${formatInt(target)} secuencias utilizables.`,
        details: [["Población elegible", formatInt(N)], ["Secuencias requeridas", formatInt(target)], ["Probabilidad global por unidad", percent(success)], ["Probabilidad alcanzada", percent(required.achieved)]],
        warnings,
        report: `En la población ${valueOf("seqFarmStage")} de una granja se recomienda iniciar con ${formatInt(required.trials)} cerdos o muestras para obtener al menos ${formatInt(target)} secuencias utilizables con ${formatNumber(planningConfidence * 100, 0)} % de probabilidad. El cálculo incorpora una positividad esperada de ${formatNumber(numberOf("seqAnimalPositivity"), 1)} %, sensibilidad de detección de ${formatNumber(numberOf("seqTestSe"), 1)} %, éxito de amplificación de ${formatNumber(numberOf("seqAmplification"), 1)} %, secuenciación de ${formatNumber(numberOf("seqSequencing"), 1)} % y calidad de ${formatNumber(numberOf("seqQuality"), 1)} %.`,
        funnel: { stagesExpected: [required.trials, required.trials * numberOf("seqAnimalPositivity") / 100, required.trials * numberOf("seqAnimalPositivity") / 100 * numberOf("seqTestSe") / 100 * amp, required.trials * numberOf("seqAnimalPositivity") / 100 * numberOf("seqTestSe") / 100 * amp * seq, required.trials * success] },
        formulaHtml: sequencingFormulaHtml("farm"),
        flow: [
          { label: "Población elegida", value: `${formatInt(numberOf("seqFarmPopulation"))} animales` },
          { label: "Cerdos o muestras", value: `${formatInt(required.trials)}` },
          { label: "Positivas esperadas", value: `${formatInt(required.trials * numberOf("seqAnimalPositivity") / 100)}` },
          { label: "Meta final", value: `${formatInt(target)} secuencias` }
        ]
      };
    }

    const stageN = numberOf("seqStageN");
    const within = calc.finiteDetectionSample({ populationSize: stageN, designPrevalence: numberOf("seqWithinPrev"), confidence: Number(valueOf("seqHerdConfidence")), testSensitivity: numberOf("seqTestSe") });
    const farmSuccess = (numberOf("seqFarmPositivity") / 100) * within.achieved * amp * seq * quality;
    const farmsRequired = calc.minimumTrialsForTarget(target, farmSuccess, planningConfidence);
    const Nfarms = numberOf("seqTerritoryFarmN");
    const totalPigs = farmsRequired.trials * within.final;
    if (farmsRequired.trials > Nfarms) warnings.push(`Se requieren más granjas (${formatInt(farmsRequired.trials)}) que las disponibles (${formatInt(Nfarms)}). La meta no es alcanzable bajo los supuestos actuales dentro de ese territorio.`);
    if (valueOf("seqIndependence") !== "farm") warnings.push("Al contar varias muestras de la misma granja como unidades moleculares, debe explicitarse la dependencia epidemiológica y evitar inferencias territoriales basadas únicamente en el número de secuencias.");
    warnings.push("El cálculo territorial supone una secuencia representativa obtenible por granja positiva muestreada. Brotes repetidos, granjas con múltiples secuencias o sesgos por carga viral deben documentarse.");

    return {
      primary: farmsRequired.trials,
      primaryUnit: "granjas",
      explanation: `${formatInt(farmsRequired.trials)} granjas × ${formatInt(within.final)} cerdos por granja = ${formatInt(totalPigs)} cerdos para obtener ${formatInt(target)} secuencias utilizables.`,
      details: [["Granjas disponibles", formatInt(Nfarms)], ["Granjas a muestrear", formatInt(farmsRequired.trials)], ["Cerdos por granja", formatInt(within.final)], ["Total de cerdos", formatInt(totalPigs)], ["Secuencias utilizables requeridas", formatInt(target)], ["Probabilidad global de secuencia por granja", percent(farmSuccess)]],
      warnings,
      report: `Para obtener al menos ${formatInt(target)} secuencias utilizables con ${formatNumber(planningConfidence * 100, 0)} % de probabilidad en ${valueOf("seqTerritoryName").trim() || "el territorio seleccionado"}, se recomienda muestrear ${formatInt(farmsRequired.trials)} granjas. Dentro de cada granja se examinarán ${formatInt(within.final)} cerdos de ${valueOf("seqStageLabel")}, para un total de ${formatInt(totalPigs)} animales. El cálculo considera una frecuencia esperada de granjas positivas de ${formatNumber(numberOf("seqFarmPositivity"), 1)} %, prevalencia intragranja mínima de ${formatNumber(numberOf("seqWithinPrev"), 1)} %, sensibilidad de detección de ${formatNumber(numberOf("seqTestSe"), 1)} %, éxito de amplificación de ${formatNumber(numberOf("seqAmplification"), 1)} %, secuenciación de ${formatNumber(numberOf("seqSequencing"), 1)} % y aceptación por calidad de ${formatNumber(numberOf("seqQuality"), 1)} %.`,
      funnel: { stagesExpected: [farmsRequired.trials, farmsRequired.trials * numberOf("seqFarmPositivity") / 100, farmsRequired.trials * numberOf("seqFarmPositivity") / 100 * within.achieved, farmsRequired.trials * numberOf("seqFarmPositivity") / 100 * within.achieved * amp * seq, farmsRequired.trials * farmSuccess] },
      formulaHtml: sequencingFormulaHtml("territory"),
      flow: [
        { label: "Territorio", value: `${formatInt(numberOf("seqTerritoryFarmN"))} granjas` },
        { label: "Granjas a muestrear", value: `${formatInt(farmsRequired.trials)}` },
        { label: "Cerdos por granja", value: `${formatInt(within.trials)}` },
        { label: "Meta final", value: `${formatInt(target)} secuencias` }
      ]
    };
  }


  function formulaFigure(src, title, caption, whereItems = []) {
    const whereHtml = whereItems.length
      ? `<div class="formula-where"><strong>Dónde:</strong><ul>${whereItems.map(item => `<li>${item}</li>`).join("")}</ul></div>`
      : "";
    return `<figure class="formula-figure"><img src="${src}" alt="${title}" /><figcaption><strong>${title}</strong><span>${caption}</span>${whereHtml}</figcaption></figure>`;
  }

  function territoryFormulaHtml(objective) {
    const main = objective === "frequency"
      ? formulaFigure("assets/img/formulas/prevalence.svg", "Estimación de granjas", "Calcula cuántas granjas deben muestrearse para estimar la frecuencia territorial con precisión y confianza definidas.", ["N = total de granjas en el territorio", "p = frecuencia esperada de granjas positivas", "d = precisión absoluta deseada", "Z = valor z asociado al nivel de confianza"]) 
      : formulaFigure("assets/img/formulas/detection.svg", "Detección territorial", "Calcula el número de granjas requerido para detectar presencia por encima de una frecuencia mínima de diseño.", ["C = confianza o probabilidad deseada de detección", "p = frecuencia mínima territorial de diseño", "n = granjas a muestrear"]);
    const within = formulaFigure("assets/img/formulas/detection.svg", "Clasificación intragranja", "Determina cuántos cerdos deben examinarse dentro de cada granja para clasificarla como positiva o no detectada.", ["C = probabilidad deseada de detectar una granja positiva", "p = prevalencia mínima intragranja de diseño", "Se = sensibilidad diagnóstica de la prueba"]);
    return main + within;
  }

  function farmFormulaHtml(objective, conclusion) {
    const main = objective === "detection"
      ? formulaFigure("assets/img/formulas/detection.svg", "Presencia o ausencia", "Usa población finita, prevalencia mínima de diseño y sensibilidad diagnóstica para calcular la muestra.", ["N = población seleccionada", "C = probabilidad deseada de detección", "p = prevalencia mínima de diseño", "Se = sensibilidad diagnóstica"])
      : formulaFigure("assets/img/formulas/prevalence.svg", "Estimación de prevalencia", "Calcula la muestra para estimar una proporción dentro de la población seleccionada.", ["N = población seleccionada", "p = prevalencia esperada", "d = precisión absoluta deseada", "Z = valor z asociado al nivel de confianza"]);
    const conc = conclusion === "joint"
      ? formulaFigure("assets/img/formulas/allocation.svg", "Asignación proporcional", "Distribuye la muestra total entre etapas, casetas o lotes en proporción a su inventario.", ["n = muestra total calculada", "N_j = inventario de la unidad j", "N = inventario total seleccionado", "n_j = muestra asignada a la unidad j"])
      : `<div class="formula-note-card"><strong>Resultados independientes por unidad</strong><p>Cuando elige resultados independientes, la herramienta calcula una muestra separada para cada etapa, caseta o lote, en lugar de repartir una sola muestra total.</p></div>`;
    return main + conc;
  }

  function sequencingFormulaHtml(scope) {
    const target = formulaFigure("assets/img/formulas/seq_target.svg", "Meta de secuencias", "Estima cuántas secuencias utilizables se necesitan para detectar un linaje o variante con la probabilidad deseada.", ["C = probabilidad deseada de detección", "p = frecuencia mínima del linaje o variante", "n = secuencias utilizables requeridas"]);
    if (scope === "positive") return target + formulaFigure("assets/img/formulas/seq_positive.svg", "Embudo laboratorial", "Parte de muestras positivas elegibles y las convierte en secuencias utilizables esperadas.", ["r = rendimiento laboratorial global", "r = amplificación × secuenciación × calidad", "n = secuencias requeridas"]);
    if (scope === "total") return target + formulaFigure("assets/img/formulas/seq_total.svg", "Embudo desde muestras totales", "Parte de todas las muestras disponibles y aplica positividad, amplificación, secuenciación y calidad.", ["r = rendimiento global desde muestras totales", "r = positividad × amplificación × secuenciación × calidad", "n = secuencias requeridas"]);
    if (scope === "farm") return target + formulaFigure("assets/img/formulas/seq_farm.svg", "Secuenciación desde una granja", "Convierte el muestreo de cerdos o muestras iniciales dentro de la granja en secuencias utilizables.", ["Se integra positividad animal, sensibilidad diagnóstica y rendimiento laboratorial", "La salida final es el número de cerdos o muestras iniciales requeridas"]);
    return target + formulaFigure("assets/img/formulas/seq_territory.svg", "Secuenciación territorial", "Integra granjas, cerdos, positividad y rendimiento laboratorial para alcanzar la meta molecular.", ["El diseño se resuelve en varios niveles: granjas, cerdos y secuencias", "Se busca cumplir la meta final de secuencias utilizables"]);
  }

  function renderResults(result) {
    const warnings = result.warnings?.length ? result.warnings : ["Los parámetros básicos son compatibles con el objetivo seleccionado."];
    const warningHtml = warnings.map((warning, index) => `<li class="${result.warnings?.length ? "" : "ok"}">${warning}</li>`).join("");
    const allocationMode = (result.allocationMode || "joint");
    const allocationTitle = allocationMode === "separate" ? "Resultados independientes por unidad" : "Distribución proporcional de la muestra";
    const allocationNote = allocationMode === "separate"
      ? "Cada fila corresponde a un cálculo independiente. Por eso la muestra no se reparte proporcionalmente al inventario total."
      : "La muestra total se reparte proporcionalmente al inventario seleccionado.";
    const maxSample = result.allocation?.length ? Math.max(...result.allocation.map(row => Number(row.sample) || 0), 1) : 1;
    const allocationHtml = result.allocation?.length ? `
      <div class="result-card wide"><h3>${allocationTitle}</h3><p class="allocation-note">${allocationNote}</p><table class="allocation-table"><thead><tr><th>Unidad</th><th>Inventario</th><th>Muestra</th></tr></thead><tbody>${result.allocation.map(row => `<tr><td>${row.label}</td><td>${formatInt(row.population)}</td><td><strong>${formatInt(row.sample)}</strong></td></tr>`).join("")}</tbody></table><div class="allocation-chart">${result.allocation.map(row => `<div class="allocation-bar-row"><div class="allocation-bar-label">${row.label}</div><div class="allocation-bar-track"><div class="allocation-bar-fill" style="width:${Math.max(8, (Number(row.sample)||0) / maxSample * 100)}%"></div></div><div class="allocation-bar-value">${formatInt(row.sample)}</div></div>`).join("")}</div></div>` : "";
    const funnelHtml = result.funnel ? `
      <div class="result-card wide"><h3>Embudo esperado</h3><div class="funnel">${result.funnel.stagesExpected.map((value, index) => {
        const labels = ["Inicio", "Positivas", "Detectadas / amplificables", "Secuenciadas", "Utilizables"];
        return `<div class="funnel-stage" style="width:${Math.max(44, 100 - index * 12)}%">${labels[index]}: ${formatInt(value)}</div>`;
      }).join("")}</div></div>` : "";
    const flowHtml = result.flow?.length ? `<div class="result-card wide"><h3>Ruta del diseño</h3><div class="flow-visual">${result.flow.map((node, index) => `<div class="flow-node"><small>${node.label}</small><strong>${node.value}</strong></div>${index < result.flow.length - 1 ? `<div class="flow-arrow">→</div>` : ``}`).join("")}</div></div>` : "";

    resultsContent.innerHTML = `
      <div class="result-hero">
        <div class="result-number"><strong>${formatInt(result.primary)}</strong><span>${result.primaryUnit}</span></div>
        <div class="result-explanation"><h3>Diseño recomendado</h3><p>${result.explanation}</p></div>
      </div>
      <div class="result-grid">
        <div class="result-card"><h3>Resumen</h3><dl>${result.details.map(([term, value]) => `<dt>${term}</dt><dd>${value}</dd>`).join("")}</dl></div>
        <div class="result-card"><h3>Interpretación y límites</h3><ul class="warning-list">${warningHtml}</ul></div>
        ${allocationHtml}${funnelHtml}${flowHtml}
        ${result.formulaHtml ? `<div class="result-card wide"><h3>Fórmulas y lógica del cálculo</h3><div class="formula-grid">${result.formulaHtml}</div></div>` : ""}
        <div class="result-card wide"><h3>Texto para metodología</h3><textarea id="report-text" class="report-text" readonly>${result.report}</textarea><div class="result-actions"><button id="copy-report" class="secondary-button" type="button">Copiar texto</button><button id="print-result" class="secondary-button" type="button">Imprimir o guardar PDF</button></div></div>
      </div>`;
    $("#copy-report").addEventListener("click", async event => {
      try { await navigator.clipboard.writeText($("#report-text").value); event.target.textContent = "Texto copiado"; }
      catch { $("#report-text").select(); document.execCommand("copy"); }
    });
    $("#print-result").addEventListener("click", () => window.print());
    resultsPanel.hidden = false;
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function calculate() {
    message.hidden = true;
    try {
      let result;
      if (state.mode === "territory") result = calculateTerritory();
      if (state.mode === "farm") result = calculateFarm();
      if (state.mode === "sequencing") result = calculateSequencing();
      if (!result) throw new Error("Seleccione un nivel de estudio.");
      renderResults(result);
    } catch (error) {
      message.textContent = error.message || "No fue posible completar el cálculo.";
      message.hidden = false;
      resultsPanel.hidden = true;
    }
  }

  function reset() {
    state.mode = null;
    $$(".mode-card").forEach(card => card.classList.remove("active"));
    workspace.hidden = true;
    resultsPanel.hidden = true;
    message.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $$(".mode-card").forEach(card => card.addEventListener("click", () => setMode(card.dataset.mode)));
  $("#calculate-button").addEventListener("click", calculate);
  $("#reset-button").addEventListener("click", reset);
})();
