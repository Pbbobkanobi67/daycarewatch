/**
 * Federal Investigation Tracking Data
 *
 * Tracks facilities mentioned in federal investigations,
 * news reports, and viral videos.
 */

// Facilities mentioned in Nick Shirley's viral video (December 2025)
export const SHIRLEY_VIDEO_FACILITIES = [
  {
    name: 'Quality Learning Center',
    address: '2533 24th Ave S',
    city: 'Minneapolis',
    notes: [
      'Featured prominently in viral video',
      'Alleged $4M+ in CCAP payments since FY2020',
      '95 violations reported (2019-2023)',
      'Conditional license in 2022',
      'Sign reportedly misspelled "Learning" as "Learing"',
    ],
    source: 'Nick Shirley viral video (Dec 27, 2025)',
    verificationStatus: 'under_investigation',
  },
  {
    name: 'Nakomis Day Care Center',
    address: null,
    city: 'Minneapolis',
    notes: [
      'Reported break-in with "stolen documents"',
      'Nick Sortor noted cuts in sheetrock appeared made from inside',
      'Documents allegedly stolen included enrollment records',
    ],
    source: 'News reports (Dec 31, 2025)',
    verificationStatus: 'under_investigation',
  },
];

// Federal agencies involved in investigation
export const FEDERAL_AGENCIES = [
  {
    agency: 'Department of Health and Human Services (HHS)',
    action: 'Froze all Minnesota childcare funding',
    date: '2025-12-31',
    details: 'Deputy Secretary Jim O\'Neill ordered comprehensive audit',
  },
  {
    agency: 'Department of Homeland Security (DHS)',
    action: 'Visiting dozens of sites in Minneapolis',
    date: '2025-12-30',
    details: 'Secretary Kristi Noem described as "massive investigation"',
  },
  {
    agency: 'Federal Bureau of Investigation (FBI)',
    action: 'Surged personnel and investigative resources',
    date: '2025-12-30',
    details: 'Director Kash Patel confirmed active investigation',
  },
];

// Key statistics from federal investigation
export const INVESTIGATION_STATS = {
  confirmedFraud: '$1 billion',
  potentialFraud: '$9 billion',
  source: 'New York Times',
  programs: ['Child Care (CCAP)', 'Food Programs', 'Housing Programs'],
  state: 'Minnesota',
  fedFundingStatus: 'FROZEN',
  freezeDate: '2025-12-31',
};

// News articles tracking the investigation
export const NEWS_SOURCES = [
  {
    title: 'HHS freezes all child care payments to Minnesota after viral fraud allegations',
    source: 'CBS News',
    date: '2025-12-31',
    url: 'https://www.cbsnews.com/news/hhs-freezes-child-care-payments-minnesota/',
  },
  {
    title: 'How a viral video prompted investigations into alleged fraud at day care centers',
    source: 'CBS News',
    date: '2025-12-30',
    url: 'https://www.cbsnews.com/news/minnesota-fraud-nick-shirley-video-day-care-investigation/',
  },
  {
    title: 'Federal payment freeze puts Minnesota families in danger of losing child care',
    source: 'CNN',
    date: '2025-12-29',
    url: 'https://www.cnn.com/2025/12/29/us/minnesota-day-care-fraud-what-we-know',
  },
  {
    title: 'Everything we know about Minnesota\'s massive fraud schemes',
    source: 'CBS News',
    date: '2025-12-30',
    url: 'https://www.cbsnews.com/news/minnesota-fraud-schemes-what-we-know/',
  },
  {
    title: 'Who is Nick Shirley, the 23-year-old MAGA journalist whose story went viral',
    source: 'CNN',
    date: '2025-12-30',
    url: 'https://www.cnn.com/2025/12/30/media/nick-shirley-minnesota-somali-video',
  },
];

// Timeline of events
export const INVESTIGATION_TIMELINE = [
  {
    date: '2025-12-27',
    event: 'Nick Shirley posts viral video showing empty daycare centers',
    impact: 'Video gets 100M+ views after JD Vance and Elon Musk repost',
  },
  {
    date: '2025-12-28',
    event: 'Federal officials begin responding to video allegations',
    impact: 'DHS announces site visits planned',
  },
  {
    date: '2025-12-29',
    event: 'DHS agents visit dozens of Minneapolis daycare sites',
    impact: 'Secretary Noem calls it "massive investigation"',
  },
  {
    date: '2025-12-30',
    event: 'FBI confirms surging resources to Minnesota',
    impact: 'Director Patel announces personnel deployment',
  },
  {
    date: '2025-12-31',
    event: 'HHS freezes ALL Minnesota childcare funding',
    impact: 'Legitimate daycares also affected by freeze',
  },
  {
    date: '2026-01-01',
    event: 'Daycares report impacts, some claim unfair targeting',
    impact: 'Debate over scope and accuracy of allegations',
  },
];

/**
 * Check if a facility is mentioned in federal investigation
 */
export const isUnderFederalInvestigation = (facility) => {
  if (!facility) return false;

  const normalizedName = (facility.name || '').toLowerCase();
  const normalizedAddress = (facility.address || '').toLowerCase();

  return SHIRLEY_VIDEO_FACILITIES.some(f => {
    const matchName = f.name && normalizedName.includes(f.name.toLowerCase());
    const matchAddress = f.address && normalizedAddress.includes(f.address.toLowerCase());
    return matchName || matchAddress;
  });
};

/**
 * Get investigation details for a facility
 */
export const getInvestigationDetails = (facility) => {
  if (!facility) return null;

  const normalizedName = (facility.name || '').toLowerCase();
  const normalizedAddress = (facility.address || '').toLowerCase();

  return SHIRLEY_VIDEO_FACILITIES.find(f => {
    const matchName = f.name && normalizedName.includes(f.name.toLowerCase());
    const matchAddress = f.address && normalizedAddress.includes(f.address.toLowerCase());
    return matchName || matchAddress;
  }) || null;
};

const federalInvestigation = {
  SHIRLEY_VIDEO_FACILITIES,
  FEDERAL_AGENCIES,
  INVESTIGATION_STATS,
  NEWS_SOURCES,
  INVESTIGATION_TIMELINE,
  isUnderFederalInvestigation,
  getInvestigationDetails,
};

export default federalInvestigation;
