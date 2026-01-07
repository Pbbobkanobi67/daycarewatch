/**
 * Process Minnesota Secretary of State Business Data
 *
 * Parses the Active Business Data CSV and cross-references with
 * DaycareWatch facility data to identify:
 * - Business entities linked to licensed childcare facilities
 * - Shell company patterns (same address, agent, rapid formation)
 * - Ownership networks across multiple programs
 *
 * Input: MN SOS Active Business Data CSV (extracted from zip)
 * Output: JSON files with matched businesses and risk analysis
 *
 * Usage: node scripts/process-sos-business.js <path-to-csv>
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '../public/data/minnesota/sos');

// High-risk business types often used in fraud schemes
const HIGH_RISK_BUSINESS_TYPES = [
  'limited liability company',
  'llc',
  'assumed name',
  'nonprofit corporation',
];

// Keywords suggesting healthcare/childcare related businesses
const PROGRAM_KEYWORDS = {
  childcare: ['childcare', 'child care', 'daycare', 'day care', 'learning', 'preschool', 'early childhood', 'kids', 'children'],
  healthcare: ['health', 'medical', 'care', 'home care', 'homecare', 'pca', 'nursing', 'therapy', 'mental health', 'behavioral', 'rehabilitation', 'rehab'],
  transport: ['transport', 'transit', 'ambulance', 'nemt', 'medical transport', 'mobility'],
};

// ============================================================================
// Normalization Functions (matching networkAnalysis.js patterns)
// ============================================================================

const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

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

const normalizeNameForMatching = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(llc|inc|corp|corporation|company|co|limited|ltd)\b/g, '')
    .trim();
};

// ============================================================================
// CSV Parsing
// ============================================================================

/**
 * Parse CSV line handling quoted fields with commas
 */
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
};

/**
 * Parse SOS Active Business Data CSV
 * Expected columns (based on MN SOS documentation):
 * - Business Filing Type
 * - Business Name
 * - File Number
 * - Filing Date
 * - Status
 * - Address
 * - City
 * - Region Code (State)
 * - Zip
 * - Country
 * - Business Party Name Type (e.g., Registered Agent, Manager)
 * - Party Full Name
 * - Next Renewal Due Date
 */
const parseSOSData = (csvPath) => {
  console.log(`Reading SOS data from: ${csvPath}`);

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file appears empty or has no data rows');
  }

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  console.log('CSV columns found:', header.join(', '));

  // Map columns (flexible to handle variations)
  const colMap = {
    filing_type: header.findIndex(h => h.includes('filing_type') || h.includes('business_type')),
    name: header.findIndex(h => h.includes('business_name') || h === 'name'),
    file_number: header.findIndex(h => h.includes('file_number') || h.includes('file_no')),
    filing_date: header.findIndex(h => h.includes('filing_date')),
    status: header.findIndex(h => h.includes('status')),
    address: header.findIndex(h => h === 'address' || h.includes('street')),
    city: header.findIndex(h => h === 'city'),
    state: header.findIndex(h => h.includes('region') || h === 'state'),
    zip: header.findIndex(h => h.includes('zip')),
    party_type: header.findIndex(h => h.includes('party') && h.includes('type')),
    party_name: header.findIndex(h => h.includes('party') && h.includes('name')),
    renewal_date: header.findIndex(h => h.includes('renewal')),
  };

  console.log('Column mapping:', colMap);

  // Parse data rows
  const businesses = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 3) continue; // Skip malformed rows

    const business = {
      filing_type: colMap.filing_type >= 0 ? values[colMap.filing_type] : null,
      name: colMap.name >= 0 ? values[colMap.name] : null,
      file_number: colMap.file_number >= 0 ? values[colMap.file_number] : null,
      filing_date: colMap.filing_date >= 0 ? values[colMap.filing_date] : null,
      status: colMap.status >= 0 ? values[colMap.status] : null,
      address: colMap.address >= 0 ? values[colMap.address] : null,
      city: colMap.city >= 0 ? values[colMap.city] : null,
      state: colMap.state >= 0 ? values[colMap.state] : null,
      zip: colMap.zip >= 0 ? values[colMap.zip] : null,
      party_type: colMap.party_type >= 0 ? values[colMap.party_type] : null,
      party_name: colMap.party_name >= 0 ? values[colMap.party_name] : null,
      renewal_date: colMap.renewal_date >= 0 ? values[colMap.renewal_date] : null,
      // Normalized fields for matching
      normalized_name: null,
      normalized_address: null,
      normalized_party: null,
    };

    // Add normalized fields
    business.normalized_name = normalizeNameForMatching(business.name);
    business.normalized_address = normalizeAddress(business.address);
    business.normalized_party = normalizeName(business.party_name);

    businesses.push(business);
  }

  console.log(`Parsed ${businesses.length} business records`);
  return businesses;
};

