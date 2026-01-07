/**
 * Geocode Maryland childcare facilities using Nominatim
 * Run with: node scripts/geocode-maryland.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Montgomery County, MD bounds (approximate)
const MD_BOUNDS = {
  minLat: 38.9,
  maxLat: 39.4,
  minLng: -77.5,
  maxLng: -76.9
};

// Rate limiting - Nominatim requires max 1 request per second
const RATE_LIMIT_MS = 1100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    // Add Maryland to improve results
    const query = `${address}, Maryland, USA`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&countrycodes=us`;

    const options = {
      headers: {
        'User-Agent': 'DaycareWatch/1.0 (childcare transparency project)'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);

            // Validate within Montgomery County bounds
            if (lat >= MD_BOUNDS.minLat && lat <= MD_BOUNDS.maxLat &&
                lon >= MD_BOUNDS.minLng && lon <= MD_BOUNDS.maxLng) {
              resolve({ lat, lon, display: results[0].display_name });
            } else {
              resolve({ lat: null, lon: null, error: 'Outside Montgomery County bounds' });
            }
          } else {
            resolve({ lat: null, lon: null, error: 'No results' });
          }
        } catch (e) {
          resolve({ lat: null, lon: null, error: e.message });
        }
      });
    }).on('error', (e) => {
      resolve({ lat: null, lon: null, error: e.message });
    });
  });
}

async function geocodeFacilities(inputFile, outputFile) {
  console.log(`Reading facilities from ${inputFile}...`);

  const facilities = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log(`Found ${facilities.length} facilities to geocode`);

  // Filter to only LICENSED facilities to save time
  const toGeocode = facilities.filter(f => f.status === 'LICENSED' && !f.latitude);
  console.log(`${toGeocode.length} licensed facilities need geocoding`);

  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < facilities.length; i++) {
    const facility = facilities[i];

    // Skip already geocoded or non-licensed
    if (facility.latitude || facility.status !== 'LICENSED') {
      continue;
    }

    if (!facility.address) {
      console.log(`  [${i + 1}] ${facility.name} - No address`);
      failed++;
      continue;
    }

    // Geocode
    const result = await geocodeAddress(facility.address);

    if (result.lat && result.lon) {
      facility.latitude = result.lat;
      facility.longitude = result.lon;
      facility.geocoded_at = new Date().toISOString();
      geocoded++;
      console.log(`  [${i + 1}] ${facility.name} - OK (${result.lat.toFixed(4)}, ${result.lon.toFixed(4)})`);
    } else {
      failed++;
      console.log(`  [${i + 1}] ${facility.name} - FAILED: ${result.error}`);
    }

    // Progress update every 50
    if ((geocoded + failed) % 50 === 0) {
      console.log(`\n  Progress: ${geocoded} geocoded, ${failed} failed\n`);

      // Save intermediate results
      fs.writeFileSync(outputFile, JSON.stringify(facilities, null, 2));
    }

    // Rate limiting
    await sleep(RATE_LIMIT_MS);
  }

  // Save final results
  fs.writeFileSync(outputFile, JSON.stringify(facilities, null, 2));

  console.log(`\n=== GEOCODING COMPLETE ===`);
  console.log(`Geocoded: ${geocoded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total licensed: ${toGeocode.length}`);
  console.log(`Success rate: ${((geocoded / toGeocode.length) * 100).toFixed(1)}%`);
  console.log(`Output saved to: ${outputFile}`);
}

// Main
const dataDir = path.join(__dirname, '..', 'public', 'data', 'maryland');
const inputFile = path.join(dataDir, 'montgomery_facilities.json');
const outputFile = inputFile; // Overwrite with geocoded data

geocodeFacilities(inputFile, outputFile).catch(console.error);
