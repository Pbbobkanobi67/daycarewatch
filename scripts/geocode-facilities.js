/**
 * Geocode facilities using Nominatim (OpenStreetMap) API
 *
 * Usage: node scripts/geocode-facilities.js
 *
 * Rate limited to 1 request per second per Nominatim usage policy.
 * Progress is saved after each batch to prevent data loss.
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../public/data/minnesota/hennepin_facilities.json');
const OUTPUT_FILE = INPUT_FILE; // Overwrite in place
const BATCH_SIZE = 50; // Save progress every 50 facilities
const DELAY_MS = 1100; // Nominatim requires 1 request per second

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Geocode a single address using Nominatim
async function geocodeAddress(address, city, state, zip) {
  const fullAddress = `${address}, ${city}, ${state} ${zip || ''}`.trim();
  const encodedAddress = encodeURIComponent(fullAddress);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DaycareWatch/1.0 (https://github.com/Pbbobkanobi67/daycarewatch)'
      }
    });

    if (!response.ok) {
      console.error(`HTTP error for "${fullAddress}": ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        geocoded_address: data[0].display_name
      };
    }

    return null;
  } catch (error) {
    console.error(`Geocoding error for "${fullAddress}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('Loading facilities data...');

  const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
  const facilities = JSON.parse(rawData);

  console.log(`Loaded ${facilities.length} facilities`);

  // Count already geocoded
  const alreadyGeocoded = facilities.filter(f => f.latitude && f.longitude).length;
  console.log(`Already geocoded: ${alreadyGeocoded}`);

  // Get facilities that need geocoding
  const needsGeocoding = facilities.filter(f => !f.latitude && f.address && f.city);
  console.log(`Need geocoding: ${needsGeocoding.length}`);

  if (needsGeocoding.length === 0) {
    console.log('All facilities are already geocoded!');
    return;
  }

  let geocoded = 0;
  let failed = 0;
  let processed = 0;

  console.log('\nStarting geocoding (1 request/sec)...');
  console.log(`Estimated time: ${Math.ceil(needsGeocoding.length / 60)} minutes\n`);

  for (const facility of facilities) {
    // Skip if already geocoded
    if (facility.latitude && facility.longitude) {
      continue;
    }

    // Skip if no address
    if (!facility.address || !facility.city) {
      console.log(`Skipping ${facility.name || facility.license_number}: missing address`);
      continue;
    }

    const result = await geocodeAddress(
      facility.address,
      facility.city,
      facility.state || 'MN',
      facility.zip_code
    );

    processed++;

    if (result) {
      facility.latitude = result.latitude;
      facility.longitude = result.longitude;
      facility.geocoded_at = new Date().toISOString();
      geocoded++;
      console.log(`✓ ${processed}/${needsGeocoding.length} ${facility.name}: ${result.latitude}, ${result.longitude}`);
    } else {
      failed++;
      console.log(`✗ ${processed}/${needsGeocoding.length} ${facility.name}: geocoding failed`);
    }

    // Save progress every BATCH_SIZE facilities
    if (processed % BATCH_SIZE === 0) {
      console.log(`\nSaving progress (${processed} processed)...`);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(facilities, null, 2));
      console.log('Progress saved.\n');
    }

    // Rate limiting
    await sleep(DELAY_MS);
  }

  // Final save
  console.log('\nSaving final results...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(facilities, null, 2));

  console.log('\n=== Geocoding Complete ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Successfully geocoded: ${geocoded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((geocoded / processed) * 100).toFixed(1)}%`);
}

main().catch(console.error);
