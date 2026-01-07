import React from 'react';
import {
  Database,
  AlertTriangle,
  Network,
  MapPin,
  FileText,
  Shield,
  BarChart,
  CheckCircle,
  XCircle,
  HelpCircle,
  ExternalLink,
  Code
} from 'lucide-react';

/**
 * MethodologyPage - Explains data sources and analysis methods
 */
const MethodologyPage = () => {
  return (
    <div className="methodology-page">
      <div className="page-header">
        <h1>Methodology</h1>
        <p className="page-subtitle">
          How we collect, analyze, and present childcare facility data
        </p>
      </div>

      {/* Data Sources Section */}
      <section className="method-section">
        <div className="section-icon">
          <Database size={32} />
        </div>
        <h2>Data Sources</h2>
        <p>
          All data used by DaycareWatch comes from publicly available government
          sources. We do not collect or store any private information.
        </p>

        <div className="data-source-list">
          <div className="data-source">
            <h3>Minnesota</h3>
            <ul>
              <li>
                <strong>MN DHS License Lookup</strong> - Facility information,
                license status, capacity, and compliance history
                <a href="https://licensinglookup.dhs.state.mn.us/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <strong>Compliance Visit Records</strong> - Inspection dates,
                findings, and corrective actions
              </li>
              <li>
                <strong>Maltreatment Reports</strong> - Substantiated maltreatment
                determinations (public record)
              </li>
            </ul>
          </div>

          <div className="data-source">
            <h3>California</h3>
            <ul>
              <li>
                <strong>CDSS Community Care Licensing</strong> - Facility search,
                citations, and inspection reports
                <a href="https://www.ccld.dss.ca.gov/carefacilitysearch/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          <div className="data-source pending">
            <h3>Subsidy Payment Data</h3>
            <p>
              Subsidy payment records require public records requests (FOIA/state
              equivalents). We are actively submitting requests and will integrate
              this data as it becomes available.
            </p>
          </div>
        </div>
      </section>

      {/* Data Collection Section */}
      <section className="method-section">
        <div className="section-icon">
          <Code size={32} />
        </div>
        <h2>Data Collection Process</h2>
        <div className="process-steps">
          <div className="process-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Scraping</h3>
              <p>
                We use automated scripts to collect facility data from state
                licensing databases. Our scrapers respect rate limits and only
                access publicly available pages.
              </p>
            </div>
          </div>
          <div className="process-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Enrichment</h3>
              <p>
                Raw data is enriched with additional details from state DHS
                systems, including compliance visit history, violation details,
                and maltreatment information.
              </p>
            </div>
          </div>
          <div className="process-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Geocoding</h3>
              <p>
                Facility addresses are geocoded using OpenStreetMap's Nominatim
                service to enable geographic visualization and proximity analysis.
              </p>
            </div>
          </div>
          <div className="process-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Analysis</h3>
              <p>
                Our algorithms analyze the data to identify patterns, calculate
                risk scores, and detect potential anomalies requiring further
                investigation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Scoring Section */}
      <section className="method-section">
        <div className="section-icon">
          <AlertTriangle size={32} />
        </div>
        <h2>Risk Scoring Algorithm</h2>
        <p>
          Each facility receives a risk score from 0-100 based on multiple factors.
          Higher scores indicate more red flags that may warrant investigation.
        </p>

        <div className="risk-factors">
          <h3>Scoring Factors</h3>
          <table className="factors-table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Points</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Multiple facilities at same address</td>
                <td>+10 to +40</td>
                <td>Shell company pattern - multiple licenses at one location</td>
              </tr>
              <tr>
                <td>Multiple owners at same address</td>
                <td>+25 to +40</td>
                <td>Ownership transfers to evade violations/scrutiny</td>
              </tr>
              <tr>
                <td>High capacity with few staff</td>
                <td>+15 to +30</td>
                <td>Potential overbilling or safety concern</td>
              </tr>
              <tr>
                <td>License holder owns 5+ facilities</td>
                <td>+15 to +30</td>
                <td>Large networks associated with fraud schemes</td>
              </tr>
              <tr>
                <td>Recent maltreatment finding</td>
                <td>+25 to +40</td>
                <td>Substantiated child safety violation</td>
              </tr>
              <tr>
                <td>Multiple compliance violations</td>
                <td>+5 to +20</td>
                <td>Pattern of non-compliance</td>
              </tr>
              <tr>
                <td>License status (probation/suspended)</td>
                <td>+20 to +35</td>
                <td>Active enforcement action</td>
              </tr>
              <tr>
                <td>Shared phone with other facilities</td>
                <td>+10 to +20</td>
                <td>Potential network connection</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="risk-levels">
          <h3>Risk Level Categories</h3>
          <div className="level-grid">
            <div className="level-item low">
              <CheckCircle size={20} />
              <span className="level-name">Low (0-20)</span>
              <span className="level-desc">No significant red flags detected</span>
            </div>
            <div className="level-item moderate">
              <HelpCircle size={20} />
              <span className="level-name">Moderate (21-50)</span>
              <span className="level-desc">Some patterns worth noting</span>
            </div>
            <div className="level-item high">
              <AlertTriangle size={20} />
              <span className="level-name">High (51-80)</span>
              <span className="level-desc">Multiple red flags present</span>
            </div>
            <div className="level-item critical">
              <XCircle size={20} />
              <span className="level-name">Critical (81+)</span>
              <span className="level-desc">Significant investigation warranted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Network Analysis Section */}
      <section className="method-section">
        <div className="section-icon">
          <Network size={32} />
        </div>
        <h2>Network Analysis</h2>
        <p>
          We analyze connections between facilities to identify potential shell
          company networks and patterns associated with fraud schemes.
        </p>

        <div className="network-types">
          <div className="network-type">
            <h3>Owner Networks</h3>
            <p>
              Facilities grouped by license holder name. Large networks (5+
              facilities) receive additional scrutiny as they've been associated
              with fraud schemes.
            </p>
          </div>
          <div className="network-type">
            <h3>Address Clustering</h3>
            <p>
              Multiple licenses at the same physical address, especially with
              different owners, is a red flag for shell company operations.
            </p>
          </div>
          <div className="network-type">
            <h3>License Change Tracking</h3>
            <p>
              We track addresses where licenses have changed hands multiple times,
              which can indicate ownership transfers to avoid enforcement.
            </p>
          </div>
          <div className="network-type">
            <h3>Phone Number Networks</h3>
            <p>
              Shared phone numbers between facilities at different addresses
              may indicate common management or ownership.
            </p>
          </div>
        </div>
      </section>

      {/* Geographic Analysis Section */}
      <section className="method-section">
        <div className="section-icon">
          <MapPin size={32} />
        </div>
        <h2>Geographic Analysis</h2>
        <p>
          Facility locations are mapped to identify geographic patterns:
        </p>
        <ul className="geo-features">
          <li>
            <strong>Density Analysis:</strong> Areas with unusually high
            concentrations of facilities relative to population
          </li>
          <li>
            <strong>Risk Clustering:</strong> Geographic clusters of high-risk
            facilities that may share connections
          </li>
          <li>
            <strong>Address Verification:</strong> Identifying facilities at
            addresses that may not be suitable for childcare (commercial buildings,
            vacant lots, etc.)
          </li>
        </ul>
      </section>

      {/* Limitations Section */}
      <section className="method-section">
        <div className="section-icon">
          <Shield size={32} />
        </div>
        <h2>Limitations & Caveats</h2>
        <div className="limitations-list">
          <div className="limitation">
            <h3>Not Proof of Wrongdoing</h3>
            <p>
              A high risk score indicates patterns that <em>may</em> warrant
              investigation. It is not evidence of fraud or violations. Many
              legitimate facilities may trigger flags due to coincidental patterns.
            </p>
          </div>
          <div className="limitation">
            <h3>Data Currency</h3>
            <p>
              Our data is scraped periodically and may not reflect the most
              recent changes. Always verify current status through official
              state databases.
            </p>
          </div>
          <div className="limitation">
            <h3>Incomplete Information</h3>
            <p>
              Not all states provide the same level of detail. Some facilities
              may have limited data available, affecting risk score accuracy.
            </p>
          </div>
          <div className="limitation">
            <h3>Geocoding Accuracy</h3>
            <p>
              Approximately 3-4% of addresses cannot be geocoded or may be
              geocoded to approximate locations. Map positions should be verified.
            </p>
          </div>
          <div className="limitation">
            <h3>Subsidy Data Pending</h3>
            <p>
              Until subsidy payment data is integrated, we cannot detect
              payment-related anomalies like overbilling or payments during
              license suspension.
            </p>
          </div>
        </div>
      </section>

      {/* Updates Section */}
      <section className="method-section">
        <div className="section-icon">
          <BarChart size={32} />
        </div>
        <h2>Data Updates</h2>
        <p>
          We aim to refresh facility data regularly:
        </p>
        <ul>
          <li><strong>Licensing data:</strong> Weekly updates</li>
          <li><strong>Compliance visits:</strong> As new records become available</li>
          <li><strong>Risk scores:</strong> Recalculated with each data refresh</li>
        </ul>
        <p>
          Last data update timestamps are shown on individual facility records.
        </p>
      </section>

      {/* Technical Details */}
      <section className="method-section">
        <div className="section-icon">
          <FileText size={32} />
        </div>
        <h2>Technical Implementation</h2>
        <p>
          DaycareWatch is built with modern web technologies:
        </p>
        <ul className="tech-list">
          <li><strong>Frontend:</strong> React.js with Recharts for visualization</li>
          <li><strong>Mapping:</strong> Leaflet with OpenStreetMap tiles</li>
          <li><strong>Geocoding:</strong> Nominatim (OpenStreetMap)</li>
          <li><strong>Hosting:</strong> Vercel (static deployment)</li>
          <li><strong>Data Format:</strong> JSON files (no backend database)</li>
        </ul>
        <p>
          All source code is available on{' '}
          <a
            href="https://github.com/Pbbobkanobi67/daycarewatch"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <ExternalLink size={12} />
          </a>
          .
        </p>
      </section>
    </div>
  );
};

export default MethodologyPage;
