import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  Building,
  MapPin,
  Shield,
  Calendar
} from 'lucide-react';

const COLORS = ['#1a365d', '#2c5282', '#4299e1', '#63b3ed', '#90cdf4', '#bee3f8'];
const RISK_COLORS = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  critical: '#ef4444'
};

/**
 * AnalyticsDashboard - Comparative analysis and statistics
 */
const AnalyticsDashboard = ({ facilities, stateData, onFacilityClick }) => {
  const analytics = useMemo(() => {
    if (!facilities || facilities.length === 0) return null;

    // Basic stats
    const totalFacilities = facilities.length;
    const totalCapacity = facilities.reduce((sum, f) => sum + (f.capacity || 0), 0);
    const avgCapacity = Math.round(totalCapacity / totalFacilities);

    // Risk distribution
    const riskDistribution = { low: 0, moderate: 0, high: 0, critical: 0 };
    facilities.forEach(f => {
      const score = f.riskAssessment?.score || 0;
      if (score <= 20) riskDistribution.low++;
      else if (score <= 50) riskDistribution.moderate++;
      else if (score <= 80) riskDistribution.high++;
      else riskDistribution.critical++;
    });

    // Facility type distribution
    const typeDistribution = {};
    facilities.forEach(f => {
      const type = f.facility_type || 'Unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    // Status distribution
    const statusDistribution = {};
    facilities.forEach(f => {
      const status = f.status || 'Unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    // City distribution (top 10)
    const cityDistribution = {};
    facilities.forEach(f => {
      const city = f.city || 'Unknown';
      cityDistribution[city] = (cityDistribution[city] || 0) + 1;
    });
    const topCities = Object.entries(cityDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }));

    // Violations analysis
    const facilitiesWithViolations = facilities.filter(f =>
      (f.total_citations || 0) > 0 || (f.visits_with_violations || 0) > 0
    ).length;

    const totalViolations = facilities.reduce((sum, f) =>
      sum + (f.total_citations || 0) + (f.visits_with_violations || 0), 0
    );

    // Maltreatment
    const facilitiesWithMaltreatment = facilities.filter(f =>
      f.has_maltreatment || f.maltreatment_info
    ).length;

    // Capacity distribution
    const capacityBuckets = [
      { range: '1-25', min: 1, max: 25, count: 0 },
      { range: '26-50', min: 26, max: 50, count: 0 },
      { range: '51-100', min: 51, max: 100, count: 0 },
      { range: '101-200', min: 101, max: 200, count: 0 },
      { range: '200+', min: 201, max: Infinity, count: 0 },
    ];
    facilities.forEach(f => {
      const cap = f.capacity || 0;
      const bucket = capacityBuckets.find(b => cap >= b.min && cap <= b.max);
      if (bucket) bucket.count++;
    });

    // DHS enrichment status
    const enrichedCount = facilities.filter(f => f.dhs_enriched).length;
    const estimatedCapacityCount = facilities.filter(f => f.capacity_estimated).length;

    // High-risk facilities
    const highRiskFacilities = facilities
      .filter(f => f.riskAssessment?.score > 50)
      .sort((a, b) => (b.riskAssessment?.score || 0) - (a.riskAssessment?.score || 0))
      .slice(0, 10);

    return {
      totalFacilities,
      totalCapacity,
      avgCapacity,
      riskDistribution,
      typeDistribution,
      statusDistribution,
      topCities,
      facilitiesWithViolations,
      totalViolations,
      facilitiesWithMaltreatment,
      capacityBuckets,
      enrichedCount,
      estimatedCapacityCount,
      highRiskFacilities,
    };
  }, [facilities]);

  if (!analytics) {
    return <div className="analytics-dashboard">Loading analytics...</div>;
  }

  const riskPieData = [
    { name: 'Low Risk', value: analytics.riskDistribution.low, color: RISK_COLORS.low },
    { name: 'Moderate', value: analytics.riskDistribution.moderate, color: RISK_COLORS.moderate },
    { name: 'High Risk', value: analytics.riskDistribution.high, color: RISK_COLORS.high },
    { name: 'Critical', value: analytics.riskDistribution.critical, color: RISK_COLORS.critical },
  ].filter(d => d.value > 0);

  const typePieData = Object.entries(analytics.typeDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="analytics-dashboard">
      <h3><TrendingUp size={20} /> Analytics Dashboard</h3>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <Building size={24} />
          <div className="metric-content">
            <span className="metric-value">{analytics.totalFacilities.toLocaleString()}</span>
            <span className="metric-label">Total Facilities</span>
          </div>
        </div>

        <div className="metric-card">
          <Users size={24} />
          <div className="metric-content">
            <span className="metric-value">{analytics.totalCapacity.toLocaleString()}</span>
            <span className="metric-label">Total Capacity</span>
          </div>
        </div>

        <div className="metric-card warning">
          <AlertTriangle size={24} />
          <div className="metric-content">
            <span className="metric-value">{analytics.facilitiesWithViolations}</span>
            <span className="metric-label">With Violations</span>
          </div>
        </div>

        <div className="metric-card danger">
          <Shield size={24} />
          <div className="metric-content">
            <span className="metric-value">{analytics.facilitiesWithMaltreatment}</span>
            <span className="metric-label">Maltreatment Cases</span>
          </div>
        </div>

        <div className="metric-card">
          <Calendar size={24} />
          <div className="metric-content">
            <span className="metric-value">{analytics.enrichedCount}</span>
            <span className="metric-label">DHS Verified</span>
          </div>
        </div>

        <div className="metric-card info">
          <TrendingUp size={24} />
          <div className="metric-content">
            <span className="metric-value">{analytics.avgCapacity}</span>
            <span className="metric-label">Avg Capacity</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Risk Distribution */}
        <div className="chart-card">
          <h4>Risk Distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {riskPieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Facility Types */}
        <div className="chart-card">
          <h4>Facility Types</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={typePieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
              >
                {typePieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Capacity Distribution */}
        <div className="chart-card">
          <h4>Capacity Distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.capacityBuckets}>
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#4299e1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Cities */}
      <div className="chart-card full-width">
        <h4><MapPin size={16} /> Top Cities by Facility Count</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={analytics.topCities} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="city" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="count" fill="#2c5282" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* High Risk Table */}
      {analytics.highRiskFacilities.length > 0 && (
        <div className="high-risk-section">
          <h4><AlertTriangle size={16} /> Highest Risk Facilities</h4>
          <table className="high-risk-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>City</th>
                <th>Risk Score</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {analytics.highRiskFacilities.map((f, idx) => (
                <tr
                  key={idx}
                  className="clickable-row"
                  onClick={() => onFacilityClick && onFacilityClick(f)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="facility-name">{f.name}</span>
                    <span className="license-number">#{f.license_number}</span>
                  </td>
                  <td>{f.city}</td>
                  <td>
                    <span
                      className="risk-score-badge"
                      style={{
                        backgroundColor: f.riskAssessment.score > 80 ? RISK_COLORS.critical :
                          f.riskAssessment.score > 50 ? RISK_COLORS.high : RISK_COLORS.moderate
                      }}
                    >
                      {f.riskAssessment.score}
                    </span>
                  </td>
                  <td>{f.riskAssessment.flagCount} flags</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data Quality */}
      <div className="data-quality-section">
        <h4>Data Quality</h4>
        <div className="quality-bars">
          <div className="quality-item">
            <span className="quality-label">DHS Verified</span>
            <div className="quality-bar">
              <div
                className="quality-fill verified"
                style={{ width: `${(analytics.enrichedCount / analytics.totalFacilities) * 100}%` }}
              />
            </div>
            <span className="quality-value">
              {Math.round((analytics.enrichedCount / analytics.totalFacilities) * 100)}%
            </span>
          </div>
          <div className="quality-item">
            <span className="quality-label">Estimated Capacity</span>
            <div className="quality-bar">
              <div
                className="quality-fill estimated"
                style={{ width: `${(analytics.estimatedCapacityCount / analytics.totalFacilities) * 100}%` }}
              />
            </div>
            <span className="quality-value">
              {Math.round((analytics.estimatedCapacityCount / analytics.totalFacilities) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
