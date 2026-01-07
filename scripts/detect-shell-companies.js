/**
 * Shell Company Detection Script
 *
 * Analyzes SOS business data to identify potential shell company patterns:
 * - Same registered agent across many businesses
 * - Multiple businesses at same address
 * - Rapid company formation (fraud tourism)
 * - Out-of-state registered agents
 * - Cross-program ownership (daycare + healthcare + transport)
 *
 * Usage: node scripts/detect-shell-companies.js
 *
 * Requires: SOS data already processed by process-sos-business.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const SOS_DATA_DIR = path.join(__dirname, '../public/data/minnesota/sos');
const FACILITY_DATA_DIR = path.join(__dirname, '../public/data/minnesota');
const OUTPUT_FILE = path.join(SOS_DATA_DIR, 'shell_company_report.json');
const READABLE_REPORT = path.join(SOS_DATA_DIR, 'shell_company_report.txt');

// Thresholds for flagging
const THRESHOLDS = {
  MIN_BUSINESSES_PER_AGENT: 5,        // Flag agents with 5+ businesses
  MIN_BUSINESSES_PER_ADDRESS: 5,       // Flag addresses with 5+ businesses
  RAPID_FORMATION_WINDOW_DAYS: 90,     // 3 months
  RAPID_FORMATION_MIN_COUNT: 3,        // 3+ businesses in window
  RECENT_FORMATION_CUTOFF: '2021-01-01', // Start of fraud surge
  HIGH_RISK_SCORE_THRESHOLD: 50,
  MEDIUM_RISK_SCORE_THRESHOLD: 25,
};

// ============================================================================
// Normalization (matching other scripts)
// ============================================================================

const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(llc|inc|corp|corporation|company|co|limited|ltd|lp|llp)\b/g, '')
    .trim();
};

const normalizeAddress = (address) => {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd)\b/g, '')
    .replace(/\b(north|south|east|west|n|s|e|w)\b/g, '')
    .replace(/\b(suite|ste|unit|apt)\s*#?\s*\d*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// ============================================================================
// Data Loading
// ============================================================================

const loadJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`Could not load ${filePath}: ${e.message}`);
    return null;
  }
};

const loadFacilityData = () => {
  const facilities = [];
  const files = fs.readdirSync(FACILITY_DATA_DIR)
    .filter(f => f.endsWith('_facilities.json') && !f.includes('summary'));

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(FACILITY_DATA_DIR, file), 'utf8'));
      facilities.push(...data);
    } catch (e) {
      // Skip problematic files
    }
  }
  return facilities;
};

// ============================================================================
// Shell Company Detection
// ============================================================================

/**
 * Analyze registered agent patterns
 */
const analyzeAgentPatterns = (businesses) => {
  const agentMap = new Map();

  businesses.forEach(b => {
    if (!b.party_name) return;
    const partyType = (b.party_type || '').toLowerCase();
    if (!partyType.includes('agent')) return;

    const key = normalizeName(b.party_name);
    if (key.length < 3) return;

    if (!agentMap.has(key)) {
      agentMap.set(key, {
        agent: b.party_name,
        businesses: [],
        addresses: new Set(),
        states: new Set(),
        filingDates: [],
        filingTypes: new Set(),
      });
    }

    const entry = agentMap.get(key);
    entry.businesses.push({
      name: b.name,
      file_number: b.file_number,
      filing_date: b.filing_date,
      address: b.address,
      city: b.city,
      status: b.status,
    });
    if (b.address) entry.addresses.add(b.address);
    if (b.state) entry.states.add(b.state);
    if (b.filing_date) entry.filingDates.push(b.filing_date);
    if (b.filing_type) entry.filingTypes.add(b.filing_type);
  });

  // Convert to array and filter high-volume agents
  return Array.from(agentMap.values())
    .filter(a => a.businesses.length >= THRESHOLDS.MIN_BUSINESSES_PER_AGENT)
    .map(a => ({
      ...a,
      addresses: [...a.addresses],
      states: [...a.states],
      filingTypes: [...a.filingTypes],
      businessCount: a.businesses.length,
      addressCount: a.addresses.size,
      isOutOfState: !a.states.has('MN') && a.states.size > 0,
      isMultiState: a.states.size > 1,
    }))
    .sort((a, b) => b.businessCount - a.businessCount);
};

/**
 * Analyze address clustering
 */
