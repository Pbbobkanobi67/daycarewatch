/**
 * Retry geocoding for failed facilities with address variations
 *
 * Tries multiple address formats to improve geocoding success rate
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../public/data/minnesota/hennepin_facilities.json');
const DELAY_MS = 1100;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Clean address for better geocoding
function cleanAddress(address) {
  if (!address) return '';
  return address
    // Remove suite/unit numbers
    .replace(/\s*(suite|ste|unit|apt|#)\s*\d+[a-z]*/gi, '')
    // Remove floor numbers
    .replace(/\s*(floor|fl)\s*\d+/gi, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Try geocoding with different address formats
async function geocodeWithRetry(facility) {
  const variations = [
    // Original address
    `${facility.address}, ${facility.city}, MN ${facility.zip_code || ''}`,
    // Cleaned address (no suite)
    `${cleanAddress(facility.address)}, ${facility.city}, MN`,
    // Just street and city
    `${facility.address.split(',')[0]}, ${facility.city}, Minnesota`,
    // Zip code based
    `${cleanAddress(facility.address)}, ${facility.zip_code?.substring(0, 5) || ''}`
  ];

  for (const addr of variations) {
    const result = await tryGeocode(addr.trim());
    if (result) {
      return result;
    }
    await sleep(DELAY_MS);
  }
  return null;
}

async function tryGeocode(fullAddress) {
  const encodedAddress = encodeURIComponent(fullAddress);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DaycareWatch/1.0 (https://github.com/Pbbobkanobi67/daycarewatch)'
      }
    });

    if (!response.ok) return null;

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
    return null;
  }
}

async function main() {
  console.log('Loading facilities data...');
  const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
  const facilities = JSON.parse(rawData);

  const needsGeocoding = facilities.filter(f => !f.latitude && f.address && f.city);
  console.log(`Need geocoding: ${needsGeocoding.length}`);

  if (needsGeocoding.length === 0) {
    console.log('All facilities are already geocoded!');
    return;
  }

  let geocoded = 0;
  let failed = 0;
  let processed = 0;

  console.log('\nRetrying with address variations...\n');

  for (const facility of facilities) {
    if (facility.latitude && facility.longitude) continue;
    if (!facility.address || !facility.city) continue;

    processed++;
    const result = await geocodeWithRetry(facility);

    if (result) {
      facility.latitude = result.latitude;
      facility.longitude = result.longitude;
      facility.geocoded_at = new Date().toISOString();
      geocoded++;
      console.log(`✓ ${processed}/${needsGeocoding.length} ${facility.name}: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`);
    } else {
      failed++;
      console.log(`✗ ${processed}/${needsGeocoding.length} ${facility.name}: all variations failed`);
    }

    // Save every 20 facilities
    if (processed % 20 === 0) {
      fs.writeFileSync(INPUT_FILE, JSON.stringify(facilities, null, 2));
      console.log(`  [Progress saved]`);
    }
  }

  // Final save
  fs.writeFileSync(INPUT_FILE, JSON.stringify(facilities, null, 2));

  console.log('\n=== Retry Complete ===');
  console.log(`Newly geocoded: ${geocoded}`);
  console.log(`Still failed: ${failed}`);

  const total = facilities.filter(f => f.latitude && f.longitude).length;
  console.log(`Total with coordinates: ${total}/${facilities.length} (${((total/facilities.length)*100).toFixed(1)}%)`);
}

main().catch(console.error);
