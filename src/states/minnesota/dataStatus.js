/**
 * Data status for Minnesota counties
 * Data sourced from Minnesota GIS Data Commons (gisdata.mn.gov)
 */

// All 87 counties with facility counts from GIS data
const COUNTIES_WITH_DATA = {
  "Aitkin": { facilitiesCount: 22 },
  "Anoka": { facilitiesCount: 465 },
  "Becker": { facilitiesCount: 65 },
  "Beltrami": { facilitiesCount: 94 },
  "Benton": { facilitiesCount: 104 },
  "Big Stone": { facilitiesCount: 8 },
  "Blue Earth": { facilitiesCount: 120 },
  "Brown": { facilitiesCount: 71 },
  "Carlton": { facilitiesCount: 23 },
  "Carver": { facilitiesCount: 136 },
  "Cass": { facilitiesCount: 26 },
  "Chippewa": { facilitiesCount: 26 },
  "Chisago": { facilitiesCount: 72 },
  "Clay": { facilitiesCount: 148 },
  "Clearwater": { facilitiesCount: 12 },
  "Cook": { facilitiesCount: 8 },
  "Cottonwood": { facilitiesCount: 30 },
  "Crow Wing": { facilitiesCount: 109 },
  "Dakota": { facilitiesCount: 582 },
  "Dodge": { facilitiesCount: 47 },
  "Douglas": { facilitiesCount: 101 },
  "Faribault": { facilitiesCount: 19 },
  "Fillmore": { facilitiesCount: 16 },
  "Freeborn": { facilitiesCount: 40 },
  "Goodhue": { facilitiesCount: 78 },
  "Grant": { facilitiesCount: 7 },
  "Hennepin": { facilitiesCount: 1162 },
  "Houston": { facilitiesCount: 29 },
  "Hubbard": { facilitiesCount: 36 },
  "Isanti": { facilitiesCount: 40 },
  "Itasca": { facilitiesCount: 57 },
  "Jackson": { facilitiesCount: 10 },
  "Kanabec": { facilitiesCount: 24 },
  "Kandiyohi": { facilitiesCount: 86 },
  "Kittson": { facilitiesCount: 6 },
  "Koochiching": { facilitiesCount: 16 },
  "Lac qui Parle": { facilitiesCount: 18 },
  "Lake": { facilitiesCount: 16 },
  "Lake of the Woods": { facilitiesCount: 9 },
  "Le Sueur": { facilitiesCount: 47 },
  "Lincoln": { facilitiesCount: 3 },
  "Lyon": { facilitiesCount: 63 },
  "Mahnomen": { facilitiesCount: 2 },
  "Marshall": { facilitiesCount: 6 },
  "Martin": { facilitiesCount: 41 },
  "McLeod": { facilitiesCount: 77 },
  "Meeker": { facilitiesCount: 46 },
  "Mille Lacs": { facilitiesCount: 25 },
  "Morrison": { facilitiesCount: 80 },
  "Mower": { facilitiesCount: 46 },
  "Murray": { facilitiesCount: 10 },
  "Nicollet": { facilitiesCount: 24 },
  "Nobles": { facilitiesCount: 18 },
  "Norman": { facilitiesCount: 6 },
  "Olmsted": { facilitiesCount: 341 },
  "Otter Tail": { facilitiesCount: 146 },
  "Pennington": { facilitiesCount: 44 },
  "Pine": { facilitiesCount: 30 },
  "Pipestone": { facilitiesCount: 35 },
  "Polk": { facilitiesCount: 67 },
  "Pope": { facilitiesCount: 20 },
  "Ramsey": { facilitiesCount: 503 },
  "Red Lake": { facilitiesCount: 7 },
  "Redwood": { facilitiesCount: 23 },
  "Renville": { facilitiesCount: 15 },
  "Rice": { facilitiesCount: 105 },
  "Rock": { facilitiesCount: 22 },
  "Roseau": { facilitiesCount: 40 },
  "Scott": { facilitiesCount: 273 },
  "Sherburne": { facilitiesCount: 199 },
  "Sibley": { facilitiesCount: 29 },
  "St. Louis": { facilitiesCount: 227 },
  "Stearns": { facilitiesCount: 342 },
  "Steele": { facilitiesCount: 97 },
  "Stevens": { facilitiesCount: 17 },
  "Swift": { facilitiesCount: 18 },
  "Todd": { facilitiesCount: 52 },
  "Traverse": { facilitiesCount: 7 },
  "Wabasha": { facilitiesCount: 62 },
  "Wadena": { facilitiesCount: 12 },
  "Waseca": { facilitiesCount: 31 },
  "Washington": { facilitiesCount: 343 },
  "Watonwan": { facilitiesCount: 16 },
  "Wilkin": { facilitiesCount: 14 },
  "Winona": { facilitiesCount: 89 },
  "Wright": { facilitiesCount: 238 },
  "Yellow Medicine": { facilitiesCount: 19 }
};

/**
 * Get data status for a Minnesota county
 * @param {string} countyName - Name of the county
 * @returns {Object} Data status object
 */
export const getMinnesotaDataStatus = (countyName) => {
  const countyData = COUNTIES_WITH_DATA[countyName];

  if (countyData) {
    return {
      licensingData: true,
      subsidyData: false,
      lastUpdated: '2024-11-21',
      facilitiesCount: countyData.facilitiesCount,
      note: 'Data from MN GIS Commons - MGDPA request pending for subsidies',
      source: 'Minnesota GIS Data Commons'
    };
  }

  return {
    licensingData: false,
    subsidyData: false,
    lastUpdated: null,
    facilitiesCount: null,
    note: 'Data collection pending'
  };
};

export default getMinnesotaDataStatus;