const analyzeAddressClustering = (businesses) => {
  const addressMap = new Map();

  businesses.forEach(b => {
    if (!b.address) return;
    const key = normalizeAddress(b.address);
    if (key.length < 5) return;

    if (!addressMap.has(key)) {
      addressMap.set(key, {
        address: b.address,
        city: b.city,
        businesses: [],
        agents: new Set(),
        owners: new Set(),
      });
    }

    const entry = addressMap.get(key);
    entry.businesses.push({
      name: b.name,
      file_number: b.file_number,
      party_name: b.party_name,
      filing_date: b.filing_date,
    });
    if (b.party_name) entry.agents.add(b.party_name);
    if (b.name) entry.owners.add(b.name);
  });

  return Array.from(addressMap.values())
    .filter(a => a.businesses.length >= THRESHOLDS.MIN_BUSINESSES_PER_ADDRESS)
    .map(a => ({
      ...a,
      agents: [...a.agents],
      owners: [...a.owners],
      businessCount: a.businesses.length,
      agentCount: a.agents.size,
      multipleAgents: a.agents.size > 1,
    }))
    .sort((a, b) => b.businessCount - a.businessCount);
};

/**
 * Detect rapid formation patterns
 */
const detectRapidFormation = (businesses) => {
  // Group by agent
  const agentFilings = new Map();

  businesses.forEach(b => {
    if (!b.party_name || !b.filing_date) return;
    const partyType = (b.party_type || '').toLowerCase();
    if (!partyType.includes('agent')) return;

    const key = normalizeName(b.party_name);
    if (!agentFilings.has(key)) {
      agentFilings.set(key, []);
    }

    try {
      agentFilings.get(key).push({
        business: b,
        date: new Date(b.filing_date),
      });
    } catch {
      // Invalid date
    }
  });

  const patterns = [];

  agentFilings.forEach((filings, agent) => {
    if (filings.length < THRESHOLDS.RAPID_FORMATION_MIN_COUNT) return;

    filings.sort((a, b) => a.date - b.date);

    // Sliding window detection
    for (let i = 0; i < filings.length; i++) {
      const window = [filings[i]];
      const windowEnd = new Date(filings[i].date);
      windowEnd.setDate(windowEnd.getDate() + THRESHOLDS.RAPID_FORMATION_WINDOW_DAYS);

      for (let j = i + 1; j < filings.length && filings[j].date <= windowEnd; j++) {
        window.push(filings[j]);
      }

      if (window.length >= THRESHOLDS.RAPID_FORMATION_MIN_COUNT) {
        patterns.push({
          agent: window[0].business.party_name,
          startDate: window[0].date.toISOString().split('T')[0],
          endDate: window[window.length - 1].date.toISOString().split('T')[0],
          daysSpan: Math.round((window[window.length - 1].date - window[0].date) / (1000 * 60 * 60 * 24)),
          count: window.length,
          businesses: window.map(w => ({
            name: w.business.name,
            date: w.business.filing_date,
            address: w.business.address,
          })),
          avgDaysBetweenFilings: Math.round(
            (window[window.length - 1].date - window[0].date) / (1000 * 60 * 60 * 24) / (window.length - 1)
          ),
        });

        // Skip processed entries
        i = filings.indexOf(window[window.length - 1]);
      }
    }
  });

  return patterns.sort((a, b) => b.count - a.count);
};

/**
 * Cross-reference with facility owners
 */
