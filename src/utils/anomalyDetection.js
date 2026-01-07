/**
 * Anomaly Detection Engine for DaycareWatch
 *
 * Implements risk scoring and cross-reference analysis
 * based on patterns identified in fraud investigations
 * (Shirley/David Minnesota investigation, Feeding Our Future case)
 */

// Risk score weights based on fraud investigation patterns
const RISK_WEIGHTS = {
  HIGH_CAPACITY_NO_INSPECTION: 20,      // Core Shirley finding
  MULTIPLE_FACILITIES_SAME_ADDRESS: 30, // Shell company indicator
  HIGH_CCAP_PAYMENT: 25,                // Payment > $1M/year
  HIGH_PAYMENT_RATIO: 35,               // Payment/capacity > $15K
  MANY_VIOLATIONS: 15,                  // >10 violations
  PANDEMIC_ERA_LICENSE: 0,              // Removed - too many false positives on legitimate businesses
  SHIRLEY_INVESTIGATION: 50,            // In known investigation list
  PROBATION_STATUS: 25,                 // License on probation
  SUSPENDED_STATUS: 40,                 // License suspended
  NO_PHONE_NUMBER: 5,                   // Basic contact info missing
  CAPACITY_ESTIMATED: 5,                // Using estimated, not real capacity
};

// Risk level thresholds
const RISK_LEVELS = {
  LOW: { max: 20, label: 'Low Risk', color: '#22c55e' },
  MODERATE: { max: 50, label: 'Moderate', color: '#eab308' },
  HIGH: { max: 80, label: 'High Risk', color: '#f97316' },
  CRITICAL: { max: Infinity, label: 'Critical', color: '#ef4444' },
};

/**
 * Calculate risk score and flags for a single facility
 * @param {Object} facility - Facility data object
 * @param {Object} context - Additional context (addressGroups, zipStats, investigationList)
 * @returns {Object} Risk assessment with score, level, and flags
 */
