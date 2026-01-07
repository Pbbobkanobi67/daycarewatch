import React, { useState } from 'react';
import {
  Truck,
  FileText,
  Mail,
  AlertTriangle,
  ExternalLink,
  Building,
  Users,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  Copy,
  Download
} from 'lucide-react';

/**
 * TransportWatch - NEMT (Non-Emergency Medical Transportation) Fraud Investigation Module
 *
 * Exposes patterns in medical transportation billing fraud, which often
 * operates alongside daycare fraud using similar shell company structures.
 */
const TransportWatchPage = () => {
  const [copiedTemplate, setCopiedTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('mndot');

  // MGDPA Request Templates
  const templates = {
    mndot: {
      agency: 'Minnesota Department of Transportation',
      email: null,
      formUrl: 'http://www.dot.state.mn.us/information/datapractices/submit-request.html',
      subject: 'MGDPA Request - Commercial Vehicle Registrations for Medical Transportation',
      body: `MINNESOTA GOVERNMENT DATA PRACTICES ACT (MGDPA) REQUEST
Minnesota Department of Transportation

Subject: Commercial Vehicle Registrations for Medical Transportation Companies

Purpose: Public accountability research examining Non-Emergency Medical Transportation (NEMT) providers in Minnesota, in connection with the ongoing $9 billion Medicaid fraud investigation.

DATA REQUESTED:

1. COMMERCIAL VEHICLE REGISTRATIONS
For vehicles registered to businesses classified under medical transportation, ambulette services, or non-emergency medical transportation (NAICS codes 485991, 621910, or similar):
- Vehicle identification (VIN, plate number)
- Registered owner name and business name
- Business address
- Vehicle type/class
- Registration date and expiration
- Registration status (active, expired, suspended)

2. FLEET REGISTRATIONS
For any business with 3 or more vehicles registered for medical/patient transportation:
- Company name and address
- Total vehicles registered
- Registration history (additions/removals) for 2020-2025

3. AMBULETTE/MEDICAL TRANSPORT PERMITS
Any special permits, certifications, or endorsements required for medical transportation vehicles:
- Permit holder name and address
- Permit type and status
- Issue and expiration dates

4. AGGREGATE DATA
- Total medical transportation vehicles registered by county
- Year-over-year registration trends (2020-2025)

PREFERRED FORMAT: CSV or Excel files preferred. PDF acceptable.

FEE WAIVER REQUEST: I request a fee waiver as this research serves the public interest in accountability for taxpayer-funded programs. If a waiver is not possible, please provide a cost estimate before processing.

NOTE: This request relates to the December 2025 federal/state investigation into Minnesota Medicaid fraud, which identified NEMT as one of 14 high-risk programs.

[Your Name]
[Your Email]
[Your Phone]`
    },
    dhs_nemt: {
      agency: 'Minnesota Department of Human Services',
      email: 'DHS.info@state.mn.us',
      subject: 'MGDPA Request - NEMT Provider Enrollment, Certification, and Billing Data',
      body: `MINNESOTA GOVERNMENT DATA PRACTICES ACT (MGDPA) REQUEST
Minnesota Department of Human Services

To: DHS Data Practices Office
PO Box 64998
St. Paul, MN 55164-0998

Subject: Non-Emergency Medical Transportation (NEMT) Provider Data

Purpose: Public accountability research examining NEMT providers enrolled in Minnesota Health Care Programs (MHCP), in connection with the December 2025 federal/state investigation identifying NEMT as one of 14 high-risk Medicaid programs.

DATA REQUESTED:

1. ENROLLED NEMT PROVIDERS
Complete list of all currently enrolled NEMT providers in MHCP, including:
- Provider legal name and DBA name
- National Provider Identifier (NPI)
- Business address (physical and mailing)
- Provider enrollment date
- Provider type/mode (Mode 1-5 classification)
- Number of vehicles certified
- Number of affiliated/credentialed drivers
- Service area (counties authorized to serve)

2. BILLING AND PAYMENT DATA (FY2020-2025)
For each enrolled NEMT provider:
- Total payments received by fiscal year
- Number of trips billed by fiscal year
- Average payment per trip
- Breakdown by transport mode (ambulatory, wheelchair, stretcher, etc.)
- Number of unique Medicaid recipients served

3. CERTIFICATION AND COMPLIANCE STATUS
- Current certification status (active, suspended, pending)
- MnDOT STS certification status
- Any corrective action plans
- Results of compliance reviews or audits

4. PROVIDER ENROLLMENT/TERMINATION HISTORY
- Providers newly enrolled 2020-2025 (date and approving entity)
- Providers terminated or voluntarily withdrawn 2020-2025 (date and reason)
- Providers with denied enrollment applications (reason for denial)

5. PROGRAM INTEGRITY DATA
- Providers currently under payment withhold
- Providers referred for investigation (to extent public)
- Overpayment recoveries by provider
- Fraud referrals to law enforcement or OIG (aggregate statistics acceptable)

6. AGGREGATE STATISTICS
- Total NEMT spending by fiscal year (2020-2025)
- Total trips by fiscal year
- Number of enrolled providers by year
- Geographic distribution of providers by county

PREFERRED FORMAT: CSV or Excel files preferred for data tables. PDF acceptable for reports.

FEE WAIVER REQUEST: I request a fee waiver as this research serves the public interest in accountability for taxpayer-funded programs. If a waiver is not possible, please provide a cost estimate before processing.

NOTE: This request relates to the December 2025 federal/state investigation into Minnesota Medicaid fraud, which identified NEMT as one of 14 high-risk programs with an estimated $9 billion in fraudulent claims.

[Your Name]
[Your Email]
[Your Phone]`
    },
    dvs: {
      agency: 'Minnesota Driver and Vehicle Services',
      email: null,
      formUrl: 'https://dvsportal-dpsmn.govqa.us/WEBAPP/_rs/supporthome.aspx?lp=10',
      subject: 'Data Practices Request - Commercial Fleet Vehicle Records',
      body: `To: Minnesota Department of Public Safety
Driver and Vehicle Services - Records Unit
445 Minnesota Street, Suite 161
Saint Paul, MN 55101-5161

RE: Minnesota Government Data Practices Act Request
Commercial Fleet Vehicle Registration Records

Dear Records Officer,

Pursuant to the Minnesota Government Data Practices Act (Minn. Stat. Ch. 13), I am requesting the following public data:

1. List of businesses registered under the Fleet Registration Program with 50+ vehicles, including:
   - Business name
   - Business address
   - Number of registered vehicles
   - Fleet registration date

2. For commercial vehicles registered to medical transportation companies (SIC/NAICS codes related to medical transportation or ambulette services):
   - Vehicle counts by registered owner
   - Registration status
   - Any available mileage data from IRP (International Registration Plan) filings

3. Aggregate statistics on medical transportation fleet registrations by county

I understand that individual vehicle records may have access restrictions. I am requesting only data that is classified as public under the Data Practices Act.

Please provide these records in electronic format if available.

I understand there may be reasonable costs associated with this request. Please contact me if costs will exceed $50 before proceeding.

Thank you for your assistance with this request.

Sincerely,
[Your Name]
[Your Email]
[Your Phone]`
    },
    sos: {
      agency: 'Minnesota Secretary of State',
      email: 'business.services@state.mn.us',
      subject: 'Business Records Request - Medical Transportation Companies',
      body: `To: Minnesota Secretary of State
Business Services Division
60 Empire Drive, Suite 100
St. Paul, MN 55103

RE: Business Entity Records Request

Dear Business Services,

I am requesting information on business entities registered in Minnesota that operate in medical transportation or non-emergency medical transportation services.

Specifically, I am requesting:

1. A list of all active business entities (corporations, LLCs, partnerships) with names containing:
   - "medical transport"
   - "NEMT"
   - "ambulette"
   - "patient transport"
   - "healthcare transport"
   - "medical shuttle"

2. For each entity:
   - Entity name
   - Entity type
   - Registered agent
   - Principal place of business
   - Date of formation
   - Status (active/inactive)
   - Officers/members (if public)

3. Any entities that share registered agents or principal addresses with multiple medical transportation companies

I understand much of this information is available through the Business Filing Search at mblsportal.sos.state.mn.us, but I am requesting a consolidated export if available.

Thank you for your assistance.

Sincerely,
[Your Name]
[Your Email]
[Your Phone]`
    }
  };

  const copyToClipboard = (text, templateId) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(templateId);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const generateMailtoLink = (template) => {
    return `mailto:${template.email}?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
  };

  const currentTemplate = templates[selectedTemplate];

  return (
    <div className="transport-watch-page">
      {/* Hero Section */}
      <section className="tw-hero">
        <div className="tw-hero-content">
          <div className="tw-hero-icon">
            <Truck size={48} />
          </div>
          <h1>TransportWatch</h1>
          <p className="tw-hero-subtitle">
            Non-Emergency Medical Transportation (NEMT) Fraud Investigation
          </p>
          <p className="tw-hero-description">
            Exposing billing fraud in Minnesota's 1,200+ medical transportation companies.
            Many operate alongside daycare fraud networks using the same shell company patterns.
          </p>
        </div>
      </section>

      {/* Alert Banner */}
      <section className="tw-alert">
        <AlertTriangle size={24} />
        <div>
          <strong>Active Investigation:</strong> Nick Shirley's year-long investigation documented
          NEMT vans that "have not moved one inch in an entire year" while billing Medicaid for patient transport.
          NEMT is one of 14 programs included in the $9 billion fraud investigation.
        </div>
      </section>

      {/* Stats Overview */}
      <section className="tw-stats">
        <div className="tw-stat-card">
          <span className="tw-stat-number">1,200+</span>
          <span className="tw-stat-label">NEMT Companies in MN</span>
        </div>
        <div className="tw-stat-card">
          <span className="tw-stat-number">$9B+</span>
          <span className="tw-stat-label">Total Fraud Estimate</span>
        </div>
        <div className="tw-stat-card">
          <span className="tw-stat-number">14</span>
          <span className="tw-stat-label">Programs Under Audit</span>
        </div>
        <div className="tw-stat-card">
          <span className="tw-stat-number">90 Days</span>
          <span className="tw-stat-label">Payment Freeze</span>
        </div>
      </section>

      {/* How NEMT Fraud Works */}
      <section className="tw-section">
        <h2><AlertTriangle size={24} /> How NEMT Fraud Works</h2>
        <div className="tw-fraud-patterns">
          <div className="tw-pattern-card">
            <h3>Phantom Trips</h3>
            <p>Billing for rides that never happened. Vans sit parked while companies bill Medicaid for patient transport.</p>
          </div>
          <div className="tw-pattern-card">
            <h3>Shell Company Networks</h3>
            <p>Same owners operate multiple transport companies at the same address, artificially inflating the provider pool.</p>
          </div>
          <div className="tw-pattern-card">
            <h3>Daycare-Transport Kickbacks</h3>
            <p>Adult day care centers and transport companies work together - billing for both "services" and transport to fake appointments.</p>
          </div>
          <div className="tw-pattern-card">
            <h3>Recruiter Networks</h3>
            <p>Recruiters sign up Medicaid recipients for fake trips to specialty clinics, splitting the fraudulent payments.</p>
          </div>
        </div>
      </section>

      {/* MGDPA Request Templates */}
      <section className="tw-section">
        <h2><FileText size={24} /> File Public Records Requests</h2>
        <p className="tw-section-description">
          Use these pre-written MGDPA (Minnesota Government Data Practices Act) templates to request
          NEMT provider data, vehicle records, and payment information.
        </p>

        <div className="tw-template-selector">
          <button
            className={`tw-template-tab ${selectedTemplate === 'mndot' ? 'active' : ''}`}
            onClick={() => setSelectedTemplate('mndot')}
          >
            <Truck size={18} />
            MnDOT (Vehicles)
          </button>
          <button
            className={`tw-template-tab ${selectedTemplate === 'dhs_nemt' ? 'active' : ''}`}
            onClick={() => setSelectedTemplate('dhs_nemt')}
          >
            <DollarSign size={18} />
            DHS (Payments)
          </button>
          <button
            className={`tw-template-tab ${selectedTemplate === 'dvs' ? 'active' : ''}`}
            onClick={() => setSelectedTemplate('dvs')}
          >
            <MapPin size={18} />
            DVS (Fleet Data)
          </button>
          <button
            className={`tw-template-tab ${selectedTemplate === 'sos' ? 'active' : ''}`}
            onClick={() => setSelectedTemplate('sos')}
          >
            <Building size={18} />
            SOS (Business)
          </button>
        </div>

        <div className="tw-template-content">
          <div className="tw-template-header">
            <h3>{currentTemplate.agency}</h3>
            <span className="tw-template-email">
              {currentTemplate.email || (currentTemplate.formUrl ? 'Online Portal Only' : '')}
            </span>
          </div>

          <div className="tw-template-body">
            <pre>{currentTemplate.body}</pre>
          </div>

          <div className="tw-template-actions">
            {currentTemplate.formUrl && (
              <a
                href={currentTemplate.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tw-action-button primary"
              >
                <ExternalLink size={18} />
                Use Online Form {currentTemplate.email ? '(Recommended)' : ''}
              </a>
            )}
            {currentTemplate.email && (
              <a
                href={generateMailtoLink(currentTemplate)}
                className={`tw-action-button ${currentTemplate.formUrl ? 'secondary' : 'primary'}`}
              >
                <Mail size={18} />
                Open in Email Client
              </a>
            )}
            <button
              className="tw-action-button secondary"
              onClick={() => copyToClipboard(currentTemplate.body, selectedTemplate)}
            >
              {copiedTemplate === selectedTemplate ? (
                <>
                  <CheckCircle size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Template
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Data Pipeline Status */}
      <section className="tw-section">
        <h2><Clock size={24} /> Data Collection Status</h2>
        <div className="tw-pipeline-status">
          <div className="tw-pipeline-item pending">
            <div className="tw-pipeline-icon">
              <Clock size={20} />
            </div>
            <div className="tw-pipeline-info">
              <h4>MnDOT STS Provider List</h4>
              <p>MGDPA request pending - will contain all certified NEMT providers and vehicle lists</p>
            </div>
            <span className="tw-pipeline-badge pending">Pending Request</span>
          </div>

          <div className="tw-pipeline-item pending">
            <div className="tw-pipeline-icon">
              <Clock size={20} />
            </div>
            <div className="tw-pipeline-info">
              <h4>DHS NEMT Payment Data</h4>
              <p>MGDPA request pending - billing records by provider, FY2020-2025</p>
            </div>
            <span className="tw-pipeline-badge pending">Pending Request</span>
          </div>

          <div className="tw-pipeline-item pending">
            <div className="tw-pipeline-icon">
              <Clock size={20} />
            </div>
            <div className="tw-pipeline-info">
              <h4>Secretary of State Business Records</h4>
              <p>Cross-reference ownership patterns with daycare fraud networks</p>
            </div>
            <span className="tw-pipeline-badge pending">Pending Request</span>
          </div>

          <div className="tw-pipeline-item planned">
            <div className="tw-pipeline-icon">
              <AlertTriangle size={20} />
            </div>
            <div className="tw-pipeline-info">
              <h4>Cross-Reference Analysis</h4>
              <p>Match NEMT providers with flagged daycare facilities by owner, address, phone</p>
            </div>
            <span className="tw-pipeline-badge planned">Planned</span>
          </div>
        </div>
      </section>

      {/* External Resources */}
      <section className="tw-section">
        <h2><ExternalLink size={24} /> Investigation Resources</h2>
        <div className="tw-resources">
          <a
            href="https://www.dot.state.mn.us/cvo/sts/"
            target="_blank"
            rel="noopener noreferrer"
            className="tw-resource-link"
          >
            <Truck size={20} />
            <div>
              <strong>MnDOT Special Transportation Services</strong>
              <span>Official STS certification program</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <a
            href="https://www.dhs.state.mn.us/dhs16_141019/"
            target="_blank"
            rel="noopener noreferrer"
            className="tw-resource-link"
          >
            <Users size={20} />
            <div>
              <strong>DHS NEMT Services</strong>
              <span>Medicaid transportation program info</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <a
            href="https://mn.gov/dhs/program-integrity/"
            target="_blank"
            rel="noopener noreferrer"
            className="tw-resource-link"
          >
            <AlertTriangle size={20} />
            <div>
              <strong>DHS Program Integrity</strong>
              <span>Report suspected fraud</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <a
            href="https://mblsportal.sos.state.mn.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="tw-resource-link"
          >
            <Building size={20} />
            <div>
              <strong>MN Secretary of State Business Search</strong>
              <span>Look up company registrations</span>
            </div>
            <ExternalLink size={16} />
          </a>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="tw-section tw-coming-soon">
        <h2>Coming Soon</h2>
        <p>
          Once we receive data from MGDPA requests, TransportWatch will feature:
        </p>
        <ul>
          <li><strong>Provider Map</strong> - Visualize all NEMT companies and flag clusters at single addresses</li>
          <li><strong>Payment Analysis</strong> - Compare billing to vehicle counts and identify outliers</li>
          <li><strong>Network Detection</strong> - Find ownership connections between transport and daycare companies</li>
          <li><strong>Risk Scoring</strong> - Automated flagging using the same methodology as DaycareWatch</li>
        </ul>
      </section>

      {/* Disclaimer */}
      <section className="tw-disclaimer">
        <p>
          <strong>Disclaimer:</strong> TransportWatch compiles public data for transparency purposes.
          Inclusion of a provider does not imply wrongdoing. All analysis should be verified with
          official sources before drawing conclusions.
        </p>
      </section>
    </div>
  );
};

export default TransportWatchPage;
