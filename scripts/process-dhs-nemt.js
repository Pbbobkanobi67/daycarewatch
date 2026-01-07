/**
 * Process DHS NEMT (Non-Emergency Medical Transportation) Provider Data
 *
 * Parses NEMT provider enrollment data from MN DHS and cross-references
 * with existing DaycareWatch data to identify:
 * - NEMT providers linked to daycare facility owners
 * - Shared addresses between NEMT and daycare operations
 * - Rapid enrollment patterns
 * - High-risk provider indicators
 *
 * Input: CSV/Excel from DHS MGDPA response
 * Output: JSON files for TransportWatch module
 *
 * Usage: node scripts/process-dhs-nemt.js <path-to-file>
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '../public/data/minnesota/nemt');
const FACILITY_DATA_DIR = path.join(__dirname, '../public/data/minnesota');
const SOS_DATA_DIR = path.join(__dirname, '../public/data/minnesota/sos');

// High-risk indicators for NEMT fraud
const HIGH_RISK_INDICATORS = {
  // Enrollment during fraud investigation period
  FRAUD_PERIOD_START: new Date('2020-01-01'),
  // Rapid growth threshold (billing increase)
  RAPID_GROWTH_THRESHOLD: 3.0, // 300% increase
  // Multiple vehicles threshold
  LARGE_FLEET_THRESHOLD: 10,
};

// ============================================================================
// Normalization Functions
// ============================================================================

const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(llc|inc|corp|corporation|company|co|limited|ltd|lp|llp|transport|transportation|medical|services|svc)\b/g, '')
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

const normalizeNPI = (npi) => {
  if (!npi) return '';
  return String(npi).replace(/\D/g, '').padStart(10, '0');
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
};

// ============================================================================
// CSV/Excel Parsing
// ============================================================================

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
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
 * Parse NEMT provider data
 * Expected columns (flexible mapping):
 * - Provider Name / Business Name / DBA
 * - NPI (National Provider Identifier)
 * - Provider ID / Enrollment ID
 * - Address, City, State, Zip
 * - Phone
 * - Enrollment Date / Effective Date
 * - Termination Date (if applicable)
 * - Status (Active, Terminated, etc.)
 * - Owner Name / Principal
 * - Vehicle Count (if available)
 * - Service Area / Counties
 */