// ============================================================================
// Load Facility Data
// ============================================================================

const loadFacilityData = () => {
  const dataDir = path.join(__dirname, '../public/data/minnesota');
  const facilities = [];

  // Load all county facility files
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('_facilities.json') && !f.includes('summary'));

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      facilities.push(...data);
    } catch (e) {
      console.warn(`Warning: Could not load ${file}:`, e.message);
    }
  }

  // Add normalized fields for matching
  return facilities.map(f => ({
    ...f,
    normalized_name: normalizeNameForMatching(f.name),
    normalized_address: normalizeAddress(f.address),
    normalized_owner: normalizeNameForMatching(f.license_holder),
  }));
};

// ============================================================================
// Cross-Reference Analysis
// ============================================================================

/**
 * Find businesses that match facility owners
 */
const matchBusinessesToFacilities = (businesses, facilities) => {
  const matches = [];

  // Build lookup maps
  const ownerMap = new Map();
  const addressMap = new Map();

  facilities.forEach(f => {
    if (f.normalized_owner && f.normalized_owner.length > 3) {
      if (!ownerMap.has(f.normalized_owner)) {
        ownerMap.set(f.normalized_owner, []);
      }
      ownerMap.set(f.normalized_owner, [...ownerMap.get(f.normalized_owner), f]);
    }

    if (f.normalized_address && f.normalized_address.length > 5) {
      if (!addressMap.has(f.normalized_address)) {
        addressMap.set(f.normalized_address, []);
      }
      addressMap.set(f.normalized_address, [...addressMap.get(f.normalized_address), f]);
    }
  });

  console.log(`Built lookup maps: ${ownerMap.size} unique owners, ${addressMap.size} unique addresses`);

  // Match businesses
  businesses.forEach(business => {
    const matchedFacilities = [];
    const matchTypes = [];

    // Match by business name to facility owner
    if (business.normalized_name && ownerMap.has(business.normalized_name)) {
      matchedFacilities.push(...ownerMap.get(business.normalized_name));
      matchTypes.push('OWNER_NAME_MATCH');
    }

    // Match by party name (registered agent/manager) to facility owner
    if (business.normalized_party && ownerMap.has(business.normalized_party)) {
      const partyMatches = ownerMap.get(business.normalized_party);
      partyMatches.forEach(f => {
        if (!matchedFacilities.find(m => m.license_number === f.license_number)) {
          matchedFacilities.push(f);
        }
      });
      matchTypes.push('PARTY_NAME_MATCH');
    }

    // Match by address
    if (business.normalized_address && addressMap.has(business.normalized_address)) {
      const addressMatches = addressMap.get(business.normalized_address);
      addressMatches.forEach(f => {
        if (!matchedFacilities.find(m => m.license_number === f.license_number)) {
          matchedFacilities.push(f);
        }
      });
      matchTypes.push('ADDRESS_MATCH');
    }

    if (matchedFacilities.length > 0) {
      matches.push({
        business,
        facilities: matchedFacilities.map(f => ({
          license_number: f.license_number,
          name: f.name,
          license_holder: f.license_holder,
          address: f.address,
          city: f.city,
          status: f.status,
        })),
        matchTypes: [...new Set(matchTypes)],
        facilityCount: matchedFacilities.length,
      });
    }
  });

  return matches;
};

// ============================================================================
// Shell Company Detection
// ============================================================================

/**
 * Build registered agent network
 */
