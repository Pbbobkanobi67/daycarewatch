/**
 * Geocode Colorado facilities using Nominatim (OpenStreetMap) API
 *
 * Usage: node scripts/geocode-colorado.js [county]
 * Example: node scripts/geocode-colorado.js jefferson
 *
 * Rate limited to 1 request per second per Nominatim usage policy.
 */

const fs = require('fs');
const path = require('path');

const COUNTY = process.argv[2] || 'jefferson';
const INPUT_FILE = path.join(__dirname, `../public/data/colorado/${COUNTY}_facilities.json`);
const OUTPUT_FILE = INPUT_FILE;
const BATCH_SIZE = 50;
const DELAY_MS = 1100;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Colorado Denver metro approximate bounds
const CO_BOUNDS = {
  minLat: 39.3,
  maxLat: 40.1,
  minLng: -105.5,
  maxLng: -104.5
};

function isInColoradoMetro(lat, lng) {
  return lat >= CO_BOUNDS.minLat && lat <= CO_BOUNDS.maxLat &&
         lng >= CO_BOUNDS.minLng && lng <= CO_BOUNDS.maxLng;
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

      // Validate it's actually in Colorado metro area
      if (!isInColoradoMetro(lat, lng)) {
        console.log(`  Warning: ${city} geocoded outside CO metro bounds (${lat}, ${lng})`);
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

  // Try without unit/suite numbers
  const cleanAddress = facility.address
    .replace(/\s+(unit|suite|ste|apt|#)\s*\S+$/i, '')
    .replace(/\s+\d+[a-z]?$/i, '');

  if (cleanAddress !== facility.address) {
    result = await geocodeAddress(cleanAddress, facility.city, facility.state, facility.zip_code);
    if (result) return result;
    await sleep(DELAY_MS);
  }

  // Try just city + zip
  result = await geocodeAddress('', facility.city, facility.state, facility.zip_code);
  return result;
}

async function main() {
  console.log(`\nGeocoding Colorado facilities: ${COUNTY}`);
  console.log(`Input file: ${INPUT_FILE}\n`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`File not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const facilities = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const needsGeocoding = facilities.filter(f => !f.latitude || !f.longitude);

  console.log(`Total facilities: ${facilities.length}`);
  console.log(`Already geocoded: ${facilities.length - needsGeocoding.length}`);
  console.log(`Need geocoding: ${needsGeocoding.length}\n`);

  if (needsGeocoding.length === 0) {
    console.log('All facilities already geocoded!');
    return;
  }

  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < needsGeocoding.length; i++) {
    const facility = needsGeocoding[i];

    process.stdout.write(`[${i + 1}/${needsGeocoding.length}] ${facility.name.substring(0, 40)}... `);

    const result = await geocodeWithRetry(facility);

    if (result) {
      facility.latitude = result.latitude;
      facility.longitude = result.longitude;
      facility.geocoded_at = new Date().toISOString();
      geocoded++;
      console.log(`OK (${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)})`);
    } else {
      failed++;
      console.log('FAILED');
    }

    await sleep(DELAY_MS);

    // Save progress every batch
    if ((i + 1) % BATCH_SIZE === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(facilities, null, 2));
      console.log(`\n--- Saved progress: ${geocoded} geocoded, ${failed} failed ---\n`);
    }
  }

  // Final save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(facilities, null, 2));

  console.log(`\n=== Geocoding Complete ===`);
  console.log(`Geocoded: ${geocoded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((geocoded / (geocoded + failed)) * 100).toFixed(1)}%`);
}

main().catch(console.error);
