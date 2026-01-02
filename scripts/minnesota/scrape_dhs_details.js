#!/usr/bin/env node
/**
 * Minnesota DHS Licensing Detail Scraper
 *
 * Scrapes detailed facility information from the MN DHS Licensing Lookup site
 * using Playwright to bypass bot protection.
 *
 * Data extracted:
 * - License holder name (owner/operator)
 * - Real capacity (by age group)
 * - License status and effective dates
 * - Restrictions
 * - Compliance history (visits and violations)
 * - Maltreatment determinations
 *
 * Usage:
 *   node scrape_dhs_details.js --county hennepin
 *   node scrape_dhs_details.js --county hennepin --limit 10
 *   node scrape_dhs_details.js --license 800064
 *   node scrape_dhs_details.js --all --delay 3000
 *
 * Requirements:
 *   npm install playwright
 *   npx playwright install chromium
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

// Add stealth plugin to avoid bot detection
chromium.use(StealthPlugin());

// Configuration
const CONFIG = {
  baseUrl: 'https://licensinglookup.dhs.state.mn.us/Details.aspx',
  dataDir: path.join(__dirname, '..', '..', 'public', 'data', 'minnesota'),
  delayBetweenRequests: 2000, // ms between requests to be respectful
  timeout: 30000, // page load timeout
  headless: true, // set to false to see browser
  retryAttempts: 3,
  retryDelay: 5000,
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    county: null,
    license: null,
    all: false,
    limit: null,
    delay: CONFIG.delayBetweenRequests,
    headless: CONFIG.headless,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--county':
        options.county = args[++i];
        break;
      case '--license':
        options.license = args[++i];
        break;
      case '--all':
        options.all = true;
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--delay':
        options.delay = parseInt(args[++i], 10);
        break;
      case '--visible':
        options.headless = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Minnesota DHS Detail Scraper

Usage:
  node scrape_dhs_details.js [options]

Options:
  --county <name>   Scrape facilities for a specific county (e.g., hennepin)
  --license <num>   Scrape a single facility by license number
  --all             Scrape all counties
  --limit <n>       Limit to first n facilities per county
  --delay <ms>      Delay between requests (default: 2000ms)
  --visible         Show browser window (useful for debugging)
  --dry-run         Preview what would be scraped without making requests
  --help            Show this help message

Examples:
  node scrape_dhs_details.js --license 800064
  node scrape_dhs_details.js --county hennepin --limit 5 --visible
  node scrape_dhs_details.js --all --delay 3000
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract facility details from the DHS page
 */
