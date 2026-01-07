/**
 * Maryland state configuration for DaycareWatch
 */

const marylandConfig = {
  id: 'maryland',
  name: 'Maryland',
  abbreviation: 'MD',
  tagline: 'Maryland Childcare Transparency',
  color: '#c41e3a', // Maryland red

  dataSources: {
    licensing: {
      name: 'Check Child Care Maryland (CheckCCMD)',
      url: 'https://www.checkccmd.org/',
      agency: 'Maryland State Department of Education (MSDE)',
      description: 'Licensed facility data including inspection results and compliance history',
      scrapable: true,
      dataAvailable: ['facility_name', 'address', 'license_status', 'facility_type', 'inspection_results', 'violations']
    },
    qualityRatings: {
      name: 'Maryland EXCELS',
      url: 'https://marylandexcels.org/',
      description: 'Quality rating and improvement system',
      scrapable: true,
      dataAvailable: ['quality_rating', 'accreditation']
    },
    subsidies: {
      name: 'Child Care Scholarship (CCS) Program',
      requiresMDPIA: true,
      agency: 'MSDE Division of Early Childhood',
      description: 'Formerly Child Care Subsidy Program - serves ~15,000 children'
    }
  },

  subsidyPrograms: [
    {
      code: 'CCS',
      name: 'Child Care Scholarship',
      description: 'Financial assistance for working families (formerly CCSP)',
      annualBudget: null, // Need to research
      childrenServed: 15000,
      eligibility: '75% of State Median Income (~$90K for family of 4)',
      note: 'Program paused new enrollments May 2025'
    }
  ],

  publicRecordsLaw: {
    name: 'Maryland Public Information Act (MPIA)',
    shortName: 'MPIA',
    citation: 'Md. Code, Gen. Prov. 4-101 et seq.',
    responseDeadline: '30 days (10 days for denial)',
    presumption: 'Public records are presumed open',
    fees: 'Reasonable fee for search, preparation, and reproduction',
    templatePath: '/docs/MPIA_TEMPLATES.md',
    submissionInfo: {
      agency: 'MSDE Division of Early Childhood',
      email: 'earlychildhoodpolicy.msde@maryland.gov',
      address: '200 W. Baltimore Street, Baltimore, MD 21201'
    }
  },

  agencies: {
    msde: {
      name: 'Maryland State Department of Education',
      division: 'Division of Early Childhood',
      role: 'Licensing, CCS administration',
      url: 'https://earlychildhood.marylandpublicschools.org/',
      licensingPhone: '410-767-7805'
    },
    occ: {
      name: 'Office of Child Care',
      role: 'Licensing Branch oversight',
      url: 'https://earlychildhood.marylandpublicschools.org/child-care-providers/licensing'
    }
  },

  facilityTypes: [
    { code: 'CENTER', name: 'Child Care Center' },
    { code: 'FAMILY', name: 'Family Child Care Home' },
    { code: 'LARGE_FAMILY', name: 'Large Family Child Care Home' },
    { code: 'LOC', name: 'Letter of Compliance' },
    { code: 'SACC', name: 'School-Age Child Care' }
  ],

  anomalyThresholds: {
    highPaymentPerCapacity: 20000,
    violationsWarning: 5,
    violationsCritical: 15,
    inspectionOverdueMonths: 12,
    conditionalLicenseFlag: true
  },

  stats: {
    totalCounties: 24,
    annualSubsidies: '$200M+',
    licensedProviders: 7200,
    pilotCounty: 'Montgomery'
  },

  footerLinks: [
    { name: 'CheckCCMD Provider Search', url: 'https://www.checkccmd.org/' },
    { name: 'MSDE Division of Early Childhood', url: 'https://earlychildhood.marylandpublicschools.org/' },
    { name: 'Maryland EXCELS', url: 'https://marylandexcels.org/' },
    { name: 'Child Care Scholarship Program', url: 'https://earlychildhood.marylandpublicschools.org/child-care-providers/child-care-scholarship-program' }
  ]
};

export default marylandConfig;
