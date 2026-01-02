import React, { useState, useMemo } from 'react';
import {
  Network,
  Building,
  Phone,
  MapPin,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { analyzeNetworks } from '../utils/networkAnalysis';

/**
 * NetworkAnalysisPanel - Visualizes connections between facilities
 *
 * Shows owner networks, shared addresses, shared phones, and similar names
 * to help identify potential shell company operations.
 */
const NetworkAnalysisPanel = ({ facilities, onFacilityClick }) => {
  const [activeTab, setActiveTab] = useState('owners');
  const [expandedNetworks, setExpandedNetworks] = useState(new Set());

  const analysis = useMemo(() => {
    if (!facilities || facilities.length === 0) return null;
    return analyzeNetworks(facilities);
  }, [facilities]);

  if (!analysis) {
    return (
      <div className="network-panel">
        <p className="no-data">No facility data available for network analysis.</p>
      </div>
    );
  }

  const toggleNetwork = (id) => {
    const newExpanded = new Set(expandedNetworks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNetworks(newExpanded);
  };

  const { ownerNetworks, addressNetworks, phoneNetworks, similarNames, stats } = analysis;

  const tabs = [
    { id: 'owners', label: 'Owner Networks', icon: <Users size={16} />, count: ownerNetworks.length },
    { id: 'addresses', label: 'Shared Addresses', icon: <MapPin size={16} />, count: addressNetworks.length },
    { id: 'phones', label: 'Shared Phones', icon: <Phone size={16} />, count: phoneNetworks.length },
    { id: 'names', label: 'Similar Names', icon: <Building size={16} />, count: similarNames.length },
  ];

  const renderOwnerNetworks = () => (
    <div className="network-list">
      {ownerNetworks.length === 0 ? (
        <p className="no-data">No multi-facility owner networks detected.</p>
      ) : (
        ownerNetworks.slice(0, 20).map((network, idx) => (
          <div key={idx} className={`network-card ${network.score > 30 ? 'high-risk' : ''}`}>
            <div
              className="network-header"
              onClick={() => toggleNetwork(`owner-${idx}`)}
            >
              <div className="network-title">
                {expandedNetworks.has(`owner-${idx}`) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <strong>{network.owner}</strong>
                <span className="network-count">{network.facilityCount} facilities</span>
              </div>
              {network.score > 0 && (
                <span className="risk-indicator" style={{ backgroundColor: network.score > 30 ? '#ef4444' : '#f97316' }}>
                  Risk: {network.score}
                </span>
              )}
            </div>

            {expandedNetworks.has(`owner-${idx}`) && (
              <div className="network-details">
                <div className="network-stats">
                  <span><Users size={14} /> Total Capacity: {network.totalCapacity}</span>
                  <span><MapPin size={14} /> {network.cities.length} cities</span>
                </div>

                {network.flags && network.flags.length > 0 && (
                  <div className="network-flags">
                    {network.flags.map((flag, i) => (
                      <div key={i} className="flag-item">
                        <AlertTriangle size={14} />
                        {flag.message}
                      </div>
                    ))}
                  </div>
                )}

                <div className="facility-list">
                  <h5>Facilities:</h5>
                  {network.facilities.map((f, i) => (
                    <div
                      key={i}
                      className="facility-item clickable"
                      onClick={() => onFacilityClick && onFacilityClick(f)}
                    >
                      <span className="facility-name">{f.name}</span>
                      <span className="facility-address">{f.city}</span>
                      <span className="facility-capacity">Cap: {f.capacity || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderAddressNetworks = () => (
    <div className="network-list">
      {addressNetworks.length === 0 ? (
        <p className="no-data">No shared address locations detected.</p>
      ) : (
        addressNetworks.slice(0, 20).map((network, idx) => (
          <div key={idx} className={`network-card ${network.multipleOwners ? 'warning' : ''}`}>
            <div
              className="network-header"
              onClick={() => toggleNetwork(`addr-${idx}`)}
            >
              <div className="network-title">
                {expandedNetworks.has(`addr-${idx}`) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <MapPin size={16} />
                <strong>{network.address}</strong>
                <span className="network-count">{network.facilityCount} facilities</span>
              </div>
              {network.multipleOwners && (
                <span className="warning-badge">Multiple Owners</span>
              )}
            </div>

            {expandedNetworks.has(`addr-${idx}`) && (
              <div className="network-details">
                <p className="address-city">{network.city}</p>
                <p className="total-capacity">Combined Capacity: {network.totalCapacity}</p>

                {network.owners.length > 1 && (
                  <div className="owners-list">
                    <strong>Different Owners at this Address:</strong>
                    <ul>
                      {network.owners.map((owner, i) => (
                        <li key={i}>{owner}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="facility-list">
                  <h5>Licenses at this Address:</h5>
                  {network.facilities.map((f, i) => (
                    <div
                      key={i}
                      className="facility-item clickable"
                      onClick={() => onFacilityClick && onFacilityClick(f)}
                    >
                      <span className="facility-name">{f.name}</span>
                      <span className="facility-license">#{f.license_number}</span>
                      <span className="facility-status">{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderPhoneNetworks = () => (
    <div className="network-list">
      {phoneNetworks.length === 0 ? (
        <p className="no-data">No shared phone numbers detected.</p>
      ) : (
        phoneNetworks.slice(0, 20).map((network, idx) => (
          <div key={idx} className={`network-card ${network.differentAddresses ? 'warning' : ''}`}>
            <div
              className="network-header"
              onClick={() => toggleNetwork(`phone-${idx}`)}
            >
              <div className="network-title">
                {expandedNetworks.has(`phone-${idx}`) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <Phone size={16} />
                <strong>{network.phone}</strong>
                <span className="network-count">{network.facilityCount} facilities</span>
              </div>
              {network.differentAddresses && (
                <span className="warning-badge">Different Addresses</span>
              )}
            </div>

            {expandedNetworks.has(`phone-${idx}`) && (
              <div className="network-details">
                <div className="facility-list">
                  {network.facilities.map((f, i) => (
                    <div
                      key={i}
                      className="facility-item clickable"
                      onClick={() => onFacilityClick && onFacilityClick(f)}
                    >
                      <span className="facility-name">{f.name}</span>
                      <span className="facility-address">{f.address}, {f.city}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderSimilarNames = () => (
    <div className="network-list">
      {similarNames.length === 0 ? (
        <p className="no-data">No similar name patterns detected.</p>
      ) : (
        similarNames.slice(0, 20).map((group, idx) => (
          <div key={idx} className="network-card">
            <div
              className="network-header"
              onClick={() => toggleNetwork(`name-${idx}`)}
            >
              <div className="network-title">
                {expandedNetworks.has(`name-${idx}`) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <Building size={16} />
                <strong>"{group.baseName}" pattern</strong>
                <span className="network-count">{group.count} similar</span>
              </div>
            </div>

            {expandedNetworks.has(`name-${idx}`) && (
              <div className="network-details">
                <div className="facility-list">
                  {group.facilities.map((f, i) => (
                    <div
                      key={i}
                      className="facility-item clickable"
                      onClick={() => onFacilityClick && onFacilityClick(f)}
                    >
                      <span className="facility-name">{f.name}</span>
                      <span className="facility-address">{f.city}</span>
                      {f.similarity && (
                        <span className="similarity-score">{Math.round(f.similarity * 100)}% match</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="network-panel">
      <div className="network-panel-header">
        <h3><Network size={20} /> Network Analysis</h3>
        <p className="panel-description">
          Identify potential shell company networks by analyzing shared owners, addresses, and phone numbers.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="network-summary">
        <div className="summary-stat">
          <span className="stat-value">{stats.facilitiesInOwnerNetworks}</span>
          <span className="stat-label">In owner networks</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{stats.addressesWithMultipleFacilities}</span>
          <span className="stat-label">Shared addresses</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{stats.phonesSharedByMultipleFacilities}</span>
          <span className="stat-label">Shared phones</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{stats.largestOwnerNetwork}</span>
          <span className="stat-label">Largest network</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="network-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`network-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="network-content">
        {activeTab === 'owners' && renderOwnerNetworks()}
        {activeTab === 'addresses' && renderAddressNetworks()}
        {activeTab === 'phones' && renderPhoneNetworks()}
        {activeTab === 'names' && renderSimilarNames()}
      </div>
    </div>
  );
};

export default NetworkAnalysisPanel;
