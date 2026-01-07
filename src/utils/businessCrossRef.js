/**
 * Business Cross-Reference Utilities
 *
 * Provides functions to cross-reference SOS business data with
 * facility data, NEMT providers, and healthcare providers.
 *
 * Used to identify ownership networks that span multiple programs.
 */

/**
 * Normalize a business/owner name for comparison
 */
export const normalizeBusinessName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(llc|inc|corp|corporation|company|co|limited|ltd|lp|llp|pllc)\b/g, '')
    .trim();
};

/**
 * Normalize address for comparison
 */
export const normalizeAddress = (address) => {
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
 * Check if two names are likely the same entity
 */
export const namesMatch = (name1, name2, threshold = 0.8) => {
  const n1 = normalizeBusinessName(name1);
  const n2 = normalizeBusinessName(name2);

  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // Check word overlap (Jaccard similarity)
  const words1 = new Set(n1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(n2.split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return false;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  const similarity = intersection / union;

  return similarity >= threshold;
};

/**
 * Check if two addresses are likely the same location
 */
export const addressesMatch = (addr1, addr2) => {
  const a1 = normalizeAddress(addr1);
  const a2 = normalizeAddress(addr2);

  if (!a1 || !a2) return false;
  if (a1 === a2) return true;

  // Check if one contains the other (handles partial matches)
  return a1.includes(a2) || a2.includes(a1);
};

/**
 * Find businesses linked to a facility
 */
export const findLinkedBusinesses = (facility, businesses) => {
  if (!facility || !businesses || businesses.length === 0) return [];

  const matches = [];
  const facilityOwner = normalizeBusinessName(facility.license_holder || facility.owner);
  const facilityAddress = normalizeAddress(facility.address);

  businesses.forEach(business => {
    const matchTypes = [];

    // Check business name matches owner
    if (facilityOwner && namesMatch(business.name, facilityOwner)) {
      matchTypes.push('OWNER_NAME');
    }

    // Check party name (registered agent) matches owner
    if (facilityOwner && business.party_name && namesMatch(business.party_name, facilityOwner)) {
      matchTypes.push('PARTY_NAME');
    }

    // Check address match
    if (facilityAddress && addressesMatch(business.address, facilityAddress)) {
      matchTypes.push('ADDRESS');
    }

    if (matchTypes.length > 0) {
      matches.push({
        business,
        matchTypes,
        confidence: matchTypes.length / 3, // 0.33 to 1.0
      });
    }
  });

  return matches.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Find facilities linked to a business
 */
export const findLinkedFacilities = (business, facilities) => {
  if (!business || !facilities || facilities.length === 0) return [];

  const matches = [];
  const businessName = normalizeBusinessName(business.name);
  const businessAddress = normalizeAddress(business.address);
  const partyName = normalizeBusinessName(business.party_name);

  facilities.forEach(facility => {
    const matchTypes = [];
    const facilityOwner = normalizeBusinessName(facility.license_holder || facility.owner);
    const facilityAddress = normalizeAddress(facility.address);

    // Check business name matches facility owner
    if (businessName && facilityOwner && namesMatch(businessName, facilityOwner)) {
      matchTypes.push('OWNER_MATCH');
    }

    // Check party name matches facility owner
    if (partyName && facilityOwner && namesMatch(partyName, facilityOwner)) {
      matchTypes.push('PARTY_MATCH');
    }

    // Check address match
    if (businessAddress && facilityAddress && addressesMatch(businessAddress, facilityAddress)) {
      matchTypes.push('ADDRESS_MATCH');
    }

    if (matchTypes.length > 0) {
      matches.push({
        facility,
        matchTypes,
        confidence: matchTypes.length / 3,
      });
    }
  });

  return matches.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Build ownership network from SOS data
 * Groups businesses by registered agent to find shell company networks
 */
export const buildOwnershipNetwork = (businesses) => {
  const agentMap = new Map();

  businesses.forEach(business => {
    if (!business.party_name) return;

    const partyType = (business.party_type || '').toLowerCase();
    // Only consider registered agents and managers
    if (!partyType.includes('agent') && !partyType.includes('manager') && !partyType.includes('member')) {
      return;
    }

    const normalizedAgent = normalizeBusinessName(business.party_name);
    if (normalizedAgent.length < 3) return;

    if (!agentMap.has(normalizedAgent)) {
      agentMap.set(normalizedAgent, {
        agent: business.party_name,
        normalizedAgent,
        businesses: [],
        addresses: new Set(),
        cities: new Set(),
      });
    }

    const network = agentMap.get(normalizedAgent);
    network.businesses.push({
      name: business.name,
      file_number: business.file_number,
      filing_date: business.filing_date,
      filing_type: business.filing_type,
      address: business.address,
      city: business.city,
      status: business.status,
    });
    if (business.address) network.addresses.add(business.address);
    if (business.city) network.cities.add(business.city);
  });

  // Convert to array and enrich
  return Array.from(agentMap.values())
    .map(network => ({
      ...network,
      addresses: [...network.addresses],
      cities: [...network.cities],
      businessCount: network.businesses.length,
      addressCount: network.addresses.size,
      isMultiAddress: network.addresses.size > 1,
    }))
    .filter(n => n.businessCount >= 2)
    .sort((a, b) => b.businessCount - a.businessCount);
};

/**
 * Detect rapid company formation patterns
 * Identifies agents who registered multiple businesses in a short time window
 */
export const detectRapidFormation = (businesses, windowDays = 90) => {
  const agentFilings = new Map();

  // Group by registered agent with filing dates
  businesses.forEach(business => {
    if (!business.party_name || !business.filing_date) return;

    const partyType = (business.party_type || '').toLowerCase();
    if (!partyType.includes('agent')) return;

    const normalizedAgent = normalizeBusinessName(business.party_name);
    if (!agentFilings.has(normalizedAgent)) {
      agentFilings.set(normalizedAgent, []);
    }

    try {
      agentFilings.get(normalizedAgent).push({
        business,
        filingDate: new Date(business.filing_date),
      });
    } catch {
      // Invalid date, skip
    }
  });

  const patterns = [];

  agentFilings.forEach((filings, agent) => {
    if (filings.length < 3) return;

    // Sort by filing date
    filings.sort((a, b) => a.filingDate - b.filingDate);

    // Find clusters of rapid filings
    for (let i = 0; i < filings.length - 2; i++) {
      const cluster = [filings[i]];

      for (let j = i + 1; j < filings.length; j++) {
        const daysDiff = (filings[j].filingDate - cluster[0].filingDate) / (1000 * 60 * 60 * 24);
        if (daysDiff <= windowDays) {
          cluster.push(filings[j]);
        } else {
          break;
        }
      }

      if (cluster.length >= 3) {
        patterns.push({
          agent: filings[0].business.party_name,
          normalizedAgent: agent,
          startDate: cluster[0].filingDate.toISOString().split('T')[0],
          endDate: cluster[cluster.length - 1].filingDate.toISOString().split('T')[0],
          daysSpan: Math.round((cluster[cluster.length - 1].filingDate - cluster[0].filingDate) / (1000 * 60 * 60 * 24)),
          businessCount: cluster.length,
          businesses: cluster.map(c => ({
            name: c.business.name,
            filingDate: c.business.filing_date,
          })),
        });

        // Skip to end of this cluster
        i = filings.indexOf(cluster[cluster.length - 1]);
      }
    }
  });

  return patterns.sort((a, b) => b.businessCount - a.businessCount);
};

/**
 * Calculate cross-program risk for an entity
 * Checks if owner appears across childcare, healthcare, and transport
 */
export const calculateCrossProgramRisk = (ownerName, daycareData, healthcareData, transportData) => {
  const normalizedOwner = normalizeBusinessName(ownerName);
  if (!normalizedOwner) return { score: 0, programs: [], flags: [] };

  const programs = [];
  const flags = [];
  let score = 0;

  // Check daycare facilities
  if (daycareData && daycareData.length > 0) {
    const daycareMatches = daycareData.filter(f =>
      namesMatch(f.license_holder || f.owner, ownerName)
    );
    if (daycareMatches.length > 0) {
      programs.push({ type: 'daycare', count: daycareMatches.length });
      score += 10 * Math.min(daycareMatches.length, 5);
    }
  }

  // Check healthcare providers
  if (healthcareData && healthcareData.length > 0) {
    const healthMatches = healthcareData.filter(p =>
      namesMatch(p.owner || p.provider_name, ownerName)
    );
    if (healthMatches.length > 0) {
      programs.push({ type: 'healthcare', count: healthMatches.length });
      score += 15 * Math.min(healthMatches.length, 5);
    }
  }

  // Check transport providers
  if (transportData && transportData.length > 0) {
    const transportMatches = transportData.filter(p =>
      namesMatch(p.owner || p.company_name, ownerName)
    );
    if (transportMatches.length > 0) {
      programs.push({ type: 'transport', count: transportMatches.length });
      score += 15 * Math.min(transportMatches.length, 5);
    }
  }

  // Cross-program bonus (major red flag)
  if (programs.length >= 3) {
    score += 50;
    flags.push({
      type: 'ALL_PROGRAMS',
      severity: 'critical',
      message: 'Owner operates across daycare, healthcare, AND transport programs',
    });
  } else if (programs.length === 2) {
    score += 30;
    flags.push({
      type: 'MULTI_PROGRAM',
      severity: 'high',
      message: `Owner operates in ${programs.map(p => p.type).join(' and ')} programs`,
    });
  }

  return { score, programs, flags };
};

/**
 * Generate shell company risk assessment
 */
export const assessShellCompanyRisk = (business, ownershipNetworks, addressClusters) => {
  let score = 0;
  const flags = [];

  // Check agent network size
  const normalizedAgent = normalizeBusinessName(business.party_name);
  const network = ownershipNetworks?.find(n => n.normalizedAgent === normalizedAgent);

  if (network) {
    if (network.businessCount >= 10) {
      score += 40;
      flags.push({
        type: 'HIGH_VOLUME_AGENT',
        severity: 'high',
        message: `Registered agent controls ${network.businessCount} businesses`,
      });
    } else if (network.businessCount >= 5) {
      score += 25;
      flags.push({
        type: 'MULTI_BUSINESS_AGENT',
        severity: 'medium',
        message: `Registered agent controls ${network.businessCount} businesses`,
      });
    }

    if (network.isMultiAddress && network.addressCount >= 3) {
      score += 15;
      flags.push({
        type: 'DISPERSED_OPERATIONS',
        severity: 'medium',
        message: `Businesses spread across ${network.addressCount} addresses`,
      });
    }
  }

  // Check address clustering
  const normalizedAddr = normalizeAddress(business.address);
  const cluster = addressClusters?.find(c =>
    normalizeAddress(c.address) === normalizedAddr
  );

  if (cluster && cluster.businessCount >= 5) {
    score += 30;
    flags.push({
      type: 'HIGH_DENSITY_ADDRESS',
      severity: 'high',
      message: `${cluster.businessCount} businesses registered at same address`,
    });
  }

  // Recent formation during fraud investigation period
  if (business.filing_date) {
    const filingYear = new Date(business.filing_date).getFullYear();
    if (filingYear >= 2021) {
      score += 15;
      flags.push({
        type: 'RECENT_FORMATION',
        severity: 'medium',
        message: `Business formed in ${filingYear} (during fraud investigation period)`,
      });
    }
  }

  // LLC structure (commonly used in fraud)
  const filingType = (business.filing_type || '').toLowerCase();
  if (filingType.includes('llc') || filingType.includes('limited liability')) {
    score += 5;
  }

  return {
    score,
    flags,
    riskLevel: score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low',
  };
};

const businessCrossRef = {
  normalizeBusinessName,
  normalizeAddress,
  namesMatch,
  addressesMatch,
  findLinkedBusinesses,
  findLinkedFacilities,
  buildOwnershipNetwork,
  detectRapidFormation,
  calculateCrossProgramRisk,
  assessShellCompanyRisk,
};

export default businessCrossRef;