const parseNEMTData = (filePath) => {
  console.log(`Reading NEMT data from: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('File appears empty or has no data rows');
  }

  // Parse header and create flexible column mapping
  const header = parseCSVLine(lines[0]).map(h =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
  );
  console.log('Columns found:', header.join(', '));

  // Flexible column mapping - try multiple possible column names
  const findColumn = (...names) => {
    for (const name of names) {
      const idx = header.findIndex(h => h.includes(name));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const colMap = {
    name: findColumn('provider_name', 'business_name', 'company_name', 'dba', 'name'),
    npi: findColumn('npi', 'national_provider'),
    provider_id: findColumn('provider_id', 'enrollment_id', 'mhcp_id', 'id'),
    address: findColumn('address', 'street', 'address_1', 'address1'),
    city: findColumn('city'),
    state: findColumn('state'),
    zip: findColumn('zip', 'postal'),
    phone: findColumn('phone', 'telephone'),
    enrollment_date: findColumn('enrollment_date', 'effective_date', 'start_date', 'enrolled'),
    termination_date: findColumn('termination_date', 'end_date', 'terminated'),
    status: findColumn('status', 'enrollment_status'),
    owner: findColumn('owner', 'principal', 'contact', 'authorized_official'),
    vehicle_count: findColumn('vehicle', 'fleet'),
    counties: findColumn('county', 'counties', 'service_area'),
    payments: findColumn('payment', 'paid', 'amount', 'total'),
  };

  console.log('Column mapping:', JSON.stringify(colMap, null, 2));

  // Parse data rows
  const providers = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 3) continue;

    const getValue = (col) => col >= 0 && col < values.length ? values[col] : null;

    const provider = {
      name: getValue(colMap.name),
      npi: normalizeNPI(getValue(colMap.npi)),
      provider_id: getValue(colMap.provider_id),
      address: getValue(colMap.address),
      city: getValue(colMap.city),
      state: getValue(colMap.state) || 'MN',
      zip: getValue(colMap.zip),
      phone: getValue(colMap.phone),
      enrollment_date: getValue(colMap.enrollment_date),
      termination_date: getValue(colMap.termination_date),
      status: getValue(colMap.status),
      owner: getValue(colMap.owner),
      vehicle_count: parseInt(getValue(colMap.vehicle_count)) || null,
      counties: getValue(colMap.counties),
      total_payments: parseFloat(String(getValue(colMap.payments)).replace(/[$,]/g, '')) || null,
      // Normalized fields for matching
      normalized_name: null,
      normalized_address: null,
      normalized_owner: null,
    };

    // Add normalized fields
    provider.normalized_name = normalizeName(provider.name);
    provider.normalized_address = normalizeAddress(provider.address);
    provider.normalized_owner = normalizeName(provider.owner);

    // Parse dates
    if (provider.enrollment_date) {
      try {
        provider.enrollment_date_parsed = new Date(provider.enrollment_date);
      } catch {
        provider.enrollment_date_parsed = null;
      }
    }

    providers.push(provider);
  }

  console.log(`Parsed ${providers.length} NEMT provider records`);
  return providers;
};

// ============================================================================
// Data Loading
// ============================================================================

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

  return facilities.map(f => ({
    ...f,
    normalized_name: normalizeName(f.name),
    normalized_address: normalizeAddress(f.address),
    normalized_owner: normalizeName(f.license_holder),
  }));
};

const loadSOSData = () => {
  const sosPath = path.join(SOS_DATA_DIR, 'sos_businesses.json');
  if (fs.existsSync(sosPath)) {
    try {
      return JSON.parse(fs.readFileSync(sosPath, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
};

// ============================================================================
// Cross-Reference Analysis
// ============================================================================

/**
 * Find NEMT providers linked to daycare facility owners
 */
const crossReferenceWithDaycare = (providers, facilities) => {
  const matches = [];

  // Build owner and address lookups
  const ownerMap = new Map();
  const addressMap = new Map();

  facilities.forEach(f => {
    if (f.normalized_owner && f.normalized_owner.length > 3) {
      if (!ownerMap.has(f.normalized_owner)) {
        ownerMap.set(f.normalized_owner, []);
      }
      ownerMap.get(f.normalized_owner).push(f);
    }

    if (f.normalized_address && f.normalized_address.length > 5) {
      if (!addressMap.has(f.normalized_address)) {
        addressMap.set(f.normalized_address, []);
      }
      addressMap.get(f.normalized_address).push(f);
    }
  });

  providers.forEach(provider => {
    const linkedFacilities = [];
    const linkTypes = [];

    // Match provider name to facility owner
    if (provider.normalized_name && ownerMap.has(provider.normalized_name)) {
      linkedFacilities.push(...ownerMap.get(provider.normalized_name));
      linkTypes.push('PROVIDER_NAME_MATCHES_OWNER');
    }

    // Match provider owner to facility owner
    if (provider.normalized_owner && ownerMap.has(provider.normalized_owner)) {
      const ownerMatches = ownerMap.get(provider.normalized_owner);
      ownerMatches.forEach(f => {
        if (!linkedFacilities.find(lf => lf.license_number === f.license_number)) {
          linkedFacilities.push(f);
        }
      });
      linkTypes.push('OWNER_MATCH');
    }

    // Match address
    if (provider.normalized_address && addressMap.has(provider.normalized_address)) {
      const addrMatches = addressMap.get(provider.normalized_address);
      addrMatches.forEach(f => {
        if (!linkedFacilities.find(lf => lf.license_number === f.license_number)) {
          linkedFacilities.push(f);
        }
      });
      linkTypes.push('ADDRESS_MATCH');
    }

    if (linkedFacilities.length > 0) {
      matches.push({
        provider: {
          name: provider.name,
          npi: provider.npi,
          provider_id: provider.provider_id,
          owner: provider.owner,
          address: provider.address,
          city: provider.city,
          status: provider.status,
          enrollment_date: provider.enrollment_date,
          total_payments: provider.total_payments,
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

  return matches.sort((a, b) => b.facilityCount - a.facilityCount);
};

/**
 * Find NEMT providers linked to SOS business entities
 */
const crossReferenceWithSOS = (providers, businesses) => {
  if (!businesses || businesses.length === 0) return [];

  const matches = [];

  // Build lookups
  const bizNameMap = new Map();
  const bizAddrMap = new Map();

  businesses.forEach(b => {
    const normName = normalizeName(b.name);
    if (normName.length > 3) {
      if (!bizNameMap.has(normName)) bizNameMap.set(normName, []);
      bizNameMap.get(normName).push(b);
    }

    const normAddr = normalizeAddress(b.address);
    if (normAddr.length > 5) {
      if (!bizAddrMap.has(normAddr)) bizAddrMap.set(normAddr, []);
      bizAddrMap.get(normAddr).push(b);
    }
  });

  providers.forEach(provider => {
    const linkedBusinesses = [];
    const linkTypes = [];

    // Match by name
    if (provider.normalized_name && bizNameMap.has(provider.normalized_name)) {
      linkedBusinesses.push(...bizNameMap.get(provider.normalized_name));
      linkTypes.push('NAME_MATCH');
    }

    // Match by address
    if (provider.normalized_address && bizAddrMap.has(provider.normalized_address)) {
      bizAddrMap.get(provider.normalized_address).forEach(b => {
        if (!linkedBusinesses.find(lb => lb.file_number === b.file_number)) {
          linkedBusinesses.push(b);
        }
      });
      linkTypes.push('ADDRESS_MATCH');
    }

    if (linkedBusinesses.length > 0) {
      matches.push({
        provider: {
          name: provider.name,
          npi: provider.npi,
          address: provider.address,
          city: provider.city,
        },
        businesses: linkedBusinesses.map(b => ({
          name: b.name,
          file_number: b.file_number,
          filing_date: b.filing_date,
          party_name: b.party_name,
          address: b.address,
        })),
        linkTypes,
        businessCount: linkedBusinesses.length,
      });
    }
  });

  return matches;
};

// ============================================================================
// Risk Analysis
// ============================================================================

/**
 * Analyze enrollment patterns for fraud indicators
 */
const analyzeEnrollmentPatterns = (providers) => {
  // Group by month
  const monthlyEnrollments = {};

  providers.forEach(p => {
    if (!p.enrollment_date_parsed) return;

    const month = p.enrollment_date_parsed.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyEnrollments[month]) {
      monthlyEnrollments[month] = [];
    }
    monthlyEnrollments[month].push(p);
  });

  // Find months with unusually high enrollments
  const counts = Object.values(monthlyEnrollments).map(m => m.length);
  const avgEnrollments = counts.reduce((a, b) => a + b, 0) / counts.length || 1;
  const threshold = avgEnrollments * 2;

  const spikes = Object.entries(monthlyEnrollments)
    .filter(([_, providers]) => providers.length > threshold)
    .map(([month, providers]) => ({
      month,
      count: providers.length,
      ratio: (providers.length / avgEnrollments).toFixed(2),
      providers: providers.map(p => ({
        name: p.name,
        enrollment_date: p.enrollment_date,
      })),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    monthlyEnrollments: Object.fromEntries(
      Object.entries(monthlyEnrollments).map(([m, p]) => [m, p.length])
    ),
    averagePerMonth: avgEnrollments.toFixed(1),
    enrollmentSpikes: spikes,
  };
};

/**
 * Identify high-volume operators
 */
const identifyHighVolumeOperators = (providers) => {
  const ownerMap = new Map();

  providers.forEach(p => {
    const owner = p.normalized_owner || p.normalized_name;
    if (!owner || owner.length < 3) return;

    if (!ownerMap.has(owner)) {
      ownerMap.set(owner, {
        owner: p.owner || p.name,
        providers: [],
        totalPayments: 0,
        addresses: new Set(),
      });
    }

    const entry = ownerMap.get(owner);
    entry.providers.push(p);
    entry.totalPayments += p.total_payments || 0;
    if (p.address) entry.addresses.add(p.address);
  });

  return Array.from(ownerMap.values())
    .filter(o => o.providers.length >= 2)
    .map(o => ({
      ...o,
      addresses: [...o.addresses],
      providerCount: o.providers.length,
      addressCount: o.addresses.size,
    }))
    .sort((a, b) => b.providerCount - a.providerCount);
};

/**
 * Calculate risk score for each provider
 */
const calculateRiskScores = (providers, daycareMatches, sosMatches) => {
  // Build lookup maps
  const daycareLinked = new Set(
    daycareMatches.map(m => m.provider.npi || m.provider.provider_id)
  );
  const sosLinked = new Set(
    sosMatches.map(m => m.provider.npi || m.provider.provider_id)
  );

  return providers.map(provider => {
    let score = 0;
    const flags = [];
    const id = provider.npi || provider.provider_id;

    // Linked to daycare facilities
    if (daycareLinked.has(id)) {
      score += 40;
      flags.push({ type: 'LINKED_TO_DAYCARE', severity: 'high' });
    }

    // Linked to SOS business entities
    if (sosLinked.has(id)) {
      score += 20;
      flags.push({ type: 'SOS_BUSINESS_LINK', severity: 'medium' });
    }

    // Enrolled during fraud investigation period
    if (provider.enrollment_date_parsed &&
        provider.enrollment_date_parsed >= HIGH_RISK_INDICATORS.FRAUD_PERIOD_START) {
      score += 15;
      flags.push({
        type: 'FRAUD_PERIOD_ENROLLMENT',
        severity: 'medium',
        date: provider.enrollment_date,
      });
    }

    // High payment volume
    if (provider.total_payments > 1000000) {
      score += 30;
      flags.push({
        type: 'HIGH_PAYMENT_VOLUME',
        severity: 'high',
        amount: provider.total_payments,
      });
    } else if (provider.total_payments > 500000) {
      score += 20;
      flags.push({
        type: 'ELEVATED_PAYMENTS',
        severity: 'medium',
        amount: provider.total_payments,
      });
    }

    // Large fleet
    if (provider.vehicle_count >= HIGH_RISK_INDICATORS.LARGE_FLEET_THRESHOLD) {
      score += 15;
      flags.push({
        type: 'LARGE_FLEET',
        severity: 'medium',
        count: provider.vehicle_count,
      });
    }

    // Terminated status
    if (provider.status && provider.status.toLowerCase().includes('terminat')) {
      score += 25;
      flags.push({ type: 'TERMINATED', severity: 'high' });
    }

    return {
      provider: {
        name: provider.name,
        npi: provider.npi,
        provider_id: provider.provider_id,
        owner: provider.owner,
        address: provider.address,
        city: provider.city,
        status: provider.status,
        enrollment_date: provider.enrollment_date,
        total_payments: provider.total_payments,
        vehicle_count: provider.vehicle_count,
      },
      score,
      flags,
      riskLevel: score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW',
    };
  }).sort((a, b) => b.score - a.score);
};

// ============================================================================
// Main Processing
// ============================================================================

const main = async () => {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log(`
DHS NEMT Provider Data Processor
=================================

Usage: node scripts/process-dhs-nemt.js <path-to-file>

This script processes NEMT provider enrollment data from MN DHS
and cross-references it with DaycareWatch facility data.

Expected input: CSV file from DHS MGDPA response

Expected columns (flexible matching):
  - Provider Name / Business Name / DBA
  - NPI (National Provider Identifier)
  - Provider ID / Enrollment ID
  - Address, City, State, Zip
  - Phone
  - Enrollment Date / Effective Date
  - Termination Date
  - Status
  - Owner Name / Principal
  - Vehicle Count
  - Counties / Service Area
  - Payment amounts (if available)

Output files (in public/data/minnesota/nemt/):
  - nemt_providers.json (all parsed providers)
  - daycare_crossref.json (NEMT-daycare ownership links)
  - sos_crossref.json (NEMT-business entity links)
  - enrollment_analysis.json (enrollment pattern analysis)
  - high_volume_operators.json (operators with multiple NPIs)
  - risk_scores.json (risk-scored provider list)
  - summary.json (analysis summary)
`);
    process.exit(0);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n=== DHS NEMT Provider Data Processor ===\n');

  // Parse NEMT data
  console.log('Step 1: Parsing NEMT provider data...');
  const providers = parseNEMTData(filePath);

  // Load cross-reference data
  console.log('\nStep 2: Loading cross-reference data...');
  const facilities = loadFacilityData();
  console.log(`  Loaded ${facilities.length} daycare facilities`);
  const businesses = loadSOSData();
  console.log(`  Loaded ${businesses.length} SOS business records`);

  // Cross-reference analysis
  console.log('\nStep 3: Cross-referencing with daycare facilities...');
  const daycareMatches = crossReferenceWithDaycare(providers, facilities);
  console.log(`  Found ${daycareMatches.length} NEMT providers linked to daycare`);

  console.log('\nStep 4: Cross-referencing with SOS business data...');
  const sosMatches = crossReferenceWithSOS(providers, businesses);
  console.log(`  Found ${sosMatches.length} NEMT providers linked to SOS entities`);

  // Pattern analysis
  console.log('\nStep 5: Analyzing enrollment patterns...');
  const enrollmentAnalysis = analyzeEnrollmentPatterns(providers);
  console.log(`  Found ${enrollmentAnalysis.enrollmentSpikes.length} enrollment spikes`);

  console.log('\nStep 6: Identifying high-volume operators...');
  const highVolumeOperators = identifyHighVolumeOperators(providers);
  console.log(`  Found ${highVolumeOperators.length} operators with multiple registrations`);

  // Risk scoring
  console.log('\nStep 7: Calculating risk scores...');
  const riskScores = calculateRiskScores(providers, daycareMatches, sosMatches);
  const highRisk = riskScores.filter(r => r.riskLevel === 'HIGH');
  const mediumRisk = riskScores.filter(r => r.riskLevel === 'MEDIUM');

  // Generate summary
  const summary = {
    processedAt: new Date().toISOString(),
    sourceFile: path.basename(filePath),
    totalProviders: providers.length,
    activeProviders: providers.filter(p =>
      !p.status || !p.status.toLowerCase().includes('terminat')
    ).length,
    terminatedProviders: providers.filter(p =>
      p.status && p.status.toLowerCase().includes('terminat')
    ).length,
    crossReference: {
      linkedToDaycare: daycareMatches.length,
      linkedToSOSEntities: sosMatches.length,
      highVolumeOperators: highVolumeOperators.length,
    },
    riskAnalysis: {
      highRisk: highRisk.length,
      mediumRisk: mediumRisk.length,
      lowRisk: riskScores.length - highRisk.length - mediumRisk.length,
    },
    enrollmentSpikes: enrollmentAnalysis.enrollmentSpikes.length,
    totalPaymentsRecorded: providers
      .filter(p => p.total_payments)
      .reduce((sum, p) => sum + p.total_payments, 0),
  };

  // Write output files
  console.log('\nStep 8: Writing output files...');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'nemt_providers.json'),
    JSON.stringify(providers, null, 2)
  );
  console.log(`  nemt_providers.json: ${providers.length} records`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'daycare_crossref.json'),
    JSON.stringify(daycareMatches, null, 2)
  );
  console.log(`  daycare_crossref.json: ${daycareMatches.length} matches`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'sos_crossref.json'),
    JSON.stringify(sosMatches, null, 2)
  );
  console.log(`  sos_crossref.json: ${sosMatches.length} matches`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'enrollment_analysis.json'),
    JSON.stringify(enrollmentAnalysis, null, 2)
  );
  console.log(`  enrollment_analysis.json`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'high_volume_operators.json'),
    JSON.stringify(highVolumeOperators, null, 2)
  );
  console.log(`  high_volume_operators.json: ${highVolumeOperators.length} operators`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'risk_scores.json'),
    JSON.stringify(riskScores, null, 2)
  );
  console.log(`  risk_scores.json: ${riskScores.length} scored providers`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  console.log(`  summary.json`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total NEMT providers: ${providers.length}`);
  console.log(`Linked to daycare facilities: ${daycareMatches.length}`);
  console.log(`HIGH risk: ${highRisk.length}`);
  console.log(`MEDIUM risk: ${mediumRisk.length}`);

  if (daycareMatches.length > 0) {
    console.log('\nTop NEMT-Daycare connections:');
    daycareMatches.slice(0, 5).forEach((match, i) => {
      console.log(`  ${i + 1}. ${match.provider.name}`);
      console.log(`     Linked to ${match.facilityCount} daycare facilities`);
      console.log(`     Via: ${match.linkTypes.join(', ')}`);
    });
  }

  console.log(`\nOutput written to: ${OUTPUT_DIR}`);
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
