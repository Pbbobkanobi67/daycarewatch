/**
 * Geocode California facilities using Nominatim (OpenStreetMap) API
 *
 * Usage: node scripts/geocode-california.js [county]
 * Example: node scripts/geocode-california.js san_diego
 *
 * Rate limited to 1 request per second per Nominatim usage policy.
 */

const fs = require('fs');
const path = require('path');

const COUNTY = process.argv[2] || 'san_diego';
const INPUT_FILE = path.join(__dirname, `../public/data/california/${COUNTY}_facilities.json`);
const OUTPUT_FILE = INPUT_FILE;
const BATCH_SIZE = 50;
const DELAY_MS = 1100;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// San Diego County approximate bounds
const SD_BOUNDS = {
  minLat: 32.5,
  maxLat: 33.5,
  minLng: -117.6,
  maxLng: -116.0
};

function isInSanDiego(lat, lng) {
  return lat >= SD_BOUNDS.minLat && lat <= SD_BOUNDS.maxLat &&
         lng >= SD_BOUNDS.minLng && lng <= SD_BOUNDS.maxLng;
}

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
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      // Validate it's actually in San Diego area
      if (!isInSanDiego(lat, lng)) {
        console.log(`  Warning: ${city} geocoded outside SD bounds (${lat}, ${lng})`);
        return null;
      }

      return {
        latitude: lat,
        longitude: lng,
        geocoded_address: data[0].display_name
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Try alternate address formats
async function geocodeWithRetry(facility) {
  // Try full address first
  let result = await geocodeAddress(
    facility.address,
    facility.city,
    facility.state,
    facility.zip_code
  );

  if (result) return result;

  await sleep(DELAY_MS);

  // Try without suite/unit numbers
  const cleanedAddress = facility.address
    .replace(/\s*(suite|ste|unit|apt|#)\s*\d+[a-z]*/gi, '')
    .replace(/\s*(floor|fl)\s*\d+/gi, '')
    .replace(/,\s*$/, '')
    .trim();

  if (cleanedAddress !== facility.address) {
    result = await geocodeAddress(cleanedAddress, facility.city, facility.state, facility.zip_code);
    if (result) return result;
  }

  return null;
}

async function main() {
  console.log(`Loading facilities from ${INPUT_FILE}...`);

  const facilities = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${facilities.length} facilities`);

  const alreadyGeocoded = facilities.filter(f => f.latitude && f.longitude).length;
  console.log(`Already geocoded: ${alreadyGeocoded}`);

  const needsGeocoding = facilities.filter(f => !f.latitude && f.address && f.city);
  console.log(`Need geocoding: ${needsGeocoding.length}`);

  if (needsGeocoding.length === 0) {
    console.log('All facilities are already geocoded!');
    return;
  }

  let geocoded = 0;
  let failed = 0;
  let processed = 0;

  console.log(`\nStarting geocoding (1 request/sec)...`);
  console.log(`Estimated time: ${Math.ceil(needsGeocoding.length * 1.5 / 60)} minutes\n`);

  for (const facility of facilities) {
    if (facility.latitude && facility.longitude) continue;
    if (!facility.address || !facility.city) continue;

    const result = await geocodeWithRetry(facility);
    processed++;

    if (result) {
      facility.latitude = result.latitude;
      facility.longitude = result.longitude;
      facility.geocoded_at = new Date().toISOString();
      geocoded++;
      console.log(`✓ ${processed}/${needsGeocoding.length} ${facility.name}: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`);
    } else {
      failed++;
      console.log(`✗ ${processed}/${needsGeocoding.length} ${facility.name}: failed`);
    }

    if (processed % BATCH_SIZE === 0) {
      console.log(`\nSaving progress (${processed} processed)...`);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(facilities, null, 2));
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(facilities, null, 2));

  const finalGeocoded = facilities.filter(f => f.latitude && f.longitude).length;
  console.log('\n=== Geocoding Complete ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Successfully geocoded: ${geocoded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total with coordinates: ${finalGeocoded}/${facilities.length} (${(finalGeocoded/facilities.length*100).toFixed(1)}%)`);
}

main().catch(console.error);
