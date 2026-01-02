# Minnesota Data Scripts

Scripts for scraping and enriching Minnesota childcare facility data.

## Setup

```bash
cd scripts
npm install
npx playwright install chromium
```

## DHS Detail Scraper

The `scrape_dhs_details.js` script extracts detailed facility information from the [MN DHS Licensing Lookup](https://licensinglookup.dhs.state.mn.us/) site.

### Data Extracted

| Field | Description |
|-------|-------------|
| `license_holder` | Owner/operator name |
| `capacity` | Real licensed capacity (replaces estimate) |
| `capacity_infants` | Infant capacity |
| `capacity_toddlers` | Toddler capacity |
| `capacity_preschool` | Preschool capacity |
| `capacity_school_age` | School-age capacity |
| `license_effective_date` | When current license started |
| `license_first_date` | When first licensed |
| `license_expiration_date` | License expiration |
| `restrictions` | Any license restrictions |
| `total_citations` | Total violations found |
| `last_inspection_date` | Most recent visit date |
| `compliance_visits` | Array of all visits with dates and violation counts |
| `maltreatment_info` | Any maltreatment determinations |
| `phone` | Phone number if available |
| `setting_type` | Family child care setting type |

### Usage

**Test with a single facility:**
```bash
node scrape_dhs_details.js --license 800064 --visible
```

**Scrape a specific county:**
```bash
# Scrape first 10 facilities in Hennepin County
node scrape_dhs_details.js --county hennepin --limit 10

# Scrape all of Hennepin County
node scrape_dhs_details.js --county hennepin
```

**Scrape all counties:**
```bash
node scrape_dhs_details.js --all --delay 3000
```

**Preview without scraping:**
```bash
node scrape_dhs_details.js --county hennepin --dry-run
```

### Options

| Option | Description |
|--------|-------------|
| `--county <name>` | Scrape facilities for a specific county |
| `--license <num>` | Scrape a single facility by license number |
| `--all` | Scrape all counties |
| `--limit <n>` | Limit to first n facilities per county |
| `--delay <ms>` | Delay between requests (default: 2000ms) |
| `--visible` | Show browser window (useful for debugging) |
| `--dry-run` | Preview what would be scraped |
| `--help` | Show help message |

### Notes

- The script respects the DHS site by adding delays between requests
- Already-enriched facilities are skipped (look for `dhs_enriched: true`)
- Data is saved every 10 facilities to prevent data loss
- If a facility is not found on DHS, it's marked with an error
- Run with `--visible` to debug any issues with the page parsing

### Estimated Time

- ~3 seconds per facility (with 2s delay)
- Hennepin County (~1,200 facilities): ~1 hour
- All Minnesota (~7,900 facilities): ~7 hours

Consider running overnight or in batches.

## Capacity Estimates

The `add_capacity_estimates.py` script adds estimated capacity based on facility type for facilities without real capacity data.

```bash
python add_capacity_estimates.py --data-dir ../../public/data/minnesota
```

This is a fallback when DHS scraping isn't possible.
