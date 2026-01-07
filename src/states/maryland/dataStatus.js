/**
 * Data status for Maryland counties
 */

// Counties with available data
const COUNTIES_WITH_DATA = {
  'Montgomery': {
    licensingData: true,
    subsidyData: false,
    lastUpdated: '2026-01-06',
    facilitiesCount: null, // Will be updated after data collection
    note: 'DC suburbs pilot - MPIA request pending for CCS payment data'
  }
};

/**
 * Get data status for a Maryland county
 * @param {string} countyName - Name of the county
 * @returns {Object} Data status object
 */
export const getMarylandDataStatus = (countyName) => {
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

export default getMarylandDataStatus;
