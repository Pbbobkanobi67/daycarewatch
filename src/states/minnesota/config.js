/**
 * Minnesota state configuration for DaycareWatch
 * Enhanced with subsidy program details and investigation context
 */
const minnesotaConfig = {
  id: 'minnesota',
  name: 'Minnesota',
  abbreviation: 'MN',

  // Branding
  tagline: 'Minnesota Childcare Transparency',
  color: '#003865', // Minnesota blue

  // Data sources
  dataSources: {
    licensing: {
      name: 'Minnesota DHS License Lookup',
      url: 'https://licensinglookup.dhs.state.mn.us/',
      agency: 'Minnesota Department of Human Services',
      scrapable: true,
      dataAvailable: [
        'license_number',
        'facility_name',
        'facility_type',
        'address',
        'city',
        'zip_code',
        'county',
        'capacity',
        'license_status',
        'licensor',
        'phone'
      ]
    },
    qualityRatings: {
      name: 'ParentAware',
      url: 'https://parentaware.org/',
      scrapable: true,
      dataAvailable: [
        'quality_rating',
        'ccap_registered',
        'els_eligible',
        'hours_of_operation'
      ]
    },
    subsidies: {
      name: 'Child Care Assistance Program (CCAP)',
      url: null,
      scrapable: false,
      requiresMGDPA: true,
      agency: 'Minnesota DCYF'
    }
  },

  // Subsidy programs
  subsidyPrograms: [
    {
      code: 'CCAP',
      name: 'Child Care Assistance Program',
      description: 'Helps low-income families pay for child care',
      annualBudget: 157000000, // FY2025
      childrenServed: 23000,
      familiesServed: 12000,
      providersRegistered: 4000
    },
    {
      code: 'ELS',
      name: 'Early Learning Scholarships',
      description: 'Additional assistance for quality-rated programs'
    },
    {
      code: 'MFIP',
      name: 'Minnesota Family Investment Program',
      description: 'Cash assistance with child care component'
    },
    {
      code: 'BSF',
      name: 'Basic Sliding Fee',
      description: 'For families not on cash assistance'
    }
  ],

  // Public records law
  publicRecordsLaw: {
    name: 'Minnesota Government Data Practices Act (MGDPA)',
    shortName: 'MGDPA',
    citation: 'Minn. Stat. § 13.01 et seq.',
    responseDeadline: '10 business days',
    presumption: 'Public unless classified otherwise',
    templatePath: '/docs/MGDPA_TEMPLATES.md',
    strengths: [
      'Strong presumption of public access',
      'Short response deadline',
      'No purpose requirement',
      'Fee waiver provisions'
    ]
  },

  // Key agencies
  agencies: {
    dcyf: {
      name: 'Department of Children, Youth, and Families',
      role: 'CCAP administration (as of April 2025)',
      dataContact: 'datamanagement.dhs@state.mn.us',
      phone: '651-431-3830'
    },
    dhs: {
      name: 'Department of Human Services',
      role: 'Licensing, OIG investigations',
      licensingPhone: '651-431-6500',
      fraudHotline: '1-800-657-3508'
    }
  },

  // Facility types (Minnesota-specific)
  facilityTypes: [
    { code: 'LCCC', name: 'Licensed Child Care Center' },
    { code: 'LFCC', name: 'Licensed Family Child Care' },
    { code: 'CLEC', name: 'Certified License-Exempt Center' },
    { code: 'LNL', name: 'Legal Nonlicensed Provider' }
  ],

  // Anomaly detection thresholds (Minnesota-specific)
  anomalyThresholds: {
    highPaymentPerCapacity: 25000, // $ per licensed slot per year
    violationsWarning: 10,
    violationsCritical: 25,
    inspectionOverdueMonths: 12,
    conditionalLicenseFlag: true
  },

  // Stats for display
  stats: {
    totalCounties: 87,
    annualSubsidies: '$157M+',
    pilotCounty: 'Hennepin'
  },

  // Current context
  currentContext: {
    federalFundingStatus: 'FROZEN', // As of Dec 2025
    activeInvestigations: 62, // DHS OIG
    relatedFraudCases: [
      {
        name: 'Feeding Our Future',
        amount: 250000000,
        status: 'Prosecuted',
        program: 'Federal meal program'
      }
    ],
    mediaAttention: 'HIGH',
    lastUpdated: '2025-12-31'
  },

  // Footer links
  footerLinks: [
    {
      name: 'MN DHS Licensing',
      url: 'https://mn.gov/dhs/general-public/licensing/'
    },
    {
      name: 'MN Dept of Human Services',
      url: 'https://mn.gov/dhs/'
    },
    {
      name: 'MN DCYF',
      url: 'https://dcyf.mn.gov/'
    },
    {
      name: 'ParentAware',
      url: 'https://parentaware.org/'
    }
  ]
};

export default minnesotaConfig;
