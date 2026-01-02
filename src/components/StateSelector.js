import React from 'react';
import { MapPin, ChevronRight } from 'lucide-react';

/**
 * StateSelector component - Landing page for selecting a state
 */
function StateSelector({ states, onSelectState }) {
  return (
    <section className="state-selector">
      <div className="state-selector-intro">
        <p className="intro-text">
          Select a state to explore childcare facility data, licensing information,
          and subsidy payment transparency.
        </p>
      </div>

      <div className="state-grid">
        {states.map(state => (
          <button
            key={state.id}
            className={`state-card ${state.id}`}
            onClick={() => onSelectState(state.id)}
            style={{ '--state-color': state.color }}
          >
            <div className="state-card-header">
              <MapPin size={20} className="state-icon" />
              <span className="state-abbrev">{state.abbreviation}</span>
            </div>
            <div className="state-card-body">
              <h3 className="state-name">{state.name}</h3>
              <p className="state-tagline">{state.tagline}</p>
            </div>
            <div className="state-card-stats">
              <div className="state-stat">
                <span className="stat-number">{state.stats.totalCounties}</span>
                <span className="stat-label">Counties</span>
              </div>
              <div className="state-stat">
                <span className="stat-number">{state.stats.annualSubsidies}</span>
                <span className="stat-label">Annual Subsidies</span>
              </div>
            </div>
            <div className="state-card-footer">
              <span className="pilot-badge">
                Pilot: {state.stats.pilotCounty} County
              </span>
              <ChevronRight size={16} className="chevron" />
            </div>
          </button>
        ))}
      </div>

      <div className="coming-soon">
        <h4>Coming Soon</h4>
        <p>
          We're working on expanding to more states. Interested in helping bring
          transparency to your state's childcare system?{' '}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            Contribute on GitHub
          </a>
        </p>
      </div>
    </section>
  );
}

export default StateSelector;