export const calculateRiskScore = (facility, context = {}) => {
  const flags = [];
  let score = 0;

  // High capacity with no inspection
  if (facility.capacity > 50 && !facility.last_inspection_date) {
    score += RISK_WEIGHTS.HIGH_CAPACITY_NO_INSPECTION;
    flags.push({
      type: 'HIGH_CAPACITY_NO_INSPECTION',
      severity: 'high',
      message: `High capacity (${facility.capacity}) with no inspection on file`,
      detail: 'Large facilities without recent inspections warrant scrutiny'
    });
  }

  // Multiple facilities at same address - only flag if DIFFERENT owners
  // (Same owner with multiple licenses for different age groups is normal)
  if (context.addressGroups) {
    const normalizedAddress = normalizeAddressSimple(facility.address);
    const facilitiesAtAddress = context.addressGroups[normalizedAddress] || [];
    if (facilitiesAtAddress.length > 1) {
      // Check if there are different licensees at this address
      const uniqueLicensees = new Set(facilitiesAtAddress.map(f =>
        (f.licensee || f.license_holder || '').toLowerCase().trim()
      ).filter(l => l));

      // Only flag if multiple DIFFERENT owners at same address (shell company pattern)
      if (uniqueLicensees.size > 1) {
        score += RISK_WEIGHTS.MULTIPLE_FACILITIES_SAME_ADDRESS;
        flags.push({
          type: 'MULTIPLE_FACILITIES_SAME_ADDRESS',
          severity: 'high',
          message: `${uniqueLicensees.size} different owners at this address`,
          detail: `${facilitiesAtAddress.length} facilities with different licensees - potential shell company pattern`,
          relatedFacilities: facilitiesAtAddress.filter(f => f.license_number !== facility.license_number)
        });
      }
      // If same owner has multiple licenses (preschool + infant + school-age), that's normal - no flag
    }
  }

  // High CCAP payment (when financial data available)
  if (facility.ccap_payment_fy2025 && facility.ccap_payment_fy2025 > 1000000) {
    score += RISK_WEIGHTS.HIGH_CCAP_PAYMENT;
    flags.push({
      type: 'HIGH_CCAP_PAYMENT',
      severity: 'high',
      message: `High CCAP payment: $${(facility.ccap_payment_fy2025 / 1000000).toFixed(1)}M`,
      detail: 'Payments exceeding $1M/year warrant verification'
    });
  }

  // High payment to capacity ratio
  if (facility.ccap_payment_fy2025 && facility.capacity) {
    const ratio = facility.ccap_payment_fy2025 / facility.capacity;
    if (ratio > 15000) {
      score += RISK_WEIGHTS.HIGH_PAYMENT_RATIO;
      flags.push({
        type: 'HIGH_PAYMENT_RATIO',
        severity: 'critical',
        message: `$${Math.round(ratio).toLocaleString()} per licensed capacity`,
        detail: 'Payment per child exceeds typical thresholds'
      });
    }
  }

  // Many violations
  if (facility.total_citations && facility.total_citations > 10) {
    score += RISK_WEIGHTS.MANY_VIOLATIONS;
    flags.push({
      type: 'MANY_VIOLATIONS',
      severity: 'moderate',
      message: `${facility.total_citations} violations on record`,
      detail: 'Facilities with extensive violation history may have ongoing compliance issues'
    });
  }

  // Probation or suspension status
  if (facility.status === 'PROBATION') {
    score += RISK_WEIGHTS.PROBATION_STATUS;
    flags.push({
      type: 'PROBATION_STATUS',
      severity: 'high',
      message: 'License on PROBATION',
      detail: 'Facility has active license conditions'
    });
  }
  if (facility.status === 'SUSPENDED') {
    score += RISK_WEIGHTS.SUSPENDED_STATUS;
    flags.push({
      type: 'SUSPENDED_STATUS',
      severity: 'critical',
      message: 'License SUSPENDED',
      detail: 'Facility should not be operating or receiving payments'
    });
  }

  // NOTE: Pandemic-era license flag removed - too many false positives
  // Legitimate businesses like churches and established organizations
  // opened childcare during 2020-2021 for valid reasons

  // In Shirley investigation list
  if (context.investigationList) {
    const inInvestigation = context.investigationList.find(inv =>
      inv.name && facility.name &&
      (inv.name.toLowerCase().includes(facility.name.toLowerCase()) ||
       facility.name.toLowerCase().includes(inv.name.toLowerCase()))
    );
    if (inInvestigation) {
      score += RISK_WEIGHTS.SHIRLEY_INVESTIGATION;
      flags.push({
        type: 'SHIRLEY_INVESTIGATION',
        severity: 'critical',
        message: 'Flagged in Shirley investigation (Dec 2025)',
        detail: inInvestigation.observations ? inInvestigation.observations.join('; ') : 'Featured in viral investigation video',
        investigationData: inInvestigation
      });
    }
  }

  // Using estimated capacity
  if (facility.capacity_estimated) {
    score += RISK_WEIGHTS.CAPACITY_ESTIMATED;
    flags.push({
      type: 'CAPACITY_ESTIMATED',
      severity: 'info',
      message: 'Capacity is estimated, not verified',
      detail: 'Real capacity data pending from official source'
    });
  }

  // Determine risk level
  let riskLevel = RISK_LEVELS.LOW;
  if (score > 80) riskLevel = RISK_LEVELS.CRITICAL;
  else if (score > 50) riskLevel = RISK_LEVELS.HIGH;
  else if (score > 20) riskLevel = RISK_LEVELS.MODERATE;

  return {
    score,
    level: riskLevel,
    flags: flags.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    flagCount: flags.length,
    hasCriticalFlags: flags.some(f => f.severity === 'critical'),
    hasHighFlags: flags.some(f => f.severity === 'high' || f.severity === 'critical'),
  };
};

/**
 * Simple address normalization for grouping
 */
