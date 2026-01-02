#!/usr/bin/env python3
"""
CCLD Facility Scraper for CalChildWatch
Scrapes California Community Care Licensing Division database for childcare facilities.

Usage:
    python scrape_ccld.py --county "San Diego" --output ../data/san_diego_facilities.json
    python scrape_ccld.py --all-counties --output ../data/

Data Source: https://www.ccld.dss.ca.gov/carefacilitysearch/
"""

import argparse
import json
import time
import random
import os
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
import re

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'requests', 'beautifulsoup4', '--break-system-packages'])
    import requests
    from bs4 import BeautifulSoup


# California counties
CALIFORNIA_COUNTIES = [
    "Alameda", "Alpine", "Amador", "Butte", "Calaveras", "Colusa", "Contra Costa",
    "Del Norte", "El Dorado", "Fresno", "Glenn", "Humboldt", "Imperial", "Inyo",
    "Kern", "Kings", "Lake", "Lassen", "Los Angeles", "Madera", "Marin", "Mariposa",
    "Mendocino", "Merced", "Modoc", "Mono", "Monterey", "Napa", "Nevada", "Orange",
    "Placer", "Plumas", "Riverside", "Sacramento", "San Benito", "San Bernardino",
    "San Diego", "San Francisco", "San Joaquin", "San Luis Obispo", "San Mateo",
    "Santa Barbara", "Santa Clara", "Santa Cruz", "Shasta", "Sierra", "Siskiyou",
    "Solano", "Sonoma", "Stanislaus", "Sutter", "Tehama", "Trinity", "Tulare",
    "Tuolumne", "Ventura", "Yolo", "Yuba"
]

# Facility types to scrape
FACILITY_TYPES = [
    ("CHILD CARE CENTER", "220"),
    ("FAMILY CHILD CARE HOME - LARGE", "850"),
    ("FAMILY CHILD CARE HOME - SMALL", "840"),
]


@dataclass
class Facility:
    """Represents a childcare facility."""
    license_number: str
    name: str
    facility_type: str
    address: str
    city: str
    state: str
    zip_code: str
    county: str
    capacity: int
    status: str
    license_first_date: Optional[str]
    license_expiration_date: Optional[str]
    phone: Optional[str]
    last_inspection_date: Optional[str]
    total_visits: Optional[int]
    total_citations: Optional[int]
    total_complaints: Optional[int]
    scraped_at: str
    ccld_url: str


