/**
 * Network Analysis Utilities for DaycareWatch
 *
 * Analyzes connections between facilities to identify:
 * - Shell company networks (same owner, multiple facilities)
 * - Address clustering (multiple licenses at same location)
 * - Phone number networks (shared contact info)
 * - Name pattern networks (similar naming conventions)
 */

/**
 * Normalize a name for comparison
 */
const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(llc|inc|corp|corporation|company|co|childcare|child care|learning|center|daycare|day care|early|childhood|education|educational|academy|school|preschool|pre school)\b/g, '')
    .trim();
};

/**
 * Normalize address for comparison
 */
const normalizeAddress = (address) => {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|circle|cir|place|pl)\b/g, '')
    .replace(/\b(north|south|east|west|n|s|e|w)\b/g, '')
    .replace(/\b(suite|ste|unit|apt|apartment|floor|fl)\s*#?\s*\d*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Normalize phone for comparison
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10); // Last 10 digits
};

/**
 * Calculate string similarity (Levenshtein-based)
 */
const stringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Simple word overlap for performance
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union; // Jaccard similarity
};

/**
 * Build owner network - group facilities by owner/license holder
 */
export const buildOwnerNetwork = (facilities) => {
  const networks = {};

  facilities.forEach(facility => {
    const owner = facility.license_holder || facility.owner;
    if (!owner) return;

    const normalizedOwner = normalizeName(owner);
    if (normalizedOwner.length < 3) return;

    if (!networks[normalizedOwner]) {
      networks[normalizedOwner] = {
        owner: owner,
        normalizedOwner,
        facilities: [],
        totalCapacity: 0,
        addresses: new Set(),
        cities: new Set(),
      };
    }

    networks[normalizedOwner].facilities.push(facility);
    networks[normalizedOwner].totalCapacity += facility.capacity || 0;
    if (facility.address) networks[normalizedOwner].addresses.add(facility.address);
    if (facility.city) networks[normalizedOwner].cities.add(facility.city);
  });

  // Convert sets to arrays and filter to multi-facility networks
  return Object.values(networks)
    .map(n => ({
      ...n,
      addresses: [...n.addresses],
      cities: [...n.cities],
      facilityCount: n.facilities.length,
    }))
    .filter(n => n.facilityCount > 1)
    .sort((a, b) => b.facilityCount - a.facilityCount);
};

/**
 * Build address network - find facilities sharing addresses
 */
export const buildAddressNetwork = (facilities) => {
  const networks = {};

  facilities.forEach(facility => {
    if (!facility.address) return;

    const normalizedAddr = normalizeAddress(facility.address);
    if (normalizedAddr.length < 5) return;

    if (!networks[normalizedAddr]) {
      networks[normalizedAddr] = {
        address: facility.address,
        city: facility.city,
        normalizedAddress: normalizedAddr,
        facilities: [],
        owners: new Set(),
        totalCapacity: 0,
      };
    }

    networks[normalizedAddr].facilities.push(facility);
    networks[normalizedAddr].totalCapacity += facility.capacity || 0;
    if (facility.license_holder) networks[normalizedAddr].owners.add(facility.license_holder);
  });

  return Object.values(networks)
    .map(n => ({
      ...n,
      owners: [...n.owners],
      facilityCount: n.facilities.length,
      multipleOwners: n.owners.length > 1,
    }))
    .filter(n => n.facilityCount > 1)
    .sort((a, b) => b.facilityCount - a.facilityCount);
};

/**
 * Build phone network - find facilities sharing phone numbers
 */
export const buildPhoneNetwork = (facilities) => {
  const networks = {};

  facilities.forEach(facility => {
    if (!facility.phone) return;

    const normalizedPhone = normalizePhone(facility.phone);
    if (normalizedPhone.length !== 10) return;

    if (!networks[normalizedPhone]) {
      networks[normalizedPhone] = {
        phone: facility.phone,
        normalizedPhone,
        facilities: [],
        addresses: new Set(),
        owners: new Set(),
      };
    }

    networks[normalizedPhone].facilities.push(facility);
    if (facility.address) networks[normalizedPhone].addresses.add(facility.address);
    if (facility.license_holder) networks[normalizedPhone].owners.add(facility.license_holder);
  });

  return Object.values(networks)
    .map(n => ({
      ...n,
      addresses: [...n.addresses],
      owners: [...n.owners],
      facilityCount: n.facilities.length,
      differentAddresses: n.addresses.length > 1,
    }))
    .filter(n => n.facilityCount > 1)
    .sort((a, b) => b.facilityCount - a.facilityCount);
};

/**
 * Find facilities with similar names (potential shell companies)
 */
