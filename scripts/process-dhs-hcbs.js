/**
 * Process DHS HCBS/Waiver Provider Data
 *
 * Parses provider data for the 13 high-risk Medicaid programs:
 * 1. Housing Stabilization Services (HSS) - TERMINATED
 * 2. Early Intensive Developmental and Behavioral Intervention (EIDBI)
 * 3. Personal Care Assistance (PCA) / CFSS
 * 4. Adult Day Services
 * 5. Adult Rehabilitative Mental Health Services (ARMHS)
 * 6. Integrated Community Supports (ICS)
 * 7. Individualized Home Supports
 * 8. Recovery Peer Support
 * 9. Assertive Community Treatment (ACT)
 * 10. Intensive Residential Treatment Services (IRTS)
 * 11. Adult Companion Services
 * 12. Night Supervision Services
 * 13. Recuperative Care
 *
 * Cross-references with daycare, NEMT, and SOS data to identify
 * fraud networks operating across multiple programs.
 *
 * Usage: node scripts/process-dhs-hcbs.js <path-to-file>
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '../public/data/minnesota/hcbs');
const FACILITY_DATA_DIR = path.join(__dirname, '../public/data/minnesota');
const SOS_DATA_DIR = path.join(__dirname, '../public/data/minnesota/sos');
const NEMT_DATA_DIR = path.join(__dirname, '../public/data/minnesota/nemt');

// The 13 high-risk programs (from federal investigation)
const HIGH_RISK_PROGRAMS = {
  HSS: {
    name: 'Housing Stabilization Services',
    keywords: ['housing', 'stabilization', 'hss'],
    status: 'TERMINATED',
    notes: 'Program terminated due to widespread fraud',
  },
  EIDBI: {
    name: 'Early Intensive Developmental and Behavioral Intervention',
    keywords: ['eidbi', 'early intensive', 'developmental', 'behavioral intervention', 'autism'],
    status: 'UNDER_REVIEW',
    notes: 'High-risk for billing fraud targeting autism services',
  },
  PCA: {
    name: 'Personal Care Assistance / CFSS',
    keywords: ['pca', 'personal care', 'cfss', 'community first'],
    status: 'UNDER_REVIEW',
    notes: 'Largest HCBS program, significant fraud exposure',
  },
  ADULT_DAY: {
    name: 'Adult Day Services',
    keywords: ['adult day', 'day services', 'day program'],
    status: 'UNDER_REVIEW',
    notes: 'Similar fraud patterns to childcare',
  },
  ARMHS: {
    name: 'Adult Rehabilitative Mental Health Services',
    keywords: ['armhs', 'rehabilitative mental health', 'mental health rehab'],
    status: 'UNDER_REVIEW',
    notes: 'High billing volume, documentation fraud risk',
  },
  ICS: {
    name: 'Integrated Community Supports',
    keywords: ['ics', 'integrated community', 'community supports'],
    status: 'UNDER_REVIEW',
    notes: '37x growth (2021-2024), extreme fraud indicator',
  },
  IHS: {
    name: 'Individualized Home Supports',
    keywords: ['individualized home', 'home supports', 'ihs'],
    status: 'UNDER_REVIEW',
  },
  PEER: {
    name: 'Recovery Peer Support',
    keywords: ['peer support', 'recovery peer', 'peer specialist'],
    status: 'UNDER_REVIEW',
  },
  ACT: {
    name: 'Assertive Community Treatment',
    keywords: ['act', 'assertive community', 'community treatment'],
    status: 'UNDER_REVIEW',
  },
  IRTS: {
    name: 'Intensive Residential Treatment Services',
    keywords: ['irts', 'intensive residential', 'residential treatment'],
    status: 'UNDER_REVIEW',
  },
  COMPANION: {
    name: 'Adult Companion Services',
    keywords: ['companion', 'adult companion'],
    status: 'UNDER_REVIEW',
  },
  NIGHT: {
    name: 'Night Supervision Services',
    keywords: ['night supervision', 'overnight'],
    status: 'UNDER_REVIEW',
  },
  RECUP: {
    name: 'Recuperative Care',
    keywords: ['recuperative', 'recup care'],
    status: 'UNDER_REVIEW',
  },
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
    .replace(/\b(llc|inc|corp|corporation|company|co|limited|ltd|lp|llp|services|svc|healthcare|health|care|home|community)\b/g, '')
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

// ============================================================================
// CSV Parsing
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
 * Detect which high-risk program a provider belongs to
 */
