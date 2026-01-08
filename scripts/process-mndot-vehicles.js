/**
 * Process MnDOT Vehicle Registration Data
 *
 * Parses vehicle registration data and cross-references with
 * NEMT providers, daycare facilities, and SOS business data to identify:
 * - Vehicles registered at daycare/NEMT provider addresses
 * - Large fleets potentially used for fraudulent NEMT billing
 * - Shell company vehicle networks
 * - Recent registrations during fraud investigation period
 *
 * Input: CSV/Excel from MnDOT MGDPA response
 * Output: JSON files for TransportWatch module
 *
 * Usage: node scripts/process-mndot-vehicles.js <path-to-file>
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '../public/data/minnesota/vehicles');
const FACILITY_DATA_DIR = path.join(__dirname, '../public/data/minnesota');
const SOS_DATA_DIR = path.join(__dirname, '../public/data/minnesota/sos');
const NEMT_DATA_DIR = path.join(__dirname, '../public/data/minnesota/nemt');

// Vehicle types commonly used in NEMT fraud
const NEMT_VEHICLE_TYPES = [
  'passenger van',
  'minivan',
  'wheelchair van',
  'accessible vehicle',
  'medical transport',
  'ambulette',
  'stretcher van',
  'passenger vehicle',
  'multi-passenger',
];

// Thresholds for flagging
const THRESHOLDS = {
  LARGE_FLEET_SIZE: 5,           // 5+ vehicles = large fleet
  VERY_LARGE_FLEET_SIZE: 15,     // 15+ vehicles = very large fleet
  RECENT_REGISTRATION_CUTOFF: new Date('2020-01-01'),
  SUSPICIOUS_REGISTRATION_WINDOW_DAYS: 30, // Multiple registrations within 30 days
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

const normalizePlate = (plate) => {
  if (!plate) return '';
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const normalizeVIN = (vin) => {
  if (!vin) return '';
  return vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
 * Detect if vehicle type suggests NEMT use
 */
const isNEMTVehicleType = (vehicleType, bodyStyle, useType) => {
  const searchText = [vehicleType, bodyStyle, useType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return NEMT_VEHICLE_TYPES.some(type => searchText.includes(type));
};

/**
 * Parse MnDOT vehicle registration data
 * Expected columns (flexible mapping):
 * - Plate Number / License Plate
 * - VIN
 * - Owner Name / Registered Owner
 * - Owner Address, City, State, Zip
 * - Vehicle Year, Make, Model
 * - Vehicle Type / Body Style
 * - Registration Date / Effective Date
 * - Expiration Date
 * - Use Type (Commercial, Personal, etc.)
 * - Title Number
 */
const parseVehicleData = (filePath) => {
  console.log(`Reading vehicle data from: ${filePath}`);

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
    plate: findColumn('plate', 'license_plate', 'tag'),
    vin: findColumn('vin', 'vehicle_id'),
    owner_name: findColumn('owner_name', 'registered_owner', 'owner', 'name'),
    owner_address: findColumn('owner_address', 'address', 'street'),
    owner_city: findColumn('owner_city', 'city'),
    owner_state: findColumn('owner_state', 'state'),
    owner_zip: findColumn('owner_zip', 'zip', 'postal'),
    year: findColumn('year', 'model_year', 'vehicle_year'),
    make: findColumn('make', 'manufacturer'),
    model: findColumn('model'),
    vehicle_type: findColumn('vehicle_type', 'type'),
    body_style: findColumn('body_style', 'body'),
    registration_date: findColumn('registration_date', 'reg_date', 'effective'),
    expiration_date: findColumn('expiration', 'expires'),
    use_type: findColumn('use_type', 'use', 'usage'),
    title_number: findColumn('title', 'title_number'),
  };

  console.log('Column mapping:', JSON.stringify(colMap, null, 2));

  const vehicles = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 3) continue;

    const getValue = (col) => col >= 0 && col < values.length ? values[col] : null;

    const vehicleType = getValue(colMap.vehicle_type);
    const bodyStyle = getValue(colMap.body_style);
    const useType = getValue(colMap.use_type);

    const vehicle = {
      plate: normalizePlate(getValue(colMap.plate)),
      vin: normalizeVIN(getValue(colMap.vin)),
      owner_name: getValue(colMap.owner_name),
      owner_address: getValue(colMap.owner_address),
      owner_city: getValue(colMap.owner_city),
      owner_state: getValue(colMap.owner_state) || 'MN',
      owner_zip: getValue(colMap.owner_zip),
      year: parseInt(getValue(colMap.year)) || null,
      make: getValue(colMap.make),
      model: getValue(colMap.model),
      vehicle_type: vehicleType,
      body_style: bodyStyle,
      use_type: useType,
      registration_date: getValue(colMap.registration_date),
      expiration_date: getValue(colMap.expiration_date),
      title_number: getValue(colMap.title_number),
      // Derived fields
      is_nemt_type: isNEMTVehicleType(vehicleType, bodyStyle, useType),
      normalized_owner: normalizeName(getValue(colMap.owner_name)),
      normalized_address: normalizeAddress(getValue(colMap.owner_address)),
      registration_date_parsed: null,
    };

    // Parse registration date
    if (vehicle.registration_date) {
      try {
        vehicle.registration_date_parsed = new Date(vehicle.registration_date);
      } catch {
        vehicle.registration_date_parsed = null;
      }
    }

    vehicles.push(vehicle);
  }

  console.log(`Parsed ${vehicles.length} vehicle records`);
  return vehicles;
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
// Fleet Analysis
// ============================================================================

