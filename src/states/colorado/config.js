/**
 * Colorado state configuration for DaycareWatch
 */
const coloradoConfig = {
  id: 'colorado',
  name: 'Colorado',
  abbreviation: 'CO',

  // Branding
  tagline: 'Colorado Childcare Transparency',
  color: '#1a365d',

  // Data sources
  dataSources: {
    licensing: {
      name: 'Department of Early Childhood (CDEC)',
      url: 'https://cdec.colorado.gov/',
      agency: 'Colorado Department of Early Childhood',
      description: 'Licensed facility data including Colorado Shines ratings'
    },
    subsidies: {
      name: 'Colorado Child Care Assistance Program (CCCAP)',
      agencies: ['CDEC', 'County DHS'],
      description: 'Subsidy payment data (requires CORA request)'
    }
  },

  // Public records law
  publicRecordsLaw: {
    name: 'Colorado Open Records Act (CORA)',
    shortName: 'CORA',
    statute: 'C.R.S. 24-72-200.1 et seq.',
    responseDeadline: '3 working days',
    templatePath: '/docs/CORA_TEMPLATES.md'
  },

  // Stats for display
  stats: {
    totalCounties: 64,
    annualSubsidies: '$250M+',
    pilotCounties: 'Jefferson, Arapahoe'
  },

  // Footer links
  footerLinks: [
    {
      name: 'CO Dept of Early Childhood',
      url: 'https://cdec.colorado.gov/'
    },
    {
      name: 'Colorado Shines',
      url: 'https://www.coloradoshines.com/'
    },
    {
      name: 'CO Open Data Portal',
      url: 'https://data.colorado.gov/'
    }
  ]
};

export default coloradoConfig;
