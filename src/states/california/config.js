/**
 * California state configuration for DaycareWatch
 */
const californiaConfig = {
  id: 'california',
  name: 'California',
  abbreviation: 'CA',

  // Branding
  tagline: 'California Childcare Transparency',
  color: '#1a365d',

  // Data sources
  dataSources: {
    licensing: {
      name: 'Community Care Licensing Division (CCLD)',
      url: 'https://www.ccld.dss.ca.gov/carefacilitysearch/',
      agency: 'California Department of Social Services',
      description: 'Licensed facility data including inspections and violations'
    },
    subsidies: {
      name: 'CalWORKs, State Preschool, CCTR Programs',
      agencies: ['CDSS', 'CDE'],
      description: 'Subsidy payment data (requires CPRA request)'
    }
  },

  // Public records law
  publicRecordsLaw: {
    name: 'California Public Records Act (CPRA)',
    shortName: 'CPRA',
    statute: 'Government Code 7920.000 et seq.',
    responseDeadline: '10 days for determination',
    templatePath: '/docs/CPRA_TEMPLATES.md'
  },

  // Stats for display
  stats: {
    totalCounties: 58,
    annualSubsidies: '$1B+',
    pilotCounty: 'San Diego'
  },

  // Footer links
  footerLinks: [
    {
      name: 'CA Community Care Licensing',
      url: 'https://www.ccld.dss.ca.gov/carefacilitysearch/'
    },
    {
      name: 'CA Dept of Social Services',
      url: 'https://www.cdss.ca.gov/'
    },
    {
      name: 'CA Dept of Education',
      url: 'https://www.cde.ca.gov/sp/cd/'
    }
  ]
};

export default californiaConfig;