async function extractFacilityDetails(page) {
  return await page.evaluate(() => {
    const data = {
      scraped_from_dhs: true,
      dhs_scraped_at: new Date().toISOString(),
    };

    // Get all text content for regex matching
    const allText = document.body.innerText;

    // Program name - look for the main header
    const headerEl = document.querySelector('#MainContent_lblProgName, #lblProgName, h1');
    if (headerEl) {
      const name = headerEl.textContent.trim();
      if (name && !name.toLowerCase().includes('details')) {
        data.program_name_dhs = name;
      }
    }

    // License holder name - look for specific label
    const holderMatch = allText.match(/License\s*Holder[:\s]*\(?s?\)?[:\s]*\n?\s*([^\n]+)/i);
    if (holderMatch) {
      let holder = holderMatch[1].trim();
      // Clean up common prefixes
      holder = holder.replace(/^\(?s?\)?[:\s]*/i, '').trim();
      if (holder && holder !== 'Details' && !holder.match(/^License/) && holder.length > 2) {
        data.license_holder = holder;
      }
    }

    // Capacity - look for "Licensed Capacity" or just "Capacity"
    const capacityMatch = allText.match(/(?:Licensed\s+)?Capacity[:\s]*(\d+)/i);
    if (capacityMatch) {
      data.capacity_dhs = parseInt(capacityMatch[1], 10);
    }

    // Age-specific capacity
    const infantMatch = allText.match(/Infant[s]?[:\s]*(\d+)/i);
    if (infantMatch) data.capacity_infants = parseInt(infantMatch[1], 10);

    const toddlerMatch = allText.match(/Toddler[s]?[:\s]*(\d+)/i);
    if (toddlerMatch) data.capacity_toddlers = parseInt(toddlerMatch[1], 10);

    const preschoolMatch = allText.match(/Preschool(?:er)?[s]?[:\s]*(\d+)/i);
    if (preschoolMatch) data.capacity_preschool = parseInt(preschoolMatch[1], 10);

    const schoolAgeMatch = allText.match(/School[\s-]?Age[:\s]*(\d+)/i);
    if (schoolAgeMatch) data.capacity_school_age = parseInt(schoolAgeMatch[1], 10);

    // License status
    const statusMatch = allText.match(/Status[:\s]*(Active|Inactive|Suspended|Revoked|Probation)/i);
    if (statusMatch) data.license_status_dhs = statusMatch[1].trim();

    // License dates
    const effectiveMatch = allText.match(/Effective\s*(?:Date)?[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (effectiveMatch) data.license_effective_date = effectiveMatch[1];

    const expirationMatch = allText.match(/Expir(?:ation|es?)\s*(?:Date)?[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (expirationMatch) data.license_expiration_date = expirationMatch[1];

    const firstLicensedMatch = allText.match(/First\s+Licensed[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (firstLicensedMatch) data.license_first_date = firstLicensedMatch[1];

    // Restrictions - look after "Restriction" header
    const restrictionsMatch = allText.match(/Restrictions?\s*\n+([^\n]+)/i);
    if (restrictionsMatch) {
      const restrictions = restrictionsMatch[1].trim();
      if (restrictions && restrictions.toLowerCase() !== 'none' && restrictions.length > 2) {
        data.restrictions = restrictions;
      }
    }

    // Extract visits/inspections from compliance tables
    data.visits = [];

    // Find all date patterns in compliance section
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})\s*(Licensing\s+(?:Review|Investigation|Inspection)|Complaint\s+Investigation|Monitoring\s+Visit)/gi;
    let match;
    while ((match = datePattern.exec(allText)) !== null) {
      const visit = {
        date: match[1],
        type: match[2].trim()
      };
      // Check if this date already exists (avoid duplicates)
      if (!data.visits.find(v => v.date === visit.date && v.type === visit.type)) {
        data.visits.push(visit);
      }
    }

    // Count visits with violations
    const violationMatches = allText.match(/See Violation/gi);
    if (violationMatches) {
      data.visits_with_violations = violationMatches.length;
    }

    // Last inspection date - use the most recent visit
    if (data.visits.length > 0) {
      const sortedVisits = [...data.visits].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      data.last_inspection_date_dhs = sortedVisits[0].date;
      data.total_visits_dhs = data.visits.length;
    }

    // Check for maltreatment determinations
    if (allText.includes('Maltreatment') && !allText.match(/Maltreatment.*None/i)) {
      const maltMatch = allText.match(/Maltreatment[:\s]*\n?\s*([^\n]+)/i);
      if (maltMatch && !maltMatch[1].toLowerCase().includes('none')) {
        data.has_maltreatment = true;
        data.maltreatment_info = maltMatch[1].trim();
      }
    }

    // Phone number
    const phoneMatch = allText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    if (phoneMatch) {
      data.phone_dhs = phoneMatch[0];
    }

    // Address - look for street address pattern
    const addressMatch = allText.match(/(\d+\s+[A-Za-z0-9\s.,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Blvd|Boulevard|Circle|Cir)[.,]?\s*(?:#?\s*\d+)?)/i);
    if (addressMatch) {
      data.address_dhs = addressMatch[1].trim();
    }

    // Setting type for family child care
    const settingMatch = allText.match(/Setting\s*Type[:\s]*([^\n]+)/i);
    if (settingMatch) {
      const setting = settingMatch[1].trim();
      if (setting && setting.length < 100) {
        data.setting_type = setting;
      }
    }

    // License type
    const typeMatch = allText.match(/License\s*Type[:\s]*(Child\s+Care\s+Center|Family\s+Child\s+Care|Group\s+Family)/i);
    if (typeMatch) {
      data.license_type_dhs = typeMatch[1].trim();
    }

    // Clean up - remove empty visits array
    if (data.visits.length === 0) {
      delete data.visits;
    }

    return data;
  });
}

/**
 * Scrape a single facility by license number
 */
async function scrapeFacility(browser, licenseNumber, options = {}) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/Chicago',
  });

  const page = await context.newPage();
  const url = `${CONFIG.baseUrl}?l=${licenseNumber}`;

  console.log(`  Scraping license #${licenseNumber}...`);

  try {
    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'commit',
      timeout: CONFIG.timeout
    });

    // Wait for bot challenge to complete - it should redirect automatically
    console.log(`    Waiting for page to load...`);

    // Try to wait for an element that exists on the real DHS page
    try {
      // Wait up to 45 seconds for the real page content
      await page.waitForSelector('form, #MainContent, .details-container, table', {
        timeout: 45000
      });
      console.log(`    Page loaded successfully`);
    } catch (waitError) {
      // Check if we're still on challenge page
      const currentUrl = page.url();
      const pageContent = await page.content();

      if (currentUrl.includes('validate.perfdrive.com') ||
          pageContent.includes('Checking your browser') ||
          pageContent.includes('Please wait') ||
          pageContent.includes('challenge')) {
        console.log(`    Bot challenge not resolved after 45s`);

        // Try one more approach - wait longer
        console.log(`    Waiting additional 15s for challenge...`);
        await sleep(15000);

        // Check again
        const newContent = await page.content();
        if (newContent.includes('validate.perfdrive.com') ||
            newContent.includes('challenge')) {
          console.log(`    Could not bypass bot protection`);
          return { error: 'bot_protection', license_number: licenseNumber };
        }
      }
    }

    // Additional wait for dynamic content
    await sleep(2000);

    // Check for "not found" or error page
    const bodyText = await page.textContent('body');
    if (bodyText.includes('not found') ||
        bodyText.includes('No records') ||
        bodyText.includes('does not exist')) {
      console.log(`    License #${licenseNumber} not found on DHS site`);
      return { error: 'not_found', license_number: licenseNumber };
    }

    // Extract the data
    const data = await extractFacilityDetails(page);
    data.license_number = licenseNumber;

    console.log(`    Found: ${data.program_name_dhs || 'Unknown'}, Capacity: ${data.capacity_dhs || 'N/A'}`);

    return data;

  } catch (error) {
    console.error(`    Error scraping ${licenseNumber}: ${error.message}`);
    return { error: error.message, license_number: licenseNumber };
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * Load facilities from a county file
 */
async function loadCountyFacilities(countyName) {
  const filename = `${countyName.toLowerCase().replace(/ /g, '_')}_facilities.json`;
  const filepath = path.join(CONFIG.dataDir, filename);

  try {
    const data = await fs.readFile(filepath, 'utf-8');
    return { facilities: JSON.parse(data), filepath };
  } catch (error) {
    console.error(`Error loading ${filename}: ${error.message}`);
    return { facilities: [], filepath };
  }
}

/**
 * Save updated facilities to file
 */
async function saveFacilities(facilities, filepath) {
  await fs.writeFile(filepath, JSON.stringify(facilities, null, 2));
  console.log(`Saved ${facilities.length} facilities to ${path.basename(filepath)}`);
}

/**
 * Merge scraped DHS data into facility record
 */
function mergeDhsData(facility, dhsData) {
  if (dhsData.error) return facility;

  const updated = { ...facility };

  // Update capacity if we got real data
  if (dhsData.capacity_dhs) {
    updated.capacity = dhsData.capacity_dhs;
    updated.capacity_estimated = false;
    updated.capacity_infants = dhsData.capacity_infants || null;
    updated.capacity_toddlers = dhsData.capacity_toddlers || null;
    updated.capacity_preschool = dhsData.capacity_preschool || null;
    updated.capacity_school_age = dhsData.capacity_school_age || null;
  }

  // License holder (owner)
  if (dhsData.license_holder) {
    updated.license_holder = dhsData.license_holder;
  }

  // License dates
  if (dhsData.license_effective_date) {
    updated.license_effective_date = dhsData.license_effective_date;
  }
  if (dhsData.license_first_date) {
    updated.license_first_date = dhsData.license_first_date;
  }
  if (dhsData.license_expiration_date) {
    updated.license_expiration_date = dhsData.license_expiration_date;
  }

  // Status
  if (dhsData.license_status_dhs) {
    updated.status = dhsData.license_status_dhs.toUpperCase();
  }

  // Restrictions
  if (dhsData.restrictions) {
    updated.restrictions = dhsData.restrictions;
  }

  // Violations/visits
  if (dhsData.total_violations_dhs !== undefined) {
    updated.total_citations = dhsData.total_violations_dhs;
  }
  if (dhsData.last_visit_date) {
    updated.last_inspection_date = dhsData.last_visit_date;
  }
  if (dhsData.visits && dhsData.visits.length > 0) {
    updated.compliance_visits = dhsData.visits;
    updated.total_visits = dhsData.visits.length;
  }

  // Maltreatment
  if (dhsData.maltreatment_info) {
    updated.maltreatment_info = dhsData.maltreatment_info;
  }

  // Phone
  if (dhsData.phone_dhs && !updated.phone) {
    updated.phone = dhsData.phone_dhs;
  }

  // Setting type
  if (dhsData.setting_type) {
    updated.setting_type = dhsData.setting_type;
  }

  // Mark as enriched
  updated.dhs_enriched = true;
  updated.dhs_enriched_at = new Date().toISOString();

  return updated;
}

/**
 * Get list of all county files
 */
async function getAllCountyFiles() {
  const files = await fs.readdir(CONFIG.dataDir);
  return files
    .filter(f => f.endsWith('_facilities.json'))
    .map(f => f.replace('_facilities.json', '').replace(/_/g, ' '));
}

/**
 * Main scraper function
 */
async function main() {
  const options = parseArgs();

  console.log('\n=== Minnesota DHS Detail Scraper ===\n');

  // Determine what to scrape
  let facilitiesToScrape = [];
  let countyFilePath = null;

  if (options.license) {
    // Single license
    facilitiesToScrape = [{ license_number: options.license }];
    console.log(`Scraping single license: ${options.license}`);
  } else if (options.county) {
    // Single county
    const { facilities, filepath } = await loadCountyFacilities(options.county);
    facilitiesToScrape = facilities;
    countyFilePath = filepath;
    console.log(`Loaded ${facilities.length} facilities from ${options.county} county`);
  } else if (options.all) {
    // All counties - we'll process one at a time
    const counties = await getAllCountyFiles();
    console.log(`Found ${counties.length} county files to process`);

    // For --all, we process each county separately
    const browser = await chromium.launch({ headless: options.headless });

    for (const county of counties) {
      console.log(`\n--- Processing ${county} county ---`);
      const { facilities, filepath } = await loadCountyFacilities(county);

      if (facilities.length === 0) continue;

      let toScrape = facilities.filter(f => !f.dhs_enriched);
      if (options.limit) toScrape = toScrape.slice(0, options.limit);

      console.log(`${toScrape.length} facilities to scrape (${facilities.length - toScrape.length} already enriched)`);

      if (options.dryRun) {
        console.log('Dry run - skipping actual scraping');
        continue;
      }

      for (let i = 0; i < toScrape.length; i++) {
        const facility = toScrape[i];
        console.log(`[${i + 1}/${toScrape.length}]`);

        const dhsData = await scrapeFacility(browser, facility.license_number, options);

        // Find and update facility in array
        const idx = facilities.findIndex(f => f.license_number === facility.license_number);
        if (idx !== -1) {
          facilities[idx] = mergeDhsData(facilities[idx], dhsData);
        }

        // Save periodically
        if ((i + 1) % 10 === 0) {
          await saveFacilities(facilities, filepath);
        }

        // Delay between requests
        if (i < toScrape.length - 1) {
          await sleep(options.delay);
        }
      }

      // Final save for county
      await saveFacilities(facilities, filepath);
    }

    await browser.close();
    console.log('\n=== All counties processed ===\n');
    return;
  } else {
    console.log('Please specify --county, --license, or --all. Use --help for options.');
    process.exit(1);
  }

  // Apply limit
  if (options.limit && facilitiesToScrape.length > options.limit) {
    facilitiesToScrape = facilitiesToScrape.slice(0, options.limit);
    console.log(`Limited to ${options.limit} facilities`);
  }

  // Filter out already enriched
  const needsScraping = facilitiesToScrape.filter(f => !f.dhs_enriched);
  console.log(`${needsScraping.length} facilities need scraping (${facilitiesToScrape.length - needsScraping.length} already enriched)`);

  if (options.dryRun) {
    console.log('\nDry run - would scrape:');
    needsScraping.slice(0, 10).forEach(f => {
      console.log(`  - ${f.license_number}: ${f.name}`);
    });
    if (needsScraping.length > 10) console.log(`  ... and ${needsScraping.length - 10} more`);
    return;
  }

  if (needsScraping.length === 0) {
    console.log('All facilities already enriched. Use --all to re-scrape.');
    return;
  }

  // Launch browser
  console.log(`\nLaunching browser (headless: ${options.headless})...`);
  const browser = await chromium.launch({ headless: options.headless });

  try {
    const results = [];

    for (let i = 0; i < needsScraping.length; i++) {
      const facility = needsScraping[i];
      console.log(`\n[${i + 1}/${needsScraping.length}]`);

      let dhsData = null;
      let attempts = 0;

      while (attempts < CONFIG.retryAttempts) {
        dhsData = await scrapeFacility(browser, facility.license_number, options);

        if (!dhsData.error || dhsData.error === 'not_found') break;

        attempts++;
        if (attempts < CONFIG.retryAttempts) {
          console.log(`    Retry ${attempts}/${CONFIG.retryAttempts} in ${CONFIG.retryDelay/1000}s...`);
          await sleep(CONFIG.retryDelay);
        }
      }

      results.push(dhsData);

      // Update facility in original array
      if (countyFilePath) {
        const idx = facilitiesToScrape.findIndex(f => f.license_number === facility.license_number);
        if (idx !== -1) {
          facilitiesToScrape[idx] = mergeDhsData(facilitiesToScrape[idx], dhsData);
        }
      }

      // Delay between requests
      if (i < needsScraping.length - 1) {
        await sleep(options.delay);
      }

      // Save periodically
      if (countyFilePath && (i + 1) % 10 === 0) {
        await saveFacilities(facilitiesToScrape, countyFilePath);
      }
    }

    // Final save
    if (countyFilePath) {
      await saveFacilities(facilitiesToScrape, countyFilePath);
    }

    // Summary
    console.log('\n=== Summary ===');
    const successful = results.filter(r => !r.error).length;
    const notFound = results.filter(r => r.error === 'not_found').length;
    const errors = results.filter(r => r.error && r.error !== 'not_found').length;

    console.log(`Successful: ${successful}`);
    console.log(`Not found: ${notFound}`);
    console.log(`Errors: ${errors}`);

    // Show sample of successful data
    if (successful > 0 && options.license) {
      const sample = results.find(r => !r.error);
      console.log('\nSample scraped data:');
      console.log(JSON.stringify(sample, null, 2));
    }

  } finally {
    await browser.close();
  }

  console.log('\nDone!');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
