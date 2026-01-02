/**
 * State registry for DaycareWatch
 * Central export point for all state configurations
 */

import californiaConfig from './california/config';
import { CALIFORNIA_COUNTIES } from './california/counties';
import { getCaliforniaDataStatus } from './california/dataStatus';

import minnesotaConfig from './minnesota/config';
import { MINNESOTA_COUNTIES } from './minnesota/counties';
import { getMinnesotaDataStatus } from './minnesota/dataStatus';

/**
 * All available states with their configurations
 */
export const states = {
  california: {
    config: californiaConfig,
    counties: CALIFORNIA_COUNTIES,
    getDataStatus: getCaliforniaDataStatus
  },
  minnesota: {
    config: minnesotaConfig,
    counties: MINNESOTA_COUNTIES,
    getDataStatus: getMinnesotaDataStatus
  }
};

/**
 * Get a specific state's data
 * @param {string} stateId - State identifier (e.g., 'california', 'minnesota')
 * @returns {Object|null} State data object or null if not found
 */
export const getState = (stateId) => states[stateId] || null;

/**
 * Get list of all available state configs for the state selector
 * @returns {Array} Array of state config objects
 */
export const getAllStates = () => Object.values(states).map(s => s.config);

/**
 * Get list of state IDs
 * @returns {Array} Array of state ID strings
 */
export const getStateIds = () => Object.keys(states);

export default states;
