import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map,
  Layers,
  AlertTriangle,
  Building,
  DollarSign,
  Filter
} from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Heat layer component using canvas
const HeatLayer = ({ points, options }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Create canvas-based heat visualization
    const canvas = L.canvas({ padding: 0.5 });

    // Create a layer group for heat circles
    const heatGroup = L.layerGroup();

    points.forEach(point => {
      const [lat, lng, intensity] = point;
      const radius = Math.max(10, Math.min(50, intensity * 2));
      const opacity = Math.min(0.7, 0.2 + intensity / 100);

      // Color based on intensity
      let color;
      if (intensity > 70) color = '#ef4444'; // red
      else if (intensity > 50) color = '#f97316'; // orange
      else if (intensity > 30) color = '#eab308'; // yellow
      else color = '#22c55e'; // green

      const circle = L.circleMarker([lat, lng], {
        radius: radius,
        fillColor: color,
        fillOpacity: opacity,
        stroke: false,
        renderer: canvas
      });

      heatGroup.addLayer(circle);
    });

    heatGroup.addTo(map);

    return () => {
      map.removeLayer(heatGroup);
    };
  }, [map, points, options]);

  return null;
};

// Map bounds updater
const MapBoundsUpdater = ({ facilities }) => {
  const map = useMap();

  useEffect(() => {
    if (!facilities || facilities.length === 0) return;

    const validFacilities = facilities.filter(f => f.latitude && f.longitude);
    if (validFacilities.length === 0) return;

    const bounds = L.latLngBounds(
      validFacilities.map(f => [f.latitude, f.longitude])
    );

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, facilities]);

  return null;
};

/**
 * HeatMap - Geographic visualization of facility data
 *
 * Shows facility distribution, risk levels, and density patterns
 */
const HeatMap = ({ facilities, onFacilityClick }) => {
  const [viewMode, setViewMode] = useState('risk'); // risk, density, capacity
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [riskFilter, setRiskFilter] = useState('all'); // all, high, critical

  // Default center (Minneapolis for MN, or first facility location)
  const defaultCenter = useMemo(() => {
    const validFacility = facilities.find(f => f.latitude && f.longitude);
    if (validFacility) {
      return [validFacility.latitude, validFacility.longitude];
    }
    return [44.9778, -93.2650]; // Minneapolis default
  }, [facilities]);

  // Process facilities for mapping
  const mappableFacilities = useMemo(() => {
    return facilities.filter(f => {
      if (!f.latitude || !f.longitude) return false;
      if (riskFilter === 'high') return f.riskAssessment?.score > 50;
      if (riskFilter === 'critical') return f.riskAssessment?.score > 80;
      return true;
    });
  }, [facilities, riskFilter]);

  // Generate heat points based on view mode
  const heatPoints = useMemo(() => {
    return mappableFacilities.map(f => {
      let intensity;
      switch (viewMode) {
        case 'risk':
          intensity = f.riskAssessment?.score || 0;
          break;
        case 'capacity':
          intensity = Math.min(100, (f.capacity || 0) / 2);
          break;
        case 'density':
        default:
          intensity = 30; // Fixed intensity for density view
          break;
      }
      return [f.latitude, f.longitude, intensity];
    });
  }, [mappableFacilities, viewMode]);

  // Get marker color based on risk
  const getMarkerColor = (facility) => {
    const score = facility.riskAssessment?.score || 0;
    if (score > 80) return '#ef4444'; // red - critical
    if (score > 50) return '#f97316'; // orange - high
    if (score > 20) return '#eab308'; // yellow - moderate
    return '#22c55e'; // green - low
  };

  // Stats for the current view
  const stats = useMemo(() => {
    const total = mappableFacilities.length;
    const highRisk = mappableFacilities.filter(f => f.riskAssessment?.score > 50).length;
    const critical = mappableFacilities.filter(f => f.riskAssessment?.score > 80).length;
    const totalCapacity = mappableFacilities.reduce((sum, f) => sum + (f.capacity || 0), 0);

    return { total, highRisk, critical, totalCapacity };
  }, [mappableFacilities]);

  // Count facilities without coordinates
  const missingCoords = facilities.length - facilities.filter(f => f.latitude && f.longitude).length;

  if (facilities.length === 0) {
    return (
      <div className="heat-map-container">
        <div className="no-data-message">
          <Map size={48} />
          <h3>No Facilities to Map</h3>
          <p>Load facility data to view the geographic distribution.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="heat-map-container">
      {/* Controls Header */}
      <div className="map-controls">
        <div className="control-group">
          <label><Layers size={14} /> View Mode</label>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value="risk">Risk Score</option>
            <option value="density">Facility Density</option>
            <option value="capacity">Capacity</option>
          </select>
        </div>

        <div className="control-group">
          <label><Filter size={14} /> Risk Filter</label>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="all">All Facilities</option>
            <option value="high">High Risk (50+)</option>
            <option value="critical">Critical (80+)</option>
          </select>
        </div>

        <div className="control-group checkboxes">
          <label>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
            />
            Heat overlay
          </label>
          <label>
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
            />
            Markers
          </label>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="map-stats">
        <div className="map-stat">
          <Building size={14} />
          <span>{stats.total} mapped</span>
        </div>
        <div className="map-stat warning">
          <AlertTriangle size={14} />
          <span>{stats.highRisk} high risk</span>
        </div>
        <div className="map-stat danger">
          <AlertTriangle size={14} />
          <span>{stats.critical} critical</span>
        </div>
        <div className="map-stat">
          <DollarSign size={14} />
          <span>{stats.totalCapacity.toLocaleString()} capacity</span>
        </div>
        {missingCoords > 0 && (
          <div className="map-stat muted">
            <span>{missingCoords} without coordinates</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="map-wrapper">
        {mappableFacilities.length > 0 ? (
          <MapContainer
            center={defaultCenter}
            zoom={10}
            style={{ height: '500px', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapBoundsUpdater facilities={mappableFacilities} />

            {/* Heat layer */}
            {showHeatmap && heatPoints.length > 0 && (
              <HeatLayer
                points={heatPoints}
                options={{ radius: 25, blur: 15, maxZoom: 17 }}
              />
            )}

            {/* Individual markers */}
            {showMarkers && mappableFacilities.map(facility => (
              <CircleMarker
                key={facility.license_number}
                center={[facility.latitude, facility.longitude]}
                radius={6}
                pathOptions={{
                  fillColor: getMarkerColor(facility),
                  fillOpacity: 0.8,
                  color: '#fff',
                  weight: 1
                }}
                eventHandlers={{
                  click: () => onFacilityClick && onFacilityClick(facility)
                }}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{facility.name}</strong>
                    <p>{facility.address}, {facility.city}</p>
                    <p>
                      <span>Capacity: {facility.capacity || 'N/A'}</span>
                      {facility.riskAssessment && (
                        <span className={`risk-badge-small ${facility.riskAssessment.level.name}`}>
                          Risk: {facility.riskAssessment.score}
                        </span>
                      )}
                    </p>
                    <button
                      className="popup-details-btn"
                      onClick={() => onFacilityClick && onFacilityClick(facility)}
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <div className="no-coords-message">
            <Map size={48} />
            <h4>No Geocoded Facilities</h4>
            <p>
              {facilities.length} facilities found but none have latitude/longitude coordinates.
              Geographic visualization requires geocoded data.
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="map-legend">
        <h5>Risk Level Legend</h5>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#22c55e' }}></span>
            <span>Low (0-20)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#eab308' }}></span>
            <span>Moderate (21-50)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#f97316' }}></span>
            <span>High (51-80)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
            <span>Critical (81+)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatMap;
