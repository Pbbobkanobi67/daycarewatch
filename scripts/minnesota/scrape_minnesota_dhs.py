#!/usr/bin/env python3
"""
Minnesota DHS License Lookup Scraper for DaycareWatch
Scrapes child care facility data from licensinglookup.dhs.state.mn.us

Usage:
    python scrape_minnesota_dhs.py --county "Hennepin" --output ../data/minnesota
    python scrape_minnesota_dhs.py --all-counties --output ../data/minnesota
"""

import argparse
import json
import os
import random
import re
import time
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlencode

import requests
from bs4 import BeautifulSoup

# Minnesota DHS License Lookup base URL
BASE_URL = "https://licensinglookup.dhs.state.mn.us"

# All 87 Minnesota counties
MINNESOTA_COUNTIES = [
    "Aitkin", "Anoka", "Becker", "Beltrami", "Benton", "Big Stone", "Blue Earth",
    "Brown", "Carlton", "Carver", "Cass", "Chippewa", "Chisago", "Clay", "Clearwater",
    "Cook", "Cottonwood", "Crow Wing", "Dakota", "Dodge", "Douglas", "Faribault",
    "Fillmore", "Freeborn", "Goodhue", "Grant", "Hennepin", "Houston", "Hubbard",
    "Isanti", "Itasca", "Jackson", "Kanabec", "Kandiyohi", "Kittson", "Koochiching",
    "Lac qui Parle", "Lake", "Lake of the Woods", "Le Sueur", "Lincoln", "Lyon",
    "Mahnomen", "Marshall", "Martin", "McLeod", "Meeker", "Mille Lacs", "Morrison",
    "Mower", "Murray", "Nicollet", "Nobles", "Norman", "Olmsted", "Otter Tail",
    "Pennington", "Pine", "Pipestone", "Polk", "Pope", "Ramsey", "Red Lake",
    "Redwood", "Renville", "Rice", "Rock", "Roseau", "Scott", "Sherburne", "Sibley",
    "St. Louis", "Stearns", "Steele", "Stevens", "Swift", "Todd", "Traverse",
    "Wabasha", "Wadena", "Waseca", "Washington", "Watonwan", "Wilkin", "Winona",
    "Wright", "Yellow Medicine"
]

# Facility types to search
FACILITY_TYPES = [
    ("Child Care Center", "CCC"),
    ("Family Child Care", "FCC"),
    # Add more as discovered
]


