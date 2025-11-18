import * as d3 from "d3";
import { createDataCollectionMap } from "./charts.js";

d3.csv("./js/data/PAL_TEE_UPF_HDI_Data_Elsa.csv", d3.autoType).then(raw => {

  const populationData = raw.map(d => ({
    // rename keys
    name: d.Population,
    economy: d.Economy,           // highHDI, midHDI, lowHDI, AGP, HORT, HG
    economyFull: economyFullName(d.Economy),  // derived
    lat: Number(d.lat),
    lon: Number(d.lon),

    // optional fields your map uses
    N_M: d.N_M,
    N_F: d.N_F
  }));

  createDataCollectionMap("map-container", populationData);
});

// helper to map short codes to long names
function economyFullName(code) {
  switch (code) {
    case "HG": return "hunter-gatherer";
    case "HORT": return "horticulturalist";
    case "AGP": return "agropastoralist";
    case "highHDI": return "high HDI";
    case "midHDI": return "mid HDI";
    case "lowHDI": return "low HDI";
    default: return code;
  }
}