export const findSimilarNames = (facilities, threshold = 0.5) => {
  const groups = [];
  const processed = new Set();

  facilities.forEach((facility, i) => {
    if (processed.has(i) || !facility.name) return;

    const similar = [facility];
    const normalizedName = normalizeName(facility.name);

    facilities.forEach((other, j) => {
      if (i === j || processed.has(j) || !other.name) return;

      const similarity = stringSimilarity(normalizedName, normalizeName(other.name));
      if (similarity >= threshold) {
        similar.push({ ...other, similarity });
        processed.add(j);
      }
    });

    if (similar.length > 1) {
      processed.add(i);
      groups.push({
        baseName: facility.name,
        facilities: similar,
        count: similar.length,
      });
    }
  });

  return groups.sort((a, b) => b.count - a.count);
};

/**
 * Calculate network risk score for owner networks
 */
export const calculateNetworkRisk = (network) => {
  let score = 0;
  const flags = [];

  // Multiple facilities same owner
  if (network.facilityCount >= 5) {
    score += 30;
    flags.push({ type: 'LARGE_NETWORK', message: `${network.facilityCount} facilities under same owner` });
  } else if (network.facilityCount >= 3) {
    score += 15;
    flags.push({ type: 'MEDIUM_NETWORK', message: `${network.facilityCount} facilities under same owner` });
  }

  // High total capacity
  if (network.totalCapacity > 500) {
    score += 20;
    flags.push({ type: 'HIGH_CAPACITY_NETWORK', message: `Total capacity: ${network.totalCapacity}` });
  }

  // Multiple cities (spread out operations)
  if (network.cities && network.cities.length >= 3) {
    score += 15;
    flags.push({ type: 'MULTI_CITY', message: `Operations in ${network.cities.length} cities` });
  }

  return { score, flags };
};

/**
 * Calculate risk score for address clustering
 * Detects suspicious patterns at shared addresses
 */
export const calculateAddressRisk = (addressNetwork) => {
  let score = 0;
  const flags = [];

  // Multiple different owners at same address - major red flag
  if (addressNetwork.owners && addressNetwork.owners.length > 1) {
    const ownerCount = addressNetwork.owners.length;
    if (ownerCount >= 3) {
      score += 40;
      flags.push({
        type: 'MULTIPLE_OWNERS',
        severity: 'high',
        message: `${ownerCount} different license holders at same address`
      });
    } else {
      score += 25;
      flags.push({
        type: 'MULTIPLE_OWNERS',
        severity: 'medium',
        message: `${ownerCount} different license holders at same address`
      });
    }
  }

  // High capacity at single address
  if (addressNetwork.totalCapacity > 200) {
    score += 20;
    flags.push({
      type: 'HIGH_ADDRESS_CAPACITY',
      severity: 'medium',
      message: `Total capacity: ${addressNetwork.totalCapacity} at one location`
    });
  }

  // Many facilities at same address
  if (addressNetwork.facilityCount >= 4) {
    score += 30;
    flags.push({
      type: 'FACILITY_CLUSTER',
      severity: 'high',
      message: `${addressNetwork.facilityCount} facilities registered at this address`
    });
  } else if (addressNetwork.facilityCount >= 2) {
    score += 10;
    flags.push({
      type: 'FACILITY_CLUSTER',
      severity: 'low',
      message: `${addressNetwork.facilityCount} facilities at this address`
    });
  }

  return { score, flags };
};

/**
 * Detect potential license changes or shell company patterns at addresses
 * Looks for facilities that may have changed hands or been re-registered
 */
