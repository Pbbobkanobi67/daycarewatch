import React from 'react';
import {
  Users,
  Target,
  Shield,
  Database,
  GitBranch,
  ExternalLink,
  AlertTriangle,
  Building2,
  Scale,
  Heart
} from 'lucide-react';

/**
 * AboutPage - Information about the DaycareWatch project
 */
const AboutPage = () => {
  return (
    <div className="about-page">
      <div className="page-header">
        <h1>About DaycareWatch</h1>
        <p className="page-subtitle">
          An open-source investigation bringing transparency to childcare subsidy systems
        </p>
      </div>

      {/* Mission Section */}
      <section className="about-section">
        <div className="section-icon">
          <Target size={32} />
        </div>
        <h2>Our Mission</h2>
        <p>
          DaycareWatch exists to protect children and taxpayers by bringing transparency
          to the childcare subsidy system. We cross-reference public licensing data with
          subsidy payments to identify potential fraud, safety concerns, and patterns
          that warrant further investigation.
        </p>
        <p>
          Billions of dollars flow through childcare subsidy programs each year. When
          these funds are misused, children suffer from inadequate care and taxpayers
          foot the bill for services never rendered. Our goal is to make this data
          accessible to journalists, researchers, parents, and policymakers.
        </p>
      </section>

      {/* Background Section */}
      <section className="about-section">
        <div className="section-icon">
          <AlertTriangle size={32} />
        </div>
        <h2>The Problem</h2>
        <p>
          In 2024, a federal investigation in Minnesota uncovered one of the largest
          childcare fraud schemes in U.S. history, with over $250 million stolen from
          programs meant to feed children. Investigative journalists like Nick Shirley
          have documented how shell companies, fake facilities, and fraudulent billing
          exploit gaps in oversight.
        </p>
        <div className="problem-stats">
          <div className="problem-stat">
            <span className="stat-number">$250M+</span>
            <span className="stat-desc">Stolen in MN fraud case</span>
          </div>
          <div className="problem-stat">
            <span className="stat-number">70+</span>
            <span className="stat-desc">Defendants charged</span>
          </div>
          <div className="problem-stat">
            <span className="stat-number">???</span>
            <span className="stat-desc">Unknown scope nationally</span>
          </div>
        </div>
        <p>
          Common fraud patterns include: facilities operating at addresses that don't exist,
          multiple licenses at the same location with different owners, capacity numbers
          that exceed physical space, and billing for children who never attended.
        </p>
      </section>

      {/* What We Do Section */}
      <section className="about-section">
        <div className="section-icon">
          <Database size={32} />
        </div>
        <h2>What We Do</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <Building2 size={24} />
            <h3>Aggregate Public Data</h3>
            <p>
              We collect publicly available licensing data from state databases,
              including facility information, inspection records, violations, and
              maltreatment reports.
            </p>
          </div>
          <div className="feature-card">
            <Shield size={24} />
            <h3>Detect Anomalies</h3>
            <p>
              Our algorithms identify red flags: shared addresses, phone numbers,
              ownership networks, license changes, and patterns associated with
              known fraud cases.
            </p>
          </div>
          <div className="feature-card">
            <Scale size={24} />
            <h3>Enable Oversight</h3>
            <p>
              We provide tools for journalists, researchers, and officials to
              investigate facilities, track networks, and export data for
              further analysis.
            </p>
          </div>
          <div className="feature-card">
            <Heart size={24} />
            <h3>Protect Children</h3>
            <p>
              By surfacing compliance issues and potential fraud, we help ensure
              that childcare funds go to legitimate providers who actually care
              for children.
            </p>
          </div>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="about-section">
        <div className="section-icon">
          <GitBranch size={32} />
        </div>
        <h2>Open Source & Transparent</h2>
        <p>
          DaycareWatch is 100% open source. Our code, data collection methods, and
          analysis algorithms are publicly available for review and contribution.
          We believe transparency in oversight tools is essential for public trust.
        </p>
        <div className="cta-buttons">
          <a
            href="https://github.com/Pbbobkanobi67/daycarewatch"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button primary"
          >
            <GitBranch size={18} />
            View on GitHub
            <ExternalLink size={14} />
          </a>
          <a
            href="https://github.com/Pbbobkanobi67/daycarewatch/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button secondary"
          >
            Report an Issue
            <ExternalLink size={14} />
          </a>
        </div>
      </section>

      {/* Team Section */}
      <section className="about-section">
        <div className="section-icon">
          <Users size={32} />
        </div>
        <h2>Contributors</h2>
        <p>
          DaycareWatch is a community-driven project. We welcome contributions from
          developers, data analysts, journalists, and anyone passionate about
          protecting children and ensuring accountability in public programs.
        </p>
        <div className="contribute-ways">
          <div className="contribute-item">
            <strong>Developers:</strong> Help improve our analysis algorithms,
            add new state data sources, or enhance the user interface.
          </div>
          <div className="contribute-item">
            <strong>Researchers:</strong> Use our data and tools for academic
            research on childcare systems and fraud prevention.
          </div>
          <div className="contribute-item">
            <strong>Journalists:</strong> Investigate facilities in your area
            and help bring accountability to local childcare systems.
          </div>
          <div className="contribute-item">
            <strong>Parents:</strong> Report concerns about facilities through
            our tips system or official channels.
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="about-section disclaimer">
        <h2>Important Disclaimer</h2>
        <p>
          DaycareWatch is an independent research project with no affiliation to
          any government agency. The information presented is derived from publicly
          available data and should not be considered definitive proof of wrongdoing.
        </p>
        <p>
          High risk scores or flags indicate patterns that <em>may</em> warrant
          further investigation, not confirmed fraud or safety violations. Always
          verify information through official channels before taking action.
        </p>
        <p>
          If you have concerns about a specific facility, please contact your
          state's licensing authority or law enforcement directly.
        </p>
      </section>
    </div>
  );
};

export default AboutPage;