const detectProgram = (providerType, serviceCodes, providerName) => {
  const searchText = [
    providerType,
    serviceCodes,
    providerName,
  ].filter(Boolean).join(' ').toLowerCase();

  for (const [code, program] of Object.entries(HIGH_RISK_PROGRAMS)) {
    if (program.keywords.some(kw => searchText.includes(kw))) {
      return { code, ...program };
    }
  }

  return null;
};

/**
 * Parse HCBS provider data
 * Expected columns:
 * - Provider Name / Business Name
 * - NPI
 * - Provider ID / Enrollment ID
 * - Provider Type / Service Type
 * - Service Codes (if available)
 * - Address, City, State, Zip
 * - Enrollment Date
 * - Termination Date
 * - Status
 * - Owner / Principal
 * - Payment data (if available)
 */
const parseHCBSData = (filePath) => {
  console.log(`Reading HCBS data from: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('File appears empty or has no data rows');
  }

  const header = parseCSVLine(lines[0]).map(h =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
  );
  console.log('Columns found:', header.join(', '));

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
    provider_type: findColumn('provider_type', 'service_type', 'specialty', 'category'),
    service_codes: findColumn('service_code', 'procedure_code', 'hcpcs'),
    address: findColumn('address', 'street', 'address_1'),
    city: findColumn('city'),
    state: findColumn('state'),
    zip: findColumn('zip', 'postal'),
    phone: findColumn('phone', 'telephone'),
    enrollment_date: findColumn('enrollment_date', 'effective_date', 'start_date'),
    termination_date: findColumn('termination_date', 'end_date'),
    status: findColumn('status', 'enrollment_status'),
    owner: findColumn('owner', 'principal', 'authorized_official'),
    payments_2021: findColumn('2021', 'payment_2021', 'paid_2021'),
    payments_2022: findColumn('2022', 'payment_2022', 'paid_2022'),
    payments_2023: findColumn('2023', 'payment_2023', 'paid_2023'),
    payments_2024: findColumn('2024', 'payment_2024', 'paid_2024'),
    total_payments: findColumn('total', 'total_paid', 'total_payment'),
  };

  console.log('Column mapping:', JSON.stringify(colMap, null, 2));

  const providers = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 3) continue;

    const getValue = (col) => col >= 0 && col < values.length ? values[col] : null;
    const parseAmount = (val) => {
      if (!val) return null;
      return parseFloat(String(val).replace(/[$,]/g, '')) || null;
    };

    const providerType = getValue(colMap.provider_type);
    const serviceCodes = getValue(colMap.service_codes);
    const providerName = getValue(colMap.name);

    const provider = {
      name: providerName,
      npi: normalizeNPI(getValue(colMap.npi)),
      provider_id: getValue(colMap.provider_id),
      provider_type: providerType,
      service_codes: serviceCodes,
      address: getValue(colMap.address),
      city: getValue(colMap.city),
      state: getValue(colMap.state) || 'MN',
      zip: getValue(colMap.zip),
      phone: getValue(colMap.phone),
      enrollment_date: getValue(colMap.enrollment_date),
      termination_date: getValue(colMap.termination_date),
      status: getValue(colMap.status),
      owner: getValue(colMap.owner),
      payments_2021: parseAmount(getValue(colMap.payments_2021)),
      payments_2022: parseAmount(getValue(colMap.payments_2022)),
      payments_2023: parseAmount(getValue(colMap.payments_2023)),
      payments_2024: parseAmount(getValue(colMap.payments_2024)),
      total_payments: parseAmount(getValue(colMap.total_payments)),
      // Detected program
      detected_program: detectProgram(providerType, serviceCodes, providerName),
      // Normalized fields
      normalized_name: normalizeName(providerName),
      normalized_address: normalizeAddress(getValue(colMap.address)),
      normalized_owner: normalizeName(getValue(colMap.owner)),
    };

    // Calculate payment growth if yearly data available
    if (provider.payments_2021 && provider.payments_2024) {
      provider.payment_growth = (
        (provider.payments_2024 - provider.payments_2021) / provider.payments_2021
      ).toFixed(2);
    } else if (provider.payments_2022 && provider.payments_2024) {
      provider.payment_growth = (
        (provider.payments_2024 - provider.payments_2022) / provider.payments_2022
      ).toFixed(2);
    }

    providers.push(provider);
  }

  console.log(`Parsed ${providers.length} HCBS provider records`);
  return providers;
};

// ============================================================================
// Data Loading
// ============================================================================

const loadJSON = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // Ignore
  }
  return [];
};

const loadFacilityData = () => {
  const facilities = [];
  const files = fs.readdirSync(FACILITY_DATA_DIR)
    .filter(f => f.endsWith('_facilities.json') && !f.includes('summary'));

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(FACILITY_DATA_DIR, file), 'utf8'));
      facilities.push(...data);
    } catch {
      // Skip
    }
  }

  return facilities.map(f => ({
    ...f,
    normalized_name: normalizeName(f.name),
    normalized_address: normalizeAddress(f.address),
    normalized_owner: normalizeName(f.license_holder),
  }));
};

// ============================================================================
// Cross-Reference Analysis
// ============================================================================

const crossReferenceAll = (providers, facilities, sosBusinesses, nemtProviders) => {
  const results = {
    daycare: [],
    sos: [],
    nemt: [],
  };

  // Build lookup maps
  const buildLookups = (items, nameField, addressField, ownerField) => {
    const nameMap = new Map();
    const addrMap = new Map();
    const ownerMap = new Map();

    items.forEach(item => {
      const name = normalizeName(item[nameField]);
      const addr = normalizeAddress(item[addressField]);
      const owner = normalizeName(item[ownerField]);

      if (name && name.length > 3) {
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name).push(item);
      }
      if (addr && addr.length > 5) {
        if (!addrMap.has(addr)) addrMap.set(addr, []);
        addrMap.get(addr).push(item);
      }
      if (owner && owner.length > 3) {
        if (!ownerMap.has(owner)) ownerMap.set(owner, []);
        ownerMap.get(owner).push(item);
      }
    });

    return { nameMap, addrMap, ownerMap };
  };

  const facilityLookups = buildLookups(facilities, 'name', 'address', 'license_holder');
  const sosLookups = sosBusinesses.length > 0 ?
    buildLookups(sosBusinesses, 'name', 'address', 'party_name') : null;
  const nemtLookups = nemtProviders.length > 0 ?
    buildLookups(nemtProviders, 'name', 'address', 'owner') : null;

  // Cross-reference each HCBS provider
  providers.forEach(provider => {
    // Daycare cross-reference
    const daycareMatches = [];
    const daycareTypes = [];

    if (facilityLookups.ownerMap.has(provider.normalized_name)) {
      daycareMatches.push(...facilityLookups.ownerMap.get(provider.normalized_name));
      daycareTypes.push('NAME_AS_OWNER');
    }
    if (provider.normalized_owner && facilityLookups.ownerMap.has(provider.normalized_owner)) {
      facilityLookups.ownerMap.get(provider.normalized_owner).forEach(f => {
        if (!daycareMatches.find(m => m.license_number === f.license_number)) {
          daycareMatches.push(f);
        }
      });
      daycareTypes.push('OWNER_MATCH');
    }
    if (facilityLookups.addrMap.has(provider.normalized_address)) {
      facilityLookups.addrMap.get(provider.normalized_address).forEach(f => {
        if (!daycareMatches.find(m => m.license_number === f.license_number)) {
          daycareMatches.push(f);
        }
      });
      daycareTypes.push('ADDRESS_MATCH');
    }

    if (daycareMatches.length > 0) {
      results.daycare.push({
        provider: {
          name: provider.name,
          npi: provider.npi,
          provider_type: provider.provider_type,
          detected_program: provider.detected_program?.name,
          address: provider.address,
          city: provider.city,
          total_payments: provider.total_payments,
        },
        matches: daycareMatches.map(f => ({
          license_number: f.license_number,
          name: f.name,
          license_holder: f.license_holder,
          address: f.address,
          status: f.status,
        })),
        matchTypes: [...new Set(daycareTypes)],
        matchCount: daycareMatches.length,
      });
    }

    // SOS cross-reference
    if (sosLookups) {
      const sosMatches = [];
      const sosTypes = [];

      if (sosLookups.nameMap.has(provider.normalized_name)) {
        sosMatches.push(...sosLookups.nameMap.get(provider.normalized_name));
        sosTypes.push('NAME_MATCH');
      }
      if (sosLookups.addrMap.has(provider.normalized_address)) {
        sosLookups.addrMap.get(provider.normalized_address).forEach(b => {
          if (!sosMatches.find(m => m.file_number === b.file_number)) {
            sosMatches.push(b);
          }
        });
        sosTypes.push('ADDRESS_MATCH');
      }

      if (sosMatches.length > 0) {
        results.sos.push({
          provider: {
            name: provider.name,
            npi: provider.npi,
            detected_program: provider.detected_program?.name,
          },
          matches: sosMatches.map(b => ({
            name: b.name,
            file_number: b.file_number,
            party_name: b.party_name,
            filing_date: b.filing_date,
          })),
          matchTypes: sosTypes,
          matchCount: sosMatches.length,
        });
      }
    }

    // NEMT cross-reference
    if (nemtLookups) {
      const nemtMatches = [];
      const nemtTypes = [];

      if (nemtLookups.ownerMap.has(provider.normalized_name)) {
        nemtMatches.push(...nemtLookups.ownerMap.get(provider.normalized_name));
        nemtTypes.push('NAME_AS_OWNER');
      }
      if (provider.normalized_owner && nemtLookups.ownerMap.has(provider.normalized_owner)) {
        nemtLookups.ownerMap.get(provider.normalized_owner).forEach(n => {
          if (!nemtMatches.find(m => m.npi === n.npi)) {
            nemtMatches.push(n);
          }
        });
        nemtTypes.push('OWNER_MATCH');
      }
      if (nemtLookups.addrMap.has(provider.normalized_address)) {
        nemtLookups.addrMap.get(provider.normalized_address).forEach(n => {
          if (!nemtMatches.find(m => m.npi === n.npi)) {
            nemtMatches.push(n);
          }
        });
        nemtTypes.push('ADDRESS_MATCH');
      }

      if (nemtMatches.length > 0) {
        results.nemt.push({
          provider: {
            name: provider.name,
            npi: provider.npi,
            detected_program: provider.detected_program?.name,
          },
          matches: nemtMatches.map(n => ({
            name: n.name,
            npi: n.npi,
            address: n.address,
          })),
          matchTypes: nemtTypes,
          matchCount: nemtMatches.length,
        });
      }
    }
  });

  return results;
};

// ============================================================================
// Risk Analysis
// ============================================================================

/**
 * Analyze payment growth patterns (ICS grew 37x, major fraud indicator)
 */
const analyzePaymentGrowth = (providers) => {
  const rapidGrowth = providers
    .filter(p => p.payment_growth && parseFloat(p.payment_growth) >= 2.0)
    .map(p => ({
      name: p.name,
      npi: p.npi,
      provider_type: p.provider_type,
      detected_program: p.detected_program?.name,
      growth_rate: parseFloat(p.payment_growth),
      payments_2021: p.payments_2021,
      payments_2022: p.payments_2022,
      payments_2023: p.payments_2023,
      payments_2024: p.payments_2024,
      total_payments: p.total_payments,
    }))
    .sort((a, b) => b.growth_rate - a.growth_rate);

  return rapidGrowth;
};

/**
 * Group providers by program type
 */
const groupByProgram = (providers) => {
  const groups = {};

  Object.keys(HIGH_RISK_PROGRAMS).forEach(code => {
    groups[code] = {
      ...HIGH_RISK_PROGRAMS[code],
      providers: [],
      totalPayments: 0,
      providerCount: 0,
    };
  });

  groups.UNKNOWN = {
    name: 'Unknown/Other',
    providers: [],
    totalPayments: 0,
    providerCount: 0,
  };

  providers.forEach(p => {
    const programCode = p.detected_program?.code || 'UNKNOWN';
    if (!groups[programCode]) {
      groups[programCode] = {
        name: programCode,
        providers: [],
        totalPayments: 0,
        providerCount: 0,
      };
    }

    groups[programCode].providers.push({
      name: p.name,
      npi: p.npi,
      status: p.status,
      total_payments: p.total_payments,
    });
    groups[programCode].totalPayments += p.total_payments || 0;
    groups[programCode].providerCount++;
  });

  return groups;
};

/**
 * Calculate risk scores
 */
const calculateRiskScores = (providers, crossRef) => {
  // Build lookup sets
  const daycareLinked = new Set(crossRef.daycare.map(m => m.provider.npi));
  const sosLinked = new Set(crossRef.sos.map(m => m.provider.npi));
  const nemtLinked = new Set(crossRef.nemt.map(m => m.provider.npi));

  return providers.map(provider => {
    let score = 0;
    const flags = [];

    // Cross-program links (major red flags)
    const crossProgramCount = [
      daycareLinked.has(provider.npi),
      nemtLinked.has(provider.npi),
    ].filter(Boolean).length;

    if (crossProgramCount >= 2) {
      score += 60;
      flags.push({
        type: 'MULTI_PROGRAM_FRAUD_NETWORK',
        severity: 'critical',
        message: 'Owner operates HCBS + NEMT + Daycare',
      });
    } else if (daycareLinked.has(provider.npi)) {
      score += 40;
      flags.push({
        type: 'DAYCARE_LINK',
        severity: 'high',
        message: 'Owner also operates daycare facilities',
      });
    }

    if (nemtLinked.has(provider.npi)) {
      score += 35;
      flags.push({
        type: 'NEMT_LINK',
        severity: 'high',
        message: 'Owner also operates NEMT services',
      });
    }

    if (sosLinked.has(provider.npi)) {
      score += 15;
      flags.push({
        type: 'SOS_ENTITY_LINK',
        severity: 'medium',
      });
    }

    // High-risk program
    if (provider.detected_program) {
      const program = provider.detected_program;
      if (program.code === 'ICS') {
        score += 25;
        flags.push({
          type: 'ICS_PROGRAM',
          severity: 'high',
          message: 'ICS program (37x growth, extreme fraud risk)',
        });
      } else if (program.code === 'HSS') {
        score += 30;
        flags.push({
          type: 'HSS_PROGRAM',
          severity: 'critical',
          message: 'HSS program (terminated for fraud)',
        });
      } else if (['PCA', 'EIDBI', 'ARMHS'].includes(program.code)) {
        score += 15;
        flags.push({
          type: 'HIGH_RISK_PROGRAM',
          severity: 'medium',
          program: program.name,
        });
      }
    }

    // Rapid payment growth
    if (provider.payment_growth) {
      const growth = parseFloat(provider.payment_growth);
      if (growth >= 10) {
        score += 40;
        flags.push({
          type: 'EXTREME_GROWTH',
          severity: 'critical',
          growth: `${(growth * 100).toFixed(0)}%`,
        });
      } else if (growth >= 3) {
        score += 25;
        flags.push({
          type: 'RAPID_GROWTH',
          severity: 'high',
          growth: `${(growth * 100).toFixed(0)}%`,
        });
      }
    }

    // High payment volume
    if (provider.total_payments > 5000000) {
      score += 30;
      flags.push({
        type: 'VERY_HIGH_PAYMENTS',
        severity: 'high',
        amount: provider.total_payments,
      });
    } else if (provider.total_payments > 1000000) {
      score += 15;
      flags.push({
        type: 'HIGH_PAYMENTS',
        severity: 'medium',
        amount: provider.total_payments,
      });
    }

    // Terminated status
    if (provider.status && provider.status.toLowerCase().includes('terminat')) {
      score += 20;
      flags.push({ type: 'TERMINATED', severity: 'high' });
    }

    return {
      provider: {
        name: provider.name,
        npi: provider.npi,
        provider_id: provider.provider_id,
        provider_type: provider.provider_type,
        detected_program: provider.detected_program?.name,
        owner: provider.owner,
        address: provider.address,
        city: provider.city,
        status: provider.status,
        total_payments: provider.total_payments,
        payment_growth: provider.payment_growth,
      },
      score,
      flags,
      riskLevel: score >= 60 ? 'CRITICAL' :
                 score >= 40 ? 'HIGH' :
                 score >= 20 ? 'MEDIUM' : 'LOW',
      crossProgramLinks: {
        daycare: daycareLinked.has(provider.npi),
        nemt: nemtLinked.has(provider.npi),
        sos: sosLinked.has(provider.npi),
      },
    };
  }).sort((a, b) => b.score - a.score);
};

// ============================================================================
// Report Generation
// ============================================================================

const generateReport = (data) => {
  const lines = [];

  lines.push('='.repeat(80));
  lines.push('DHS HCBS PROVIDER ANALYSIS REPORT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('='.repeat(80));
  lines.push('');

  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(`Total providers analyzed: ${data.summary.totalProviders.toLocaleString()}`);
  lines.push(`CRITICAL risk: ${data.summary.criticalRisk.toLocaleString()}`);
  lines.push(`HIGH risk: ${data.summary.highRisk.toLocaleString()}`);
  lines.push(`MEDIUM risk: ${data.summary.mediumRisk.toLocaleString()}`);
  lines.push('');
  lines.push('Cross-Program Links:');
  lines.push(`  Linked to daycare facilities: ${data.summary.daycareLinks.toLocaleString()}`);
  lines.push(`  Linked to NEMT providers: ${data.summary.nemtLinks.toLocaleString()}`);
  lines.push(`  Multi-program networks: ${data.summary.multiProgramNetworks.toLocaleString()}`);
  lines.push('');

  lines.push('='.repeat(80));
  lines.push('PROVIDERS BY HIGH-RISK PROGRAM');
  lines.push('='.repeat(80));
  lines.push('');

  Object.entries(data.programBreakdown)
    .filter(([_, p]) => p.providerCount > 0)
    .sort((a, b) => b[1].totalPayments - a[1].totalPayments)
    .forEach(([code, program]) => {
      lines.push(`${code}: ${program.name}`);
      lines.push(`  Providers: ${program.providerCount} | Total Payments: $${program.totalPayments.toLocaleString()}`);
      if (program.status) lines.push(`  Status: ${program.status}`);
      if (program.notes) lines.push(`  Notes: ${program.notes}`);
      lines.push('');
    });

  lines.push('='.repeat(80));
  lines.push('CRITICAL/HIGH RISK PROVIDERS WITH CROSS-PROGRAM LINKS');
  lines.push('='.repeat(80));
  lines.push('');

  data.riskScores
    .filter(r => ['CRITICAL', 'HIGH'].includes(r.riskLevel) &&
                 (r.crossProgramLinks.daycare || r.crossProgramLinks.nemt))
    .slice(0, 30)
    .forEach((r, i) => {
      lines.push(`${i + 1}. ${r.provider.name}`);
      lines.push(`   Risk: ${r.riskLevel} (Score: ${r.score})`);
      lines.push(`   Program: ${r.provider.detected_program || 'Unknown'}`);
      lines.push(`   NPI: ${r.provider.npi}`);
      lines.push(`   Total Payments: $${(r.provider.total_payments || 0).toLocaleString()}`);
      lines.push(`   Cross-Program: ${[
        r.crossProgramLinks.daycare ? 'DAYCARE' : null,
        r.crossProgramLinks.nemt ? 'NEMT' : null,
      ].filter(Boolean).join(', ')}`);
      r.flags.forEach(f => lines.push(`   ⚠️  ${f.type}: ${f.message || ''}`));
      lines.push('');
    });

  lines.push('='.repeat(80));
  lines.push('RAPID PAYMENT GROWTH (Fraud Indicator)');
  lines.push('='.repeat(80));
  lines.push('');

  data.rapidGrowth.slice(0, 20).forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name}`);
    lines.push(`   Growth: ${(p.growth_rate * 100).toFixed(0)}%`);
    lines.push(`   Program: ${p.detected_program || 'Unknown'}`);
    lines.push(`   2021: $${(p.payments_2021 || 0).toLocaleString()}`);
    lines.push(`   2024: $${(p.payments_2024 || 0).toLocaleString()}`);
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
  const filePath = process.argv[2];

  if (!filePath) {
    console.log(`
DHS HCBS/Waiver Provider Data Processor
========================================

Usage: node scripts/process-dhs-hcbs.js <path-to-file>

Processes provider data for the 13 high-risk Medicaid programs
and cross-references with daycare, NEMT, and SOS business data.

High-Risk Programs Detected:
${Object.entries(HIGH_RISK_PROGRAMS).map(([code, p]) =>
  `  - ${code}: ${p.name}${p.status === 'TERMINATED' ? ' (TERMINATED)' : ''}`
).join('\n')}

Output files (in public/data/minnesota/hcbs/):
  - hcbs_providers.json
  - program_breakdown.json
  - daycare_crossref.json
  - nemt_crossref.json
  - sos_crossref.json
  - rapid_growth.json
  - risk_scores.json
  - summary.json
  - report.txt (human-readable)
`);
    process.exit(0);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n=== DHS HCBS Provider Data Processor ===\n');

  // Parse data
  console.log('Step 1: Parsing HCBS provider data...');
  const providers = parseHCBSData(filePath);

  // Load cross-reference data
  console.log('\nStep 2: Loading cross-reference data...');
  const facilities = loadFacilityData();
  console.log(`  Daycare facilities: ${facilities.length}`);
  const sosBusinesses = loadJSON(path.join(SOS_DATA_DIR, 'sos_businesses.json'));
  console.log(`  SOS businesses: ${sosBusinesses.length}`);
  const nemtProviders = loadJSON(path.join(NEMT_DATA_DIR, 'nemt_providers.json'));
  console.log(`  NEMT providers: ${nemtProviders.length}`);

  // Cross-reference
  console.log('\nStep 3: Cross-referencing data...');
  const crossRef = crossReferenceAll(providers, facilities, sosBusinesses, nemtProviders);
  console.log(`  Daycare links: ${crossRef.daycare.length}`);
  console.log(`  NEMT links: ${crossRef.nemt.length}`);
  console.log(`  SOS links: ${crossRef.sos.length}`);

  // Analyze
  console.log('\nStep 4: Analyzing patterns...');
  const programBreakdown = groupByProgram(providers);
  const rapidGrowth = analyzePaymentGrowth(providers);
  console.log(`  Rapid growth providers: ${rapidGrowth.length}`);

  console.log('\nStep 5: Calculating risk scores...');
  const riskScores = calculateRiskScores(providers, crossRef);
  const critical = riskScores.filter(r => r.riskLevel === 'CRITICAL');
  const high = riskScores.filter(r => r.riskLevel === 'HIGH');
  const medium = riskScores.filter(r => r.riskLevel === 'MEDIUM');

  // Multi-program networks
  const multiProgram = riskScores.filter(r =>
    [r.crossProgramLinks.daycare, r.crossProgramLinks.nemt].filter(Boolean).length >= 2
  );

  const summary = {
    processedAt: new Date().toISOString(),
    sourceFile: path.basename(filePath),
    totalProviders: providers.length,
    criticalRisk: critical.length,
    highRisk: high.length,
    mediumRisk: medium.length,
    daycareLinks: crossRef.daycare.length,
    nemtLinks: crossRef.nemt.length,
    sosLinks: crossRef.sos.length,
    multiProgramNetworks: multiProgram.length,
    rapidGrowthProviders: rapidGrowth.length,
    programCounts: Object.fromEntries(
      Object.entries(programBreakdown).map(([k, v]) => [k, v.providerCount])
    ),
  };

  // Write outputs
  console.log('\nStep 6: Writing output files...');

  const outputs = [
    ['hcbs_providers.json', providers],
    ['program_breakdown.json', programBreakdown],
    ['daycare_crossref.json', crossRef.daycare],
    ['nemt_crossref.json', crossRef.nemt],
    ['sos_crossref.json', crossRef.sos],
    ['rapid_growth.json', rapidGrowth],
    ['risk_scores.json', riskScores],
    ['summary.json', summary],
  ];

  outputs.forEach(([filename, data]) => {
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(data, null, 2));
    console.log(`  ${filename}`);
  });

  const report = generateReport({
    summary,
    programBreakdown,
    riskScores,
    rapidGrowth,
    crossRef,
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'report.txt'), report);
  console.log(`  report.txt`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total HCBS providers: ${providers.length}`);
  console.log(`CRITICAL risk: ${critical.length}`);
  console.log(`HIGH risk: ${high.length}`);
  console.log(`Multi-program fraud networks: ${multiProgram.length}`);
  console.log(`Linked to daycare: ${crossRef.daycare.length}`);
  console.log(`Linked to NEMT: ${crossRef.nemt.length}`);

  if (multiProgram.length > 0) {
    console.log('\nTop multi-program fraud network suspects:');
    multiProgram.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.provider.name} (Score: ${r.score})`);
      console.log(`     Programs: HCBS + ${[
        r.crossProgramLinks.daycare ? 'Daycare' : null,
        r.crossProgramLinks.nemt ? 'NEMT' : null,
      ].filter(Boolean).join(' + ')}`);
    });
  }

  console.log(`\nOutput written to: ${OUTPUT_DIR}`);
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
