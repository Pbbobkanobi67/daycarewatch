import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Search, AlertTriangle, Building2, DollarSign, Users, ExternalLink, Info, ArrowLeft, Eye, Network, TrendingUp, BookMarked, MapPin, Download } from 'lucide-react';
import './App.css';
import './components/components.css';

// Import state configurations
import { getState, getAllStates } from './states';
import StateSelector from './components/StateSelector';
import FacilityDetail from './components/FacilityDetail';
import NetworkAnalysisPanel from './components/NetworkAnalysisPanel';
import WatchlistPanel from './components/WatchlistPanel';
import InvestigationBanner from './components/InvestigationBanner';
import AdvancedSearch from './components/AdvancedSearch';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import HeatMap from './components/HeatMap';
import ExportPanel from './components/ExportPanel';
import { buildAddressGroups, calculateZipStats } from './utils/anomalyDetection';
import { addToWatchlist, removeFromWatchlist, isInWatchlist, getWatchlist } from './utils/watchlist';
import { analyzeNetworks } from './utils/networkAnalysis';

// Chart colors
const CHART_COLORS = ['#1a365d', '#2c5282', '#4299e1', '#63b3ed', '#90cdf4'];

function App() {
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [facilitySearch, setFacilitySearch] = useState("");
  const [showFlagged, setShowFlagged] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Real data state
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Facility detail modal state
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [investigationData, setInvestigationData] = useState(null);

  // Advanced search filtered facilities
  const [advancedFilteredFacilities, setAdvancedFilteredFacilities] = useState([]);

  // Watchlist state
  const [watchlistRefresh, setWatchlistRefresh] = useState(0);

  // Load investigation seed data (Shirley investigation)
  useEffect(() => {
    fetch('/data/minnesota/minnesota_shirley_investigation_seed.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => setInvestigationData(data))
      .catch(() => setInvestigationData(null));
  }, []);

  // Get current state data if a state is selected
  const stateData = selectedState ? getState(selectedState) : null;
  const currentCounties = stateData ? stateData.counties : [];

  // Load facility data when county is selected
  useEffect(() => {
    if (selectedState && selectedCounty) {
      loadFacilityData(selectedState, selectedCounty.name);
    } else {
      setFacilities([]);
    }
  }, [selectedState, selectedCounty]);

  const loadFacilityData = async (stateId, countyName) => {
    setLoading(true);
    setError(null);

    try {
      const filename = countyName.toLowerCase().replace(/ /g, '_');
      const response = await fetch(`/data/${stateId}/${filename}_facilities.json`);

      if (!response.ok) {
        if (response.status === 404) {
          setFacilities([]);
          setError(`No data available yet for ${countyName} County`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      setFacilities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading facility data:', err);
      setError(`Failed to load data for ${countyName} County`);
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter counties by search term
  const filteredCounties = useMemo(() => {
    return currentCounties.filter(county =>
      county.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, currentCounties]);

  // Check if facility should be flagged
  const isFlagged = (facility) => {
    const flags = [];

    // High citation count
    if (facility.total_citations >= 5) {
      flags.push(`High citations: ${facility.total_citations}`);
    }

    // Status issues
    if (facility.status === 'PROBATION' || facility.status === 'SUSPENDED') {
      flags.push(`License status: ${facility.status}`);
    }

    // High capacity with no recent inspection data
    if (facility.capacity > 50 && !facility.last_inspection_date) {
      flags.push('High capacity, no recent inspection on file');
    }

    return flags;
  };

  // Build cross-reference data for anomaly detection
  const addressGroups = useMemo(() => buildAddressGroups(facilities), [facilities]);
  const zipStats = useMemo(() => calculateZipStats(facilities), [facilities]);

  // Network analysis for owner/address connections
  const networkAnalysis = useMemo(() => analyzeNetworks(facilities), [facilities]);

  // Handler for advanced search results
  const handleAdvancedFilterResults = useCallback((filtered) => {
    setAdvancedFilteredFacilities(filtered);
  }, []);

  // Watchlist handlers
  const handleAddToWatchlist = useCallback((facility, reason) => {
    addToWatchlist(facility, reason);
    setWatchlistRefresh(prev => prev + 1);
  }, []);

  const handleRemoveFromWatchlist = useCallback((licenseNumber) => {
    removeFromWatchlist(licenseNumber);
    setWatchlistRefresh(prev => prev + 1);
  }, []);

  // Get current watchlist
  const watchlistItems = useMemo(() => getWatchlist(), [watchlistRefresh]);

  // Filter and process facilities with enhanced anomaly detection
  const filteredFacilities = useMemo(() => {
    let filtered = facilities;

    // Build context for anomaly detection
    const context = {
      addressGroups,
      zipStats,
      investigationList: investigationData?.facilities || []
    };

    // Add flag data and risk assessment to each facility
    filtered = filtered.map(f => {
      const oldFlags = isFlagged(f);
      // Import advanced risk assessment
      const { calculateRiskScore } = require('./utils/anomalyDetection');
      const riskAssessment = calculateRiskScore(f, context);

      return {
        ...f,
        flagReasons: oldFlags,
        flagged: oldFlags.length > 0 || riskAssessment.hasHighFlags,
        riskAssessment
      };
    });

    // Text search
    if (facilitySearch) {
      const search = facilitySearch.toLowerCase();
      filtered = filtered.filter(f =>
        (f.name && f.name.toLowerCase().includes(search)) ||
        (f.address && f.address.toLowerCase().includes(search)) ||
        (f.city && f.city.toLowerCase().includes(search)) ||
        (f.license_number && f.license_number.includes(facilitySearch))
      );
    }

    // Flagged filter
    if (showFlagged) {
      filtered = filtered.filter(f => f.flagged);
    }

    // Sort by risk score descending
    filtered = [...filtered].sort((a, b) =>
      (b.riskAssessment?.score || 0) - (a.riskAssessment?.score || 0)
    );

    return filtered;
  }, [facilities, facilitySearch, showFlagged, addressGroups, zipStats, investigationData]);

  // Calculate stats from real data
  const stats = useMemo(() => {
    if (!facilities.length) {
      return {
        totalFacilities: 0,
        totalCapacity: 0,
        flaggedCount: 0,
        byType: [],
        byStatus: [],
        activeCount: 0
      };
    }

    const totalCapacity = facilities.reduce((sum, f) => sum + (f.capacity || 0), 0);

    // Count by type
    const typeMap = {};
    facilities.forEach(f => {
      const type = f.facility_type || 'Unknown';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    const byType = Object.entries(typeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Count by status
    const statusMap = {};
    facilities.forEach(f => {
      const status = f.status || 'Unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    const byStatus = Object.entries(statusMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Count flagged
    const flaggedCount = facilities.filter(f => isFlagged(f).length > 0).length;

    // Count active/licensed
    const activeCount = facilities.filter(f =>
      f.status === 'LICENSED' || f.status === 'Active'
    ).length;

    return {
      totalFacilities: facilities.length,
      totalCapacity,
      flaggedCount,
      byType,
      byStatus,
      activeCount
    };
  }, [facilities]);

  // Use state-specific data status function
  const countyStatus = useMemo(() => {
    if (!selectedCounty || !stateData) return null;

    const status = stateData.getDataStatus(selectedCounty.name);

    // Override with real data if we have it
    if (facilities.length > 0) {
      return {
        ...status,
        licensingData: true,
        facilitiesCount: facilities.length
      };
    }

    return status;
  }, [selectedCounty, stateData, facilities]);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo" onClick={() => { setSelectedState(null); setSelectedCounty(null); }} style={{cursor: 'pointer'}}>
            <div className="logo-icon">
              <Building2 size={28} />
            </div>
            <div className="logo-text">
              <h1>DaycareWatch</h1>
              <span className="tagline">National Childcare Subsidy Transparency</span>
            </div>
          </div>
          <nav className="nav">
            <a href="#about" className="nav-link">About</a>
            <a href="#methodology" className="nav-link">Methodology</a>
            <a href="https://github.com/Pbbobkanobi67/daycarewatch" className="nav-link" target="_blank" rel="noopener noreferrer">
              GitHub <ExternalLink size={14} />
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section - shown when no county is selected */}
      {!selectedCounty && (
        <section className="hero">
          <div className="hero-content">
            <h2>Where do childcare subsidies actually go?</h2>
            <p>
              An open-source investigation cross-referencing public licensing data
              with subsidy payments across multiple states.
            </p>
            {stateData ? (
              <div className="hero-stats">
                <div className="stat-card">
                  <span className="stat-number">{stateData.config.stats.totalCounties}</span>
                  <span className="stat-label">Counties</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stateData.config.stats.annualSubsidies}</span>
                  <span className="stat-label">Annual Subsidies</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stateData.config.stats.pilotCounty}</span>
                  <span className="stat-label">Pilot County</span>
                </div>
              </div>
            ) : (
              <div className="hero-stats">
                <div className="stat-card">
                  <span className="stat-number">2</span>
                  <span className="stat-label">States</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">145</span>
                  <span className="stat-label">Counties</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">$1.3B+</span>
                  <span className="stat-label">Annual Subsidies</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <main className="main">
        {/* State Selection View - shown when no state is selected */}
        {!selectedState ? (
          <StateSelector
            states={getAllStates()}
            onSelectState={setSelectedState}
          />
        ) : !selectedCounty ? (
          /* County Selection View - shown when state selected but no county */
          <section className="county-section">
            <button
              className="back-button"
              onClick={() => {
                setSelectedState(null);
                setSearchTerm('');
              }}
            >
              <ArrowLeft size={16} /> Back to States
            </button>

            <div className="section-header">
              <h3>Select a County in {stateData.config.name}</h3>
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search counties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="county-grid">
              {filteredCounties.map(county => {
                const status = stateData.getDataStatus(county.name);
                return (
                  <button
                    key={county.name}
                    className={`county-card ${status.licensingData ? 'has-data' : ''}`}
                    onClick={() => setSelectedCounty(county)}
                  >
                    <div className="county-name">{county.name}</div>
                    <div className="county-pop">Pop: {county.population.toLocaleString()}</div>
                    {status.licensingData ? (
                      <div className="county-status active">
                        <span className="status-dot"></span>
                        {status.facilitiesCount?.toLocaleString()} facilities
                      </div>
                    ) : (
                      <div className="county-status pending">
                        Pending
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Project Status */}
            <div className="project-status">
              <h3>Project Status</h3>
              <div className="status-timeline">
                <div className="timeline-item completed">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <strong>Phase 1: Infrastructure</strong>
                    <p>App framework, data models, visualization components</p>
                  </div>
                </div>
                <div className="timeline-item in-progress">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <strong>Phase 2: Pilot Counties</strong>
                    <p>San Diego (CA) &amp; Hennepin (MN) - scraping licensing data, filing records requests</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <strong>Phase 3: State Expansion</strong>
                    <p>Roll out to remaining counties</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <strong>Phase 4: Anomaly Detection</strong>
                    <p>Automated flagging of payment/capacity mismatches</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* County Detail View */
          <section className="county-detail">
            <button className="back-button" onClick={() => { setSelectedCounty(null); setFacilities([]); setActiveTab('overview'); }}>
              <ArrowLeft size={16} /> Back to {stateData.config.name} Counties
            </button>

            <div className="county-header">
              <div className="county-title">
                <h2>{selectedCounty.name} County, {stateData.config.abbreviation}</h2>
                <span className="county-population">
                  Population: {selectedCounty.population.toLocaleString()}
                </span>
              </div>
              <div className="data-status">
                <div className={`status-badge ${countyStatus?.licensingData ? 'active' : 'pending'}`}>
                  <span className="badge-dot"></span>
                  Licensing Data: {countyStatus?.licensingData ? 'Available' : 'Pending'}
                </div>
                <div className={`status-badge ${countyStatus?.subsidyData ? 'active' : 'pending'}`}>
                  <span className="badge-dot"></span>
                  Subsidy Data: {countyStatus?.subsidyData ? 'Available' : `${stateData.config.publicRecordsLaw.shortName} Pending`}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading-message">
                <div className="loading-spinner"></div>
                <p>Loading facility data...</p>
              </div>
            ) : error && facilities.length === 0 ? (
              <div className="no-data-message">
                <Building2 size={48} />
                <h3>Data Collection Pending</h3>
                <p>
                  We're working on collecting licensing and subsidy data for {selectedCounty.name} County.
                  Check out our pilot counties or help us expand by contributing to the project!
                </p>
                <a href="https://github.com/Pbbobkanobi67/daycarewatch" className="contribute-button" target="_blank" rel="noopener noreferrer">
                  Contribute on GitHub
                </a>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stat-card-large">
                    <Building2 className="stat-icon" />
                    <div className="stat-info">
                      <span className="stat-value">{stats.totalFacilities.toLocaleString()}</span>
                      <span className="stat-title">Total Facilities</span>
                    </div>
                  </div>
                  <div className="stat-card-large">
                    <Users className="stat-icon" />
                    <div className="stat-info">
                      <span className="stat-value">{stats.totalCapacity.toLocaleString()}</span>
                      <span className="stat-title">Total Capacity</span>
                    </div>
                  </div>
                  <div className="stat-card-large">
                    <DollarSign className="stat-icon" />
                    <div className="stat-info">
                      <span className="stat-value awaiting">—</span>
                      <span className="stat-title">Total Subsidies ({stateData.config.publicRecordsLaw.shortName} Pending)</span>
                    </div>
                  </div>
                  <div className="stat-card-large warning">
                    <AlertTriangle className="stat-icon" />
                    <div className="stat-info">
                      <span className="stat-value">{stats.flaggedCount.toLocaleString()}</span>
                      <span className="stat-title">Flagged for Review</span>
                    </div>
                  </div>
                </div>

                {/* Investigation Banner for Minnesota */}
                <InvestigationBanner stateId={selectedState} />

                {/* Tabs */}
                <div className="tabs">
                  <button
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={`tab ${activeTab === 'facilities' ? 'active' : ''}`}
                    onClick={() => setActiveTab('facilities')}
                  >
                    Facilities ({stats.totalFacilities.toLocaleString()})
                  </button>
                  <button
                    className={`tab ${activeTab === 'anomalies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('anomalies')}
                  >
                    Anomalies ({stats.flaggedCount})
                  </button>
                  <button
                    className={`tab ${activeTab === 'network' ? 'active' : ''}`}
                    onClick={() => setActiveTab('network')}
                  >
                    <Network size={16} /> Networks
                  </button>
                  <button
                    className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    <TrendingUp size={16} /> Analytics
                  </button>
                  <button
                    className={`tab ${activeTab === 'watchlist' ? 'active' : ''}`}
                    onClick={() => setActiveTab('watchlist')}
                  >
                    <BookMarked size={16} /> Watchlist ({watchlistItems.length})
                  </button>
                  <button
                    className={`tab ${activeTab === 'map' ? 'active' : ''}`}
                    onClick={() => setActiveTab('map')}
                  >
                    <MapPin size={16} /> Map
                  </button>
                  <button
                    className={`tab ${activeTab === 'export' ? 'active' : ''}`}
                    onClick={() => setActiveTab('export')}
                  >
                    <Download size={16} /> Export
                  </button>
                </div>

                {activeTab === 'overview' && (
                  <div className="tab-content">
                    <div className="charts-grid">
                      <div className="chart-card">
                        <h4>Facility Types</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={stats.byType.slice(0, 5)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              dataKey="value"
                              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                              {stats.byType.slice(0, 5).map((entry, index) => (
                                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="chart-legend">
                          {stats.byType.slice(0, 5).map((entry, index) => (
                            <div key={entry.name} className="legend-item">
                              <span className="legend-color" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                              <span className="legend-label">{entry.name}</span>
                              <span className="legend-value">{entry.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="chart-card">
                        <h4>Status Distribution</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={stats.byStatus.slice(0, 6)} layout="vertical">
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => [value.toLocaleString(), 'Count']} />
                            <Bar dataKey="count" fill="#2c5282" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="info-box">
                      <Info size={20} />
                      <div>
                        <strong>Data Note:</strong> Subsidy payment data requires a {stateData.config.publicRecordsLaw.name} ({stateData.config.publicRecordsLaw.shortName})
                        request. Response deadline: {stateData.config.publicRecordsLaw.responseDeadline}.
                        Licensing data shown is from public state databases.
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'facilities' && (
                  <div className="tab-content">
                    {/* Advanced Search Component */}
                    <AdvancedSearch
                      facilities={filteredFacilities}
                      onFilteredResults={handleAdvancedFilterResults}
                      counties={currentCounties}
                    />

                    <div className="facilities-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Risk</th>
                            <th>Facility Name</th>
                            <th>Type</th>
                            <th>City</th>
                            <th>Capacity</th>
                            <th>Status</th>
                            <th>Watch</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(advancedFilteredFacilities.length > 0 ? advancedFilteredFacilities : filteredFacilities).slice(0, 100).map(facility => (
                            <tr
                              key={facility.license_number}
                              className={`facility-row ${facility.flagged ? 'flagged-row' : ''} ${isInWatchlist(facility.license_number) ? 'watched-row' : ''} clickable`}
                              onClick={() => setSelectedFacility(facility)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>
                                {facility.riskAssessment && facility.riskAssessment.score > 0 && (
                                  <span
                                    className="risk-badge"
                                    style={{ backgroundColor: facility.riskAssessment.level.color }}
                                    title={`Risk Score: ${facility.riskAssessment.score}`}
                                  >
                                    {facility.riskAssessment.score}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="facility-name">
                                  {facility.flagged && <AlertTriangle size={16} className="flag-icon" title={facility.riskAssessment?.flags?.map(f => f.message).join(', ') || facility.flagReasons.join(', ')} />}
                                  <div>
                                    <strong>{facility.name}</strong>
                                    <span className="facility-address">{facility.address}</span>
                                  </div>
                                </div>
                              </td>
                              <td>{facility.facility_type}</td>
                              <td>{facility.city}</td>
                              <td>
                                {facility.capacity}
                                {facility.capacity_estimated && <span className="estimated-marker">*</span>}
                              </td>
                              <td>
                                <span className={`status-pill ${facility.status?.toLowerCase().replace(/ /g, '-')}`}>
                                  {facility.status}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                {isInWatchlist(facility.license_number) ? (
                                  <button
                                    className="watchlist-btn active"
                                    onClick={() => handleRemoveFromWatchlist(facility.license_number)}
                                    title="Remove from watchlist"
                                  >
                                    <Eye size={16} />
                                  </button>
                                ) : (
                                  <button
                                    className="watchlist-btn"
                                    onClick={() => handleAddToWatchlist(facility, 'Added for investigation')}
                                    title="Add to watchlist"
                                  >
                                    <Eye size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="table-hint">* = estimated capacity | Click any row to view details | <Eye size={12} style={{verticalAlign: 'middle'}} /> = watchlist</p>
                    </div>

                    {(advancedFilteredFacilities.length > 0 ? advancedFilteredFacilities : filteredFacilities).length > 100 && (
                      <p className="table-note">
                        Showing first 100 of {(advancedFilteredFacilities.length > 0 ? advancedFilteredFacilities : filteredFacilities).length.toLocaleString()} facilities.
                        Use search to filter results.
                      </p>
                    )}

                    {advancedFilteredFacilities.length === 0 && filteredFacilities.length === 0 && (
                      <p className="table-note">
                        No facilities match your search. Try different filters.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'anomalies' && (
                  <div className="tab-content">
                    <div className="anomaly-section">
                      <h4>Anomaly Detection</h4>
                      <p>
                        Facilities flagged for potential issues based on available licensing data.
                        When subsidy payment data becomes available, additional anomalies will be detected.
                      </p>

                      <div className="anomaly-criteria">
                        <h5>Current Detection Criteria:</h5>
                        <ul>
                          <li><strong>High citations</strong> - 5 or more total citations on record</li>
                          <li><strong>License status</strong> - Probation or suspended status</li>
                          <li><strong>High capacity, no inspection</strong> - Over 50 capacity with no inspection on file</li>
                        </ul>
                        <h5>Future Criteria (when subsidy data available):</h5>
                        <ul>
                          <li>High subsidy payments relative to licensed capacity</li>
                          <li>Payments received during periods of license suspension</li>
                          <li>Significant payment increases without capacity changes</li>
                          <li>Multiple facilities at same address</li>
                        </ul>
                      </div>

                      <div className="current-flags">
                        <h5>Flagged Facilities ({stats.flaggedCount}):</h5>
                        {filteredFacilities.filter(f => f.flagged).slice(0, 20).map(facility => (
                          <div key={facility.license_number} className="flag-card">
                            <AlertTriangle className="flag-icon-large" />
                            <div>
                              <strong>{facility.name}</strong>
                              <p className="flag-address">{facility.address}, {facility.city}</p>
                              <ul className="flag-reasons">
                                {facility.flagReasons.map((reason, i) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                              {facility.ccld_url && (
                                <a href={facility.ccld_url} target="_blank" rel="noopener noreferrer" className="flag-link">
                                  View on CCLD <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {stats.flaggedCount > 20 && (
                          <p className="table-note">
                            Showing first 20 of {stats.flaggedCount} flagged facilities.
                          </p>
                        )}
                        {stats.flaggedCount === 0 && (
                          <p className="no-flags">No facilities currently flagged based on available data.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'network' && (
                  <div className="tab-content">
                    <NetworkAnalysisPanel
                      facilities={filteredFacilities}
                      networkAnalysis={networkAnalysis}
                      onFacilityClick={setSelectedFacility}
                    />
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="tab-content">
                    <AnalyticsDashboard
                      facilities={filteredFacilities}
                      stateData={stateData}
                    />
                  </div>
                )}

                {activeTab === 'watchlist' && (
                  <div className="tab-content">
                    <WatchlistPanel
                      watchlist={watchlistItems}
                      facilities={facilities}
                      onRemove={handleRemoveFromWatchlist}
                      onFacilityClick={setSelectedFacility}
                    />
                  </div>
                )}

                {activeTab === 'map' && (
                  <div className="tab-content">
                    <HeatMap
                      facilities={filteredFacilities}
                      onFacilityClick={setSelectedFacility}
                    />
                  </div>
                )}

                {activeTab === 'export' && (
                  <div className="tab-content">
                    <ExportPanel
                      facilities={filteredFacilities}
                      watchlist={watchlistItems}
                      countyName={selectedCounty.name}
                      stateName={stateData.config.name}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {/* Facility Detail Modal */}
      {selectedFacility && (
        <FacilityDetail
          facility={selectedFacility}
          riskAssessment={selectedFacility.riskAssessment}
          onClose={() => setSelectedFacility(null)}
          relatedFacilities={
            // Find other facilities at same address
            Object.values(addressGroups).flat().filter(f =>
              f.license_number !== selectedFacility.license_number &&
              f.address?.toLowerCase().includes(selectedFacility.address?.toLowerCase().split(' ')[0])
            ).slice(0, 5)
          }
          zipStats={zipStats[(selectedFacility.zip_code || '').substring(0, 5)]}
          stateId={selectedState}
          onAddToWatchlist={handleAddToWatchlist}
          isInWatchlist={isInWatchlist(selectedFacility.license_number)}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
        />
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>DaycareWatch</h4>
            <p>
              An open-source project bringing transparency to childcare
              subsidy systems through public records.
            </p>
          </div>
          <div className="footer-section">
            <h4>Data Sources</h4>
            {stateData ? (
              <ul>
                {stateData.config.footerLinks?.map(link => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <ul>
                <li><a href="https://www.ccld.dss.ca.gov/carefacilitysearch/" target="_blank" rel="noopener noreferrer">CA Community Care Licensing</a></li>
                <li><a href="https://licensinglookup.dhs.state.mn.us/" target="_blank" rel="noopener noreferrer">MN DHS License Lookup</a></li>
              </ul>
            )}
          </div>
          <div className="footer-section">
            <h4>Get Involved</h4>
            <ul>
              <li><a href="https://github.com/Pbbobkanobi67/daycarewatch/issues" target="_blank" rel="noopener noreferrer">Submit a Tip</a></li>
              <li><a href="https://github.com/Pbbobkanobi67/daycarewatch" target="_blank" rel="noopener noreferrer">Contribute Code</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Built with public records. Open source. No affiliation with any government agency.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