export const detectLicenseChanges = (facilities) => {
  const addressGroups = {};

  // Group facilities by normalized address
  facilities.forEach(facility => {
    if (!facility.address) return;

    const normalizedAddr = normalizeAddress(facility.address);
    if (normalizedAddr.length < 5) return;

    if (!addressGroups[normalizedAddr]) {
      addressGroups[normalizedAddr] = {
        address: facility.address,
        city: facility.city,
        facilities: [],
        ownerHistory: [],
        nameHistory: [],
      };
    }

    addressGroups[normalizedAddr].facilities.push(facility);

    if (facility.license_holder) {
      addressGroups[normalizedAddr].ownerHistory.push({
        owner: facility.license_holder,
        name: facility.name,
        license: facility.license_number,
        status: facility.status,
      });
    }

    if (facility.name) {
      addressGroups[normalizedAddr].nameHistory.push({
        name: facility.name,
        owner: facility.license_holder,
        license: facility.license_number,
      });
    }
  });

  // Find addresses with license change indicators
  const suspiciousAddresses = [];

  Object.values(addressGroups).forEach(group => {
    const uniqueOwners = new Set(group.ownerHistory.map(h => normalizeName(h.owner)));
    const uniqueNames = new Set(group.nameHistory.map(h => normalizeName(h.name)));
    const uniqueLicenses = new Set(group.facilities.map(f => f.license_number).filter(Boolean));

    // Skip if only one owner/name
    if (uniqueOwners.size <= 1 && uniqueNames.size <= 1) return;

    const indicators = [];
    let riskScore = 0;

    // Multiple owners at same address
    if (uniqueOwners.size > 1) {
      riskScore += 25 * (uniqueOwners.size - 1);
      indicators.push({
        type: 'OWNER_CHANGE',
        severity: uniqueOwners.size >= 3 ? 'high' : 'medium',
        message: `${uniqueOwners.size} different owners at this address`,
        details: [...uniqueOwners],
      });
    }

    // Multiple business names at same address
    if (uniqueNames.size > 1) {
      riskScore += 15 * (uniqueNames.size - 1);
      indicators.push({
        type: 'NAME_CHANGE',
        severity: uniqueNames.size >= 3 ? 'medium' : 'low',
        message: `${uniqueNames.size} different business names at this address`,
        details: group.nameHistory.map(h => h.name),
      });
    }

    // Multiple license numbers at same address (strong indicator of transfer)
    if (uniqueLicenses.size > 1) {
      riskScore += 20 * (uniqueLicenses.size - 1);
      indicators.push({
        type: 'LICENSE_TRANSFER',
        severity: 'high',
        message: `${uniqueLicenses.size} different license numbers at this address`,
        details: [...uniqueLicenses],
      });
    }

    // Check for closed/active transitions (possible fraud pattern)
    const statuses = group.facilities.map(f => f.status).filter(Boolean);
    const hasActive = statuses.some(s => s.toLowerCase().includes('active') || s.toLowerCase().includes('licensed'));
    const hasClosed = statuses.some(s => s.toLowerCase().includes('closed') || s.toLowerCase().includes('inactive'));

    if (hasActive && hasClosed) {
      riskScore += 15;
      indicators.push({
        type: 'STATUS_CHANGE',
        severity: 'medium',
        message: 'Mix of active and closed facilities at this address',
      });
    }

    if (indicators.length > 0) {
      suspiciousAddresses.push({
        address: group.address,
        city: group.city,
        facilities: group.facilities,
        ownerHistory: group.ownerHistory,
        nameHistory: group.nameHistory,
        uniqueOwners: uniqueOwners.size,
        uniqueNames: uniqueNames.size,
        uniqueLicenses: uniqueLicenses.size,
        indicators,
        riskScore,
      });
    }
  });

  return suspiciousAddresses.sort((a, b) => b.riskScore - a.riskScore);
};

/**
 * Comprehensive network analysis
 */
export const analyzeNetworks = (facilities) => {
  const ownerNetworks = buildOwnerNetwork(facilities);
  const addressNetworks = buildAddressNetwork(facilities);
  const phoneNetworks = buildPhoneNetwork(facilities);
  const similarNames = findSimilarNames(facilities);
  const licenseChanges = detectLicenseChanges(facilities);

  // Add risk scores to owner networks
  const scoredOwnerNetworks = ownerNetworks.map(network => ({
    ...network,
    ...calculateNetworkRisk(network),
  }));

  // Add risk scores to address networks
  const scoredAddressNetworks = addressNetworks.map(network => ({
    ...network,
    ...calculateAddressRisk(network),
  }));

  // Summary statistics
  const stats = {
    totalFacilities: facilities.length,
    facilitiesInOwnerNetworks: ownerNetworks.reduce((sum, n) => sum + n.facilityCount, 0),
    facilitiesAtSharedAddresses: addressNetworks.reduce((sum, n) => sum + n.facilityCount, 0),
    facilitiesSharingPhones: phoneNetworks.reduce((sum, n) => sum + n.facilityCount, 0),
    largestOwnerNetwork: ownerNetworks[0]?.facilityCount || 0,
    addressesWithMultipleFacilities: addressNetworks.length,
    phonesSharedByMultipleFacilities: phoneNetworks.length,
    addressesWithLicenseChanges: licenseChanges.length,
    highRiskAddresses: scoredAddressNetworks.filter(n => n.score >= 30).length,
  };

  return {
    ownerNetworks: scoredOwnerNetworks,
    addressNetworks: scoredAddressNetworks,
    phoneNetworks,
    similarNames,
    licenseChanges,
    stats,
  };
};

export default {
  buildOwnerNetwork,
  buildAddressNetwork,
  buildPhoneNetwork,
  findSimilarNames,
  analyzeNetworks,
  normalizeAddress,
  normalizeName,
  calculateAddressRisk,
  calculateNetworkRisk,
  detectLicenseChanges,
};