class CCLDScraper:
    """Scraper for California Community Care Licensing Division database."""
    
    BASE_URL = "https://www.ccld.dss.ca.gov/carefacilitysearch"
    SEARCH_URL = f"{BASE_URL}/Search/GetSearchResults"
    DETAIL_URL = f"{BASE_URL}/FacilityDetail"
    
    def __init__(self, delay_range=(1, 3)):
        """
        Initialize scraper.
        
        Args:
            delay_range: Tuple of (min, max) seconds to wait between requests
        """
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'CalChildWatch/1.0 (Civic Transparency Project; +https://github.com/calchildwatch)',
            'Accept': 'application/json, text/html, */*',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        self.delay_range = delay_range
        self.stats = {
            'requests': 0,
            'facilities_found': 0,
            'errors': 0
        }
    
    def _delay(self):
        """Random delay between requests to be respectful."""
        time.sleep(random.uniform(*self.delay_range))
    
    def _get_search_token(self) -> Optional[str]:
        """Get the anti-forgery token from the search page."""
        try:
            response = self.session.get(self.BASE_URL)
            self.stats['requests'] += 1
            soup = BeautifulSoup(response.text, 'html.parser')
            token_input = soup.find('input', {'name': '__RequestVerificationToken'})
            if token_input:
                return token_input.get('value')
        except Exception as e:
            print(f"Error getting search token: {e}")
            self.stats['errors'] += 1
        return None
    
    def search_facilities(
        self,
        county: str,
        facility_type_code: str,
        facility_type_name: str
    ) -> List[Dict[str, Any]]:
        """
        Search for facilities by county and type.
        
        Args:
            county: County name
            facility_type_code: CCLD facility type code
            facility_type_name: Human-readable facility type
            
        Returns:
            List of facility dictionaries
        """
        facilities = []
        
        # The CCLD site uses server-side pagination
        # We need to iterate through pages
        page = 1
        page_size = 100  # Max allowed
        
        while True:
            self._delay()
            
            try:
                # POST search request
                payload = {
                    'FacilityType': facility_type_code,
                    'County': county,
                    'PageNumber': page,
                    'PageSize': page_size,
                    'SortColumn': 'FacilityName',
                    'SortDirection': 'asc'
                }
                
                response = self.session.post(
                    self.SEARCH_URL,
                    data=payload,
                    headers={'X-Requested-With': 'XMLHttpRequest'}
                )
                self.stats['requests'] += 1
                
                if response.status_code != 200:
                    print(f"  Error: HTTP {response.status_code}")
                    self.stats['errors'] += 1
                    break
                
                # Parse response
                data = response.json()
                results = data.get('Data', [])
                
                if not results:
                    break
                
                print(f"  Page {page}: Found {len(results)} facilities")
                
                for item in results:
                    facility = {
                        'license_number': item.get('FacilityNumber', ''),
                        'name': item.get('FacilityName', ''),
                        'facility_type': facility_type_name,
                        'address': item.get('FacilityAddress', ''),
                        'city': item.get('FacilityCity', ''),
                        'state': 'CA',
                        'zip_code': item.get('FacilityZip', ''),
                        'county': county,
                        'capacity': int(item.get('FacilityCapacity', 0) or 0),
                        'status': item.get('FacilityStatus', ''),
                        'phone': item.get('FacilityPhone', ''),
                    }
                    facilities.append(facility)
                    self.stats['facilities_found'] += 1
                
                # Check if more pages
                total_records = data.get('TotalRecords', 0)
                if page * page_size >= total_records:
                    break
                
                page += 1
                
            except Exception as e:
                print(f"  Error on page {page}: {e}")
                self.stats['errors'] += 1
                break
        
        return facilities
    
    def get_facility_details(self, license_number: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information for a specific facility.
        
        Args:
            license_number: The facility license number
            
        Returns:
            Dictionary with facility details or None
        """
        self._delay()
        
        try:
            url = f"{self.DETAIL_URL}/{license_number}"
            response = self.session.get(url)
            self.stats['requests'] += 1
            
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            details = {
                'ccld_url': url,
                'license_first_date': None,
                'license_expiration_date': None,
                'last_inspection_date': None,
                'total_visits': None,
                'total_citations': None,
                'total_complaints': None,
            }
            
            # Parse detail fields
            # The CCLD page has various sections with facility info
            
            # Look for license dates
            license_info = soup.find('div', {'id': 'licenseInfo'})
            if license_info:
                # Extract dates using regex
                text = license_info.get_text()
                
                first_date_match = re.search(r'First Licensed:\s*(\d{1,2}/\d{1,2}/\d{4})', text)
                if first_date_match:
                    details['license_first_date'] = first_date_match.group(1)
                
                exp_date_match = re.search(r'Expiration Date:\s*(\d{1,2}/\d{1,2}/\d{4})', text)
                if exp_date_match:
                    details['license_expiration_date'] = exp_date_match.group(1)
            
            # Look for inspection/visit info
            visit_section = soup.find('div', {'id': 'visitHistory'})
            if visit_section:
                rows = visit_section.find_all('tr')
                if rows:
                    details['total_visits'] = len(rows) - 1  # Exclude header
                    
                    # Get most recent visit date
                    if len(rows) > 1:
                        first_row = rows[1]
                        cells = first_row.find_all('td')
                        if cells:
                            details['last_inspection_date'] = cells[0].get_text(strip=True)
            
            # Count citations
            citation_section = soup.find('div', {'id': 'citations'})
            if citation_section:
                citation_rows = citation_section.find_all('tr', class_='citation-row')
                details['total_citations'] = len(citation_rows)
            
            # Count complaints
            complaint_section = soup.find('div', {'id': 'complaints'})
            if complaint_section:
                complaint_rows = complaint_section.find_all('tr', class_='complaint-row')
                details['total_complaints'] = len(complaint_rows)
            
            return details
            
        except Exception as e:
            print(f"  Error getting details for {license_number}: {e}")
            self.stats['errors'] += 1
            return None
    
    def scrape_county(
        self,
        county: str,
        include_details: bool = False
    ) -> List[Facility]:
        """
        Scrape all childcare facilities for a county.
        
        Args:
            county: County name
            include_details: Whether to fetch detailed info for each facility
            
        Returns:
            List of Facility objects
        """
        print(f"\n{'='*60}")
        print(f"Scraping {county} County")
        print(f"{'='*60}")
        
        all_facilities = []
        
        for type_name, type_code in FACILITY_TYPES:
            print(f"\n  Facility Type: {type_name}")
            facilities = self.search_facilities(county, type_code, type_name)
            
            for facility_data in facilities:
                # Optionally get detailed info
                if include_details:
                    details = self.get_facility_details(facility_data['license_number'])
                    if details:
                        facility_data.update(details)
                else:
                    facility_data['ccld_url'] = f"{self.DETAIL_URL}/{facility_data['license_number']}"
                    facility_data['license_first_date'] = None
                    facility_data['license_expiration_date'] = None
                    facility_data['last_inspection_date'] = None
                    facility_data['total_visits'] = None
                    facility_data['total_citations'] = None
                    facility_data['total_complaints'] = None
                
                facility_data['scraped_at'] = datetime.utcnow().isoformat()
                
                facility = Facility(**facility_data)
                all_facilities.append(facility)
        
        print(f"\n  Total facilities in {county}: {len(all_facilities)}")
        return all_facilities
    
    def scrape_all_counties(
        self,
        include_details: bool = False,
        output_dir: str = '../data'
    ) -> Dict[str, List[Facility]]:
        """
        Scrape all California counties.
        
        Args:
            include_details: Whether to fetch detailed info
            output_dir: Directory to save county JSON files
            
        Returns:
            Dictionary mapping county names to facility lists
        """
        all_data = {}
        
        os.makedirs(output_dir, exist_ok=True)
        
        for county in CALIFORNIA_COUNTIES:
            facilities = self.scrape_county(county, include_details)
            all_data[county] = facilities
            
            # Save each county immediately
            county_filename = county.lower().replace(' ', '_')
            output_path = os.path.join(output_dir, f"{county_filename}_facilities.json")
            
            with open(output_path, 'w') as f:
                json.dump(
                    [asdict(f) for f in facilities],
                    f,
                    indent=2
                )
            print(f"  Saved to {output_path}")
        
        return all_data
    
    def print_stats(self):
        """Print scraping statistics."""
        print(f"\n{'='*60}")
        print("Scraping Statistics")
        print(f"{'='*60}")
        print(f"Total HTTP requests: {self.stats['requests']}")
        print(f"Total facilities found: {self.stats['facilities_found']}")
        print(f"Total errors: {self.stats['errors']}")


def generate_summary(data_dir: str) -> Dict[str, Any]:
    """Generate a summary of all scraped data."""
    summary = {
        'generated_at': datetime.utcnow().isoformat(),
        'counties': {},
        'totals': {
            'facilities': 0,
            'capacity': 0,
            'by_type': {}
        }
    }
    
    for filename in os.listdir(data_dir):
        if not filename.endswith('_facilities.json'):
            continue
        
        filepath = os.path.join(data_dir, filename)
        with open(filepath, 'r') as f:
            facilities = json.load(f)
        
        county_name = filename.replace('_facilities.json', '').replace('_', ' ').title()
        
        county_stats = {
            'total_facilities': len(facilities),
            'total_capacity': sum(f.get('capacity', 0) for f in facilities),
            'by_type': {},
            'by_status': {}
        }
        
        for facility in facilities:
            ftype = facility.get('facility_type', 'Unknown')
            status = facility.get('status', 'Unknown')
            
            county_stats['by_type'][ftype] = county_stats['by_type'].get(ftype, 0) + 1
            county_stats['by_status'][status] = county_stats['by_status'].get(status, 0) + 1
            
            summary['totals']['by_type'][ftype] = summary['totals']['by_type'].get(ftype, 0) + 1
        
        summary['counties'][county_name] = county_stats
        summary['totals']['facilities'] += county_stats['total_facilities']
        summary['totals']['capacity'] += county_stats['total_capacity']
    
    return summary


def main():
    parser = argparse.ArgumentParser(
        description='Scrape California CCLD childcare facility database'
    )
    parser.add_argument(
        '--county',
        type=str,
        help='Specific county to scrape'
    )
    parser.add_argument(
        '--all-counties',
        action='store_true',
        help='Scrape all California counties'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='../data',
        help='Output file or directory'
    )
    parser.add_argument(
        '--include-details',
        action='store_true',
        help='Fetch detailed info for each facility (slower)'
    )
    parser.add_argument(
        '--delay-min',
        type=float,
        default=1.0,
        help='Minimum delay between requests (seconds)'
    )
    parser.add_argument(
        '--delay-max',
        type=float,
        default=3.0,
        help='Maximum delay between requests (seconds)'
    )
    parser.add_argument(
        '--generate-summary',
        action='store_true',
        help='Generate summary from existing data files'
    )
    
    args = parser.parse_args()
    
    # Just generate summary from existing files
    if args.generate_summary:
        print("Generating summary from existing data...")
        summary = generate_summary(args.output)
        summary_path = os.path.join(args.output, 'summary.json')
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"Summary saved to {summary_path}")
        print(f"Total facilities: {summary['totals']['facilities']}")
        print(f"Total capacity: {summary['totals']['capacity']}")
        return
    
    # Initialize scraper
    scraper = CCLDScraper(delay_range=(args.delay_min, args.delay_max))
    
    if args.all_counties:
        # Scrape all counties
        scraper.scrape_all_counties(
            include_details=args.include_details,
            output_dir=args.output
        )
        
        # Generate summary
        summary = generate_summary(args.output)
        summary_path = os.path.join(args.output, 'summary.json')
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
    elif args.county:
        # Scrape single county
        if args.county not in CALIFORNIA_COUNTIES:
            print(f"Error: '{args.county}' is not a valid California county")
            print(f"Valid counties: {', '.join(CALIFORNIA_COUNTIES)}")
            return
        
        facilities = scraper.scrape_county(
            args.county,
            include_details=args.include_details
        )
        
        # Determine output path
        if args.output.endswith('.json'):
            output_path = args.output
        else:
            os.makedirs(args.output, exist_ok=True)
            county_filename = args.county.lower().replace(' ', '_')
            output_path = os.path.join(args.output, f"{county_filename}_facilities.json")
        
        with open(output_path, 'w') as f:
            json.dump([asdict(f) for f in facilities], f, indent=2)
        
        print(f"\nSaved {len(facilities)} facilities to {output_path}")
    
    else:
        print("Error: Must specify --county or --all-counties")
        parser.print_help()
        return
    
    scraper.print_stats()


if __name__ == '__main__':
    main()
