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

  // Check for multiple facilities at same address
  const sameAddress = allFacilities.filter(f =>
    f.address === facility.address &&
    f.city === facility.city &&
    f.license_number !== facility.license_number
  );

  if (sameAddress.length >= 3) {
    score += 40;
    flags.push(`${sameAddress.length + 1} facilities at same address`);
  } else if (sameAddress.length >= 1) {
    score += 15 + (sameAddress.length * 5);
    flags.push(`${sameAddress.length + 1} facilities at same address`);
  }

  // Check for multiple facilities with same licensee
  const sameLicensee = allFacilities.filter(f =>
    f.licensee === facility.licensee &&
    f.license_number !== facility.license_number
  );

  if (sameLicensee.length >= 10) {
    score += 30;
    flags.push(`Large network: ${sameLicensee.length + 1} facilities same licensee`);
  } else if (sameLicensee.length >= 5) {
    score += 20;
    flags.push(`Network: ${sameLicensee.length + 1} facilities same licensee`);
  } else if (sameLicensee.length >= 2) {
    score += 10;
    flags.push(`${sameLicensee.length + 1} facilities same licensee`);
  }

  // Check for shared phone numbers
  const samePhone = allFacilities.filter(f =>
    f.phone === facility.phone &&
    f.license_number !== facility.license_number &&
    facility.phone
  );

  if (samePhone.length >= 2) {
    score += 15;
    flags.push(`Shared phone with ${samePhone.length} other facilities`);
  }

  // Check facility status
  if (facility.status !== 'LICENSED') {
    score += 25;
    flags.push(`Status: ${facility.status}`);
  }

  // High capacity flag (potential overbilling risk)
  if (facility.capacity > 150) {
    score += 10;
    flags.push(`High capacity: ${facility.capacity}`);
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
