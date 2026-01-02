// Minnesota State Configuration for DaycareWatch
// src/states/minnesota/config.js

export const MINNESOTA_CONFIG = {
  name: "Minnesota",
  abbreviation: "MN",
  totalCounties: 87,
  pilotCounty: "Hennepin",
  
  // Data sources
  dataSources: {
    licensing: {
      name: "Minnesota DHS License Lookup",
      url: "https://licensinglookup.dhs.state.mn.us/",
      scrapable: true,
      dataAvailable: [
        "license_number",
        "facility_name",
        "facility_type",
        "address",
        "city",
        "zip_code",
        "county",
        "capacity",
        "license_status",
        "licensor",
        "phone"
      ]
    },
    qualityRatings: {
      name: "ParentAware",
      url: "https://parentaware.org/",
      scrapable: true,
      dataAvailable: [
        "quality_rating",
        "ccap_registered",
        "els_eligible",
        "hours_of_operation"
      ]
    },
    subsidyPayments: {
      name: "CCAP Payment Data",
      url: null,
      scrapable: false,
      requiresMGDPA: true,
      agency: "Minnesota DCYF"
    }
  },
  
  // Subsidy programs
  subsidyPrograms: [
    {
      code: "CCAP",
      name: "Child Care Assistance Program",
      description: "Helps low-income families pay for child care",
      annualBudget: 157000000, // FY2025
      childrenServed: 23000,
      familiesServed: 12000,
      providersRegistered: 4000
    },
    {
      code: "ELS",
      name: "Early Learning Scholarships",
      description: "Additional assistance for quality-rated programs"
    },
    {
      code: "MFIP",
      name: "Minnesota Family Investment Program",
      description: "Cash assistance with child care component"
    },
    {
      code: "BSF",
      name: "Basic Sliding Fee",
      description: "For families not on cash assistance"
    }
  ],
  
  // Public records law
  publicRecordsLaw: {
    name: "Minnesota Government Data Practices Act",
    shortName: "MGDPA",
    citation: "Minn. Stat. § 13.01 et seq.",
    responseDeadline: "10 business days",
    presumption: "Public unless classified otherwise",
    strengths: [
      "Strong presumption of public access",
      "Short response deadline",
      "No purpose requirement",
      "Fee waiver provisions"
    ]
  },
  
  // Key agencies
  agencies: {
    dcyf: {
      name: "Department of Children, Youth, and Families",
      role: "CCAP administration (as of April 2025)",
      dataContact: "datamanagement.dhs@state.mn.us",
      phone: "651-431-3830"
    },
    dhs: {
      name: "Department of Human Services",
      role: "Licensing, OIG investigations",
      licensingPhone: "651-431-6500",
      fraudHotline: "1-800-657-3508"
    }
  },
  
  // Facility types (Minnesota-specific)
  facilityTypes: [
    { code: "LCCC", name: "Licensed Child Care Center" },
    { code: "LFCC", name: "Licensed Family Child Care" },
    { code: "CLEC", name: "Certified License-Exempt Center" },
    { code: "LNL", name: "Legal Nonlicensed Provider" }
  ],
  
  // Anomaly detection thresholds (Minnesota-specific)
  anomalyThresholds: {
    highPaymentPerCapacity: 25000, // $ per licensed slot per year
    violationsWarning: 10,
    violationsCritical: 25,
    inspectionOverdueMonths: 12,
    conditionalLicenseFlag: true
  },
  
  // Current news context
  currentContext: {
    federalFundingStatus: "FROZEN", // As of Dec 2025
    activeInvestigations: 62, // DHS OIG
    relatedFraudCases: [
      {
        name: "Feeding Our Future",
        amount: 250000000,
        status: "Prosecuted",
        program: "Federal meal program"
      }
    ],
    mediaAttention: "HIGH", // Shirley video viral Dec 2025
    lastUpdated: "2025-12-31"
  }
};

