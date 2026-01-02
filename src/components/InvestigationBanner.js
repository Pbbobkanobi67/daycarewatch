import React, { useState } from 'react';
import {
  AlertTriangle,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import {
  INVESTIGATION_STATS,
  FEDERAL_AGENCIES,
  INVESTIGATION_TIMELINE,
  NEWS_SOURCES
} from '../data/federalInvestigation';

/**
 * InvestigationBanner - Shows current federal investigation status
 */
const InvestigationBanner = ({ stateId }) => {
  const [expanded, setExpanded] = useState(false);

  // Only show for Minnesota for now
  if (stateId !== 'minnesota') return null;

  return (
    <div className="investigation-banner">
      <div className="banner-main" onClick={() => setExpanded(!expanded)}>
        <div className="banner-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="banner-content">
          <h4>Federal Investigation Active</h4>
          <p>
            Minnesota childcare funding <strong>FROZEN</strong> as of Dec 31, 2025.
            {' '}Potential fraud: <strong>{INVESTIGATION_STATS.potentialFraud}</strong>
          </p>
        </div>
        <button className="expand-btn">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="banner-details">
          {/* Key Stats */}
          <div className="investigation-stats">
            <div className="inv-stat">
              <DollarSign size={18} />
              <div>
                <span className="stat-value">{INVESTIGATION_STATS.confirmedFraud}</span>
                <span className="stat-label">Confirmed fraud</span>
              </div>
            </div>
            <div className="inv-stat">
              <DollarSign size={18} />
              <div>
                <span className="stat-value">{INVESTIGATION_STATS.potentialFraud}</span>
                <span className="stat-label">Potential total</span>
              </div>
            </div>
            <div className="inv-stat">
              <Shield size={18} />
              <div>
                <span className="stat-value">{INVESTIGATION_STATS.fedFundingStatus}</span>
                <span className="stat-label">Federal funding</span>
              </div>
            </div>
          </div>

          {/* Federal Agencies */}
          <div className="agencies-section">
            <h5>Federal Agencies Involved</h5>
            <div className="agencies-grid">
              {FEDERAL_AGENCIES.map((agency, idx) => (
                <div key={idx} className="agency-card">
                  <strong>{agency.agency}</strong>
                  <p>{agency.action}</p>
                  <span className="agency-date">{agency.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="timeline-section">
            <h5>Investigation Timeline</h5>
            <div className="timeline">
              {INVESTIGATION_TIMELINE.map((event, idx) => (
                <div key={idx} className="timeline-event">
                  <div className="timeline-date">
                    <Calendar size={14} />
                    {event.date}
                  </div>
                  <div className="timeline-content">
                    <p className="event-title">{event.event}</p>
                    <p className="event-impact">{event.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* News Sources */}
          <div className="news-section">
            <h5>News Coverage</h5>
            <div className="news-links">
              {NEWS_SOURCES.slice(0, 5).map((article, idx) => (
                <a
                  key={idx}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-link"
                >
                  <span className="news-source">{article.source}</span>
                  <span className="news-title">{article.title}</span>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </div>

          <div className="banner-disclaimer">
            <p>
              <strong>Note:</strong> This data is for transparency and investigative purposes.
              Inclusion does not imply wrongdoing. Many legitimate facilities have been affected
              by the funding freeze. Always verify information with official sources.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigationBanner;