const crossReferenceWithFacilities = (businesses, facilities) => {
  const matches = [];

  // Build owner lookup
  const ownerMap = new Map();
  facilities.forEach(f => {
    const key = normalizeName(f.license_holder);
    if (key.length < 3) return;
    if (!ownerMap.has(key)) ownerMap.set(key, []);
    ownerMap.get(key).push(f);
  });

  // Build address lookup
  const addrMap = new Map();
  facilities.forEach(f => {
    const key = normalizeAddress(f.address);
    if (key.length < 5) return;
    if (!addrMap.has(key)) addrMap.set(key, []);
    addrMap.get(key).push(f);
  });

  businesses.forEach(b => {
    const linkedFacilities = [];
    const linkTypes = [];

    // Check business name vs facility owner
    const bizKey = normalizeName(b.name);
    if (ownerMap.has(bizKey)) {
      linkedFacilities.push(...ownerMap.get(bizKey));
      linkTypes.push('BUSINESS_NAME_MATCH');
    }

    // Check party name vs facility owner
    const partyKey = normalizeName(b.party_name);
    if (partyKey && ownerMap.has(partyKey)) {
      ownerMap.get(partyKey).forEach(f => {
        if (!linkedFacilities.find(lf => lf.license_number === f.license_number)) {
          linkedFacilities.push(f);
        }
      });
      linkTypes.push('PARTY_NAME_MATCH');
    }

    // Check address
    const addrKey = normalizeAddress(b.address);
    if (addrMap.has(addrKey)) {
      addrMap.get(addrKey).forEach(f => {
        if (!linkedFacilities.find(lf => lf.license_number === f.license_number)) {
          linkedFacilities.push(f);
        }
      });
      linkTypes.push('ADDRESS_MATCH');
    }

    if (linkedFacilities.length > 0) {
      matches.push({
        business: {
          name: b.name,
          file_number: b.file_number,
          party_name: b.party_name,
          address: b.address,
          city: b.city,
          filing_date: b.filing_date,
        },
        facilities: linkedFacilities.map(f => ({
          license_number: f.license_number,
          name: f.name,
          license_holder: f.license_holder,
          address: f.address,
          city: f.city,
          status: f.status,
        })),
        linkTypes: [...new Set(linkTypes)],
        facilityCount: linkedFacilities.length,
      });
    }
  });

  return matches;
};

/**
 * Calculate risk scores
 */
const calculateRiskScores = (businesses, agentPatterns, addressClusters, facilityMatches) => {
  const agentLookup = new Map(agentPatterns.map(a => [normalizeName(a.agent), a]));
  const addrLookup = new Map(addressClusters.map(a => [normalizeAddress(a.address), a]));
  const matchLookup = new Map(facilityMatches.map(m => [m.business.file_number, m]));

  return businesses.map(b => {
    let score = 0;
    const flags = [];

    // High-volume agent
    const agentData = agentLookup.get(normalizeName(b.party_name));
    if (agentData) {
      if (agentData.businessCount >= 20) {
        score += 50;
        flags.push({ type: 'VERY_HIGH_VOLUME_AGENT', value: agentData.businessCount });
      } else if (agentData.businessCount >= 10) {
        score += 35;
        flags.push({ type: 'HIGH_VOLUME_AGENT', value: agentData.businessCount });
      } else {
        score += 20;
        flags.push({ type: 'MULTI_BUSINESS_AGENT', value: agentData.businessCount });
      }

      if (agentData.isOutOfState) {
        score += 25;
        flags.push({ type: 'OUT_OF_STATE_AGENT', states: agentData.states });
      }
    }

    // Address clustering
    const addrData = addrLookup.get(normalizeAddress(b.address));
    if (addrData) {
      if (addrData.businessCount >= 20) {
        score += 45;
        flags.push({ type: 'VERY_HIGH_DENSITY_ADDRESS', value: addrData.businessCount });
      } else if (addrData.businessCount >= 10) {
        score += 30;
        flags.push({ type: 'HIGH_DENSITY_ADDRESS', value: addrData.businessCount });
      } else {
        score += 15;
        flags.push({ type: 'SHARED_ADDRESS', value: addrData.businessCount });
      }

      if (addrData.multipleAgents && addrData.agentCount >= 3) {
        score += 20;
        flags.push({ type: 'MULTIPLE_AGENTS_SAME_ADDRESS', value: addrData.agentCount });
      }
    }

    // Facility connection
    const matchData = matchLookup.get(b.file_number);
    if (matchData) {
      score += 25;
      flags.push({
        type: 'LINKED_TO_FACILITIES',
        facilityCount: matchData.facilityCount,
        linkTypes: matchData.linkTypes,
      });
    }

    // Recent formation
    if (b.filing_date) {
      const cutoff = new Date(THRESHOLDS.RECENT_FORMATION_CUTOFF);
      const filingDate = new Date(b.filing_date);
      if (filingDate >= cutoff) {
        score += 15;
        flags.push({ type: 'RECENT_FORMATION', date: b.filing_date });
      }
    }

    return {
      business: {
        name: b.name,
        file_number: b.file_number,
        party_name: b.party_name,
        address: b.address,
        city: b.city,
        filing_date: b.filing_date,
        filing_type: b.filing_type,
        status: b.status,
      },
      score,
      flags,
      riskLevel: score >= THRESHOLDS.HIGH_RISK_SCORE_THRESHOLD ? 'HIGH' :
                 score >= THRESHOLDS.MEDIUM_RISK_SCORE_THRESHOLD ? 'MEDIUM' : 'LOW',
      linkedFacilities: matchData?.facilities || [],
    };
  }).sort((a, b) => b.score - a.score);
};

