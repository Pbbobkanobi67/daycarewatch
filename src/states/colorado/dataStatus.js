/**
 * Data status for Colorado counties
 */

// Counties with available data
const COUNTIES_WITH_DATA = {
  'Jefferson': {
    licensingData: true,
    subsidyData: false,
    lastUpdated: '2026-01-06',
    facilitiesCount: 485,
    note: 'Denver metro pilot - CORA request pending for CCCAP payment data'
  },
  'Arapahoe': {
    licensingData: true,
    subsidyData: false,
    lastUpdated: '2026-01-06',
    facilitiesCount: 497,
    note: 'Denver metro pilot - CORA request pending for CCCAP payment data'
  }
};

/**
 * Get data status for a Colorado county
 * @param {string} countyName - Name of the county
 * @returns {Object} Data status object
 */
export const getColoradoDataStatus = (countyName) => {
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

export default getColoradoDataStatus;