const buildAgentNetwork = (businesses) => {
  const agentMap = new Map();

  businesses.forEach(business => {
    if (!business.party_name || !business.party_type) return;

    const partyType = business.party_type.toLowerCase();
    if (!partyType.includes('agent') && !partyType.includes('registered')) return;

    const normalizedAgent = normalizeName(business.party_name);
    if (normalizedAgent.length < 3) return;

    if (!agentMap.has(normalizedAgent)) {
      agentMap.set(normalizedAgent, {
        agent: business.party_name,
        normalizedAgent,
        businesses: [],
        addresses: new Set(),
        filingDates: [],
      });
    }

    const network = agentMap.get(normalizedAgent);
    network.businesses.push(business);
    if (business.address) network.addresses.add(business.address);
    if (business.filing_date) network.filingDates.push(business.filing_date);
  });

  // Filter to agents with multiple businesses
  return Array.from(agentMap.values())
    .filter(n => n.businesses.length >= 2)
    .map(n => ({
      ...n,
      addresses: [...n.addresses],
      businessCount: n.businesses.length,
      addressCount: n.addresses.size,
    }))
    .sort((a, b) => b.businessCount - a.businessCount);
};

/**
 * Build address clustering analysis
 */
const buildAddressClusters = (businesses) => {
  const addressMap = new Map();

  businesses.forEach(business => {
    if (!business.normalized_address || business.normalized_address.length < 5) return;

    if (!addressMap.has(business.normalized_address)) {
      addressMap.set(business.normalized_address, {
        address: business.address,
        city: business.city,
        normalizedAddress: business.normalized_address,
        businesses: [],
        agents: new Set(),
        filingTypes: new Set(),
      });
    }

    const cluster = addressMap.get(business.normalized_address);
    cluster.businesses.push(business);
    if (business.party_name) cluster.agents.add(business.party_name);
    if (business.filing_type) cluster.filingTypes.add(business.filing_type);
  });

  // Filter to addresses with multiple businesses
  return Array.from(addressMap.values())
    .filter(c => c.businesses.length >= 2)
    .map(c => ({
      ...c,
      agents: [...c.agents],
      filingTypes: [...c.filingTypes],
      businessCount: c.businesses.length,
      agentCount: c.agents.size,
      multipleAgents: c.agents.size > 1,
    }))
    .sort((a, b) => b.businessCount - a.businessCount);
};

/**
 * Detect rapid company formation patterns
 */
const detectRapidFormation = (businesses, windowDays = 90) => {
  // Group by registered agent
  const agentFilings = new Map();

  businesses.forEach(business => {
    if (!business.party_name || !business.filing_date) return;

    const partyType = (business.party_type || '').toLowerCase();
    if (!partyType.includes('agent') && !partyType.includes('registered')) return;

    const normalizedAgent = normalizeName(business.party_name);
    if (!agentFilings.has(normalizedAgent)) {
      agentFilings.set(normalizedAgent, []);
    }

    agentFilings.get(normalizedAgent).push({
      business,
      filingDate: new Date(business.filing_date),
    });
  });

  const rapidFormations = [];

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
        rapidFormations.push({
          agent: filings[0].business.party_name,
          normalizedAgent: agent,
          startDate: cluster[0].filingDate.toISOString().split('T')[0],
          endDate: cluster[cluster.length - 1].filingDate.toISOString().split('T')[0],
          daysSpan: Math.round((cluster[cluster.length - 1].filingDate - cluster[0].filingDate) / (1000 * 60 * 60 * 24)),
          businessCount: cluster.length,
          businesses: cluster.map(c => ({
            name: c.business.name,
            filing_date: c.business.filing_date,
            address: c.business.address,
          })),
        });

        // Skip to end of this cluster
        i = filings.indexOf(cluster[cluster.length - 1]);
      }
    }
  });

  return rapidFormations.sort((a, b) => b.businessCount - a.businessCount);
};

/**
 * Categorize businesses by program type
 */
