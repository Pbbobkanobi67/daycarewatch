/**
 * Process Colorado childcare facility data
 * Filters for Jefferson and Arapahoe counties and converts to app format
 */

const fs = require('fs');
const path = require('path');

// Load raw data
const rawDataPath = path.join(__dirname, '../public/data/colorado/all_facilities_raw.json');
const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

// Counties to process
const targetCounties = ['Jefferson', 'Arapahoe'];

// Convert to app format
function convertFacility(f) {
  return {
    license_number: f.provider_id,
    name: f.provider_name,
    type: f.provider_service_type,
    licensee: f.governing_body !== 'NA' ? f.governing_body : f.provider_name,
    address: f.street_address,
    city: f.city,
    state: f.state,
    zip_code: f.zip,
    county: f.county,
    capacity: parseInt(f.total_licensed_capacity) || 0,
    infant_capacity: parseInt(f.licensed_infant_capacity) || 0,
    toddler_capacity: parseInt(f.licensed_toddler_capacity) || 0,
    school_age_capacity: parseInt(f.licensed_school_age_capacity) || 0,
    quality_rating: f.quality_rating !== 'NA' ? f.quality_rating : null,
    cccap_authorized: f.cccap_fa_status_d1 || f.cccap_authorization_status,
    school_district: f.school_district,
    status: 'LICENSED',
    data_source: 'Colorado CDEC Open Data',
    scraped_at: new Date().toISOString()
  };
}

// Process each county
for (const county of targetCounties) {
  const countyData = rawData.filter(f => f.county === county);
  const converted = countyData.map(convertFacility);

  const filename = county.toLowerCase() + '_facilities.json';
  const outputPath = path.join(__dirname, '../public/data/colorado', filename);

  fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
  console.log(`${county}: ${converted.length} facilities saved to ${filename}`);
}

// Create summary
const summary = {
  state: 'Colorado',
  state_id: 'colorado',
  last_updated: new Date().toISOString(),
  total_facilities: targetCounties.reduce((sum, county) => {
    return sum + rawData.filter(f => f.county === county).length;
  }, 0),
  counties: targetCounties.map(county => ({
    name: county,
    id: county.toLowerCase(),
    facility_count: rawData.filter(f => f.county === county).length
  })),
  data_source: 'Colorado CDEC Open Data Portal',
  data_source_url: 'https://data.colorado.gov/resource/a9rr-k8mu'
};

const summaryPath = path.join(__dirname, '../public/data/colorado/summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log('\nSummary saved to summary.json');
console.log('Total facilities:', summary.total_facilities);
