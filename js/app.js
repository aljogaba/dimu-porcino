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
      ${heading("03", "Proceso molecular", "Rendimiento hasta la secuencia utilizable", "Cada porcentaje debe interpretarse como el éxito condicionado a haber superado la etapa anterior.")}
      <div id="sequence-lab-guide" class="process-guide">
        <strong>Ruta del material</strong>
        <div id="sequence-lab-route" class="process-route"></div>
      </div>
      <div class="input-grid four">
        ${field("seqTestSe", "Sensibilidad de detección (%)", 90, { min: .1, max: 100, help: "Se mantiene únicamente para las rutas que parten de animales o granjas y todavía requieren una etapa diagnóstica." })}
        ${field("seqAmplification", "Éxito de amplificación del blanco de secuenciación (%)", 90, { min: .1, max: 100, help: "Proporción de muestras elegibles que producen un amplicón adecuado para continuar a secuenciación." })}
        ${field("seqSequencing", "Éxito de secuenciación (%)", 70, { min: .1, max: 100, help: "Proporción de amplicones procesados que generan lecturas suficientes para intentar construir una secuencia." })}
        ${field("seqQuality", "Éxito de ensamble y control de calidad (%)", 95, { min: .1, max: 100, help: "Proporción de resultados de secuenciación que terminan como una secuencia consenso utilizable." })}
      </div>
      <div class="input-grid two" style="margin-top:14px">
        <div id="seq-planning-confidence-wrap">
          ${selectField("seqPlanningConfidence", "Probabilidad deseada de alcanzar la meta", [["0.90","90 %"],["0.95","95 %"],["0.99","99 %"]], "0.95", "Se utiliza cuando existe una meta explícita de secuencias; no aplica a la estimación simple del rendimiento esperado.")}
        </div>
        <div id="seq-independence-wrap">
          ${selectField("seqIndependence", "Cómo contará las secuencias", [["farm","Una secuencia por granja o evento"],["sample","Cada muestra positiva elegible cuenta por separado"]], "farm", "Este criterio se revisará en las rutas de diseño de campo; no modifica el rendimiento puramente laboratorial de un banco de muestras.")}
        </div>
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
    const mode = checkedValue("sequenceTargetMode");
    $("#manual-target-fields").hidden = mode !== "manual";
    $("#yield-target-fields").hidden = mode !== "yield";
    $("#variant-target-fields").hidden = mode !== "variant";
    $("#frequency-target-fields").hidden = mode !== "frequency";

    const yieldMode = mode === "yield";
    $("#field-scope-group").hidden = yieldMode;
    if (yieldMode) {
      const currentScope = checkedValue("sequenceScope");
      if (currentScope === "territory" || currentScope === "farm") {
        const totalRadio = document.querySelector('input[name="sequenceScope"][value="total"]');
        if (totalRadio) totalRadio.checked = true;
      }
    }
    if (mode === "variant" || mode === "frequency") $("#experimental-molecular-goals").open = true;
    updateSequenceScope();
  }

  function updateSequenceScope() {
    const scope = checkedValue("sequenceScope");
    const targetMode = checkedValue("sequenceTargetMode");
    const laboratoryScope = scope === "positive" || scope === "total";

    $("#sequence-territory-fields").hidden = scope !== "territory";
    $("#sequence-farm-fields").hidden = scope !== "farm";
    $("#sequence-positive-fields").hidden = scope !== "positive";
    $("#sequence-total-fields").hidden = scope !== "total";

    $("#seqTestSe").closest("label").hidden = laboratoryScope;
    $("#seq-independence-wrap").hidden = laboratoryScope;
    $("#seq-planning-confidence-wrap").hidden = targetMode === "yield";

    const guide = $("#sequence-lab-guide");
    guide.hidden = !laboratoryScope;
    if (laboratoryScope) {
      $("#sequence-lab-route").innerHTML = scope === "total"
        ? "<span>Muestras totales</span><b>→</b><span>Positivas esperadas</span><b>→</b><span>Amplicón</span><b>→</b><span>Secuenciación</span><b>→</b><span>Ensamble / calidad</span><b>→</b><span>Utilizables</span>"
        : "<span>Muestras positivas</span><b>→</b><span>Amplicón</span><b>→</b><span>Secuenciación</span><b>→</b><span>Ensamble / calidad</span><b>→</b><span>Utilizables</span>";
    }
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
    const mode = checkedValue("sequenceTargetMode");
    if (mode === "yield") return null;
    if (mode === "manual") {
      const target = numberOf("manualSequences");
      validatePositive(target, "Las secuencias utilizables requeridas");
      return Math.ceil(target);
    }
    if (mode === "frequency") {
      return calc.prevalenceSample({
        expectedPrevalence: numberOf("lineageExpectedFrequency"),
        precision: numberOf("lineagePrecision"),
        confidence: Number(valueOf("lineageConfidence"))
      }).final;
    }
    return calc.variantDetection({
      variantFrequency: numberOf("variantFrequency"),
      confidence: Number(valueOf("variantConfidence"))
    }).usableSequences;
  }

  function calculateSequencing() {
    const scope = checkedValue("sequenceScope");
    const targetMode = checkedValue("sequenceTargetMode");
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
    const targetMode = checkedValue("sequenceTargetMode");
    let target;
    if (targetMode === "variant") {
      target = formulaFigure("assets/img/formulas/seq_target.svg", "Detección exploratoria de linaje o variante", "Calcula cuántas secuencias utilizables se requieren para tener la probabilidad deseada de encontrar al menos una secuencia de un linaje presente a una frecuencia mínima.", ["C = probabilidad deseada de encontrar al menos una secuencia", "p = frecuencia mínima del linaje o variante en el conjunto representado", "n = secuencias utilizables requeridas"]);
    } else if (targetMode === "frequency") {
      target = formulaFigure("assets/img/formulas/prevalence.svg", "Estimación exploratoria de frecuencia molecular", "Calcula cuántas secuencias utilizables se requieren para estimar una proporción con precisión y confianza definidas. La interpretación depende del diseño que generó las secuencias.", ["p = frecuencia esperada del linaje en el conjunto representado", "d = precisión absoluta deseada", "Z = valor z asociado al nivel de confianza", "n = secuencias utilizables requeridas"]);
    } else {
      target = `<div class="formula-note-card"><strong>Meta operativa de secuencias</strong><p>El usuario fija directamente el número de secuencias utilizables requeridas. DIMUPorcino no infiere ni recomienda ese número; a partir de esta meta calcula hacia atrás las unidades necesarias en las etapas siguientes.</p></div>`;
    }
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
