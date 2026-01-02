#!/usr/bin/env python3
"""
Convert Minnesota GeoPackage childcare data to JSON files by county.
Uses city-to-county mapping for Minnesota.
"""

import sqlite3
import json
import os
from datetime import datetime
from collections import defaultdict

# Major Minnesota cities to county mapping
CITY_TO_COUNTY = {
    # Twin Cities Metro - Hennepin
    "Minneapolis": "Hennepin",
    "Bloomington": "Hennepin",
    "Brooklyn Park": "Hennepin",
    "Brooklyn Center": "Hennepin",
    "Plymouth": "Hennepin",
    "Maple Grove": "Hennepin",
    "Eden Prairie": "Hennepin",
    "Edina": "Hennepin",
    "Minnetonka": "Hennepin",
    "Hopkins": "Hennepin",
    "St. Louis Park": "Hennepin",
    "Saint Louis Park": "Hennepin",
    "Golden Valley": "Hennepin",
    "Richfield": "Hennepin",
    "Crystal": "Hennepin",
    "New Hope": "Hennepin",
    "Robbinsdale": "Hennepin",
    "Wayzata": "Hennepin",
    "Excelsior": "Hennepin",
    "Orono": "Hennepin",
    "Medina": "Hennepin",
    "Long Lake": "Hennepin",
    "Osseo": "Hennepin",
    "Champlin": "Hennepin",
    "Dayton": "Hennepin",
    "Rogers": "Hennepin",
    "Corcoran": "Hennepin",
    "Greenfield": "Hennepin",
    "Independence": "Hennepin",
    "Loretto": "Hennepin",
    "Rockford": "Hennepin",
    "St Anthony": "Hennepin",
    "St. Anthony": "Hennepin",

    # Ramsey County
    "Saint Paul": "Ramsey",
    "St. Paul": "Ramsey",
    "St Paul": "Ramsey",
    "Maplewood": "Ramsey",
    "Roseville": "Ramsey",
    "White Bear Lake": "Ramsey",
    "Shoreview": "Ramsey",
    "New Brighton": "Ramsey",
    "Vadnais Heights": "Ramsey",
    "Mounds View": "Ramsey",
    "Arden Hills": "Ramsey",
    "Little Canada": "Ramsey",
    "North Saint Paul": "Ramsey",
    "North St. Paul": "Ramsey",
    "North St Paul": "Ramsey",
    "Falcon Heights": "Ramsey",
    "Lauderdale": "Ramsey",
    "White Bear": "Ramsey",
    "Gem Lake": "Ramsey",

    # Dakota County
    "Eagan": "Dakota",
    "Burnsville": "Dakota",
    "Lakeville": "Dakota",
    "Apple Valley": "Dakota",
    "Hastings": "Dakota",
    "Farmington": "Dakota",
    "Rosemount": "Dakota",
    "Inver Grove Heights": "Dakota",
    "South Saint Paul": "Dakota",
    "South St. Paul": "Dakota",
    "South St Paul": "Dakota",
    "West Saint Paul": "Dakota",
    "West St. Paul": "Dakota",
    "West St Paul": "Dakota",
    "Mendota Heights": "Dakota",
    "Mendota": "Dakota",
    "Lilydale": "Dakota",
    "Sunfish Lake": "Dakota",

    # Anoka County
    "Coon Rapids": "Anoka",
    "Blaine": "Anoka",
    "Fridley": "Anoka",
    "Andover": "Anoka",
    "Ramsey": "Anoka",
    "Ham Lake": "Anoka",
    "Lino Lakes": "Anoka",
    "Circle Pines": "Anoka",
    "Centerville": "Anoka",
    "Columbia Heights": "Anoka",
    "Spring Lake Park": "Anoka",
    "Anoka": "Anoka",
    "East Bethel": "Anoka",
    "Oak Grove": "Anoka",
    "Nowthen": "Anoka",
    "Bethel": "Anoka",
    "Lexington": "Anoka",
    "Hilltop": "Anoka",

    # Washington County
    "Woodbury": "Washington",
    "Cottage Grove": "Washington",
    "Stillwater": "Washington",
    "Forest Lake": "Washington",
    "Hugo": "Washington",
    "Oakdale": "Washington",
    "Mahtomedi": "Washington",
    "Lake Elmo": "Washington",
    "Afton": "Washington",
    "Bayport": "Washington",
    "Newport": "Washington",
    "St. Paul Park": "Washington",
    "St Paul Park": "Washington",
    "Scandia": "Washington",
    "Marine on St. Croix": "Washington",
    "Dellwood": "Washington",
    "Grant": "Washington",
    "Denmark": "Washington",
    "Willernie": "Washington",
    "Landfall": "Washington",

    # Scott County
    "Shakopee": "Scott",
    "Prior Lake": "Scott",
    "Savage": "Scott",
    "Jordan": "Scott",
    "Elko New Market": "Scott",
    "New Prague": "Scott",
    "Belle Plaine": "Scott",
    "Credit River": "Scott",

    # Carver County
    "Chaska": "Carver",
    "Chanhassen": "Carver",
    "Waconia": "Carver",
    "Victoria": "Carver",
    "Norwood Young America": "Carver",
    "Watertown": "Carver",
    "Mayer": "Carver",
    "New Germany": "Carver",
    "Cologne": "Carver",
    "Carver": "Carver",
    "Hamburg": "Carver",

    # Sherburne County
    "Elk River": "Sherburne",
    "Big Lake": "Sherburne",
    "Zimmerman": "Sherburne",
    "Becker": "Sherburne",
    "Clear Lake": "Sherburne",
    "Princeton": "Sherburne",

    # Wright County
    "Monticello": "Wright",
    "Buffalo": "Wright",
    "Delano": "Wright",
    "Annandale": "Wright",
    "Maple Lake": "Wright",
    "Otsego": "Wright",
    "Albertville": "Wright",
    "St. Michael": "Wright",
    "St Michael": "Wright",
    "Howard Lake": "Wright",
    "Waverly": "Wright",
    "Montrose": "Wright",
    "Hanover": "Wright",
    "Clearwater": "Wright",
    "Cokato": "Wright",

    # Isanti County
    "Cambridge": "Isanti",
    "Isanti": "Isanti",
    "Braham": "Isanti",

    # Chisago County
    "North Branch": "Chisago",
    "Lindstrom": "Chisago",
    "Chisago City": "Chisago",
    "Center City": "Chisago",
    "Wyoming": "Chisago",
    "Stacy": "Chisago",
    "Rush City": "Chisago",
    "Harris": "Chisago",
    "Taylors Falls": "Chisago",

    # Greater Minnesota Cities
    "Rochester": "Olmsted",
    "Byron": "Olmsted",
    "Stewartville": "Olmsted",
    "Oronoco": "Olmsted",
    "Chatfield": "Olmsted",
    "Eyota": "Olmsted",

    "Duluth": "St. Louis",
    "Hibbing": "St. Louis",
    "Virginia": "St. Louis",
    "Eveleth": "St. Louis",
    "Ely": "St. Louis",
    "Chisholm": "St. Louis",
    "Mountain Iron": "St. Louis",
    "Hermantown": "St. Louis",
    "Proctor": "St. Louis",
    "Cloquet": "St. Louis",
    "Two Harbors": "St. Louis",

    "Saint Cloud": "Stearns",
    "St. Cloud": "Stearns",
    "St Cloud": "Stearns",
    "Sartell": "Stearns",
    "Waite Park": "Stearns",
    "Cold Spring": "Stearns",
    "Sauk Centre": "Stearns",
    "Albany": "Stearns",
    "Melrose": "Stearns",
    "Paynesville": "Stearns",

    "Moorhead": "Clay",
    "Dilworth": "Clay",
    "Hawley": "Clay",
    "Barnesville": "Clay",
    "Glyndon": "Clay",

    "Mankato": "Blue Earth",
    "North Mankato": "Blue Earth",
    "Eagle Lake": "Blue Earth",

    "Saint Peter": "Nicollet",
    "St. Peter": "Nicollet",

    "Bemidji": "Beltrami",
    "Blackduck": "Beltrami",

    "Winona": "Winona",
    "Saint Charles": "Winona",
    "St. Charles": "Winona",
    "Lewiston": "Winona",

    "Owatonna": "Steele",
    "Medford": "Steele",
    "Blooming Prairie": "Steele",

    "Austin": "Mower",
    "Lyle": "Mower",
    "Adams": "Mower",

    "Albert Lea": "Freeborn",
    "Freeborn": "Freeborn",

    "Faribault": "Rice",
    "Northfield": "Rice",
    "Lonsdale": "Rice",
    "Dundas": "Rice",

    "Red Wing": "Goodhue",
    "Zumbrota": "Goodhue",
    "Cannon Falls": "Goodhue",
    "Kenyon": "Goodhue",

    "Willmar": "Kandiyohi",
    "Spicer": "Kandiyohi",
    "New London": "Kandiyohi",
    "Atwater": "Kandiyohi",

    "Hutchinson": "McLeod",
    "Glencoe": "McLeod",
    "Lester Prairie": "McLeod",
    "Winsted": "McLeod",
    "Silver Lake": "McLeod",

    "Brainerd": "Crow Wing",
    "Crosby": "Crow Wing",
    "Baxter": "Crow Wing",
    "Nisswa": "Crow Wing",
    "Pequot Lakes": "Crow Wing",
    "Crosslake": "Crow Wing",
    "Breezy Point": "Crow Wing",
    "Deerwood": "Crow Wing",

    "Alexandria": "Douglas",
    "Osakis": "Douglas",
    "Brandon": "Douglas",
    "Evansville": "Douglas",
    "Garfield": "Douglas",

    "Fergus Falls": "Otter Tail",
    "Perham": "Otter Tail",
    "Pelican Rapids": "Otter Tail",
    "Henning": "Otter Tail",
    "New York Mills": "Otter Tail",
    "Battle Lake": "Otter Tail",
    "Wadena": "Otter Tail",

    "Detroit Lakes": "Becker",
    "Frazee": "Becker",
    "Lake Park": "Becker",

    "Thief River Falls": "Pennington",

    "Grand Rapids": "Itasca",
    "Deer River": "Itasca",
    "Cohasset": "Itasca",
    "Coleraine": "Itasca",

    "International Falls": "Koochiching",

    "Worthington": "Nobles",

    "Marshall": "Lyon",
    "Tracy": "Lyon",

    "New Ulm": "Brown",
    "Springfield": "Brown",
    "Sleepy Eye": "Brown",

    "Redwood Falls": "Redwood",

    "Montevideo": "Chippewa",

    "Morris": "Stevens",

    "Little Falls": "Morrison",
    "Pierz": "Morrison",
    "Randall": "Morrison",

    "Park Rapids": "Hubbard",

    "Walker": "Cass",
    "Pine River": "Cass",
    "Pillager": "Cass",

    "Aitkin": "Aitkin",
    "McGregor": "Aitkin",

    "Pine City": "Pine",
    "Hinckley": "Pine",
    "Sandstone": "Pine",

    "Mora": "Kanabec",
    "Ogilvie": "Kanabec",

    "Milaca": "Mille Lacs",
    "Onamia": "Mille Lacs",
    "Isle": "Mille Lacs",

    "Long Prairie": "Todd",
    "Staples": "Todd",
    "Browerville": "Todd",

    "Sauk Rapids": "Benton",
    "Foley": "Benton",
    "Rice": "Benton",

    "Le Sueur": "Le Sueur",
    "Le Center": "Le Sueur",
    "Montgomery": "Le Sueur",
    "Waterville": "Le Sueur",

    "Waseca": "Waseca",
    "Janesville": "Waseca",

    "Blue Earth": "Faribault",
    "Wells": "Faribault",

    "Fairmont": "Martin",
    "Truman": "Martin",

    "Jackson": "Jackson",

    "Luverne": "Rock",

    "Pipestone": "Pipestone",

    "Slayton": "Murray",

    "Windom": "Cottonwood",

    "Granite Falls": "Yellow Medicine",

    "Olivia": "Renville",
    "Hector": "Renville",

    "Benson": "Swift",
    "Appleton": "Swift",

    "Glenwood": "Pope",
    "Starbuck": "Pope",

    "Elbow Lake": "Grant",

    "Wheaton": "Traverse",

    "Ortonville": "Big Stone",

    "Madison": "Lac qui Parle",
    "Dawson": "Lac qui Parle",

    "Crookston": "Polk",
    "East Grand Forks": "Polk",
    "Fosston": "Polk",

    "Warren": "Marshall",

    "Ada": "Norman",

    "Hallock": "Kittson",

    "Roseau": "Roseau",
    "Warroad": "Roseau",

    "Baudette": "Lake of the Woods",

    "Red Lake Falls": "Red Lake",

    "Bagley": "Clearwater",

    "Mahnomen": "Mahnomen",

    "Carlton": "Carlton",
    "Moose Lake": "Carlton",

    "Two Harbors": "Lake",
    "Silver Bay": "Lake",

    "Grand Marais": "Cook",

    "Preston": "Fillmore",
    "Spring Valley": "Fillmore",
    "Lanesboro": "Fillmore",
    "Harmony": "Fillmore",

    "Caledonia": "Houston",
    "Spring Grove": "Houston",
    "La Crescent": "Houston",

    "Wabasha": "Wabasha",
    "Lake City": "Wabasha",
    "Plainview": "Wabasha",

    "Kasson": "Dodge",
    "Mantorville": "Dodge",
    "Dodge Center": "Dodge",

    "Sibley": "Sibley",
    "Gaylord": "Sibley",
    "Arlington": "Sibley",
    "Henderson": "Sibley",
    "Winthrop": "Sibley",

    "Ivanhoe": "Lincoln",

    "Breckenridge": "Wilkin",

    # Additional mappings from unmapped cities
    "Saint Michael": "Wright",
    "St Louis Park": "Hennepin",
    "Avon": "Stearns",
    "Saint Joseph": "Stearns",
    "Litchfield": "Meeker",
    "Lake Crystal": "Blue Earth",
    "Pine Island": "Goodhue",
    "Saint Francis": "Anoka",
    "SOUTH SAINT PAUL": "Dakota",
    "Elgin": "Wabasha",
    "Canby": "Yellow Medicine",
    "Holdingford": "Stearns",
    "Richmond": "Stearns",
    "Freeport": "Stearns",
    "Minneota": "Lyon",
    "Royalton": "Morrison",
    "Edgerton": "Pipestone",
    "Cottonwood": "Lyon",
    "Esko": "Carlton",
    "Saint James": "Watonwan",
    "St. James": "Watonwan",
    "BROOKLYN PARK": "Hennepin",
    "MINNEAPOLIS": "Hennepin",
    "SAINT PAUL": "Ramsey",
    "ROCHESTER": "Olmsted",
    "DULUTH": "St. Louis",
    "SAINT CLOUD": "Stearns",
    "MOORHEAD": "Clay",
    "MANKATO": "Blue Earth",
    "BLOOMINGTON": "Hennepin",
    "BROOKLYN CENTER": "Hennepin",
    "WOODBURY": "Washington",
    "MAPLE GROVE": "Hennepin",
    "PLYMOUTH": "Hennepin",
    "EAGAN": "Dakota",
    "BURNSVILLE": "Dakota",
    "LAKEVILLE": "Dakota",
    "COON RAPIDS": "Anoka",
    "BLAINE": "Anoka",
    "EDEN PRAIRIE": "Hennepin",
    "APPLE VALLEY": "Dakota",
    "EDINA": "Hennepin",
    "SAINT LOUIS PARK": "Hennepin",
    "MINNETONKA": "Hennepin",
    "Saint Bonifacius": "Hennepin",
    "Winthrop": "Sibley",
    "Madelia": "Watonwan",
    "Saint Clair": "Blue Earth",
    "Northome": "Koochiching",
    "Zimmerman": "Sherburne",
    "ZIMMERMAN": "Sherburne",
    "Grove City": "Meeker",
    "Eden Valley": "Meeker",
    "Dassel": "Meeker",
    "Cosmos": "Meeker",
    "Darwin": "Meeker",
    "Kingston": "Meeker",
    "Watkins": "Meeker",
    "Greenwald": "Stearns",
    "Kimball": "Stearns",
    "Rockville": "Stearns",
    "St. Augusta": "Stearns",
    "Saint Augusta": "Stearns",
    "Bowlus": "Morrison",
    "Buckman": "Morrison",
    "Genola": "Morrison",
    "Harding": "Morrison",
    "Lastrup": "Morrison",
    "Motley": "Morrison",
    "Swanville": "Morrison",
    "Upsala": "Morrison",
    "Hillman": "Morrison",
    "Sobieski": "Morrison",
    "Bock": "Mille Lacs",
    "Wahkon": "Mille Lacs",
    "Pease": "Mille Lacs",
    "Foreston": "Mille Lacs",
    "Grey Eagle": "Todd",
    "Osakis": "Todd",
    "West Union": "Todd",
    "Clarissa": "Todd",
    "Eagle Bend": "Todd",
    "Bertha": "Todd",
    "Hewitt": "Todd",
    "Verndale": "Wadena",
    "Menahga": "Wadena",
    "Sebeka": "Wadena",
    "Nevis": "Hubbard",
    "Akeley": "Hubbard",
    "Longville": "Cass",
    "Hackensack": "Cass",
    "Boy River": "Cass",
    "Federal Dam": "Cass",
    "Remer": "Cass",
    "Backus": "Cass",
    "Emily": "Crow Wing",
    "Fifty Lakes": "Crow Wing",
    "Fort Ripley": "Crow Wing",
    "Garrison": "Crow Wing",
    "Ideal": "Crow Wing",
    "Ironton": "Crow Wing",
    "Jenkins": "Crow Wing",
    "Lake Shore": "Crow Wing",
    "Merrifield": "Crow Wing",
    "Mission": "Crow Wing",
    "Riverton": "Crow Wing",
    "Center": "Crow Wing",
    "Hill City": "Aitkin",
    "Palisade": "Aitkin",
    "Tamarack": "Aitkin",
    "Ely": "St. Louis",
    "Tower": "St. Louis",
    "Aurora": "St. Louis",
    "Babbitt": "St. Louis",
    "Buhl": "St. Louis",
    "Gilbert": "St. Louis",
    "Hoyt Lakes": "St. Louis",
    "Kinney": "St. Louis",
    "Makinen": "St. Louis",
    "Meadowlands": "St. Louis",
    "Orr": "St. Louis",
    "Soudan": "St. Louis",
    "Carlton": "Carlton",
    "Barnum": "Carlton",
    "Cromwell": "Carlton",
    "Kettle River": "Carlton",
    "Mahtowa": "Carlton",
    "Scanlon": "Carlton",
    "Thomson": "Carlton",
    "Wrenshall": "Carlton",
    "Knife River": "Lake",
    "Finland": "Lake",
    "Schroeder": "Cook",
    "Tofte": "Cook",
    "Lutsen": "Cook",
    "Hovland": "Cook",
}

