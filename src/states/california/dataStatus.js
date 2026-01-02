/**
 * Data status for California counties
 */

// Counties with available data
const COUNTIES_WITH_DATA = {
  'San Diego': {
    licensingData: true,
    subsidyData: false,
    lastUpdated: '2026-01-01',
    facilitiesCount: 3518,
    note: 'Pilot county - subsidy CPRA request pending'
  }
};

/**
 * Get data status for a California county
 * @param {string} countyName - Name of the county
 * @returns {Object} Data status object
 */
export const getCaliforniaDataStatus = (countyName) => {
  if (COUNTIES_WITH_DATA[countyName]) {
    return COUNTIES_WITH_DATA[countyName];
  }

  return {
    licensingData: false,
    subsidyData: false,
    lastUpdated: null,
    facilitiesCount: null,
    note: 'Data collection pending'
  };
};

export default getCaliforniaDataStatus;
