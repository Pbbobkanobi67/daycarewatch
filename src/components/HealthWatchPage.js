import React, { useState } from 'react';
import {
  Heart,
  FileText,
  Mail,
  AlertTriangle,
  ExternalLink,
  Building,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Link2,
  Shield,
  TrendingUp,
  MapPin,
  Plane
} from 'lucide-react';

/**
 * HealthWatch - Healthcare Subsidy Fraud Investigation Module
 *
 * Exposes fraud patterns in Minnesota's 13 high-risk Medicaid programs,
 * which often operate alongside daycare and NEMT fraud using similar
 * shell company structures.
 */
const HealthWatchPage = ({ onNavigate }) => {
  const [copiedTemplate, setCopiedTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('dhs_programs');
  const [expandedProgram, setExpandedProgram] = useState(null);

  // The 13 high-risk programs (NEMT is in TransportWatch)
  const highRiskPrograms = [
    {
      id: 'hss',
      name: 'Housing Stabilization Services (HSS)',
      status: 'TERMINATED',
      statusColor: '#ef4444',
      description: 'Helps people find and keep housing. Program terminated in 2025 due to widespread fraud.',
      billedAmount: '$500M+',
      fraudPatterns: [
        'Billing for services never provided',
        'Philadelphia "fraud tourists" received $3.5M',
        'Shell companies at same addresses',
        'Services billed for people not receiving housing help'
      ],
      investigation: 'Program terminated. Multiple federal indictments.'
    },
    {
      id: 'eidbi',
      name: 'Early Intensive Developmental & Behavioral Intervention (EIDBI)',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Autism therapy services for children. One of the highest-risk programs.',
      billedAmount: '$800M+',
      fraudPatterns: [
        'Billing for therapy sessions that never occurred',
        'Unlicensed staff providing services',
        'Inflated session counts',
        'Services billed during school hours when children were in class'
      ],
      investigation: 'Active federal investigation. Multiple providers under payment withhold.'
    },
    {
      id: 'pca',
      name: 'Personal Care Assistance (PCA) / CFSS',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'In-home assistance with daily activities like bathing, dressing, meal prep.',
      billedAmount: '$2B+',
      fraudPatterns: [
        'Family members billing for care they would provide anyway',
        'Billing for hours not worked',
        'Same caregiver billing for multiple clients simultaneously',
        'Services billed for deceased recipients'
      ],
      investigation: '90-day prepayment review in effect. Optum auditing all claims.'
    },
    {
      id: 'adult_day',
      name: 'Adult Day Services',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Daytime programs for adults who need supervision and activities.',
      billedAmount: '$300M+',
      fraudPatterns: [
        'Billing for clients who never attended',
        'Same patterns as childcare fraud (shell companies)',
        'Kickback arrangements with NEMT providers',
        'Inflated attendance records'
      ],
      investigation: 'Connected to childcare fraud networks. Same owners, same addresses.'
    },
    {
      id: 'armhs',
      name: 'Adult Rehabilitative Mental Health Services (ARMHS)',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Community-based mental health rehabilitation services.',
      billedAmount: '$400M+',
      fraudPatterns: [
        'Billing for therapy never provided',
        'Unlicensed practitioners',
        'Group sessions billed as individual',
        'Services billed during impossible hours'
      ],
      investigation: 'Multiple providers terminated. Prepayment review active.'
    },
    {
      id: 'ics',
      name: 'Integrated Community Supports (ICS)',
      status: 'HIGH RISK',
      statusColor: '#ef4444',
      description: 'Housing and support services combined. Experienced 37x billing growth.',
      billedAmount: '$170M+ (2024)',
      fraudPatterns: [
        'Payments grew from $4.6M (2021) to $170M (2024)',
        'New companies billing millions within months of formation',
        'Services overlap with HSS (same fraud patterns)',
        'Out-of-state owners with no Minnesota presence'
      ],
      investigation: 'Exponential growth flagged by federal auditors.'
    },
    {
      id: 'ihs',
      name: 'Individualized Home Supports',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Training and support for people with disabilities living at home.',
      billedAmount: '$200M+',
      fraudPatterns: [
        'Billing for training that never occurred',
        'Same staff billing across multiple programs',
        'Services provided by unqualified individuals'
      ],
      investigation: 'Prepayment review active.'
    },
    {
      id: 'peer',
      name: 'Recovery Peer Support',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Support from people with lived experience in recovery.',
      billedAmount: '$50M+',
      fraudPatterns: [
        'Peer supporters without required certifications',
        'Billing for phone calls that never happened',
        'Duplicate billing across providers'
      ],
      investigation: 'Certification verification underway.'
    },
    {
      id: 'act',
      name: 'Assertive Community Treatment (ACT)',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Intensive team-based treatment for severe mental illness.',
      billedAmount: '$100M+',
      fraudPatterns: [
        'Billing for full team when only one person provided service',
        'Services billed but not documented',
        'Staff credentials not verified'
      ],
      investigation: 'Documentation audits in progress.'
    },
    {
      id: 'irts',
      name: 'Intensive Residential Treatment Services (IRTS)',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Short-term residential mental health treatment.',
      billedAmount: '$150M+',
      fraudPatterns: [
        'Billing for beds not occupied',
        'Extended stays beyond medical necessity',
        'Inadequate staffing levels'
      ],
      investigation: 'Facility inspections ongoing.'
    },
    {
      id: 'companion',
      name: 'Adult Companion Services',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Non-medical companionship and supervision.',
      billedAmount: '$80M+',
      fraudPatterns: [
        'Billing for companionship that never occurred',
        'Same companion billing for multiple clients at same time',
        'Family members billing for normal interactions'
      ],
      investigation: 'Time verification audits active.'
    },
    {
      id: 'night',
      name: 'Night Supervision Services',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Overnight supervision for people who need monitoring.',
      billedAmount: '$60M+',
      fraudPatterns: [
        'Billing for supervision while sleeping',
        'No documentation of actual monitoring',
        'Same supervisor billing at multiple locations'
      ],
      investigation: 'GPS and time verification being implemented.'
    },
    {
      id: 'recuperative',
      name: 'Recuperative Care',
      status: 'UNDER AUDIT',
      statusColor: '#f59e0b',
      description: 'Post-hospital recovery services for people without stable housing.',
      billedAmount: '$40M+',
      fraudPatterns: [
        'Billing for patients who left facility',
        'Services billed beyond recovery period',
        'Inadequate medical oversight'
      ],
      investigation: 'Patient verification audits active.'
    }
  ];

  // MGDPA Request Templates
  const templates = {
    dhs_programs: {
      agency: 'Minnesota Department of Human Services',
      email: 'DHS.info@state.mn.us',
      subject: 'MGDPA Request - High-Risk Medicaid Program Provider Data',
      body: `To: Minnesota Department of Human Services
Data Practices Office
PO Box 64998
St. Paul, MN 55164-0998

RE: Minnesota Government Data Practices Act Request
High-Risk Medicaid Program Provider Data

Dear Data Practices Officer,

Pursuant to the Minnesota Government Data Practices Act (Minn. Stat. Ch. 13), I am requesting the following public data related to Medicaid providers in the 14 programs identified as "high-risk" by DHS:

1. Complete list of enrolled providers in each high-risk program:
   - Housing Stabilization Services (terminated providers)
   - EIDBI (Early Intensive Developmental and Behavioral Intervention)
   - Personal Care Assistance / CFSS
   - Adult Day Services
   - ARMHS (Adult Rehabilitative Mental Health Services)
   - Integrated Community Supports
   - Individualized Home Supports
   - Recovery Peer Support
   - Assertive Community Treatment
   - Intensive Residential Treatment Services
   - Adult Companion Services
   - Night Supervision Services
   - Recuperative Care

2. For each provider:
   - Provider name and NPI number
   - Business address
   - Enrollment date
   - Current status (active, terminated, under withhold)
   - Programs enrolled in

3. Billing data for fiscal years 2020-2025:
   - Total payments by provider by program
   - Number of claims submitted
   - Number of recipients served

4. List of providers currently under payment withhold or investigation (to the extent public)

5. List of providers terminated from any high-risk program in the past 3 years, including termination reason

Please provide these records in electronic format (CSV, Excel, or PDF) if available.

I understand there may be reasonable costs associated with this request. Please contact me if costs will exceed $50 before proceeding.

Thank you for your assistance with this request.

Sincerely,
[Your Name]
[Your Email]
[Your Phone]`
    },
    mdh: {
      agency: 'Minnesota Department of Health',
      email: 'health.datapractices@state.mn.us',
      subject: 'Data Practices Request - Healthcare Facility Licensing Records',
      body: `To: Minnesota Department of Health
Data Practices Office
625 Robert Street North
St. Paul, MN 55155

RE: Minnesota Government Data Practices Act Request
Healthcare Facility Licensing and Enforcement Records

Dear Data Practices Officer,

Pursuant to the Minnesota Government Data Practices Act (Minn. Stat. Ch. 13), I am requesting the following public data:

1. Complete list of licensed healthcare facilities providing:
   - Adult day services
   - Residential treatment services
   - Mental health services
   - Home care services

2. For each facility:
   - Facility name and license number
   - Business address
   - License type and status
   - License issue date and expiration
   - Owner/operator information
   - Capacity (if applicable)

3. Inspection and enforcement records:
   - Inspection dates and findings
   - Violations cited
   - Corrective action plans
   - Enforcement actions taken

4. Any facilities with revoked, suspended, or conditional licenses in the past 5 years

5. Facilities sharing addresses with other licensed healthcare entities

Please provide these records in electronic format if available.

I understand there may be reasonable costs associated with this request. Please contact me if costs will exceed $50 before proceeding.

Thank you for your assistance.

Sincerely,
[Your Name]
[Your Email]
[Your Phone]`
    },
    sos: {
      agency: 'Minnesota Secretary of State',
      email: 'business.services@state.mn.us',
      subject: 'Business Records Request - Healthcare Service Companies',
      body: `To: Minnesota Secretary of State
Business Services Division
60 Empire Drive, Suite 100
St. Paul, MN 55103

RE: Business Entity Records Request

Dear Business Services,

I am requesting information on business entities registered in Minnesota that provide healthcare, home care, or disability services.

Specifically, I am requesting:

1. A list of all active business entities (corporations, LLCs, partnerships) with names containing:
   - "home care"
   - "healthcare"
   - "disability services"
   - "mental health"
   - "behavioral health"
   - "adult day"
   - "residential treatment"
   - "community support"
   - "PCA" or "personal care"

2. For each entity:
   - Entity name
   - Entity type
   - Registered agent name and address
   - Principal place of business
   - Date of formation
   - Status (active/inactive)
   - Officers/members (if public)

3. Analysis of shared registered agents:
   - Registered agents representing 5 or more healthcare-related entities
   - Addresses with 3 or more healthcare entities registered

4. Entities formed in 2023-2025 in the healthcare/disability services space (to identify rapid formation patterns)

I understand much of this information is available through the Business Filing Search, but I am requesting a consolidated export if available.

Thank you for your assistance.

Sincerely,
[Your Name]
[Your Email]
[Your Phone]`
    },
    county: {
      agency: 'County Human Services (Template)',
      email: null,
      formUrl: null,
      subject: 'Data Practices Request - HCBS Waiver Provider Contracts',
      body: `To: [County Name] Human Services
Data Practices Officer
[County Address]

RE: Minnesota Government Data Practices Act Request
Home and Community Based Services Provider Data

Dear Data Practices Officer,

Pursuant to the Minnesota Government Data Practices Act (Minn. Stat. Ch. 13), I am requesting the following public data related to Home and Community Based Services (HCBS) waiver providers contracting with [County Name] County:

1. List of all HCBS waiver providers with active contracts:
   - Provider name
   - Services provided
   - Contract effective dates
   - Contract amounts (if public)

2. Provider payment data for fiscal years 2022-2025:
   - Total payments by provider
   - Number of clients served
   - Services billed

3. Any providers terminated from county contracts in the past 3 years, including reason for termination

4. Provider performance or quality metrics (if maintained)

5. Any providers under review or investigation (to the extent public)

Please provide these records in electronic format if available.

I understand there may be reasonable costs associated with this request. Please contact me if costs will exceed $50 before proceeding.

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

  const toggleProgram = (programId) => {
    setExpandedProgram(expandedProgram === programId ? null : programId);
  };

  const currentTemplate = templates[selectedTemplate];

  return (
    <div className="health-watch-page">
      {/* Hero Section */}
      <section className="hw-hero">
        <div className="hw-hero-content">
          <div className="hw-hero-icon">
            <Heart size={48} />
          </div>
          <h1>HealthWatch</h1>
          <p className="hw-hero-subtitle">
            Minnesota Medicaid Healthcare Subsidy Fraud Investigation
          </p>
          <p className="hw-hero-description">
            Exposing fraud patterns in Minnesota's 13 high-risk Medicaid programs.
            $18 billion billed since 2018 - federal prosecutors estimate half or more is fraudulent.
          </p>
        </div>
      </section>

      {/* Alert Banner */}
      <section className="hw-alert">
        <AlertTriangle size={24} />
        <div>
          <strong>Federal Investigation Active:</strong> U.S. Attorney's Office investigating
          "industrial-scale fraud" across all 14 high-risk Medicaid programs. 90-day prepayment
          freeze in effect. Housing Stabilization Services program terminated.
        </div>
      </section>

      {/* Stats Overview */}
      <section className="hw-stats">
        <div className="hw-stat-card">
          <span className="hw-stat-number">13</span>
          <span className="hw-stat-label">High-Risk Programs</span>
        </div>
        <div className="hw-stat-card">
          <span className="hw-stat-number">$9B+</span>
          <span className="hw-stat-label">Estimated Fraud</span>
        </div>
        <div className="hw-stat-card">
          <span className="hw-stat-number">$18B</span>
          <span className="hw-stat-label">Billed Since 2018</span>
        </div>
        <div className="hw-stat-card">
          <span className="hw-stat-number">90 Days</span>
          <span className="hw-stat-label">Payment Freeze</span>
        </div>
      </section>

      {/* Cross-Reference Section - PROMINENT */}
      <section className="hw-section hw-crossref">
        <div className="hw-crossref-header">
          <Link2 size={28} />
          <h2>Same Shell Company Patterns</h2>
        </div>
        <p className="hw-crossref-description">
          Healthcare fraud in Minnesota uses the <strong>same shell company structures</strong> as
          childcare and NEMT fraud. Same owners. Same addresses. Same fraud patterns.
        </p>
        <div className="hw-crossref-links">
          <button type="button" onClick={() => onNavigate && onNavigate(null)} className="hw-crossref-card">
            <Building size={24} />
            <div>
              <strong>Check DaycareWatch</strong>
              <span>Cross-reference healthcare providers with flagged childcare facilities</span>
            </div>
          </button>
          <button type="button" onClick={() => onNavigate && onNavigate('transportwatch')} className="hw-crossref-card">
            <MapPin size={24} />
            <div>
              <strong>Check TransportWatch</strong>
              <span>Cross-reference with flagged NEMT providers</span>
            </div>
          </button>
        </div>
        <div className="hw-crossref-patterns">
          <h4>Red Flags to Watch For:</h4>
          <ul>
            <li><strong>Shared Addresses:</strong> Multiple healthcare, daycare, and transport companies at the same location</li>
            <li><strong>Shared Owners:</strong> Same principals operating across multiple program types</li>
            <li><strong>Shared Registered Agents:</strong> Single agent representing dozens of healthcare entities</li>
            <li><strong>Rapid Formation:</strong> Companies billing millions within months of formation</li>
          </ul>
        </div>
      </section>

      {/* How Healthcare Fraud Works */}
      <section className="hw-section">
        <h2><AlertTriangle size={24} /> How Healthcare Subsidy Fraud Works</h2>
        <div className="hw-fraud-patterns">
          <div className="hw-pattern-card">
            <Shield size={24} />
            <h3>Shell Company Networks</h3>
            <p>Multiple providers registered at same address with shared ownership. Creates appearance of competition while funneling money to same actors.</p>
          </div>
          <div className="hw-pattern-card">
            <DollarSign size={24} />
            <h3>Billing for Phantom Services</h3>
            <p>Submitting claims for services never provided. Staff never visited. Therapy never happened. But Medicaid paid anyway.</p>
          </div>
          <div className="hw-pattern-card">
            <Plane size={24} />
            <h3>"Fraud Tourism"</h3>
            <p>Out-of-state actors heard Minnesota was "easy money." Philadelphia men received $3.5M by enrolling companies and billing from Pennsylvania.</p>
          </div>
          <div className="hw-pattern-card">
            <TrendingUp size={24} />
            <h3>Exponential Billing Growth</h3>
            <p>ICS program grew from $4.6M to $170M in 3 years (37x). New providers billing millions within months of enrollment.</p>
          </div>
          <div className="hw-pattern-card">
            <Users size={24} />
            <h3>Cross-Program Fraud</h3>
            <p>Same providers billing multiple programs for same clients. Adult day + NEMT + PCA all billing for the same person on the same day.</p>
          </div>
          <div className="hw-pattern-card">
            <Building size={24} />
            <h3>Daycare-Healthcare Kickbacks</h3>
            <p>Adult day centers and childcare centers sharing ownership, staff, and addresses. Billing both Medicaid programs for overlapping services.</p>
          </div>
        </div>
      </section>

      {/* 13 High-Risk Programs */}
      <section className="hw-section">
        <h2><FileText size={24} /> The 13 High-Risk Programs</h2>
        <p className="hw-section-description">
          These programs were identified by DHS as having "programmatic vulnerabilities, evidence of
          fraudulent activity, or data analytics that revealed potentially suspicious patterns."
        </p>
        <div className="hw-programs-list">
          {highRiskPrograms.map((program) => (
            <div key={program.id} className="hw-program-card">
              <button
                className="hw-program-header"
                onClick={() => toggleProgram(program.id)}
              >
                <div className="hw-program-title">
                  <span className="hw-program-name">{program.name}</span>
                  <span
                    className="hw-program-status"
                    style={{ backgroundColor: program.statusColor }}
                  >
                    {program.status}
                  </span>
                </div>
                <div className="hw-program-toggle">
                  <span className="hw-program-amount">{program.billedAmount}</span>
                  {expandedProgram === program.id ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </button>
              {expandedProgram === program.id && (
                <div className="hw-program-details">
                  <p className="hw-program-description">{program.description}</p>
                  <div className="hw-program-fraud">
                    <h4>Known Fraud Patterns:</h4>
                    <ul>
                      {program.fraudPatterns.map((pattern, idx) => (
                        <li key={idx}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="hw-program-investigation">
                    <strong>Investigation Status:</strong> {program.investigation}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* MGDPA Request Templates */}
      <section className="hw-section">
        <h2><FileText size={24} /> File Public Records Requests</h2>
        <p className="hw-section-description">
          Use these pre-written MGDPA (Minnesota Government Data Practices Act) templates to request
          healthcare provider data, billing records, and enrollment information.
        </p>

        <div className="hw-template-selector">
          <button
            className={`hw-template-tab ${selectedTemplate === 'dhs_programs' ? 'active' : ''}`}
            onClick={() => setSelectedTemplate('dhs_programs')}
          >
            <Heart size={18} />
            DHS Programs
          </button>
          <button
            className={`hw-template-tab ${selectedTemplate === 'mdh' ? 'active' : ''}`}
            onClick={() => setSelectedTemplate('mdh')}
          >
            <Shield size={18} />
            MDH Licensing
          </button>
          <button
            className={`hw-template-tab ${selectedTemplate === 'sos' ? 'active' : ''}`}
            onClick={() => setSelectedTemplate('sos')}
          >
            <Building size={18} />
            SOS Business
          </button>
          <button
            className={`hw-template-tab ${selectedTemplate === 'county' ? 'active' : ''}`}
            onClick={() => setSelectedTemplate('county')}
          >
            <MapPin size={18} />
            County HHS
          </button>
        </div>

        <div className="hw-template-content">
          <div className="hw-template-header">
            <h3>{currentTemplate.agency}</h3>
            <span className="hw-template-email">
              {currentTemplate.email || 'Varies by county - check county website'}
            </span>
          </div>

          <div className="hw-template-body">
            <pre>{currentTemplate.body}</pre>
          </div>

          <div className="hw-template-actions">
            {currentTemplate.email && (
              <a
                href={generateMailtoLink(currentTemplate)}
                className="hw-action-button primary"
              >
                <Mail size={18} />
                Open in Email Client
              </a>
            )}
            <button
              className="hw-action-button secondary"
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
      <section className="hw-section">
        <h2><Clock size={24} /> Data Collection Status</h2>
        <div className="hw-pipeline-status">
          <div className="hw-pipeline-item pending">
            <div className="hw-pipeline-icon">
              <Clock size={20} />
            </div>
            <div className="hw-pipeline-info">
              <h4>DHS Provider Enrollment Data</h4>
              <p>MGDPA request pending - all 13 high-risk program providers</p>
            </div>
            <span className="hw-pipeline-badge pending">Pending Request</span>
          </div>

          <div className="hw-pipeline-item pending">
            <div className="hw-pipeline-icon">
              <Clock size={20} />
            </div>
            <div className="hw-pipeline-info">
              <h4>DHS Billing Data by Provider</h4>
              <p>Payment amounts, claim counts, FY2020-2025</p>
            </div>
            <span className="hw-pipeline-badge pending">Pending Request</span>
          </div>

          <div className="hw-pipeline-item pending">
            <div className="hw-pipeline-icon">
              <Clock size={20} />
            </div>
            <div className="hw-pipeline-info">
              <h4>Secretary of State Business Records</h4>
              <p>Healthcare company registrations, shared agents analysis</p>
            </div>
            <span className="hw-pipeline-badge pending">Pending Request</span>
          </div>

          <div className="hw-pipeline-item planned">
            <div className="hw-pipeline-icon">
              <Link2 size={20} />
            </div>
            <div className="hw-pipeline-info">
              <h4>Cross-Reference Analysis</h4>
              <p>Match healthcare providers with flagged daycare facilities and NEMT companies</p>
            </div>
            <span className="hw-pipeline-badge planned">Planned</span>
          </div>
        </div>
      </section>

      {/* External Resources */}
      <section className="hw-section">
        <h2><ExternalLink size={24} /> Investigation Resources</h2>
        <div className="hw-resources">
          <a
            href="https://mn.gov/dhs/program-integrity/"
            target="_blank"
            rel="noopener noreferrer"
            className="hw-resource-link"
          >
            <Shield size={20} />
            <div>
              <strong>DHS Program Integrity</strong>
              <span>Report fraud, view high-risk programs</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <a
            href="https://mhcpproviderdirectory.dhs.state.mn.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="hw-resource-link"
          >
            <Users size={20} />
            <div>
              <strong>MHCP Provider Directory</strong>
              <span>Search Medicaid enrolled providers</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <a
            href="https://licensinglookup.dhs.state.mn.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="hw-resource-link"
          >
            <FileText size={20} />
            <div>
              <strong>DHS License Lookup</strong>
              <span>Check provider licensing status</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <a
            href="https://npiregistry.cms.hhs.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="hw-resource-link"
          >
            <Building size={20} />
            <div>
              <strong>NPI Registry (Federal)</strong>
              <span>National Provider Identifier lookup</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <a
            href="https://mblsportal.sos.state.mn.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="hw-resource-link"
          >
            <Building size={20} />
            <div>
              <strong>MN Business Search</strong>
              <span>Look up company registrations</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <a
            href="https://www.ag.state.mn.us/Office/Medicaid.asp"
            target="_blank"
            rel="noopener noreferrer"
            className="hw-resource-link"
          >
            <AlertTriangle size={20} />
            <div>
              <strong>AG Medicaid Fraud Unit</strong>
              <span>Report fraud to Attorney General</span>
            </div>
            <ExternalLink size={16} />
          </a>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="hw-section hw-coming-soon">
        <h2>Coming Soon</h2>
        <p>
          Once we receive data from MGDPA requests, HealthWatch will feature:
        </p>
        <ul>
          <li><strong>Provider Map</strong> - Visualize all healthcare providers and flag clusters at single addresses</li>
          <li><strong>Payment Analysis</strong> - Identify billing outliers and exponential growth patterns</li>
          <li><strong>Network Detection</strong> - Find ownership connections between healthcare, daycare, and NEMT providers</li>
          <li><strong>Cross-Program Analysis</strong> - Identify providers billing multiple programs for same clients</li>
          <li><strong>Risk Scoring</strong> - Automated flagging using DaycareWatch methodology</li>
        </ul>
      </section>

      {/* Disclaimer */}
      <section className="hw-disclaimer">
        <p>
          <strong>Disclaimer:</strong> HealthWatch compiles public data for transparency purposes.
          Inclusion of a program or provider does not imply wrongdoing. All analysis should be verified
          with official sources before drawing conclusions.
        </p>
      </section>
    </div>
  );
};

export default HealthWatchPage;
