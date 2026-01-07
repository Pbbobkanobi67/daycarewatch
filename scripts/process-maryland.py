#!/usr/bin/env python3
"""
Process Maryland childcare provider data from CheckCCMD PDF
Extracts Montgomery County facilities using table extraction
"""

import pdfplumber
import json
import re
import os

def extract_maryland_providers(pdf_path, target_county="Montgomery"):
    """Extract providers from Maryland CheckCCMD PDF using table extraction"""

    providers = []

    with pdfplumber.open(pdf_path) as pdf:
        print(f"Processing {len(pdf.pages)} pages...")

        for page_num, page in enumerate(pdf.pages):
            if page_num % 100 == 0:
                print(f"  Page {page_num + 1}/{len(pdf.pages)}...")

            tables = page.extract_tables()

            for table in tables:
                for row in table:
                    if not row or len(row) < 7:
                        continue

                    # Skip header row
                    if row[0] == 'Provider Names' or not row[0]:
                        continue

                    name = row[0] or ''
                    address = row[2] or ''
                    county = row[3] or ''
                    school = row[4] or ''
                    prog_type = row[5] or ''
                    status = row[6] or ''

                    # Clean up newlines
                    name = name.replace('\n', ' ').strip()
                    address = address.replace('\n', ' ').strip()
                    county = county.replace('\n', ' ').strip()

                    # Check if this is our target county
                    if target_county and target_county.lower() not in county.lower():
                        continue

                    # Skip if missing essential data
                    if not name or not prog_type or not status:
                        continue

                    provider = {
                        'name': name,
                        'address': address,
                        'county': target_county,
                        'school': school.replace('\n', ' ').strip() if school else None,
                        'facility_type': prog_type.strip(),
                        'status': status.strip(),
                        'state': 'MD'
                    }

                    providers.append(provider)

    return providers


def clean_and_dedupe(providers):
    """Clean up and deduplicate providers"""
    seen = set()
    cleaned = []

    for p in providers:
        # Create a key for deduplication
        key = (p['name'].lower(), (p['address'] or '').lower())

        if key not in seen:
            seen.add(key)

            # Map facility type
            type_map = {
                'CTR': 'Child Care Center',
                'FCCH': 'Family Child Care Home',
                'LFCCH': 'Large Family Child Care Home',
                'LOC': 'Letter of Compliance'
            }
            p['facility_type'] = type_map.get(p['facility_type'], p['facility_type'])

            # Map status
            status_map = {
                'Open': 'LICENSED',
                'Closed': 'CLOSED',
                'Suspended': 'SUSPENDED',
                'Revoked': 'REVOKED'
            }
            p['status'] = status_map.get(p['status'], p['status'])

            cleaned.append(p)

    return cleaned


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    pdf_path = os.path.join(project_root, 'public', 'data', 'maryland', 'md_providers.pdf')
    output_dir = os.path.join(project_root, 'public', 'data', 'maryland')

    print(f"Reading PDF from: {pdf_path}")

    # Extract Montgomery County providers
    providers = extract_maryland_providers(pdf_path, "Montgomery")

    print(f"\nFound {len(providers)} raw records for Montgomery County")

    # Clean and dedupe
    cleaned = clean_and_dedupe(providers)

    print(f"After cleaning: {len(cleaned)} unique providers")

    # Add placeholder fields for compatibility
    for i, p in enumerate(cleaned):
        p['license_number'] = f"MD-MONT-{i+1:04d}"  # Generate placeholder license numbers
        p['capacity'] = None
        p['phone'] = None
        p['latitude'] = None
        p['longitude'] = None
        p['city'] = None
        p['zip_code'] = None

        # Try to extract city and zip from address
        if p['address']:
            # Pattern: City, MD XXXXX
            match = re.search(r'([^,]+),\s*MD\s+(\d{5})', p['address'])
            if match:
                p['city'] = match.group(1).strip()
                p['zip_code'] = match.group(2)

    # Save to JSON
    output_path = os.path.join(output_dir, 'montgomery_facilities.json')
    with open(output_path, 'w') as f:
        json.dump(cleaned, f, indent=2)

    print(f"\nSaved to: {output_path}")

    # Print summary
    by_type = {}
    by_status = {}
    for p in cleaned:
        by_type[p['facility_type']] = by_type.get(p['facility_type'], 0) + 1
        by_status[p['status']] = by_status.get(p['status'], 0) + 1

    print("\nBy facility type:")
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}")

    print("\nBy status:")
    for s, c in sorted(by_status.items(), key=lambda x: -x[1]):
        print(f"  {s}: {c}")


if __name__ == '__main__':
    main()