export const MINNESOTA_COUNTIES = [
  { name: "Aitkin", population: 15886 },
  { name: "Anoka", population: 363887 },
  { name: "Becker", population: 34767 },
  { name: "Beltrami", population: 47188 },
  { name: "Benton", population: 41379 },
  { name: "Big Stone", population: 4991 },
  { name: "Blue Earth", population: 67653 },
  { name: "Brown", population: 25008 },
  { name: "Carlton", population: 35871 },
  { name: "Carver", population: 106922 },
  { name: "Cass", population: 29779 },
  { name: "Chippewa", population: 11629 },
  { name: "Chisago", population: 56543 },
  { name: "Clay", population: 64222 },
  { name: "Clearwater", population: 8818 },
  { name: "Cook", population: 5463 },
  { name: "Cottonwood", population: 11196 },
  { name: "Crow Wing", population: 65055 },
  { name: "Dakota", population: 439882 },
  { name: "Dodge", population: 20867 },
  { name: "Douglas", population: 38141 },
  { name: "Faribault", population: 13653 },
  { name: "Fillmore", population: 21067 },
  { name: "Freeborn", population: 30281 },
  { name: "Goodhue", population: 46340 },
  { name: "Grant", population: 5972 },
  { name: "Hennepin", population: 1281565 },
  { name: "Houston", population: 18843 },
  { name: "Hubbard", population: 21491 },
  { name: "Isanti", population: 41000 },
  { name: "Itasca", population: 45130 },
  { name: "Jackson", population: 10073 },
  { name: "Kanabec", population: 16337 },
  { name: "Kandiyohi", population: 43199 },
  { name: "Kittson", population: 4298 },
  { name: "Koochiching", population: 12229 },
  { name: "Lac qui Parle", population: 6623 },
  { name: "Lake", population: 10571 },
  { name: "Lake of the Woods", population: 3764 },
  { name: "Le Sueur", population: 28887 },
  { name: "Lincoln", population: 5639 },
  { name: "Lyon", population: 25474 },
  { name: "Mahnomen", population: 5527 },
  { name: "Marshall", population: 9393 },
  { name: "Martin", population: 19683 },
  { name: "McLeod", population: 35893 },
  { name: "Meeker", population: 23222 },
  { name: "Mille Lacs", population: 26277 },
  { name: "Morrison", population: 33386 },
  { name: "Mower", population: 40062 },
  { name: "Murray", population: 8194 },
  { name: "Nicollet", population: 34274 },
  { name: "Nobles", population: 21629 },
  { name: "Norman", population: 6470 },
  { name: "Olmsted", population: 162847 },
  { name: "Otter Tail", population: 58746 },
  { name: "Pennington", population: 14119 },
  { name: "Pine", population: 29579 },
  { name: "Pipestone", population: 9126 },
  { name: "Polk", population: 31364 },
  { name: "Pope", population: 11249 },
  { name: "Ramsey", population: 552352 },
  { name: "Red Lake", population: 4055 },
  { name: "Redwood", population: 15170 },
  { name: "Renville", population: 14548 },
  { name: "Rice", population: 66972 },
  { name: "Rock", population: 9315 },
  { name: "Roseau", population: 15165 },
  { name: "Scott", population: 150928 },
  { name: "Sherburne", population: 97238 },
  { name: "Sibley", population: 14912 },
  { name: "St. Louis", population: 200080 },
  { name: "Stearns", population: 161075 },
  { name: "Steele", population: 36649 },
  { name: "Stevens", population: 9805 },
  { name: "Swift", population: 9783 },
  { name: "Todd", population: 25149 },
  { name: "Traverse", population: 3259 },
  { name: "Wabasha", population: 21627 },
  { name: "Wadena", population: 13885 },
  { name: "Waseca", population: 18612 },
  { name: "Washington", population: 267568 },
  { name: "Watonwan", population: 10748 },
  { name: "Wilkin", population: 6269 },
  { name: "Winona", population: 49671 },
  { name: "Wright", population: 141337 },
  { name: "Yellow Medicine", population: 9709 }
];

export default MINNESOTA_CONFIG;