class MinnesotaDHSScraper:
    """Scraper for Minnesota DHS License Lookup system."""
    
    def __init__(self, output_dir: str = "../data/minnesota"):
        self.output_dir = output_dir
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "DaycareWatch Research Bot (transparency project)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        })
        os.makedirs(output_dir, exist_ok=True)
    
    def _polite_delay(self):
        """Respectful rate limiting."""
        time.sleep(random.uniform(1.5, 3.0))
    
    def search_facilities(self, county: str, facility_type: str = None) -> List[Dict]:
        """
        Search for facilities in a county.
        
        Note: The actual implementation will depend on the DHS website structure.
        This is a template that should be adapted based on the actual site.
        """
        facilities = []
        
        # The DHS license lookup appears to have a search form
        # We need to discover the actual form parameters
        search_url = f"{BASE_URL}/Search"
        
        params = {
            "County": county,
            "ProgramType": "Child Care",  # Adjust based on actual form
        }
        
        if facility_type:
            params["FacilityType"] = facility_type
        
        try:
            print(f"Searching {county} County...")
            response = self.session.get(search_url, params=params, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Parse results - structure depends on actual site HTML
            # This is a placeholder that needs to be adapted
            results_table = soup.find("table", {"class": "results"}) or soup.find("table")
            
            if results_table:
                rows = results_table.find_all("tr")[1:]  # Skip header
                for row in rows:
                    facility = self._parse_facility_row(row)
                    if facility:
                        facilities.append(facility)
            
            # Check for pagination
            # TODO: Handle multiple pages of results
            
        except requests.RequestException as e:
            print(f"Error searching {county}: {e}")
        
        return facilities
    
    def _parse_facility_row(self, row) -> Optional[Dict]:
        """Parse a facility row from search results."""
        try:
            cells = row.find_all("td")
            if len(cells) < 4:
                return None
            
            # Extract basic info - adjust indices based on actual table structure
            facility = {
                "license_number": self._clean_text(cells[0]),
                "name": self._clean_text(cells[1]),
                "facility_type": self._clean_text(cells[2]),
                "address": self._clean_text(cells[3]),
                "city": "",
                "zip_code": "",
                "county": "",
                "capacity": None,
                "license_status": "",
                "scraped_at": datetime.now().isoformat(),
            }
            
            # Try to get detail link for more info
            detail_link = row.find("a", href=True)
            if detail_link:
                facility["detail_url"] = urljoin(BASE_URL, detail_link["href"])
            
            return facility
            
        except Exception as e:
            print(f"Error parsing row: {e}")
            return None
    
    def get_facility_details(self, facility: Dict) -> Dict:
        """Fetch detailed information for a facility."""
        if "detail_url" not in facility:
            return facility
        
        try:
            self._polite_delay()
            response = self.session.get(facility["detail_url"], timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Parse detail page - structure depends on actual site
            # Look for common patterns
            
            # Capacity
            capacity_elem = soup.find(string=re.compile(r"Capacity|Licensed For", re.I))
            if capacity_elem:
                capacity_text = capacity_elem.find_next().text if capacity_elem.find_next() else ""
                capacity_match = re.search(r"(\d+)", capacity_text)
                if capacity_match:
                    facility["capacity"] = int(capacity_match.group(1))
            
            # License status
            status_elem = soup.find(string=re.compile(r"Status|License Status", re.I))
            if status_elem:
                facility["license_status"] = self._clean_text(
                    status_elem.find_next().text if status_elem.find_next() else ""
                )
            
            # Address components
            address_elem = soup.find(string=re.compile(r"Address", re.I))
            if address_elem:
                full_address = self._clean_text(
                    address_elem.find_next().text if address_elem.find_next() else ""
                )
                facility["full_address"] = full_address
                # Try to parse city, state, zip
                zip_match = re.search(r"(\d{5}(-\d{4})?)", full_address)
                if zip_match:
                    facility["zip_code"] = zip_match.group(1)
            
            # Licensor
            licensor_elem = soup.find(string=re.compile(r"Licensor|Licensed By", re.I))
            if licensor_elem:
                facility["licensor"] = self._clean_text(
                    licensor_elem.find_next().text if licensor_elem.find_next() else ""
                )
            
            # Phone
            phone_elem = soup.find(string=re.compile(r"Phone|Telephone", re.I))
            if phone_elem:
                facility["phone"] = self._clean_text(
                    phone_elem.find_next().text if phone_elem.find_next() else ""
                )
            
        except Exception as e:
            print(f"Error fetching details for {facility.get('name', 'unknown')}: {e}")
        
        return facility
    
    def _clean_text(self, text: str) -> str:
        """Clean up extracted text."""
        if not text:
            return ""
        return " ".join(text.strip().split())
    
    def scrape_county(self, county: str, get_details: bool = True) -> List[Dict]:
        """Scrape all facilities in a county."""
        print(f"\n{'='*60}")
        print(f"Scraping {county} County, Minnesota")
        print(f"{'='*60}")
        
        all_facilities = []
        
        # Search for each facility type
        for type_name, type_code in FACILITY_TYPES:
            print(f"\nSearching for {type_name}...")
            facilities = self.search_facilities(county, type_code)
            
            if get_details:
                print(f"Found {len(facilities)} facilities, fetching details...")
                for i, facility in enumerate(facilities):
                    facility["county"] = county
                    facilities[i] = self.get_facility_details(facility)
                    if (i + 1) % 10 == 0:
                        print(f"  Processed {i + 1}/{len(facilities)}")
            
            all_facilities.extend(facilities)
        
        # Also search without type filter to catch any missed
        print("\nSearching all facility types...")
        general_facilities = self.search_facilities(county)
        
        # Deduplicate by license number
        existing_ids = {f.get("license_number") for f in all_facilities}
        for facility in general_facilities:
            if facility.get("license_number") not in existing_ids:
                facility["county"] = county
                if get_details:
                    facility = self.get_facility_details(facility)
                all_facilities.append(facility)
        
        print(f"\nTotal facilities found in {county}: {len(all_facilities)}")
        return all_facilities
    
    def save_county_data(self, county: str, facilities: List[Dict]):
        """Save county data to JSON file."""
        filename = f"{county.lower().replace(' ', '_')}_facilities.json"
        filepath = os.path.join(self.output_dir, filename)
        
        output = {
            "county": county,
            "state": "Minnesota",
            "generated_at": datetime.now().isoformat(),
            "total_facilities": len(facilities),
            "source": "Minnesota DHS License Lookup",
            "source_url": BASE_URL,
            "facilities": facilities
        }
        
        with open(filepath, "w") as f:
            json.dump(output, f, indent=2)
        
        print(f"Saved to {filepath}")
        return filepath
    
    def generate_summary(self, county_data: Dict[str, List[Dict]]):
        """Generate statewide summary JSON."""
        summary = {
            "state": "Minnesota",
            "generated_at": datetime.now().isoformat(),
            "source": "Minnesota DHS License Lookup",
            "total_counties_scraped": len(county_data),
            "total_facilities": sum(len(f) for f in county_data.values()),
            "counties": {}
        }
        
        for county, facilities in county_data.items():
            # Calculate stats
            total_capacity = sum(f.get("capacity", 0) or 0 for f in facilities)
            
            # Count by type
            type_counts = {}
            for f in facilities:
                ftype = f.get("facility_type", "Unknown")
                type_counts[ftype] = type_counts.get(ftype, 0) + 1
            
            # Count by status
            status_counts = {}
            for f in facilities:
                status = f.get("license_status", "Unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
            
            summary["counties"][county] = {
                "total_facilities": len(facilities),
                "total_capacity": total_capacity,
                "by_type": type_counts,
                "by_status": status_counts
            }
        
        filepath = os.path.join(self.output_dir, "summary.json")
        with open(filepath, "w") as f:
            json.dump(summary, f, indent=2)
        
        print(f"\nSaved summary to {filepath}")
        return summary


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Minnesota DHS child care license data"
    )
    parser.add_argument(
        "--county",
        type=str,
        help="County to scrape (e.g., 'Hennepin')"
    )
    parser.add_argument(
        "--all-counties",
        action="store_true",
        help="Scrape all 87 Minnesota counties"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="../data/minnesota",
        help="Output directory for JSON files"
    )
    parser.add_argument(
        "--no-details",
        action="store_true",
        help="Skip fetching detailed facility info (faster but less data)"
    )
    
    args = parser.parse_args()
    
    if not args.county and not args.all_counties:
        print("Please specify --county or --all-counties")
        print(f"Available counties: {', '.join(MINNESOTA_COUNTIES[:10])}...")
        return
    
    scraper = MinnesotaDHSScraper(output_dir=args.output)
    county_data = {}
    
    counties_to_scrape = MINNESOTA_COUNTIES if args.all_counties else [args.county]
    
    # Validate county names
    for county in counties_to_scrape:
        if county not in MINNESOTA_COUNTIES:
            print(f"Warning: '{county}' is not a valid Minnesota county")
            print(f"Valid counties: {', '.join(MINNESOTA_COUNTIES)}")
            return
    
    print(f"\nDaycareWatch Minnesota Scraper")
    print(f"==============================")
    print(f"Counties to scrape: {len(counties_to_scrape)}")
    print(f"Output directory: {args.output}")
    print(f"Fetch details: {not args.no_details}")
    
    for county in counties_to_scrape:
        try:
            facilities = scraper.scrape_county(county, get_details=not args.no_details)
            county_data[county] = facilities
            scraper.save_county_data(county, facilities)
            
            if args.all_counties and county != counties_to_scrape[-1]:
                # Longer delay between counties
                print(f"\nWaiting before next county...")
                time.sleep(random.uniform(5, 10))
                
        except KeyboardInterrupt:
            print("\n\nInterrupted by user. Saving progress...")
            break
        except Exception as e:
            print(f"Error scraping {county}: {e}")
            continue
    
    # Generate summary
    if county_data:
        scraper.generate_summary(county_data)
        
        print(f"\n{'='*60}")
        print("SCRAPING COMPLETE")
        print(f"{'='*60}")
        print(f"Counties scraped: {len(county_data)}")
        print(f"Total facilities: {sum(len(f) for f in county_data.values())}")
        print(f"Output directory: {args.output}")


if __name__ == "__main__":
    main()