def get_county_from_city(city):
    """Try to find county from city name."""
    if not city:
        return None
    city = city.strip()
    # Try exact match first
    if city in CITY_TO_COUNTY:
        return CITY_TO_COUNTY[city]
    # Try without periods
    city_no_periods = city.replace(".", "")
    if city_no_periods in CITY_TO_COUNTY:
        return CITY_TO_COUNTY[city_no_periods]
    # Try title case
    city_title = city.title()
    if city_title in CITY_TO_COUNTY:
        return CITY_TO_COUNTY[city_title]
    # Try with "Saint" variations
    if city.upper().startswith("ST "):
        city_saint = "Saint " + city[3:].title()
        if city_saint in CITY_TO_COUNTY:
            return CITY_TO_COUNTY[city_saint]
    if city.upper().startswith("ST. "):
        city_saint = "Saint " + city[4:].title()
        if city_saint in CITY_TO_COUNTY:
            return CITY_TO_COUNTY[city_saint]
    return None

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "..", "..", "data", "minnesota")
    gpkg_path = os.path.join(data_dir, "econ_child_care.gpkg")

    if not os.path.exists(gpkg_path):
        print(f"Error: {gpkg_path} not found")
        return

    conn = sqlite3.connect(gpkg_path)
    cursor = conn.cursor()

    # Get all facilities
    cursor.execute('''
        SELECT License_Number, License_Type, Name_of_Program,
               AddressLine1, AddressLine2, City, State, Zip
        FROM econ_child_care
    ''')

    facilities_by_county = defaultdict(list)
    unknown_cities = defaultdict(int)

    for row in cursor.fetchall():
        license_num, license_type, name, addr1, addr2, city, state, zipcode = row

        county = get_county_from_city(city)

        if not county:
            unknown_cities[city.strip() if city else "BLANK"] = unknown_cities.get(city.strip() if city else "BLANK", 0) + 1
            county = "Unknown"

        facility = {
            "license_number": str(license_num),
            "name": name.strip() if name else "",
            "facility_type": license_type,
            "address": addr1.strip() if addr1 else "",
            "address2": addr2.strip() if addr2 else None,
            "city": city.strip() if city else "",
            "state": state,
            "zip_code": zipcode,
            "county": county,
            "capacity": None,
            "status": "LICENSED",
            "license_first_date": None,
            "license_expiration_date": None,
            "phone": None,
            "last_inspection_date": None,
            "total_visits": None,
            "total_citations": None,
            "total_complaints": None,
            "scraped_at": datetime.now().isoformat(),
            "dhs_url": f"https://licensinglookup.dhs.state.mn.us/Details.aspx?l={license_num}"
        }

        facilities_by_county[county].append(facility)

    conn.close()

    # Print unknown cities
    if unknown_cities:
        total_unknown = sum(unknown_cities.values())
        print(f"\nCities not mapped ({total_unknown} facilities):")
        for city, count in sorted(unknown_cities.items(), key=lambda x: -x[1])[:20]:
            print(f"  {city}: {count}")

    # Save each county's data
    total_facilities = 0
    county_stats = {}

    for county, facilities in sorted(facilities_by_county.items()):
        if county == "Unknown":
            continue

        filename = county.lower().replace(" ", "_").replace(".", "") + "_facilities.json"
        filepath = os.path.join(data_dir, filename)

        with open(filepath, 'w') as f:
            json.dump(facilities, f, indent=2)

        total_facilities += len(facilities)
        county_stats[county] = len(facilities)
        print(f"Saved {len(facilities):4d} facilities to {filename}")

    # Generate summary
    summary = {
        "state": "Minnesota",
        "generated_at": datetime.now().isoformat(),
        "source": "Minnesota GIS Data Commons (gisdata.mn.gov)",
        "source_dataset": "Family and Child Care Centers, Minnesota",
        "data_date": "2024-11-21",
        "total_facilities": total_facilities,
        "counties_with_data": len([c for c in county_stats if c != "Unknown"]),
        "counties": {}
    }

    for county, count in sorted(county_stats.items()):
        if county != "Unknown":
            summary["counties"][county] = {
                "total_facilities": count,
                "total_capacity": None,
                "by_type": {},
                "by_status": {"LICENSED": count}
            }

    summary_path = os.path.join(data_dir, "summary.json")
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"\nTotal: {total_facilities} facilities across {len(county_stats)} counties")
    print(f"Unknown county: {len(facilities_by_county.get('Unknown', []))} facilities")
    print(f"Summary saved to {summary_path}")

if __name__ == "__main__":
    main()
