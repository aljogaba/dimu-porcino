(function (global) {
  "use strict";

  const survival = mortalityPercent => Math.max(0, 1 - Number(mortalityPercent || 0) / 100);
  const round = value => Math.max(0, Math.round(Number(value) || 0));

  function calculateInventory(parameters) {
    const sows = Math.max(1, Number(parameters.sows));
    const farrowingsPerSowYear = Math.max(0.1, Number(parameters.farrowingsPerSowYear));
    const livebornPerLitter = Math.max(0.1, Number(parameters.livebornPerLitter));
    const lactationDays = Math.max(1, Number(parameters.lactationDays));
    const farrowingsWeek = sows * farrowingsPerSowYear / 52;
    const livebornWeek = farrowingsWeek * livebornPerLitter;
    const lactationWeeks = lactationDays / 7;

    const lactatingFemales = farrowingsWeek * lactationWeeks;
    const gestationServiceFemales = Math.max(0, sows - lactatingFemales);
    const replacementInventory = sows * (Number(parameters.replacementRate || 0) / 100) / 12 * Number(parameters.replacementMonths || 0);

    const lactatingPiglets = livebornWeek * lactationWeeks;
    const weanedWeek = livebornWeek * survival(parameters.mortalityMaternity);
    const nursery = weanedWeek * Number(parameters.weaningWeeks);
    const growthEntryWeek = weanedWeek * survival(parameters.mortalityWeaning);
    const growth = growthEntryWeek * Number(parameters.growthWeeks);
    const developmentEntryWeek = growthEntryWeek * survival(parameters.mortalityGrowth);
    const development = developmentEntryWeek * Number(parameters.developmentWeeks);
    const finishingEntryWeek = developmentEntryWeek * survival(parameters.mortalityDevelopment);
    const finishing = finishingEntryWeek * Number(parameters.finishingWeeks);

    const stages = [
      { id: "replacements", label: "Reemplazos", population: round(replacementInventory), site: "site1", order: 1 },
      { id: "gestation", label: "Gestación y servicio", population: round(gestationServiceFemales), site: "site1", order: 2 },
      { id: "lactating_sows", label: "Hembras lactantes", population: round(lactatingFemales), site: "site1", order: 3 },
      { id: "lactating_piglets", label: "Lechones lactantes", population: round(lactatingPiglets), site: "site1", order: 4 },
      { id: "weaning", label: "Destete", population: round(nursery), site: "site2", order: 5 },
      { id: "growth", label: "Crecimiento", population: round(growth), site: "site3", order: 6 },
      { id: "development", label: "Desarrollo", population: round(development), site: "site3", order: 7 },
      { id: "finishing", label: "Finalización", population: round(finishing), site: "site3", order: 8 }
    ];

    const sites = [
      { id: "site1", label: "Sitio 1", population: stages.filter(x => x.site === "site1").reduce((s, x) => s + x.population, 0), order: 1 },
      { id: "site2", label: "Sitio 2", population: stages.filter(x => x.site === "site2").reduce((s, x) => s + x.population, 0), order: 2 },
      { id: "site3", label: "Sitio 3", population: stages.filter(x => x.site === "site3").reduce((s, x) => s + x.population, 0), order: 3 }
    ];

    return {
      stages,
      sites,
      total: stages.reduce((sum, stage) => sum + stage.population, 0),
      flow: {
        farrowingsWeek,
        livebornWeek,
        weanedWeek,
        growthEntryWeek,
        developmentEntryWeek,
        finishingEntryWeek
      },
      note: "Inventario promedio simultáneo estimado. En sistemas todo dentro/todo fuera debe confirmarse el inventario real de la fecha de muestreo."
    };
  }

  global.InventoryCalculator = { calculateInventory };
})(window);
