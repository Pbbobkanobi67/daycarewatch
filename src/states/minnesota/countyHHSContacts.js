/**
 * Minnesota County Human Services Contact Information
 * For MGDPA (Data Practices Act) requests
 *
 * Sources:
 * - Minnesota DHS County Directory: https://mn.gov/dhs/people-we-serve/children-and-families/health-care/health-care-programs/contact-us/county-tribal-state-offices.jsp
 * - Individual county websites
 * - MN DHS Children's Services Supervisors list
 *
 * Last Updated: January 2026
 */

export const MN_COUNTY_HHS_CONTACTS = {
  // Twin Cities Metro Counties
  "Hennepin": {
    name: "Hennepin County Human Services & Public Health",
    address: "300 S 6th St, Minneapolis, MN 55487-0999",
    phone: "612-348-4111",
    fax: "612-288-2981",
    email: "socialservices@hennepin.us",
    alternateEmails: {
      fraud: "benefits-fraud@hennepin.us",
      teenParent: "hchealthyfamilies@hennepin.us"
    },
    website: "https://www.hennepin.us/residents/human-services"
  },

  "Ramsey": {
    name: "Ramsey County Health and Human Services",
    address: "160 E Kellogg Blvd, St. Paul, MN 55101-1494",
    phone: "651-266-4444",
    fax: "651-266-3942",
    email: "ContactHR@co.ramsey.mn.us", // HR contact - use for general inquiries
    alternateEmails: {
      followAlong: "followalongramseyco@co.ramsey.mn.us"
    },
    website: "https://www.ramseycounty.us/your-government/departments/health-and-wellness/social-services"
  },

  "Dakota": {
    name: "Dakota County Community Services",
    address: "1 Mendota Road W, #100, West St. Paul, MN 55118-4765",
    phone: "651-554-5611",
    fax: "651-554-5748",
    email: "clsintake@co.dakota.mn.us",
    alternateEmails: {
      publicHealth: "public.health@co.dakota.mn.us",
      countyAdmin: "countyadmin@co.dakota.mn.us"
    },
    website: "https://www.co.dakota.mn.us/HealthFamily"
  },

  "Anoka": {
    name: "Anoka County Community Social Services & Behavioral Health",
    address: "1201 89th Ave NE, Suite 4200, Blaine, MN 55434",
    phone: "763-422-7200",
    fax: "763-324-3620",
    email: "public.health@co.anoka.mn.us",
    alternateEmails: {
      director: "george.borrell@anokacountymn.gov",
      childFamily: "jess.vankuyk@anokacountymn.gov"
    },
    website: "https://www.anokacountymn.gov/1059/Human-Services"
  },

  "Washington": {
    name: "Washington County Community Services",
    address: "14949 62nd St N, PO Box 30, Stillwater, MN 55082-0030",
    phone: "651-430-6484",
    fax: null,
    email: null, // Contact by phone
    website: "https://www.co.washington.mn.us"
  },

  "Scott": {
    name: "Scott County Human Services",
    address: "200 4th Avenue W, Shakopee, MN 55379",
    phone: "952-445-7751",
    fax: "952-496-8685",
    email: null, // Contact by phone
    website: "https://www.scottcountymn.gov"
  },

  "Carver": {
    name: "Carver County Health and Human Services",
    address: "602 E Fourth St, Chaska, MN 55318-2102",
    phone: "952-361-1600",
    fax: "952-361-1660",
    email: "kjensen@co.carver.mn.us",
    website: "https://www.carvercountymn.gov/departments/health-human-services"
  },

  "Chisago": {
    name: "Chisago County Human Services",
    address: "313 North Main Street, Rm 230, Center City, MN 55012-9665",
    phone: "651-213-5600",
    fax: "651-213-5685",
    email: "kksmith@chisagocounty.us",
    website: "https://www.chisagocountymn.gov/515/Human-Services"
  },

  "Isanti": {
    name: "Isanti County Family Services",
    address: "1700 East Rum River Drive S, Suite A, Cambridge, MN 55008-2547",
    phone: "763-689-1711",
    fax: "763-689-9877",
    email: null, // Contact by phone
    website: "https://www.co.isanti.mn.us"
  },

  "Sherburne": {
    name: "Sherburne County Health and Human Services",
    address: "13880 Business Center Drive, Elk River, MN 55330-4600",
    phone: "763-765-4000",
    tollFree: "800-433-5239",
    fax: "763-765-4096",
    email: null, // Contact by phone
    website: "https://www.co.sherburne.mn.us/1365/Health-Human-Services"
  },

  "Wright": {
    name: "Wright County Health & Human Services",
    address: "3650 Braddock Ave NE, Suite 2100, Buffalo, MN 55313-3675",
    phone: "763-682-7400",
    tollFree: "800-362-3667",
    fax: "763-682-8920",
    email: null, // Contact by phone
    website: "https://www.co.wright.mn.us"
  },

  // Central Minnesota
  "Stearns": {
    name: "Stearns County Human Services",
    address: "705 Courthouse Square, PO Box 1107, St. Cloud, MN 56302-1107",
    phone: "320-650-5839",
    tollFree: "800-450-3663",
    fax: "320-656-6134",
    email: null, // Contact by phone
    website: "https://www.stearnscountymn.gov/1479/Human-Services"
  },

  // Southeast Minnesota
  "Olmsted": {
    name: "Olmsted County Health, Housing, and Human Services",
    address: "2117 Campus Drive SE, Suite 100, Rochester, MN 55904",
    phone: "507-328-6500",
    fax: "507-328-7956",
    email: "cpintake@co.olmsted.mn.us",
    website: "https://www.olmstedcounty.gov/residents/services-individuals-families"
  },

  "Winona": {
    name: "Winona County Health and Human Services",
    address: "202 West 3rd St, Winona, MN 55987",
    phone: "507-457-6500",
    tollFree: "844-317-9381",
    fax: "507-454-9381",
    email: null, // Contact by phone
    website: "https://www.winonacounty.gov/257/Human-Services"
  },

  // South Central Minnesota
  "Blue Earth": {
    name: "Blue Earth County Human Services",
    address: "410 S Fifth St, PO Box 3526, Mankato, MN 56002-3526",
    phone: "507-304-4335",
    fax: "507-304-4336",
    email: "hsinformation@blueearthcountymn.gov",
    alternateEmails: {
      financialAssistance: "fa@blueearthcountymn.gov"
    },
    website: "https://www.blueearthcountymn.gov/99/Human-Services-Social-Services"
  },

  // Northeast Minnesota
  "St. Louis": {
    name: "St. Louis County Health and Human Services",
    address: "320 W Second St, Duluth, MN 55802-1495",
    phone: "218-726-2101",
    tollFree: "800-450-9777",
    fax: "218-733-2975",
    email: null, // Contact by phone
    alternateOffices: {
      virginia: "218-471-7137",
      ely: "218-365-8220",
      hibbing: "218-312-8300"
    },
    website: "https://www.stlouiscountymn.gov"
  },

  "Itasca": {
    name: "Itasca County Health and Human Services",
    address: "1209 SE 2nd Ave, Grand Rapids, MN 55744",
    phone: "218-327-2941",
    tollFree: "800-422-0312",
    fax: "218-327-5535",
    email: "cpintake@co.itasca.mn.us",
    website: "https://www.co.itasca.mn.us"
  },

  // Central Minnesota
  "Crow Wing": {
    name: "Crow Wing County Community Services",
    address: "204 Laurel St, PO Box 686, Brainerd, MN 56401",
    phone: "218-824-1140",
    fax: "218-824-1305",
    email: null, // Contact by phone
    website: "https://www.crowwing.us"
  },

  // West Central Minnesota
  "Clay": {
    name: "Clay County Social Services",
    address: "715 11th St N, Suite 502, Moorhead, MN 56560",
    phone: "218-299-7139",
    fax: "218-299-7515",
    email: "Child.Intake@co.clay.mn.us",
    website: "https://claycountymn.gov/168/Social-Services"
  },

  "Otter Tail": {
    name: "Otter Tail County Human Services",
    address: "530 W Fir Ave, Fergus Falls, MN 56537",
    phone: "218-998-8150",
    fax: "218-998-8213",
    email: "otcvacp@co.ottertail.mn.us",
    website: "https://ottertailcounty.gov/department/human-services/"
  },

  "Douglas": {
    name: "Douglas County Social Services",
    address: "809 Elm St, Suite 1186, Alexandria, MN 56308",
    phone: "320-762-2302",
    tollFree: "844-204-0012",
    fax: "320-762-3833",
    email: null, // Contact by phone
    website: "https://www.co.douglas.mn.us"
  },

  // Northwest Minnesota
  "Beltrami": {
    name: "Beltrami County Human Services",
    address: "616 America Ave NW, Suite 110, Bemidji, MN 56601",
    phone: "218-333-8300",
    fax: null,
    email: null, // Contact by phone
    website: "https://www.co.beltrami.mn.us"
  },

  // Remaining counties - phone contact required
  // These counties don't have publicly listed email addresses
  // Contact by phone for MGDPA requests

  "Aitkin": {
    name: "Aitkin County Health and Human Services",
    address: "204 1st St NW, Aitkin, MN 56431",
    phone: "218-927-7200",
    tollFree: "800-328-3744",
    email: null,
    website: "https://www.co.aitkin.mn.us/departments/hhs/"
  },

  "Becker": {
    name: "Becker County Human Services",
    address: "712 Minnesota Ave, Detroit Lakes, MN 56501",
    phone: "218-847-5628",
    email: null,
    website: "https://www.co.becker.mn.us"
  },

  "Freeborn": {
    name: "Freeborn County Department of Human Services",
    address: "203 W Clark St, Albert Lea, MN 56007",
    phone: "507-377-5400",
    email: "im.dhs@co.freeborn.mn.us",
    website: "https://www.co.freeborn.mn.us/135/Human-Services"
  },

  "Goodhue": {
    name: "Goodhue County Health and Human Services",
    address: "426 W Avenue, Red Wing, MN 55066",
    phone: "651-385-3200",
    email: null,
    website: "https://www.co.goodhue.mn.us"
  },

  "Kandiyohi": {
    name: "Kandiyohi County Health and Human Services",
    address: "2200 23rd St NE, Suite 1020, Willmar, MN 56201",
    phone: "320-231-7800",
    email: null,
    website: "https://www.co.kandiyohi.mn.us"
  },

  "Mower": {
    name: "Mower County Health and Human Services",
    address: "201 1st St NE, Austin, MN 55912",
    phone: "507-437-9700",
    email: null,
    website: "https://www.co.mower.mn.us"
  },

  "Rice": {
    name: "Rice County Social Services",
    address: "320 3rd St NW, Faribault, MN 55021",
    phone: "507-332-6115",
    email: null,
    website: "https://www.co.rice.mn.us"
  },

  "Steele": {
    name: "Steele County Human Services",
    address: "630 Florence Ave, Owatonna, MN 55060",
    phone: "507-431-5600",
    email: null,
    website: "https://www.co.steele.mn.us"
  }
};

