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
  Printer
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
      links.push({
        label: 'ParentAware Quality Ratings',
        url: 'https://parentaware.org/',
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
              <p className="no-data">
                Financial data not yet available. File an MGDPA (Minnesota) or CPRA (California) request
                to obtain CCAP payment records.
              </p>
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
              {investigationData?.conditional_license && (
                <div className="info-item">
                  <label>Conditional License</label>
                  <span className="status-warning">{investigationData.conditional_license}</span>
                </div>
              )}
            </div>
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