const categorizeByProgram = (businesses) => {
  const categories = {
    childcare: [],
    healthcare: [],
    transport: [],
    other: [],
  };

  businesses.forEach(business => {
    const nameLower = (business.name || '').toLowerCase();
    let categorized = false;

    for (const [category, keywords] of Object.entries(PROGRAM_KEYWORDS)) {
      if (keywords.some(kw => nameLower.includes(kw))) {
        categories[category].push(business);
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      categories.other.push(business);
    }
  });

  return categories;
};

/**
 * Calculate shell company risk score
 */
const calculateShellCompanyRisk = (business, agentNetworks, addressClusters) => {
  let score = 0;
  const flags = [];

  // Check if registered agent has many businesses
  const normalizedAgent = normalizeName(business.party_name);
  const agentNetwork = agentNetworks.find(n => n.normalizedAgent === normalizedAgent);

  if (agentNetwork) {
    if (agentNetwork.businessCount >= 10) {
      score += 40;
      flags.push({ type: 'HIGH_VOLUME_AGENT', message: `Agent has ${agentNetwork.businessCount} businesses` });
    } else if (agentNetwork.businessCount >= 5) {
      score += 25;
      flags.push({ type: 'MULTI_BUSINESS_AGENT', message: `Agent has ${agentNetwork.businessCount} businesses` });
    }
  }

  // Check address clustering
  const addressCluster = addressClusters.find(c => c.normalizedAddress === business.normalized_address);

  if (addressCluster) {
    if (addressCluster.businessCount >= 10) {
      score += 35;
      flags.push({ type: 'HIGH_DENSITY_ADDRESS', message: `${addressCluster.businessCount} businesses at this address` });
    } else if (addressCluster.businessCount >= 5) {
      score += 20;
      flags.push({ type: 'SHARED_ADDRESS', message: `${addressCluster.businessCount} businesses at this address` });
    }

    if (addressCluster.multipleAgents && addressCluster.agentCount >= 3) {
      score += 25;
      flags.push({ type: 'MULTIPLE_AGENTS_SAME_ADDRESS', message: `${addressCluster.agentCount} different agents at same address` });
    }
  }

  // High-risk business types
  const filingTypeLower = (business.filing_type || '').toLowerCase();
  if (HIGH_RISK_BUSINESS_TYPES.some(t => filingTypeLower.includes(t))) {
    score += 10;
    flags.push({ type: 'HIGH_RISK_ENTITY_TYPE', message: `Filing type: ${business.filing_type}` });
  }

  // Recent formation (within last 3 years - high fraud activity period)
  if (business.filing_date) {
    const filingDate = new Date(business.filing_date);
    const cutoffDate = new Date('2021-01-01');
    if (filingDate >= cutoffDate) {
      score += 15;
      flags.push({ type: 'RECENT_FORMATION', message: `Filed ${business.filing_date}` });
    }
  }

  return { score, flags };
};

// ============================================================================
// Main Processing
// ============================================================================

const main = async () => {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.log(`
Minnesota SOS Business Data Processor
=====================================

Usage: node scripts/process-sos-business.js <path-to-csv>

This script processes the MN Secretary of State Active Business Data
and cross-references it with DaycareWatch facility data.

Expected CSV columns:
  - Business Filing Type
  - Business Name
  - File Number
  - Filing Date
  - Status
  - Address, City, Region Code, Zip
  - Business Party Name Type (e.g., Registered Agent)
  - Party Full Name
  - Next Renewal Due Date

Output:
  - public/data/minnesota/sos/sos_businesses.json (all parsed businesses)
  - public/data/minnesota/sos/facility_matches.json (businesses linked to facilities)
  - public/data/minnesota/sos/agent_networks.json (registered agent analysis)
  - public/data/minnesota/sos/address_clusters.json (address clustering)
  - public/data/minnesota/sos/rapid_formations.json (fraud tourism patterns)
  - public/data/minnesota/sos/summary.json (analysis summary)
`);
    process.exit(0);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n=== Minnesota SOS Business Data Processor ===\n');

  // Parse SOS data
  console.log('Step 1: Parsing SOS business data...');
  const businesses = parseSOSData(csvPath);

  // Load facility data
  console.log('\nStep 2: Loading facility data...');
  const facilities = loadFacilityData();
  console.log(`Loaded ${facilities.length} facilities`);

  // Build analysis structures
  console.log('\nStep 3: Building analysis structures...');
  const agentNetworks = buildAgentNetwork(businesses);
  console.log(`Found ${agentNetworks.length} registered agents with multiple businesses`);

  const addressClusters = buildAddressClusters(businesses);
  console.log(`Found ${addressClusters.length} addresses with multiple businesses`);

  const rapidFormations = detectRapidFormation(businesses);
  console.log(`Found ${rapidFormations.length} rapid formation patterns`);

  // Categorize by program type
  console.log('\nStep 4: Categorizing businesses...');
  const categories = categorizeByProgram(businesses);
  console.log(`  Childcare-related: ${categories.childcare.length}`);
  console.log(`  Healthcare-related: ${categories.healthcare.length}`);
  console.log(`  Transport-related: ${categories.transport.length}`);
  console.log(`  Other: ${categories.other.length}`);

  // Cross-reference with facilities
  console.log('\nStep 5: Cross-referencing with facility data...');
  const facilityMatches = matchBusinessesToFacilities(businesses, facilities);
  console.log(`Found ${facilityMatches.length} businesses linked to facilities`);

  // Calculate risk scores for matched businesses
  console.log('\nStep 6: Calculating risk scores...');
  const scoredMatches = facilityMatches.map(match => ({
    ...match,
    ...calculateShellCompanyRisk(match.business, agentNetworks, addressClusters),
  })).sort((a, b) => b.score - a.score);

  // Generate summary
  const summary = {
    processedAt: new Date().toISOString(),
    sourceFile: path.basename(csvPath),
    totalBusinesses: businesses.length,
    totalFacilities: facilities.length,
    categories: {
      childcare: categories.childcare.length,
      healthcare: categories.healthcare.length,
      transport: categories.transport.length,
      other: categories.other.length,
    },
    analysis: {
      agentNetworksFound: agentNetworks.length,
      addressClustersFound: addressClusters.length,
      rapidFormationPatterns: rapidFormations.length,
      facilitiesLinked: facilityMatches.length,
    },
    topAgentsByBusinessCount: agentNetworks.slice(0, 10).map(n => ({
      agent: n.agent,
      businessCount: n.businessCount,
      addressCount: n.addressCount,
    })),
    topAddressesByBusinessCount: addressClusters.slice(0, 10).map(c => ({
      address: c.address,
      city: c.city,
      businessCount: c.businessCount,
      agentCount: c.agentCount,
    })),
    highRiskMatches: scoredMatches.filter(m => m.score >= 40).length,
    mediumRiskMatches: scoredMatches.filter(m => m.score >= 20 && m.score < 40).length,
  };

  // Write output files
  console.log('\nStep 7: Writing output files...');

  // All businesses (for reference)
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'sos_businesses.json'),
    JSON.stringify(businesses, null, 2)
  );
  console.log(`  sos_businesses.json: ${businesses.length} records`);

  // Facility matches with risk scores
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'facility_matches.json'),
    JSON.stringify(scoredMatches, null, 2)
  );
  console.log(`  facility_matches.json: ${scoredMatches.length} matches`);

  // Agent networks
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'agent_networks.json'),
    JSON.stringify(agentNetworks, null, 2)
  );
  console.log(`  agent_networks.json: ${agentNetworks.length} networks`);

  // Address clusters
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'address_clusters.json'),
    JSON.stringify(addressClusters, null, 2)
  );
  console.log(`  address_clusters.json: ${addressClusters.length} clusters`);

  // Rapid formations
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'rapid_formations.json'),
    JSON.stringify(rapidFormations, null, 2)
  );
  console.log(`  rapid_formations.json: ${rapidFormations.length} patterns`);

  // Program-specific businesses
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'childcare_businesses.json'),
    JSON.stringify(categories.childcare, null, 2)
  );
  console.log(`  childcare_businesses.json: ${categories.childcare.length} businesses`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'healthcare_businesses.json'),
    JSON.stringify(categories.healthcare, null, 2)
  );
  console.log(`  healthcare_businesses.json: ${categories.healthcare.length} businesses`);

  // Summary
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  console.log(`  summary.json`);

  // Print summary
  console.log('\n=== Analysis Complete ===\n');
  console.log(`Total businesses parsed: ${businesses.length}`);
  console.log(`Businesses linked to facilities: ${facilityMatches.length}`);
  console.log(`High-risk matches (score >= 40): ${summary.highRiskMatches}`);
  console.log(`Medium-risk matches (score 20-39): ${summary.mediumRiskMatches}`);

  if (scoredMatches.length > 0) {
    console.log('\nTop 5 highest-risk matches:');
    scoredMatches.slice(0, 5).forEach((match, i) => {
      console.log(`  ${i + 1}. ${match.business.name} (Score: ${match.score})`);
      console.log(`     Linked to ${match.facilityCount} facilities via: ${match.matchTypes.join(', ')}`);
      match.flags.forEach(f => console.log(`     - ${f.message}`));
    });
  }

  console.log(`\nOutput written to: ${OUTPUT_DIR}`);
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