/**
 * State-level DHS contacts for general inquiries
 */
export const MN_DHS_CONTACTS = {
  general: {
    email: "DHS.info@state.mn.us",
    phone: "651-431-2000"
  },
  healthcareProviders: {
    email: "dhs.healthcare-providers@state.mn.us",
    phone: "651-431-2700"
  },
  childrenServicesContact: {
    name: "Wendy Woessner",
    email: "Wendy.Woessner@state.mn.us",
    phone: "651-755-1597",
    note: "Contact for County/Tribal Children's Services Supervisors list"
  },
  civilRights: {
    address: "Equal Opportunity and Access Division, PO Box 64997, St. Paul, MN 55164-0997",
    phone: "651-431-3040",
    tty: "866-786-3945"
  }
};

/**
 * Helper function to get contact info for a county
 * Returns the county contact or a message to use state contact
 */
export function getCountyContact(countyName) {
  const contact = MN_COUNTY_HHS_CONTACTS[countyName];
  if (contact) {
    return contact;
  }

  // Return placeholder for counties not yet in database
  return {
    name: `${countyName} County Human Services`,
    phone: "Contact MN DHS at 651-431-2000 for county contact",
    email: null,
    note: "County contact not in database - check county website or call MN DHS"
  };
}

export default MN_COUNTY_HHS_CONTACTS;