const normalizeAddressSimple = (address) => {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd)\b/g, '')
    .replace(/\b(north|south|east|west|n|s|e|w)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Build address groups from facility list
 * @param {Array} facilities - Array of facility objects
 * @returns {Object} Map of normalized address to facilities at that address
 */
export const buildAddressGroups = (facilities) => {
  const groups = {};
  facilities.forEach(facility => {
    const normalized = normalizeAddressSimple(facility.address);
    if (normalized) {
      if (!groups[normalized]) groups[normalized] = [];
      groups[normalized].push(facility);
    }
  });
  return groups;
};

/**
 * Calculate ZIP code statistics
 * @param {Array} facilities - Array of facility objects
 * @returns {Object} Map of ZIP to facility count and stats
 */
export const calculateZipStats = (facilities) => {
  const stats = {};
  facilities.forEach(facility => {
    const zip = (facility.zip_code || '').substring(0, 5);
    if (zip) {
      if (!stats[zip]) {
        stats[zip] = { count: 0, totalCapacity: 0, facilities: [] };
      }
      stats[zip].count++;
      stats[zip].totalCapacity += facility.capacity || 0;
      stats[zip].facilities.push(facility.license_number);
    }
  });
  return stats;
};

/**
 * Find facilities with similar names (potential shell companies)
 * @param {Array} facilities - Array of facility objects
 * @returns {Array} Groups of facilities with similar names
 */
export const findSimilarNames = (facilities) => {
  const nameGroups = {};

  facilities.forEach(facility => {
    if (!facility.name) return;

    // Extract base name (first 2-3 significant words)
    const words = facility.name.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'and', 'for', 'inc', 'llc', 'center', 'child', 'care', 'learning', 'early', 'childhood'].includes(w));

    if (words.length >= 2) {
      const baseKey = words.slice(0, 2).join(' ');
      if (!nameGroups[baseKey]) nameGroups[baseKey] = [];
      nameGroups[baseKey].push(facility);
    }
  });

  // Return only groups with multiple facilities
  return Object.entries(nameGroups)
    .filter(([_, group]) => group.length > 1)
    .map(([baseName, facilities]) => ({
      baseName,
      count: facilities.length,
      facilities: facilities.map(f => ({
        license_number: f.license_number,
        name: f.name,
        address: f.address
      }))
    }));
};

/**
 * Analyze all facilities and return those with highest risk scores
 * @param {Array} facilities - Array of facility objects
 * @param {Object} investigationData - Shirley investigation seed data
 * @returns {Object} Analysis results
 */
export const analyzeAllFacilities = (facilities, investigationData = null) => {
  const addressGroups = buildAddressGroups(facilities);
  const zipStats = calculateZipStats(facilities);
  const investigationList = investigationData?.facilities || [];

  const context = { addressGroups, zipStats, investigationList };

  const analyzed = facilities.map(facility => ({
    ...facility,
    riskAssessment: calculateRiskScore(facility, context)
  }));

  // Sort by risk score descending
  const byRisk = [...analyzed].sort((a, b) =>
    b.riskAssessment.score - a.riskAssessment.score
  );

  return {
    facilities: analyzed,
    topRisk: byRisk.slice(0, 20),
    criticalCount: analyzed.filter(f => f.riskAssessment.level.label === 'Critical').length,
    highRiskCount: analyzed.filter(f => f.riskAssessment.hasHighFlags).length,
    addressDuplicates: Object.entries(addressGroups)
      .filter(([_, group]) => group.length > 1)
      .map(([addr, group]) => ({ address: addr, count: group.length, facilities: group })),
    zipStats,
    similarNames: findSimilarNames(facilities),
  };
};

const anomalyDetection = {
  calculateRiskScore,
  buildAddressGroups,
  calculateZipStats,
  findSimilarNames,
  analyzeAllFacilities,
  RISK_LEVELS,
};

export default anomalyDetection;