/**
 * Generate human-readable report
 */
const generateReadableReport = (report) => {
  const lines = [];

  lines.push('='.repeat(80));
  lines.push('SHELL COMPANY DETECTION REPORT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('='.repeat(80));
  lines.push('');

  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(`Total businesses analyzed: ${report.summary.totalBusinesses.toLocaleString()}`);
  lines.push(`High-risk entities: ${report.summary.highRiskCount.toLocaleString()}`);
  lines.push(`Medium-risk entities: ${report.summary.mediumRiskCount.toLocaleString()}`);
  lines.push(`Linked to licensed facilities: ${report.summary.linkedToFacilities.toLocaleString()}`);
  lines.push(`High-volume agents identified: ${report.summary.highVolumeAgents.toLocaleString()}`);
  lines.push(`Suspicious address clusters: ${report.summary.suspiciousAddresses.toLocaleString()}`);
  lines.push(`Rapid formation patterns: ${report.summary.rapidFormationPatterns.toLocaleString()}`);
  lines.push('');

  lines.push('='.repeat(80));
  lines.push('TOP HIGH-VOLUME REGISTERED AGENTS');
  lines.push('(Agents controlling 5+ businesses - potential shell company networks)');
  lines.push('='.repeat(80));
  lines.push('');

  report.topAgents.slice(0, 20).forEach((agent, i) => {
    lines.push(`${i + 1}. ${agent.agent}`);
    lines.push(`   Businesses: ${agent.businessCount} | Addresses: ${agent.addressCount}`);
    if (agent.isOutOfState) lines.push(`   ⚠️  OUT OF STATE AGENT`);
    lines.push(`   Business Types: ${agent.filingTypes.join(', ')}`);
    lines.push('');
  });

  lines.push('='.repeat(80));
  lines.push('TOP SUSPICIOUS ADDRESS CLUSTERS');
  lines.push('(Addresses with 5+ businesses registered)');
  lines.push('='.repeat(80));
  lines.push('');

  report.topAddressClusters.slice(0, 20).forEach((cluster, i) => {
    lines.push(`${i + 1}. ${cluster.address}, ${cluster.city}`);
    lines.push(`   Businesses: ${cluster.businessCount} | Agents: ${cluster.agentCount}`);
    if (cluster.multipleAgents) lines.push(`   ⚠️  MULTIPLE AGENTS AT SAME ADDRESS`);
    lines.push('');
  });

  lines.push('='.repeat(80));
  lines.push('RAPID FORMATION PATTERNS');
  lines.push(`(Agents forming 3+ businesses within ${THRESHOLDS.RAPID_FORMATION_WINDOW_DAYS} days)`);
  lines.push('='.repeat(80));
  lines.push('');

  report.rapidFormationPatterns.slice(0, 15).forEach((pattern, i) => {
    lines.push(`${i + 1}. ${pattern.agent}`);
    lines.push(`   Formed ${pattern.count} businesses in ${pattern.daysSpan} days`);
    lines.push(`   Period: ${pattern.startDate} to ${pattern.endDate}`);
    lines.push(`   Businesses:`);
    pattern.businesses.slice(0, 5).forEach(b => {
      lines.push(`      - ${b.name} (${b.date})`);
    });
    if (pattern.businesses.length > 5) {
      lines.push(`      ... and ${pattern.businesses.length - 5} more`);
    }
    lines.push('');
  });

  lines.push('='.repeat(80));
  lines.push('HIGHEST RISK ENTITIES LINKED TO LICENSED FACILITIES');
  lines.push('='.repeat(80));
  lines.push('');

  const linkedHighRisk = report.riskScores
    .filter(r => r.linkedFacilities.length > 0 && r.riskLevel === 'HIGH')
    .slice(0, 25);

  linkedHighRisk.forEach((entity, i) => {
    lines.push(`${i + 1}. ${entity.business.name}`);
    lines.push(`   Risk Score: ${entity.score} (${entity.riskLevel})`);
    lines.push(`   File #: ${entity.business.file_number}`);
    lines.push(`   Filed: ${entity.business.filing_date}`);
    lines.push(`   Agent: ${entity.business.party_name}`);
    lines.push(`   Address: ${entity.business.address}, ${entity.business.city}`);
    lines.push(`   Risk Flags:`);
    entity.flags.forEach(f => {
      lines.push(`      - ${f.type}${f.value ? `: ${f.value}` : ''}`);
    });
    lines.push(`   Linked Facilities (${entity.linkedFacilities.length}):`);
    entity.linkedFacilities.slice(0, 3).forEach(f => {
      lines.push(`      - ${f.name} (${f.license_number}) - ${f.status}`);
    });
    if (entity.linkedFacilities.length > 3) {
      lines.push(`      ... and ${entity.linkedFacilities.length - 3} more`);
    }
    lines.push('');
  });

  lines.push('='.repeat(80));
  lines.push('END OF REPORT');
  lines.push('='.repeat(80));

  return lines.join('\n');
};

// ============================================================================
// Main
// ============================================================================

const main = async () => {
  console.log('\n=== Shell Company Detection Analysis ===\n');

  // Check for SOS data
  const sosDataPath = path.join(SOS_DATA_DIR, 'sos_businesses.json');
  if (!fs.existsSync(sosDataPath)) {
    console.log('SOS business data not found.');
    console.log('Run process-sos-business.js first to process the raw CSV data.\n');
    console.log('Usage:');
    console.log('  1. node scripts/process-sos-business.js <path-to-csv>');
    console.log('  2. node scripts/detect-shell-companies.js');
    process.exit(0);
  }

  // Load data
  console.log('Loading SOS business data...');
  const businesses = loadJSON(sosDataPath);
  console.log(`Loaded ${businesses.length.toLocaleString()} businesses`);

  console.log('Loading facility data...');
  const facilities = loadFacilityData();
  console.log(`Loaded ${facilities.length.toLocaleString()} facilities`);

  // Run analyses
  console.log('\nAnalyzing registered agent patterns...');
  const agentPatterns = analyzeAgentPatterns(businesses);
  console.log(`Found ${agentPatterns.length} high-volume agents`);

  console.log('Analyzing address clustering...');
  const addressClusters = analyzeAddressClustering(businesses);
  console.log(`Found ${addressClusters.length} suspicious address clusters`);

  console.log('Detecting rapid formation patterns...');
  const rapidPatterns = detectRapidFormation(businesses);
  console.log(`Found ${rapidPatterns.length} rapid formation patterns`);

  console.log('Cross-referencing with facility owners...');
  const facilityMatches = crossReferenceWithFacilities(businesses, facilities);
  console.log(`Found ${facilityMatches.length} businesses linked to facilities`);

  console.log('Calculating risk scores...');
  const riskScores = calculateRiskScores(businesses, agentPatterns, addressClusters, facilityMatches);

  // Generate report
  const highRisk = riskScores.filter(r => r.riskLevel === 'HIGH');
  const mediumRisk = riskScores.filter(r => r.riskLevel === 'MEDIUM');

  const report = {
    generatedAt: new Date().toISOString(),
    thresholds: THRESHOLDS,
    summary: {
      totalBusinesses: businesses.length,
      highRiskCount: highRisk.length,
      mediumRiskCount: mediumRisk.length,
      linkedToFacilities: facilityMatches.length,
      highVolumeAgents: agentPatterns.length,
      suspiciousAddresses: addressClusters.length,
      rapidFormationPatterns: rapidPatterns.length,
    },
    topAgents: agentPatterns.slice(0, 50),
    topAddressClusters: addressClusters.slice(0, 50),
    rapidFormationPatterns: rapidPatterns.slice(0, 50),
    facilityMatches: facilityMatches.slice(0, 100),
    riskScores: riskScores.slice(0, 500), // Top 500 by risk
  };

  // Write outputs
  console.log('\nWriting reports...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`  JSON report: ${OUTPUT_FILE}`);

  const readableReport = generateReadableReport(report);
  fs.writeFileSync(READABLE_REPORT, readableReport);
  console.log(`  Text report: ${READABLE_REPORT}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total businesses: ${businesses.length.toLocaleString()}`);
  console.log(`HIGH risk entities: ${highRisk.length.toLocaleString()}`);
  console.log(`MEDIUM risk entities: ${mediumRisk.length.toLocaleString()}`);
  console.log(`Linked to licensed facilities: ${facilityMatches.length.toLocaleString()}`);
  console.log('');
  console.log('Top 5 highest-risk entities linked to facilities:');
  riskScores
    .filter(r => r.linkedFacilities.length > 0)
    .slice(0, 5)
    .forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.business.name} (Score: ${r.score})`);
      console.log(`     Linked to ${r.linkedFacilities.length} facilities`);
    });
  console.log('');
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
