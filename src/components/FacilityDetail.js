import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  MapPin,
  Phone,
  Users,
  FileText,
  ExternalLink,
  Shield,
  Building,
  Flag,
  AlertCircle,
  Info,
  CheckCircle,
  Eye,
  Printer,
  Calendar,
  Mail,
  Copy,
  ClipboardCheck
} from 'lucide-react';

/**
 * FacilityDetail - Investigator-focused facility detail modal
 *
 * Displays comprehensive facility information including:
 * - Risk assessment and investigation flags
 * - Basic facility information
 * - Financial data (when available)
 * - Compliance history
 * - Cross-reference analysis
 * - External links for verification
 */
const FacilityDetail = ({
  facility,
  riskAssessment,
  onClose,
  relatedFacilities = [],
  zipStats = null,
  stateId = 'minnesota',
  onAddToWatchlist,
  isInWatchlist = false,
  onRemoveFromWatchlist
}) => {
  const [watchlistReason, setWatchlistReason] = useState('');
  const [showWatchlistInput, setShowWatchlistInput] = useState(false);
  const [showRecordsRequest, setShowRecordsRequest] = useState(false);
  const [copiedRequest, setCopiedRequest] = useState(false);

  if (!facility) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      onRemoveFromWatchlist && onRemoveFromWatchlist(facility.license_number);
    } else {
      setShowWatchlistInput(true);
    }
  };

  const handleAddToWatchlist = () => {
    onAddToWatchlist && onAddToWatchlist(facility, watchlistReason || 'Added for investigation');
    setShowWatchlistInput(false);
    setWatchlistReason('');
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle size={16} className="severity-icon critical" />;
      case 'high': return <AlertTriangle size={16} className="severity-icon high" />;
      case 'moderate': return <Flag size={16} className="severity-icon moderate" />;
      case 'low': return <Info size={16} className="severity-icon low" />;
      default: return <Info size={16} className="severity-icon info" />;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    const s = status.toUpperCase();
    if (s === 'LICENSED') return 'status-licensed';
    if (s === 'PROBATION') return 'status-probation';
    if (s === 'SUSPENDED' || s === 'REVOKED') return 'status-suspended';
    if (s === 'PENDING') return 'status-pending';
    return '';
  };

  // Generate public records request data
  const getPublicRecordsData = () => {
    const licenseNum = facility.license_number || 'Unknown';
    const facilityName = facility.name || 'Unknown Facility';
    const facilityAddress = `${facility.address || ''}, ${facility.city || ''}, ${facility.state || ''} ${facility.zip_code || ''}`.trim();

    if (stateId === 'minnesota') {
      const subject = `MGDPA Request - CCAP Payment Records - License #${licenseNum}`;
      const body = `To: Minnesota Department of Children, Youth, and Families
Data Practices Office

RE: Minnesota Government Data Practices Act Request
Facility: ${facilityName}
License Number: ${licenseNum}
Address: ${facilityAddress}

Dear Data Practices Officer,

Pursuant to the Minnesota Government Data Practices Act (Minn. Stat. Ch. 13), I am requesting the following public data:

1. Child Care Assistance Program (CCAP) payment records for the above-referenced facility for fiscal years 2020-2025, including:
   - Total payments by fiscal year
   - Monthly payment amounts
   - Number of children served per month
   - Attendance records submitted for reimbursement

2. Any compliance or enforcement actions related to CCAP billing

3. Licensing inspection reports and findings

Please provide these records in electronic format if available.

I understand there may be reasonable costs associated with this request and am willing to pay up to $25 without prior notification. Please contact me if costs will exceed this amount.

Thank you for your assistance with this request.

Sincerely,
[Your Name]
[Your Email]
[Your Phone]`;

      return {
        type: 'email',
        email: 'dcyf.datarequest@state.mn.us',
        subject,
        body,
        mailto: `mailto:dcyf.datarequest@state.mn.us?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        lawName: 'MGDPA',
        lawFull: 'Minnesota Government Data Practices Act',
        agency: 'Minnesota Department of Children, Youth, and Families',
        instructions: [
          'Click "Open in Email" to send directly, OR',
          'Click "Copy Request Text" and paste into your email client',
          'Send to: dcyf.datarequest@state.mn.us',
          'Response required within 10 business days'
        ]
      };
    } else if (stateId === 'california') {
      const body = `RE: California Public Records Act Request (Gov. Code § 6250 et seq.)
Facility: ${facilityName}
License Number: ${licenseNum}
Address: ${facilityAddress}

Dear Public Records Coordinator,

Pursuant to the California Public Records Act (Government Code Section 6250 et seq.), I am requesting the following public records:

1. Childcare subsidy payment records (CalWORKs Stage 1, 2, 3 and/or Alternative Payment) for the above-referenced facility for fiscal years 2020-2025, including:
   - Total payments by fiscal year
   - Monthly reimbursement amounts
   - Number of children served
   - Attendance/enrollment data submitted for reimbursement

2. Any compliance reviews, audits, or enforcement actions related to subsidy billing

3. Community Care Licensing inspection reports and complaint investigations

Please provide these records in electronic format if available.

Per Government Code Section 6253(c), I request a response within 10 days.

Thank you for your assistance with this request.

Sincerely,
[Your Name]
[Your Email]
[Your Phone]`;

      return {
        type: 'portal',
        portalUrl: 'https://cdss.govqa.us/WEBAPP/_rs/SupportHome.aspx',
        body,
        lawName: 'CPRA',
        lawFull: 'California Public Records Act',
        agency: 'California Department of Social Services',
        instructions: [
          'Click "Open CDSS Portal" to go to the records request site',
          'Click "Submit a PRA Request" tile on the homepage',
          'Create a free account or log in if prompted',
          'Select "Community Care Licensing" as the program area',
          'Copy and paste the request text below into the description field',
          'Response required within 10 calendar days'
        ]
      };
    }

    return null;
  };

  const recordsData = getPublicRecordsData();

  const handleCopyRequest = () => {
    if (recordsData) {
      const textToCopy = recordsData.type === 'email'
        ? `Subject: ${recordsData.subject}\n\n${recordsData.body}`
        : recordsData.body;
      navigator.clipboard.writeText(textToCopy);
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2000);
    }
  };

  // Build external links based on state
  const getExternalLinks = () => {
    const links = [];

    if (stateId === 'minnesota') {
      if (facility.dhs_url) {
        links.push({
          label: 'MN DHS License Lookup',
          url: facility.dhs_url,
          icon: <Shield size={14} />
        });
      } else if (facility.license_number) {
        links.push({
          label: 'MN DHS License Lookup',
          url: `https://licensinglookup.dhs.state.mn.us/Details.aspx?l=${facility.license_number}`,
          icon: <Shield size={14} />
        });
      }
      // ParentAware doesn't support URL params for search, but link to families page
      const zip = (facility.zip_code || '').substring(0, 5);
      links.push({
        label: `ParentAware Ratings (search ${zip || facility.city || 'location'})`,
        url: 'https://www.parentaware.org/families/#/',
        icon: <CheckCircle size={14} />
      });
      links.push({
        label: 'MN Secretary of State (Business)',
        url: 'https://mblsportal.sos.state.mn.us/',
        icon: <Building size={14} />
      });
    } else if (stateId === 'california') {
      if (facility.ccld_url) {
        links.push({
          label: 'CA CCLD Facility Detail',
          url: facility.ccld_url,
          icon: <Shield size={14} />
        });
      } else if (facility.license_number) {
        links.push({
          label: 'CA CCLD Facility Detail',
          url: `https://www.ccld.dss.ca.gov/carefacilitysearch/FacilityDetail/${facility.license_number}`,
          icon: <Shield size={14} />
        });
      }
      links.push({
        label: 'CA Secretary of State',
        url: 'https://bizfileonline.sos.ca.gov/search/business',
        icon: <Building size={14} />
      });
    }

    return links;
  };

  // Get investigation data if available
  const investigationData = riskAssessment?.flags?.find(f => f.type === 'SHIRLEY_INVESTIGATION')?.investigationData;

  return (
    <div className="facility-detail-overlay" onClick={onClose}>
      <div className="facility-detail-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="facility-detail-header">
          <div className="header-content">
            <h2>{facility.name}</h2>
            <span className={`status-badge ${getStatusClass(facility.status)}`}>
              {facility.status || 'Unknown'}
            </span>
          </div>
          <div className="header-actions">
            <button
              className={`action-btn ${isInWatchlist ? 'active' : ''}`}
              onClick={handleWatchlistToggle}
              title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Eye size={18} />
              {isInWatchlist ? 'Watching' : 'Watch'}
            </button>
            <button className="action-btn print-btn" onClick={handlePrint} title="Print report">
              <Printer size={18} />
              Print
            </button>
            <button className="close-button" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Watchlist Reason Input */}
        {showWatchlistInput && (
          <div className="watchlist-input-section">
            <input
              type="text"
              placeholder="Why are you watching this facility? (optional)"
              value={watchlistReason}
              onChange={(e) => setWatchlistReason(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddToWatchlist()}
              autoFocus
            />
            <button onClick={handleAddToWatchlist}>Add to Watchlist</button>
            <button onClick={() => setShowWatchlistInput(false)}>Cancel</button>
          </div>
        )}

        {/* Risk Score Banner */}
        {riskAssessment && riskAssessment.score > 0 && (
          <div
            className="risk-score-banner"
            style={{ backgroundColor: riskAssessment.level.color }}
          >
            <div className="risk-score-content">
              <span className="risk-score-label">{riskAssessment.level.label}</span>
              <span className="risk-score-value">Risk Score: {riskAssessment.score}</span>
            </div>
            <span className="risk-score-flags">{riskAssessment.flagCount} investigation flag(s)</span>
          </div>
        )}

        <div className="facility-detail-body">
          {/* External Links - Verify with Official Sources */}
          <section className="detail-section verify-section">
            <h3>
              <ExternalLink size={18} />
              Verify with Official Sources
            </h3>
            <div className="external-links">
              {getExternalLinks().map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-button"
                >
                  {link.icon}
                  {link.label}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </section>

          {/* Investigation Flags */}
          {riskAssessment && riskAssessment.flags.length > 0 && (
            <section className="detail-section flags-section">
              <h3>
                <AlertTriangle size={18} />
                Investigation Flags ({riskAssessment.flags.length})
              </h3>
              <div className="flags-list">
                {riskAssessment.flags.map((flag, idx) => (
                  <div key={idx} className={`flag-item severity-${flag.severity}`}>
                    <div className="flag-header">
                      {getSeverityIcon(flag.severity)}
                      <span className="flag-message">{flag.message}</span>
                    </div>
                    {flag.detail && (
                      <p className="flag-detail">{flag.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Basic Information */}
          <section className="detail-section">
            <h3>
              <Building size={18} />
              Basic Information
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <label>License Number</label>
                <span>{facility.license_number || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Facility Type</label>
                <span>{facility.facility_type || 'N/A'}</span>
              </div>
              <div className="info-item full-width">
                <label><MapPin size={14} /> Address</label>
                <span>
                  {facility.address}
                  {facility.address2 && <><br />{facility.address2}</>}
                  <br />{facility.city}, {facility.state} {facility.zip_code}
                </span>
              </div>
              <div className="info-item">
                <label><Users size={14} /> Licensed Capacity</label>
                <span>
                  {facility.capacity || 'N/A'}
                  {facility.capacity_estimated && (
                    <span className="estimated-badge">estimated</span>
                  )}
                </span>
              </div>
              <div className="info-item">
                <label><Phone size={14} /> Phone</label>
                <span>{facility.phone || 'Not on file'}</span>
              </div>
              {facility.license_holder && (
                <div className="info-item full-width">
                  <label>License Holder</label>
                  <span>{facility.license_holder}</span>
                </div>
              )}
            </div>
          </section>

          {/* Financial Data */}
          <section className="detail-section">
            <h3>
              <FileText size={18} />
              Financial Data
            </h3>
            {(facility.ccap_payment_fy2025 || facility.alleged_ccap_fy2025 || investigationData) ? (
              <div className="info-grid financial-grid">
                {(facility.ccap_payment_fy2025 || investigationData?.alleged_ccap_fy2025) && (
                  <div className="info-item">
                    <label>CCAP FY2025</label>
                    <span className={facility.ccap_payment_fy2025 > 1000000 ? 'amount-high' : ''}>
                      {formatCurrency(facility.ccap_payment_fy2025 || investigationData?.alleged_ccap_fy2025)}
                      {investigationData && <span className="alleged-badge">alleged</span>}
                    </span>
                  </div>
                )}
                {(facility.ccap_total || investigationData?.alleged_total_since_fy2020) && (
                  <div className="info-item">
                    <label>Total Since FY2020</label>
                    <span className="amount-high">
                      {formatCurrency(facility.ccap_total || investigationData?.alleged_total_since_fy2020)}
                      {investigationData && <span className="alleged-badge">alleged</span>}
                    </span>
                  </div>
                )}
                {facility.capacity && (facility.ccap_payment_fy2025 || investigationData?.alleged_ccap_fy2025) && (
                  <div className="info-item">
                    <label>Payment per Capacity</label>
                    <span className={((facility.ccap_payment_fy2025 || investigationData?.alleged_ccap_fy2025) / facility.capacity) > 15000 ? 'amount-critical' : ''}>
                      {formatCurrency((facility.ccap_payment_fy2025 || investigationData?.alleged_ccap_fy2025) / facility.capacity)}
                    </span>
                  </div>
                )}
                <div className="info-item">
                  <label>Enrollment Data</label>
                  <span className="pending">Pending MGDPA request</span>
                </div>
              </div>
            ) : (
              <div className="no-data">
                <p>
                  Financial data not yet available. File a public records request to obtain subsidy payment records.
                </p>
                {recordsData && !showRecordsRequest && (
                  <button
                    onClick={() => setShowRecordsRequest(true)}
                    className="records-request-button"
                  >
                    <Mail size={16} />
                    Request Payment Records ({recordsData.lawName})
                  </button>
                )}
                {recordsData && showRecordsRequest && (
                  <div className="records-request-form">
                    <div className="records-request-header">
                      <h4>
                        <FileText size={18} />
                        {recordsData.lawFull} Request
                      </h4>
                      <button
                        className="close-records-btn"
                        onClick={() => setShowRecordsRequest(false)}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="records-request-instructions">
                      <strong>How to submit:</strong>
                      <ol>
                        {recordsData.instructions.map((instruction, idx) => (
                          <li key={idx}>{instruction}</li>
                        ))}
                      </ol>
                    </div>

                    {recordsData.type === 'email' && (
                      <div className="records-email-info">
                        <span className="email-label">Send to:</span>
                        <code>{recordsData.email}</code>
                      </div>
                    )}

                    <div className="records-request-text">
                      <label>Request Text (copy this):</label>
                      <pre>{recordsData.type === 'email' ? `Subject: ${recordsData.subject}\n\n${recordsData.body}` : recordsData.body}</pre>
                    </div>

                    <div className="records-request-actions">
                      {recordsData.type === 'email' ? (
                        <a
                          href={recordsData.mailto}
                          className="records-action-btn primary"
                        >
                          <Mail size={16} />
                          Open in Email
                        </a>
                      ) : (
                        <a
                          href={recordsData.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="records-action-btn primary"
                        >
                          <ExternalLink size={16} />
                          Open CDSS Portal
                        </a>
                      )}
                      <button
                        onClick={handleCopyRequest}
                        className="records-action-btn secondary"
                      >
                        {copiedRequest ? (
                          <>
                            <ClipboardCheck size={16} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy Request Text
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Compliance History */}
          <section className="detail-section">
            <h3>
              <Shield size={18} />
              Compliance History
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Total Visits</label>
                <span>{facility.total_visits || 'No data on file'}</span>
              </div>
              <div className="info-item">
                <label>Total Violations</label>
                <span className={facility.total_citations > 10 ? 'count-high' : ''}>
                  {facility.total_citations || investigationData?.dhs_note || 'No data on file'}
                </span>
              </div>
              <div className="info-item">
                <label>Total Complaints</label>
                <span>{facility.total_complaints || 'No data on file'}</span>
              </div>
              <div className="info-item">
                <label>Last Inspection</label>
                <span>{facility.last_inspection_date || 'No date on file'}</span>
              </div>
              <div className="info-item">
                <label>License First Issued</label>
                <span>{facility.license_first_date || 'No date on file'}</span>
              </div>
              {facility.maltreatment_info && (
                <div className="info-item">
                  <label>Maltreatment Records</label>
                  <span className="status-warning">{facility.maltreatment_info}</span>
                </div>
              )}
              {investigationData?.conditional_license && (
                <div className="info-item">
                  <label>Conditional License</label>
                  <span className="status-warning">{investigationData.conditional_license}</span>
                </div>
              )}
            </div>

            {/* Compliance Visit Timeline */}
            {facility.compliance_visits && facility.compliance_visits.length > 0 && (
              <div className="compliance-timeline">
                <h4><Calendar size={16} /> Visit History</h4>
                <div className="timeline-list">
                  {facility.compliance_visits.map((visit, idx) => (
                    <div key={idx} className="timeline-item">
                      <span className="timeline-date">{visit.date}</span>
                      <span className="timeline-type">{visit.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Cross-Reference Checks */}
          <section className="detail-section">
            <h3>
              <Flag size={18} />
              Cross-Reference Analysis
            </h3>
            <div className="cross-ref-grid">
              {relatedFacilities.length > 0 ? (
                <div className="cross-ref-item warning">
                  <label>Facilities at Same Address</label>
                  <div className="related-list">
                    {relatedFacilities.map((rel, idx) => (
                      <div key={idx} className="related-facility">
                        <span className="related-name">{rel.name}</span>
                        <span className="related-license">#{rel.license_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="cross-ref-item">
                  <label>Same Address</label>
                  <span className="all-clear">No other facilities at this address</span>
                </div>
              )}

              {zipStats && (
                <div className="cross-ref-item">
                  <label>ZIP {(facility.zip_code || '').substring(0, 5)} Statistics</label>
                  <span>
                    {zipStats.count} facilities, {zipStats.totalCapacity} total capacity
                  </span>
                </div>
              )}

              <div className="cross-ref-item">
                <label>Owner/Operator</label>
                <span className="pending">Pending business lookup</span>
              </div>
            </div>
          </section>

          {/* Investigator Notes (from Shirley data) */}
          {investigationData && investigationData.observations && (
            <section className="detail-section investigator-section">
              <h3>
                <AlertCircle size={18} />
                Investigator Notes (Shirley Video, Dec 2025)
              </h3>
              <ul className="observation-list">
                {investigationData.observations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
              {investigationData.flag_reasons && (
                <div className="flag-reasons">
                  <strong>Flagged for:</strong> {investigationData.flag_reasons.join(', ')}
                </div>
              )}
            </section>
          )}

          {/* Data Disclaimer */}
          <section className="detail-section disclaimer-section">
            <p className="disclaimer">
              <strong>Disclaimer:</strong> This data is compiled from public sources for transparency purposes.
              Inclusion of a facility does not imply wrongdoing. All payment figures marked "alleged" require
              independent verification. For investigative use, always verify data with official sources and
              conduct on-site observations.
            </p>
            <p className="data-timestamp">
              Data last updated: {facility.scraped_at ? new Date(facility.scraped_at).toLocaleDateString() : 'Unknown'}
            </p>
          </section>
        </div>

        {/* Footer with Print Button */}
        <div className="facility-detail-footer">
          <button className="print-button" onClick={() => window.print()}>
            Print Report
          </button>
          <button className="close-button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacilityDetail;
