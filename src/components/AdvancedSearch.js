import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  MapPin,
  Building
} from 'lucide-react';

/**
 * AdvancedSearch - Enhanced filtering for facilities
 */
const AdvancedSearch = ({ facilities, onFilteredResults, counties }) => {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: '',
    ownerSearch: '',
    addressSearch: '',
    minCapacity: '',
    maxCapacity: '',
    facilityTypes: [],
    statuses: [],
    hasViolations: false,
    hasMaltreatment: false,
    minRiskScore: '',
    county: '',
    enrichedOnly: false,
    hasMultipleFacilities: false,
    hideSchoolPrograms: false,
  });

  // Get unique values for filters
  const facilityTypes = [...new Set(facilities.map(f => f.facility_type).filter(Boolean))].sort();
  const statuses = [...new Set(facilities.map(f => f.status).filter(Boolean))].sort();
  const countyNames = counties ? counties.map(c => c.name).sort() : [];

  // Apply filters
  useEffect(() => {
    let filtered = [...facilities];

    // Text search (name)
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        (f.name || '').toLowerCase().includes(term) ||
        (f.license_number || '').includes(term)
      );
    }

    // Owner search
    if (filters.ownerSearch) {
      const term = filters.ownerSearch.toLowerCase();
      filtered = filtered.filter(f =>
        (f.license_holder || '').toLowerCase().includes(term)
      );
    }

    // Address search
    if (filters.addressSearch) {
      const term = filters.addressSearch.toLowerCase();
      filtered = filtered.filter(f =>
        (f.address || '').toLowerCase().includes(term) ||
        (f.city || '').toLowerCase().includes(term)
      );
    }

    // Capacity range
    if (filters.minCapacity) {
      filtered = filtered.filter(f => (f.capacity || 0) >= parseInt(filters.minCapacity));
    }
    if (filters.maxCapacity) {
      filtered = filtered.filter(f => (f.capacity || 0) <= parseInt(filters.maxCapacity));
    }

    // Facility types
    if (filters.facilityTypes.length > 0) {
      filtered = filtered.filter(f => filters.facilityTypes.includes(f.facility_type));
    }

    // Statuses
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(f => filters.statuses.includes(f.status));
    }

    // Has violations
    if (filters.hasViolations) {
      filtered = filtered.filter(f => (f.total_citations || 0) > 0 || (f.visits_with_violations || 0) > 0);
    }

    // Has maltreatment
    if (filters.hasMaltreatment) {
      filtered = filtered.filter(f => f.has_maltreatment || f.maltreatment_info);
    }

    // Minimum risk score
    if (filters.minRiskScore) {
      filtered = filtered.filter(f =>
        f.riskAssessment && f.riskAssessment.score >= parseInt(filters.minRiskScore)
      );
    }

    // County
    if (filters.county) {
      filtered = filtered.filter(f => f.county === filters.county);
    }

    // DHS enriched only
    if (filters.enrichedOnly) {
      filtered = filtered.filter(f => f.dhs_enriched);
    }

    // Hide school-based programs (before/after care at public schools)
    if (filters.hideSchoolPrograms) {
      filtered = filtered.filter(f => {
        const name = (f.name || '').toLowerCase();
        // Match patterns like "@ Elementary", "Before Care", "After Care", "Extended Day"
        const isSchoolProgram =
          /@\s*\w+.*(?:elementary|middle|high|school|ES|MS|HS)/i.test(f.name) ||
          /\b(?:before|after)\s*(?:care|school)/i.test(name) ||
          /\bextended\s*day\b/i.test(name) ||
          /\bschool.?s?\s*out\b/i.test(name) ||
          /\bkids?\s*club\s*at\b/i.test(name);
        return !isSchoolProgram;
      });
    }

    // Check if any filters are actually applied
    const hasActiveFilters =
      filters.searchTerm ||
      filters.ownerSearch ||
      filters.addressSearch ||
      filters.minCapacity ||
      filters.maxCapacity ||
      filters.facilityTypes.length > 0 ||
      filters.statuses.length > 0 ||
      filters.hasViolations ||
      filters.hasMaltreatment ||
      filters.minRiskScore ||
      filters.county ||
      filters.enrichedOnly ||
      filters.hideSchoolPrograms;

    // Pass null when no filters active, otherwise pass the filtered array
    onFilteredResults(hasActiveFilters ? filtered : null);
  }, [filters, facilities, onFilteredResults]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiSelect = (key, value) => {
    setFilters(prev => {
      const current = prev[key];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [key]: [...current, value] };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      ownerSearch: '',
      addressSearch: '',
      minCapacity: '',
      maxCapacity: '',
      facilityTypes: [],
      statuses: [],
      hasViolations: false,
      hasMaltreatment: false,
      minRiskScore: '',
      county: '',
      enrichedOnly: false,
      hasMultipleFacilities: false,
      hideSchoolPrograms: false,
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return value !== '';
  }).length;

  return (
    <div className="advanced-search">
      {/* Quick Search Bar */}
      <div className="search-bar-row">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by facility name or license number..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          />
          {filters.searchTerm && (
            <button className="clear-input" onClick={() => handleFilterChange('searchTerm', '')}>
              <X size={16} />
            </button>
          )}
        </div>

        <button
          className={`filter-toggle ${expanded ? 'active' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          <Filter size={18} />
          Advanced Filters
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {activeFilterCount > 0 && (
          <button className="clear-all-btn" onClick={clearFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {expanded && (
        <div className="filters-panel">
          <div className="filters-grid">
            {/* Owner Search */}
            <div className="filter-group">
              <label><Users size={14} /> Owner/License Holder</label>
              <input
                type="text"
                placeholder="Search by owner name..."
                value={filters.ownerSearch}
                onChange={(e) => handleFilterChange('ownerSearch', e.target.value)}
              />
            </div>

            {/* Address Search */}
            <div className="filter-group">
              <label><MapPin size={14} /> Address/City</label>
              <input
                type="text"
                placeholder="Search by address or city..."
                value={filters.addressSearch}
                onChange={(e) => handleFilterChange('addressSearch', e.target.value)}
              />
            </div>

            {/* Capacity Range */}
            <div className="filter-group">
              <label>Capacity Range</label>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minCapacity}
                  onChange={(e) => handleFilterChange('minCapacity', e.target.value)}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxCapacity}
                  onChange={(e) => handleFilterChange('maxCapacity', e.target.value)}
                />
              </div>
            </div>

            {/* Risk Score */}
            <div className="filter-group">
              <label><AlertTriangle size={14} /> Minimum Risk Score</label>
              <input
                type="number"
                placeholder="e.g., 50"
                value={filters.minRiskScore}
                onChange={(e) => handleFilterChange('minRiskScore', e.target.value)}
              />
            </div>

            {/* County */}
            {countyNames.length > 0 && (
              <div className="filter-group">
                <label>County</label>
                <select
                  value={filters.county}
                  onChange={(e) => handleFilterChange('county', e.target.value)}
                >
                  <option value="">All Counties</option>
                  {countyNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Facility Type */}
            <div className="filter-group full-width">
              <label><Building size={14} /> Facility Types</label>
              <div className="checkbox-group">
                {facilityTypes.map(type => (
                  <label key={type} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.facilityTypes.includes(type)}
                      onChange={() => handleMultiSelect('facilityTypes', type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="filter-group">
              <label>License Status</label>
              <div className="checkbox-group">
                {statuses.map(status => (
                  <label key={status} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status)}
                      onChange={() => handleMultiSelect('statuses', status)}
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>

            {/* Boolean Filters */}
            <div className="filter-group">
              <label>Investigation Flags</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.hasViolations}
                    onChange={(e) => handleFilterChange('hasViolations', e.target.checked)}
                  />
                  Has violations
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.hasMaltreatment}
                    onChange={(e) => handleFilterChange('hasMaltreatment', e.target.checked)}
                  />
                  Has maltreatment record
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.enrichedOnly}
                    onChange={(e) => handleFilterChange('enrichedOnly', e.target.checked)}
                  />
                  DHS verified data only
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.hideSchoolPrograms}
                    onChange={(e) => handleFilterChange('hideSchoolPrograms', e.target.checked)}
                  />
                  Hide school-based programs
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
