/**
 * Geocode Minnesota facilities using US Census Bureau Geocoder
 * Free, no API key required, good for US addresses
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Rate limiting - Census allows 10,000/day but we'll be conservative
const DELAY_MS = 200; // 200ms between requests
const BATCH_SIZE = 50; // Save progress every 50 facilities

// Census Bureau Geocoder API
const CENSUS_API = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeAddress(address, city, state, zip) {
  const fullAddress = `${address}, ${city}, ${state} ${zip}`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const url = `${CENSUS_API}?address=${encodedAddress}&benchmark=Public_AR_Current&format=json`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.result?.addressMatches?.length > 0) {
            const match = json.result.addressMatches[0];
            resolve({
              lat: match.coordinates.y,
              lng: match.coordinates.x,
              matchedAddress: match.matchedAddress
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function geocodeFacilities(inputFile, outputFile) {
  console.log(`Loading facilities from ${inputFile}...`);
  const facilities = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

  console.log(`Found ${facilities.length} facilities`);

  // Check how many already have coordinates
  const alreadyGeocoded = facilities.filter(f => f.latitude && f.longitude).length;
  console.log(`${alreadyGeocoded} already have coordinates`);

  let geocoded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < facilities.length; i++) {
    const facility = facilities[i];

    // Skip if already has coordinates
    if (facility.latitude && facility.longitude) {
      skipped++;
      continue;
    }

    // Skip if no address
    if (!facility.address || !facility.city) {
      console.log(`[${i + 1}/${facilities.length}] Skipping ${facility.name} - no address`);
      failed++;
      continue;
    }

    try {
      const result = await geocodeAddress(
        facility.address,
        facility.city,
        facility.state || 'MN',
        facility.zip_code || ''
      );

      if (result) {
        facility.latitude = result.lat;
        facility.longitude = result.lng;
        facility.geocoded_address = result.matchedAddress;
        geocoded++;
        console.log(`[${i + 1}/${facilities.length}] ✓ ${facility.name}: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
      } else {
        failed++;
        console.log(`[${i + 1}/${facilities.length}] ✗ ${facility.name}: No match found`);
      }
    } catch (error) {
      failed++;
      console.log(`[${i + 1}/${facilities.length}] ✗ ${facility.name}: Error - ${error.message}`);
    }

    // Rate limiting
    await sleep(DELAY_MS);

    // Save progress periodically
    if ((i + 1) % BATCH_SIZE === 0) {
      console.log(`\nSaving progress... (${geocoded} geocoded, ${failed} failed)\n`);
      fs.writeFileSync(outputFile, JSON.stringify(facilities, null, 2));
    }
  }

  // Final save
  fs.writeFileSync(outputFile, JSON.stringify(facilities, null, 2));

  console.log('\n=== Geocoding Complete ===');
  console.log(`Total: ${facilities.length}`);
  console.log(`Geocoded: ${geocoded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (already had coords): ${skipped}`);
  console.log(`Output saved to: ${outputFile}`);
}

// Run
const county = process.argv[2] || 'hennepin';
const dataDir = path.join(__dirname, '../../public/data/minnesota');
const inputFile = path.join(dataDir, `${county}_facilities.json`);
const outputFile = inputFile; // Overwrite in place

geocodeFacilities(inputFile, outputFile).catch(console.error);