/**
 * Group vehicles by owner to identify fleets
 */
const buildFleetAnalysis = (vehicles) => {
  const ownerMap = new Map();

  vehicles.forEach(vehicle => {
    const owner = vehicle.normalized_owner;
    if (!owner || owner.length < 3) return;

    if (!ownerMap.has(owner)) {
      ownerMap.set(owner, {
        owner: vehicle.owner_name,
        normalized_owner: owner,
        vehicles: [],
        addresses: new Set(),
        registrationDates: [],
        nemtTypeCount: 0,
      });
    }

    const fleet = ownerMap.get(owner);
    fleet.vehicles.push(vehicle);
    if (vehicle.owner_address) fleet.addresses.add(vehicle.owner_address);
    if (vehicle.registration_date_parsed) {
      fleet.registrationDates.push(vehicle.registration_date_parsed);
    }
    if (vehicle.is_nemt_type) fleet.nemtTypeCount++;
  });

  // Process and filter to fleets with 2+ vehicles
  return Array.from(ownerMap.values())
    .filter(f => f.vehicles.length >= 2)
    .map(fleet => {
      // Sort registration dates
      fleet.registrationDates.sort((a, b) => a - b);

      // Calculate registration velocity (vehicles per month)
      let registrationVelocity = null;
      if (fleet.registrationDates.length >= 2) {
        const firstDate = fleet.registrationDates[0];
        const lastDate = fleet.registrationDates[fleet.registrationDates.length - 1];
        const monthsDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30);
        if (monthsDiff > 0) {
          registrationVelocity = (fleet.vehicles.length / monthsDiff).toFixed(2);
        }
      }

      // Check for burst registrations (multiple in short window)
      let burstRegistrations = [];
      for (let i = 0; i < fleet.registrationDates.length - 1; i++) {
        const cluster = [fleet.registrationDates[i]];
        for (let j = i + 1; j < fleet.registrationDates.length; j++) {
          const daysDiff = (fleet.registrationDates[j] - cluster[0]) / (1000 * 60 * 60 * 24);
          if (daysDiff <= THRESHOLDS.SUSPICIOUS_REGISTRATION_WINDOW_DAYS) {
            cluster.push(fleet.registrationDates[j]);
          } else {
            break;
          }
        }
        if (cluster.length >= 3) {
          burstRegistrations.push({
            count: cluster.length,
            startDate: cluster[0].toISOString().split('T')[0],
            endDate: cluster[cluster.length - 1].toISOString().split('T')[0],
          });
          i += cluster.length - 1;
        }
      }

      return {
        owner: fleet.owner,
        normalized_owner: fleet.normalized_owner,
        vehicleCount: fleet.vehicles.length,
        nemtTypeCount: fleet.nemtTypeCount,
        nemtPercentage: ((fleet.nemtTypeCount / fleet.vehicles.length) * 100).toFixed(1),
        addresses: [...fleet.addresses],
        addressCount: fleet.addresses.size,
        registrationVelocity,
        burstRegistrations,
        vehicles: fleet.vehicles.map(v => ({
          plate: v.plate,
          vin: v.vin,
          year: v.year,
          make: v.make,
          model: v.model,
          vehicle_type: v.vehicle_type,
          is_nemt_type: v.is_nemt_type,
          registration_date: v.registration_date,
        })),
        isLargeFleet: fleet.vehicles.length >= THRESHOLDS.LARGE_FLEET_SIZE,
        isVeryLargeFleet: fleet.vehicles.length >= THRESHOLDS.VERY_LARGE_FLEET_SIZE,
      };
    })
    .sort((a, b) => b.vehicleCount - a.vehicleCount);
};

