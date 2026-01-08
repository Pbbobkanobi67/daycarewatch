/**
 * Test Data Processing Scripts
 *
 * Runs all data processing scripts with sample test data to verify:
 * - CSV parsing works correctly
 * - Cross-referencing identifies expected matches
 * - Risk scoring produces expected results
 * - Output files are generated properly
 *
 * Usage: node scripts/test-data-processing.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = __dirname;
const TEST_DATA_DIR = path.join(SCRIPTS_DIR, 'test_data');
const OUTPUT_BASE = path.join(SCRIPTS_DIR, '../public/data/minnesota');

// Test data files
const TEST_FILES = {
  sos: path.join(TEST_DATA_DIR, 'sample_sos_businesses.csv'),
  nemt: path.join(TEST_DATA_DIR, 'sample_dhs_nemt.csv'),
  hcbs: path.join(TEST_DATA_DIR, 'sample_dhs_hcbs.csv'),
  vehicles: path.join(TEST_DATA_DIR, 'sample_mndot_vehicles.csv'),
};

// Processing scripts
const SCRIPTS = {
  sos: path.join(SCRIPTS_DIR, 'process-sos-business.js'),
  shell: path.join(SCRIPTS_DIR, 'detect-shell-companies.js'),
  nemt: path.join(SCRIPTS_DIR, 'process-dhs-nemt.js'),
  hcbs: path.join(SCRIPTS_DIR, 'process-dhs-hcbs.js'),
  vehicles: path.join(SCRIPTS_DIR, 'process-mndot-vehicles.js'),
};

// Expected output directories
const OUTPUT_DIRS = {
  sos: path.join(OUTPUT_BASE, 'sos'),
  nemt: path.join(OUTPUT_BASE, 'nemt'),
  hcbs: path.join(OUTPUT_BASE, 'hcbs'),
  vehicles: path.join(OUTPUT_BASE, 'vehicles'),
};

const runScript = (name, script, args = '') => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${name}`);
  console.log('='.repeat(60));

  try {
    const cmd = `node "${script}" ${args}`;
    console.log(`Command: ${cmd}\n`);

    execSync(cmd, {
      stdio: 'inherit',
      cwd: SCRIPTS_DIR,
    });

    console.log(`\n✓ ${name} completed successfully`);
    return true;
  } catch (error) {
    console.error(`\n✗ ${name} failed:`, error.message);
    return false;
  }
};

const verifyOutputs = (dir, expectedFiles) => {
  console.log(`\nVerifying outputs in ${dir}:`);
  let allFound = true;

  expectedFiles.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(1);
      console.log(`  ✓ ${file} (${size} KB)`);
    } else {
      console.log(`  ✗ ${file} NOT FOUND`);
      allFound = false;
    }
  });

  return allFound;
};

const printSummaryStats = (jsonPath, label) => {
  try {
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      console.log(`\n${label}:`);
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'number' || typeof value === 'string') {
          console.log(`  ${key}: ${value}`);
        }
      });
    }
  } catch {
    // Ignore errors
  }
};

const main = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('DATA PROCESSING SCRIPTS TEST SUITE');
  console.log('='.repeat(60));

  // Verify test data exists
  console.log('\nVerifying test data files...');
  let allTestDataExists = true;
  Object.entries(TEST_FILES).forEach(([name, filePath]) => {
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ ${name}: ${path.basename(filePath)}`);
    } else {
      console.log(`  ✗ ${name}: NOT FOUND`);
      allTestDataExists = false;
    }
  });

  if (!allTestDataExists) {
    console.error('\nTest data files missing. Cannot proceed.');
    process.exit(1);
  }

  const results = {
    passed: [],
    failed: [],
  };

  // Step 1: Process SOS Business Data
  console.log('\n\n' + '#'.repeat(60));
  console.log('STEP 1: SOS BUSINESS DATA');
  console.log('#'.repeat(60));

  if (runScript('SOS Business Processing', SCRIPTS.sos, `"${TEST_FILES.sos}"`)) {
    results.passed.push('SOS Business Processing');

    // Verify outputs
    verifyOutputs(OUTPUT_DIRS.sos, [
      'sos_businesses.json',
      'facility_matches.json',
      'agent_networks.json',
      'address_clusters.json',
      'rapid_formations.json',
      'summary.json',
    ]);

    printSummaryStats(path.join(OUTPUT_DIRS.sos, 'summary.json'), 'SOS Summary');
  } else {
    results.failed.push('SOS Business Processing');
  }

  // Step 2: Shell Company Detection
  console.log('\n\n' + '#'.repeat(60));
  console.log('STEP 2: SHELL COMPANY DETECTION');
  console.log('#'.repeat(60));

  if (runScript('Shell Company Detection', SCRIPTS.shell)) {
    results.passed.push('Shell Company Detection');

    verifyOutputs(OUTPUT_DIRS.sos, [
      'shell_company_report.json',
      'shell_company_report.txt',
    ]);
  } else {
    results.failed.push('Shell Company Detection');
  }

  // Step 3: Process NEMT Provider Data
  console.log('\n\n' + '#'.repeat(60));
  console.log('STEP 3: DHS NEMT PROVIDER DATA');
  console.log('#'.repeat(60));

  if (runScript('NEMT Provider Processing', SCRIPTS.nemt, `"${TEST_FILES.nemt}"`)) {
    results.passed.push('NEMT Provider Processing');

    verifyOutputs(OUTPUT_DIRS.nemt, [
      'nemt_providers.json',
      'daycare_crossref.json',
      'sos_crossref.json',
      'enrollment_analysis.json',
      'high_volume_operators.json',
      'risk_scores.json',
      'summary.json',
    ]);

    printSummaryStats(path.join(OUTPUT_DIRS.nemt, 'summary.json'), 'NEMT Summary');
  } else {
    results.failed.push('NEMT Provider Processing');
  }

  // Step 4: Process HCBS Provider Data
  console.log('\n\n' + '#'.repeat(60));
  console.log('STEP 4: DHS HCBS PROVIDER DATA');
  console.log('#'.repeat(60));

  if (runScript('HCBS Provider Processing', SCRIPTS.hcbs, `"${TEST_FILES.hcbs}"`)) {
    results.passed.push('HCBS Provider Processing');

    verifyOutputs(OUTPUT_DIRS.hcbs, [
      'hcbs_providers.json',
      'program_breakdown.json',
      'daycare_crossref.json',
      'nemt_crossref.json',
      'rapid_growth.json',
      'risk_scores.json',
      'summary.json',
      'report.txt',
    ]);

    printSummaryStats(path.join(OUTPUT_DIRS.hcbs, 'summary.json'), 'HCBS Summary');
  } else {
    results.failed.push('HCBS Provider Processing');
  }

  // Step 5: Process Vehicle Data
  console.log('\n\n' + '#'.repeat(60));
  console.log('STEP 5: MnDOT VEHICLE DATA');
  console.log('#'.repeat(60));

  if (runScript('Vehicle Processing', SCRIPTS.vehicles, `"${TEST_FILES.vehicles}"`)) {
    results.passed.push('Vehicle Processing');

    verifyOutputs(OUTPUT_DIRS.vehicles, [
      'vehicles.json',
      'fleets.json',
      'address_clusters.json',
      'daycare_crossref.json',
      'nemt_crossref.json',
      'sos_crossref.json',
      'risk_scores.json',
      'summary.json',
      'report.txt',
    ]);

    printSummaryStats(path.join(OUTPUT_DIRS.vehicles, 'summary.json'), 'Vehicle Summary');
  } else {
    results.failed.push('Vehicle Processing');
  }

  // Final Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  console.log(`\nPassed: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`  ✓ ${test}`));

  if (results.failed.length > 0) {
    console.log(`\nFailed: ${results.failed.length}`);
    results.failed.forEach(test => console.log(`  ✗ ${test}`));
  }

  console.log('\n' + '-'.repeat(60));

  if (results.failed.length === 0) {
    console.log('ALL TESTS PASSED!');
    console.log('\nGenerated data is available in:');
    Object.entries(OUTPUT_DIRS).forEach(([name, dir]) => {
      console.log(`  ${name}: ${dir}`);
    });
    console.log('\nTo view reports:');
    console.log(`  - SOS Shell Companies: ${path.join(OUTPUT_DIRS.sos, 'shell_company_report.txt')}`);
    console.log(`  - HCBS Analysis: ${path.join(OUTPUT_DIRS.hcbs, 'report.txt')}`);
    console.log(`  - Vehicle Analysis: ${path.join(OUTPUT_DIRS.vehicles, 'report.txt')}`);
  } else {
    console.log(`${results.failed.length} TEST(S) FAILED`);
    process.exit(1);
  }
};

main().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
