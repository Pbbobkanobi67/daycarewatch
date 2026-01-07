/**
 * Process California CDSS childcare facility data
 *
 * Converts CSV to JSON, filters by county, calculates risk scores
 *
 * Usage: node scripts/process-california.js [county]
 * Example: node scripts/process-california.js "SAN DIEGO"
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../public/data/california/childcarecenters_full.csv');
const OUTPUT_DIR = path.join(__dirname, '../public/data/california');

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// Calculate risk score based on available data
function calculateRiskScore(facility, allFacilities) {
  let score = 0;
  const flags = [];

  // Check for multiple DIFFERENT OWNERS at same address (shell company pattern)
  // Same owner with multiple licenses (preschool + infant + school-age) is NORMAL
  const sameAddress = allFacilities.filter(f =>
    f.address === facility.address &&
    f.city === facility.city &&
    f.license_number !== facility.license_number
  );

  if (sameAddress.length >= 1) {
    // Check if there are different licensees at this address
    const licensees = new Set([facility.licensee, ...sameAddress.map(f => f.licensee)].filter(l => l));
    const differentOwners = licensees.size > 1;

    if (differentOwners) {
      // Different owners at same address = suspicious (shell company pattern)
      if (sameAddress.length >= 3) {
        score += 40;
        flags.push(`${licensees.size} different owners at same address (${sameAddress.length + 1} licenses)`);
      } else {
        score += 20;
        flags.push(`${licensees.size} different owners at same address`);
      }
    }
    // Same owner with multiple licenses at same address = normal (no flag)
  }

  // Large networks - only flag very large networks (10+) as informational
  // Organizations like YMCA, KinderCare, churches legitimately operate many facilities
  const sameLicensee = allFacilities.filter(f =>
    f.licensee === facility.licensee &&
    f.license_number !== facility.license_number
  );

  // Only flag extremely large networks (15+) as potentially suspicious
  if (sameLicensee.length >= 15) {
    score += 15;
    flags.push(`Very large network: ${sameLicensee.length + 1} facilities`);
  }

  // Shared phone numbers at DIFFERENT addresses is suspicious
  const samePhone = allFacilities.filter(f =>
    f.phone === facility.phone &&
    f.license_number !== facility.license_number &&
    f.address !== facility.address && // Different address
    facility.phone
  );

  if (samePhone.length >= 2) {
    score += 15;
    flags.push(`Shared phone with ${samePhone.length} facilities at different addresses`);
  }

  // Check facility status - CLOSED/UNLICENSED is a concern
  if (facility.status === 'CLOSED' || facility.status === 'UNLICENSED') {
    score += 20;
    flags.push(`Status: ${facility.status}`);
  } else if (facility.status !== 'LICENSED') {
    score += 10;
    flags.push(`Status: ${facility.status}`);
  }

  // Very high capacity flag (potential overbilling risk) - only flag extreme cases
  if (facility.capacity > 200) {
    score += 5;
    flags.push(`Very high capacity: ${facility.capacity}`);
  }

  // Determine risk level
  let level;
  if (score >= 80) {
    level = { name: 'critical', label: 'Critical' };
  } else if (score >= 50) {
    level = { name: 'high', label: 'High' };
  } else if (score >= 20) {
    level = { name: 'moderate', label: 'Moderate' };
  } else {
    level = { name: 'low', label: 'Low' };
  }

  return {
    score: Math.min(100, score),
    level,
    flags
  };
}

async function main() {
  const countyFilter = process.argv[2]?.toUpperCase() || 'SAN DIEGO';

  console.log(`Processing California childcare data for ${countyFilter} County...`);

  // Read CSV
  const csvData = fs.readFileSync(INPUT_FILE, 'utf8');
  const lines = csvData.split('\n').filter(line => line.trim());

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log('Headers:', headers);

  // Parse all rows
  const allFacilities = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    // Filter by county
    if (row.County_Name?.toUpperCase() !== countyFilter) continue;

    // Convert to our format
    const facility = {
      license_number: row.Facility_Number,
      name: row.Facility_Name,
      type: row.Facility_Type,
      licensee: row.Licensee,
      administrator: row.Facility_Administrator,
      phone: row.Facility_Telephone_Number,
      address: row.Facility_Address,
      city: row.Facility_City,
      state: row.Facility_State || 'CA',
      zip_code: row.Facility_Zip,
      county: row.County_Name,
      regional_office: row.Regional_Office,
      capacity: parseInt(row.Facility_Capacity) || 0,
      status: row.Facility_Status,
      license_first_date: row.License_First_Date,
      closed_date: row.Closed_Date || null,
      data_source: 'CA CDSS CCLD',
      scraped_at: new Date().toISOString()
    };

    allFacilities.push(facility);
  }

  console.log(`Found ${allFacilities.length} facilities in ${countyFilter} County`);

  // Calculate risk scores
  console.log('Calculating risk scores...');
  for (const facility of allFacilities) {
    facility.riskAssessment = calculateRiskScore(facility, allFacilities);
  }

  // Sort by risk score descending
  allFacilities.sort((a, b) => b.riskAssessment.score - a.riskAssessment.score);

  // Stats
  const stats = {
    total: allFacilities.length,
    licensed: allFacilities.filter(f => f.status === 'LICENSED').length,
    critical: allFacilities.filter(f => f.riskAssessment.level.name === 'critical').length,
    high: allFacilities.filter(f => f.riskAssessment.level.name === 'high').length,
    moderate: allFacilities.filter(f => f.riskAssessment.level.name === 'moderate').length,
    low: allFacilities.filter(f => f.riskAssessment.level.name === 'low').length,
    totalCapacity: allFacilities.reduce((sum, f) => sum + f.capacity, 0)
  };

  console.log('\n=== Statistics ===');
  console.log(`Total facilities: ${stats.total}`);
  console.log(`Licensed: ${stats.licensed}`);
  console.log(`Critical risk: ${stats.critical}`);
  console.log(`High risk: ${stats.high}`);
  console.log(`Moderate risk: ${stats.moderate}`);
  console.log(`Low risk: ${stats.low}`);
  console.log(`Total capacity: ${stats.totalCapacity.toLocaleString()}`);

  // Save output
  const countySlug = countyFilter.toLowerCase().replace(/\s+/g, '_');
  const outputFile = path.join(OUTPUT_DIR, `${countySlug}_facilities.json`);

  fs.writeFileSync(outputFile, JSON.stringify(allFacilities, null, 2));
  console.log(`\nSaved to: ${outputFile}`);

  // Show top 10 highest risk
  console.log('\n=== Top 10 Highest Risk Facilities ===');
  allFacilities.slice(0, 10).forEach((f, i) => {
    console.log(`${i + 1}. [${f.riskAssessment.score}] ${f.name}`);
    console.log(`   ${f.address}, ${f.city}`);
    console.log(`   Flags: ${f.riskAssessment.flags.join(', ')}`);
  });
}

main().catch(console.error);