/**
 * Analyze vehicles by address to find clustering
 */
const buildAddressClusters = (vehicles) => {
  const addressMap = new Map();

  vehicles.forEach(vehicle => {
    const addr = vehicle.normalized_address;
    if (!addr || addr.length < 5) return;

    if (!addressMap.has(addr)) {
      addressMap.set(addr, {
        address: vehicle.owner_address,
        city: vehicle.owner_city,
        normalized_address: addr,
        vehicles: [],
        owners: new Set(),
      });
    }

    const cluster = addressMap.get(addr);
    cluster.vehicles.push(vehicle);
    if (vehicle.owner_name) cluster.owners.add(vehicle.owner_name);
  });

  return Array.from(addressMap.values())
    .filter(c => c.vehicles.length >= 3)
    .map(c => ({
      ...c,
      owners: [...c.owners],
      vehicleCount: c.vehicles.length,
      ownerCount: c.owners.size,
      multipleOwners: c.owners.size > 1,
    }))
    .sort((a, b) => b.vehicleCount - a.vehicleCount);
};

// ============================================================================
// Cross-Reference Analysis
// ============================================================================

/**
 * Cross-reference vehicles with daycare facilities
 */
const crossReferenceWithDaycare = (vehicles, facilities) => {
  const matches = [];

  // Build facility lookups
  const ownerMap = new Map();
  const addressMap = new Map();

  facilities.forEach(f => {
    if (f.normalized_owner && f.normalized_owner.length > 3) {
      if (!ownerMap.has(f.normalized_owner)) ownerMap.set(f.normalized_owner, []);
      ownerMap.get(f.normalized_owner).push(f);
    }
    if (f.normalized_address && f.normalized_address.length > 5) {
      if (!addressMap.has(f.normalized_address)) addressMap.set(f.normalized_address, []);
      addressMap.get(f.normalized_address).push(f);
    }
  });

  // Group vehicles by owner for matching
  const vehiclesByOwner = new Map();
  vehicles.forEach(v => {
    if (!v.normalized_owner || v.normalized_owner.length < 3) return;
    if (!vehiclesByOwner.has(v.normalized_owner)) {
      vehiclesByOwner.set(v.normalized_owner, []);
    }
    vehiclesByOwner.get(v.normalized_owner).push(v);
  });

  // Find matches
  vehiclesByOwner.forEach((ownerVehicles, normalizedOwner) => {
    const matchedFacilities = [];
    const matchTypes = [];

    // Owner name match
    if (ownerMap.has(normalizedOwner)) {
      matchedFacilities.push(...ownerMap.get(normalizedOwner));
      matchTypes.push('OWNER_MATCH');
    }

    // Address match
    const vehicleAddresses = new Set(ownerVehicles.map(v => v.normalized_address).filter(Boolean));
    vehicleAddresses.forEach(addr => {
      if (addressMap.has(addr)) {
        addressMap.get(addr).forEach(f => {
          if (!matchedFacilities.find(mf => mf.license_number === f.license_number)) {
            matchedFacilities.push(f);
          }
        });
        matchTypes.push('ADDRESS_MATCH');
      }
    });

    if (matchedFacilities.length > 0) {
      matches.push({
        owner: ownerVehicles[0].owner_name,
        normalized_owner: normalizedOwner,
        vehicleCount: ownerVehicles.length,
        nemtTypeCount: ownerVehicles.filter(v => v.is_nemt_type).length,
        vehicles: ownerVehicles.map(v => ({
          plate: v.plate,
          year: v.year,
          make: v.make,
          model: v.model,
          is_nemt_type: v.is_nemt_type,
        })),
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

  return matches.sort((a, b) => b.vehicleCount - a.vehicleCount);
};

/**
 * Cross-reference with NEMT providers
 */
const crossReferenceWithNEMT = (vehicles, nemtProviders) => {
  if (!nemtProviders || nemtProviders.length === 0) return [];

  const matches = [];

  // Build NEMT lookups
  const ownerMap = new Map();
  const addressMap = new Map();

  nemtProviders.forEach(p => {
    const normOwner = normalizeName(p.owner || p.name);
    const normAddr = normalizeAddress(p.address);

    if (normOwner && normOwner.length > 3) {
      if (!ownerMap.has(normOwner)) ownerMap.set(normOwner, []);
      ownerMap.get(normOwner).push(p);
    }
    if (normAddr && normAddr.length > 5) {
      if (!addressMap.has(normAddr)) addressMap.set(normAddr, []);
      addressMap.get(normAddr).push(p);
    }
  });

  // Group vehicles by owner
  const vehiclesByOwner = new Map();
  vehicles.forEach(v => {
    if (!v.normalized_owner || v.normalized_owner.length < 3) return;
    if (!vehiclesByOwner.has(v.normalized_owner)) {
      vehiclesByOwner.set(v.normalized_owner, []);
    }
    vehiclesByOwner.get(v.normalized_owner).push(v);
  });

  // Find matches
  vehiclesByOwner.forEach((ownerVehicles, normalizedOwner) => {
    const matchedProviders = [];
    const matchTypes = [];

    if (ownerMap.has(normalizedOwner)) {
      matchedProviders.push(...ownerMap.get(normalizedOwner));
      matchTypes.push('OWNER_MATCH');
    }

    const vehicleAddresses = new Set(ownerVehicles.map(v => v.normalized_address).filter(Boolean));
    vehicleAddresses.forEach(addr => {
      if (addressMap.has(addr)) {
        addressMap.get(addr).forEach(p => {
          if (!matchedProviders.find(mp => mp.npi === p.npi)) {
            matchedProviders.push(p);
          }
        });
        matchTypes.push('ADDRESS_MATCH');
      }
    });

    if (matchedProviders.length > 0) {
      matches.push({
        owner: ownerVehicles[0].owner_name,
        vehicleCount: ownerVehicles.length,
        nemtTypeCount: ownerVehicles.filter(v => v.is_nemt_type).length,
        providers: matchedProviders.map(p => ({
          name: p.name,
          npi: p.npi,
          address: p.address,
          status: p.status,
        })),
        matchTypes: [...new Set(matchTypes)],
        providerCount: matchedProviders.length,
      });
    }
  });

  return matches.sort((a, b) => b.vehicleCount - a.vehicleCount);
};

/**
 * Cross-reference with SOS business data
 */
const crossReferenceWithSOS = (vehicles, businesses) => {
  if (!businesses || businesses.length === 0) return [];

  const matches = [];

  // Build SOS lookups
  const nameMap = new Map();
  const addressMap = new Map();

  businesses.forEach(b => {
    const normName = normalizeName(b.name);
    const normAddr = normalizeAddress(b.address);

    if (normName && normName.length > 3) {
      if (!nameMap.has(normName)) nameMap.set(normName, []);
      nameMap.get(normName).push(b);
    }
    if (normAddr && normAddr.length > 5) {
      if (!addressMap.has(normAddr)) addressMap.set(normAddr, []);
      addressMap.get(normAddr).push(b);
    }
  });

  // Group vehicles by owner
  const vehiclesByOwner = new Map();
  vehicles.forEach(v => {
    if (!v.normalized_owner || v.normalized_owner.length < 3) return;
    if (!vehiclesByOwner.has(v.normalized_owner)) {
      vehiclesByOwner.set(v.normalized_owner, []);
    }
    vehiclesByOwner.get(v.normalized_owner).push(v);
  });

  // Find matches
  vehiclesByOwner.forEach((ownerVehicles, normalizedOwner) => {
    const matchedBusinesses = [];
    const matchTypes = [];

    if (nameMap.has(normalizedOwner)) {
      matchedBusinesses.push(...nameMap.get(normalizedOwner));
      matchTypes.push('NAME_MATCH');
    }

    const vehicleAddresses = new Set(ownerVehicles.map(v => v.normalized_address).filter(Boolean));
    vehicleAddresses.forEach(addr => {
      if (addressMap.has(addr)) {
        addressMap.get(addr).forEach(b => {
          if (!matchedBusinesses.find(mb => mb.file_number === b.file_number)) {
            matchedBusinesses.push(b);
          }
        });
        matchTypes.push('ADDRESS_MATCH');
      }
    });

    if (matchedBusinesses.length > 0) {
      matches.push({
        owner: ownerVehicles[0].owner_name,
        vehicleCount: ownerVehicles.length,
        businesses: matchedBusinesses.map(b => ({
          name: b.name,
          file_number: b.file_number,
          party_name: b.party_name,
          filing_date: b.filing_date,
          address: b.address,
        })),
        matchTypes: [...new Set(matchTypes)],
        businessCount: matchedBusinesses.length,
      });
    }
  });

  return matches.sort((a, b) => b.vehicleCount - a.vehicleCount);
};

// ============================================================================
// Risk Analysis
// ============================================================================

/**
 * Calculate risk scores for fleets
 */
const calculateFleetRiskScores = (fleets, daycareMatches, nemtMatches, sosMatches) => {
  // Build lookup sets
  const daycareLinked = new Set(daycareMatches.map(m => m.normalized_owner));
  const nemtLinked = new Set(nemtMatches.map(m => normalizeName(m.owner)));
  const sosLinked = new Set(sosMatches.map(m => normalizeName(m.owner)));

  return fleets.map(fleet => {
    let score = 0;
    const flags = [];

    // Fleet size
    if (fleet.isVeryLargeFleet) {
      score += 35;
      flags.push({
        type: 'VERY_LARGE_FLEET',
        severity: 'high',
        message: `${fleet.vehicleCount} vehicles registered`,
      });
    } else if (fleet.isLargeFleet) {
      score += 20;
      flags.push({
        type: 'LARGE_FLEET',
        severity: 'medium',
        message: `${fleet.vehicleCount} vehicles registered`,
      });
    }

    // High NEMT percentage
    const nemtPct = parseFloat(fleet.nemtPercentage);
    if (nemtPct >= 80 && fleet.vehicleCount >= 5) {
      score += 25;
      flags.push({
        type: 'HIGH_NEMT_CONCENTRATION',
        severity: 'high',
        message: `${fleet.nemtPercentage}% NEMT-type vehicles`,
      });
    }

    // Burst registrations
    if (fleet.burstRegistrations && fleet.burstRegistrations.length > 0) {
      const maxBurst = Math.max(...fleet.burstRegistrations.map(b => b.count));
      if (maxBurst >= 5) {
        score += 30;
        flags.push({
          type: 'BURST_REGISTRATIONS',
          severity: 'high',
          message: `${maxBurst} vehicles registered in 30-day window`,
        });
      } else {
        score += 15;
        flags.push({
          type: 'BURST_REGISTRATIONS',
          severity: 'medium',
          message: `${maxBurst} vehicles registered in 30-day window`,
        });
      }
    }

    // Cross-program links
    if (daycareLinked.has(fleet.normalized_owner)) {
      score += 40;
      flags.push({
        type: 'DAYCARE_LINK',
        severity: 'high',
        message: 'Owner also operates daycare facilities',
      });
    }

    if (nemtLinked.has(fleet.normalized_owner)) {
      score += 20;
      flags.push({
        type: 'NEMT_PROVIDER_LINK',
        severity: 'medium',
        message: 'Matches registered NEMT provider',
      });
    }

    if (sosLinked.has(fleet.normalized_owner)) {
      score += 15;
      flags.push({
        type: 'SOS_ENTITY_LINK',
        severity: 'medium',
        message: 'Matches SOS business entity',
      });
    }

    // Multiple addresses (dispersed fleet)
    if (fleet.addressCount >= 3) {
      score += 15;
      flags.push({
        type: 'DISPERSED_FLEET',
        severity: 'medium',
        message: `Vehicles at ${fleet.addressCount} different addresses`,
      });
    }

    return {
      owner: fleet.owner,
      normalized_owner: fleet.normalized_owner,
      vehicleCount: fleet.vehicleCount,
      nemtTypeCount: fleet.nemtTypeCount,
      nemtPercentage: fleet.nemtPercentage,
      addressCount: fleet.addressCount,
      score,
      flags,
      riskLevel: score >= 60 ? 'CRITICAL' :
                 score >= 40 ? 'HIGH' :
                 score >= 20 ? 'MEDIUM' : 'LOW',
      crossProgramLinks: {
        daycare: daycareLinked.has(fleet.normalized_owner),
        nemt: nemtLinked.has(fleet.normalized_owner),
        sos: sosLinked.has(fleet.normalized_owner),
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
  lines.push('MnDOT VEHICLE REGISTRATION ANALYSIS REPORT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('='.repeat(80));
  lines.push('');

  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(`Total vehicles analyzed: ${data.summary.totalVehicles.toLocaleString()}`);
  lines.push(`NEMT-type vehicles: ${data.summary.nemtTypeVehicles.toLocaleString()}`);
  lines.push(`Unique owners: ${data.summary.uniqueOwners.toLocaleString()}`);
  lines.push(`Fleet operators (2+ vehicles): ${data.summary.fleetCount.toLocaleString()}`);
  lines.push(`Large fleets (${THRESHOLDS.LARGE_FLEET_SIZE}+ vehicles): ${data.summary.largeFleets.toLocaleString()}`);
  lines.push('');
  lines.push('Cross-Program Links:');
  lines.push(`  Linked to daycare facilities: ${data.summary.daycareLinks.toLocaleString()}`);
  lines.push(`  Linked to NEMT providers: ${data.summary.nemtLinks.toLocaleString()}`);
  lines.push(`  Linked to SOS entities: ${data.summary.sosLinks.toLocaleString()}`);
  lines.push('');

  lines.push('='.repeat(80));
  lines.push('LARGEST VEHICLE FLEETS');
  lines.push('='.repeat(80));
  lines.push('');

  data.fleets.slice(0, 20).forEach((fleet, i) => {
    lines.push(`${i + 1}. ${fleet.owner}`);
    lines.push(`   Vehicles: ${fleet.vehicleCount} | NEMT-type: ${fleet.nemtTypeCount} (${fleet.nemtPercentage}%)`);
    lines.push(`   Addresses: ${fleet.addressCount}`);
    if (fleet.burstRegistrations && fleet.burstRegistrations.length > 0) {
      lines.push(`   ⚠️  Burst registrations detected`);
    }
    lines.push('');
  });

  lines.push('='.repeat(80));
  lines.push('FLEETS LINKED TO DAYCARE FACILITIES');
  lines.push('='.repeat(80));
  lines.push('');

  data.daycareMatches.slice(0, 20).forEach((match, i) => {
    lines.push(`${i + 1}. ${match.owner}`);
    lines.push(`   Vehicles: ${match.vehicleCount} | NEMT-type: ${match.nemtTypeCount}`);
    lines.push(`   Linked to ${match.facilityCount} daycare facilities:`);
    match.facilities.slice(0, 3).forEach(f => {
      lines.push(`     - ${f.name} (${f.license_number})`);
    });
    if (match.facilities.length > 3) {
      lines.push(`     ... and ${match.facilities.length - 3} more`);
    }
    lines.push('');
  });

  lines.push('='.repeat(80));
  lines.push('HIGHEST RISK FLEETS');
  lines.push('='.repeat(80));
  lines.push('');

  data.riskScores
    .filter(r => ['CRITICAL', 'HIGH'].includes(r.riskLevel))
    .slice(0, 25)
    .forEach((r, i) => {
      lines.push(`${i + 1}. ${r.owner}`);
      lines.push(`   Risk: ${r.riskLevel} (Score: ${r.score})`);
      lines.push(`   Vehicles: ${r.vehicleCount} | NEMT-type: ${r.nemtTypeCount}`);
      lines.push(`   Cross-Program: ${[
        r.crossProgramLinks.daycare ? 'DAYCARE' : null,
        r.crossProgramLinks.nemt ? 'NEMT' : null,
        r.crossProgramLinks.sos ? 'SOS' : null,
      ].filter(Boolean).join(', ') || 'None'}`);
      r.flags.forEach(f => lines.push(`   ⚠️  ${f.type}: ${f.message || ''}`));
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
MnDOT Vehicle Registration Data Processor
==========================================

Usage: node scripts/process-mndot-vehicles.js <path-to-file>

Processes vehicle registration data from MnDOT and cross-references
with NEMT providers, daycare facilities, and SOS business data.

Expected input: CSV file from MnDOT MGDPA response

Expected columns (flexible matching):
  - Plate Number / License Plate
  - VIN
  - Owner Name / Registered Owner
  - Owner Address, City, State, Zip
  - Vehicle Year, Make, Model
  - Vehicle Type / Body Style
  - Registration Date
  - Use Type (Commercial, Personal, etc.)

NEMT-type vehicle detection keywords:
  ${NEMT_VEHICLE_TYPES.join(', ')}

Output files (in public/data/minnesota/vehicles/):
  - vehicles.json (all parsed vehicles)
  - fleets.json (owners with 2+ vehicles)
  - address_clusters.json (addresses with 3+ vehicles)
  - daycare_crossref.json (vehicles linked to daycare owners)
  - nemt_crossref.json (vehicles linked to NEMT providers)
  - sos_crossref.json (vehicles linked to SOS entities)
  - risk_scores.json (risk-scored fleet list)
  - summary.json
  - report.txt (human-readable)
`);
    process.exit(0);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n=== MnDOT Vehicle Registration Processor ===\n');

  // Parse data
  console.log('Step 1: Parsing vehicle registration data...');
  const vehicles = parseVehicleData(filePath);

  // Load cross-reference data
  console.log('\nStep 2: Loading cross-reference data...');
  const facilities = loadFacilityData();
  console.log(`  Daycare facilities: ${facilities.length}`);
  const nemtProviders = loadJSON(path.join(NEMT_DATA_DIR, 'nemt_providers.json'));
  console.log(`  NEMT providers: ${nemtProviders.length}`);
  const sosBusinesses = loadJSON(path.join(SOS_DATA_DIR, 'sos_businesses.json'));
  console.log(`  SOS businesses: ${sosBusinesses.length}`);

  // Analyze fleets
  console.log('\nStep 3: Analyzing vehicle fleets...');
  const fleets = buildFleetAnalysis(vehicles);
  const largeFleets = fleets.filter(f => f.isLargeFleet);
  console.log(`  Fleet operators: ${fleets.length}`);
  console.log(`  Large fleets: ${largeFleets.length}`);

  console.log('\nStep 4: Analyzing address clusters...');
  const addressClusters = buildAddressClusters(vehicles);
  console.log(`  Address clusters: ${addressClusters.length}`);

  // Cross-reference
  console.log('\nStep 5: Cross-referencing with daycare facilities...');
  const daycareMatches = crossReferenceWithDaycare(vehicles, facilities);
  console.log(`  Daycare-linked fleets: ${daycareMatches.length}`);

  console.log('\nStep 6: Cross-referencing with NEMT providers...');
  const nemtMatches = crossReferenceWithNEMT(vehicles, nemtProviders);
  console.log(`  NEMT-linked fleets: ${nemtMatches.length}`);

  console.log('\nStep 7: Cross-referencing with SOS data...');
  const sosMatches = crossReferenceWithSOS(vehicles, sosBusinesses);
  console.log(`  SOS-linked fleets: ${sosMatches.length}`);

  // Risk scoring
  console.log('\nStep 8: Calculating risk scores...');
  const riskScores = calculateFleetRiskScores(fleets, daycareMatches, nemtMatches, sosMatches);
  const critical = riskScores.filter(r => r.riskLevel === 'CRITICAL');
  const high = riskScores.filter(r => r.riskLevel === 'HIGH');

  // Summary
  const summary = {
    processedAt: new Date().toISOString(),
    sourceFile: path.basename(filePath),
    totalVehicles: vehicles.length,
    nemtTypeVehicles: vehicles.filter(v => v.is_nemt_type).length,
    uniqueOwners: new Set(vehicles.map(v => v.normalized_owner).filter(Boolean)).size,
    fleetCount: fleets.length,
    largeFleets: largeFleets.length,
    addressClusters: addressClusters.length,
    daycareLinks: daycareMatches.length,
    nemtLinks: nemtMatches.length,
    sosLinks: sosMatches.length,
    criticalRisk: critical.length,
    highRisk: high.length,
  };

  // Write outputs
  console.log('\nStep 9: Writing output files...');

  const outputs = [
    ['vehicles.json', vehicles],
    ['fleets.json', fleets],
    ['address_clusters.json', addressClusters],
    ['daycare_crossref.json', daycareMatches],
    ['nemt_crossref.json', nemtMatches],
    ['sos_crossref.json', sosMatches],
    ['risk_scores.json', riskScores],
    ['summary.json', summary],
  ];

  outputs.forEach(([filename, data]) => {
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(data, null, 2));
    console.log(`  ${filename}`);
  });

  const report = generateReport({
    summary,
    fleets,
    daycareMatches,
    riskScores,
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'report.txt'), report);
  console.log(`  report.txt`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total vehicles: ${vehicles.length}`);
  console.log(`NEMT-type vehicles: ${summary.nemtTypeVehicles}`);
  console.log(`Fleet operators: ${fleets.length}`);
  console.log(`Linked to daycare: ${daycareMatches.length}`);
  console.log(`CRITICAL risk: ${critical.length}`);
  console.log(`HIGH risk: ${high.length}`);

  if (daycareMatches.length > 0) {
    console.log('\nTop daycare-linked vehicle fleets:');
    daycareMatches.slice(0, 5).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.owner} - ${m.vehicleCount} vehicles, ${m.facilityCount} facilities`);
    });
  }

  console.log(`\nOutput written to: ${OUTPUT_DIR}`);
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
