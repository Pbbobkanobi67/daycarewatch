import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  AlertTriangle,
  Building,
  MapPin,
  Calendar,
  Trash2,
  Download,
  ExternalLink,
  Shield,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';

// Local storage key
const TIPS_STORAGE_KEY = 'daycarewatch_community_tips';

// Tip categories
const TIP_CATEGORIES = [
  { value: 'safety', label: 'Safety Concern', icon: AlertTriangle },
  { value: 'fraud', label: 'Suspected Fraud', icon: Shield },
  { value: 'capacity', label: 'Overcapacity', icon: Building },
  { value: 'staffing', label: 'Staffing Issues', icon: Eye },
  { value: 'conditions', label: 'Poor Conditions', icon: MapPin },
  { value: 'other', label: 'Other', icon: MessageSquare }
];

// Reporting resources
const REPORTING_RESOURCES = {
  minnesota: [
    {
      name: 'MN DHS Licensing Complaint',
      phone: '651-431-6500',
      url: 'https://mn.gov/dhs/people-we-serve/children-and-families/services/child-care/',
      description: 'Report licensing violations to MN Department of Human Services'
    },
    {
      name: 'Child Protection Hotline',
      phone: '1-800-422-4453',
      description: 'National child abuse hotline (24/7)'
    },
    {
      name: 'MN Office of Inspector General',
      url: 'https://mn.gov/dhs/general-public/about-dhs/office-of-inspector-general/',
      description: 'Report fraud, waste, or abuse in DHS programs'
    },
    {
      name: 'FBI Tips',
      url: 'https://tips.fbi.gov/',
      description: 'Report federal crimes including large-scale fraud'
    }
  ],
  california: [
    {
      name: 'CA Community Care Licensing',
      phone: '1-844-538-8766',
      url: 'https://www.cdss.ca.gov/inforesources/community-care-licensing',
      description: 'Report licensing violations to CA CCLD'
    },
    {
      name: 'Child Protection Hotline',
      phone: '1-800-422-4453',
      description: 'National child abuse hotline (24/7)'
    }
  ]
};

/**
 * CommunityTips - Submit and manage tips about facilities
 */
const CommunityTips = ({ facilities, selectedFacility, stateId, onFacilitySelect }) => {
  const [tips, setTips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [formData, setFormData] = useState({
    facilityLicense: selectedFacility?.license_number || '',
    facilityName: selectedFacility?.name || '',
    category: 'safety',
    description: '',
    dateObserved: '',
    isAnonymous: true,
    contactEmail: ''
  });

  // Load tips from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TIPS_STORAGE_KEY);
    if (stored) {
      try {
        setTips(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading tips:', e);
      }
    }
  }, []);

  // Save tips to localStorage
  const saveTips = (newTips) => {
    localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(newTips));
    setTips(newTips);
  };

  // Update form when facility changes
  useEffect(() => {
    if (selectedFacility) {
      setFormData(prev => ({
        ...prev,
        facilityLicense: selectedFacility.license_number || '',
        facilityName: selectedFacility.name || ''
      }));
    }
  }, [selectedFacility]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle facility selection from dropdown
  const handleFacilitySelect = (e) => {
    const license = e.target.value;
    const facility = facilities.find(f => f.license_number === license);
    if (facility) {
      setFormData(prev => ({
        ...prev,
        facilityLicense: facility.license_number,
        facilityName: facility.name
      }));
    }
  };

  // Submit tip
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      alert('Please provide a description of your concern.');
      return;
    }

    const newTip = {
      id: Date.now().toString(),
      ...formData,
      submittedAt: new Date().toISOString(),
      status: 'pending' // pending, submitted, resolved
    };

    const newTips = [newTip, ...tips];
    saveTips(newTips);

    // Reset form
    setFormData({
      facilityLicense: '',
      facilityName: '',
      category: 'safety',
      description: '',
      dateObserved: '',
      isAnonymous: true,
      contactEmail: ''
    });
    setShowForm(false);

    alert('Your tip has been saved locally. Use the export feature or contact authorities directly to report your concerns.');
  };

  // Delete tip
  const handleDeleteTip = (tipId) => {
    if (window.confirm('Are you sure you want to delete this tip?')) {
      const newTips = tips.filter(t => t.id !== tipId);
      saveTips(newTips);
    }
  };

  // Export tips
  const handleExportTips = () => {
    if (tips.length === 0) {
      alert('No tips to export.');
      return;
    }

    const exportData = tips.map(tip => ({
      ...tip,
      facility: facilities.find(f => f.license_number === tip.facilityLicense)
    }));

    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daycarewatch_tips_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate email body for tip
  const generateEmailBody = (tip) => {
    const facility = facilities.find(f => f.license_number === tip.facilityLicense);
    return encodeURIComponent(`
Facility Concern Report

Facility: ${tip.facilityName}
License #: ${tip.facilityLicense}
Address: ${facility?.address || 'N/A'}, ${facility?.city || ''}, ${facility?.state || ''}

Category: ${TIP_CATEGORIES.find(c => c.value === tip.category)?.label || tip.category}
Date Observed: ${tip.dateObserved || 'Not specified'}

Description:
${tip.description}

---
Submitted via DaycareWatch
https://daycarewatch.vercel.app
    `.trim());
  };

  // Get resources for current state
  const resources = REPORTING_RESOURCES[stateId] || REPORTING_RESOURCES.minnesota;

  // Get category info
  const getCategoryInfo = (categoryValue) => {
    return TIP_CATEGORIES.find(c => c.value === categoryValue) || TIP_CATEGORIES[5];
  };

  return (
    <div className="community-tips">
      <div className="tips-header">
        <h3><MessageSquare size={20} /> Community Tips</h3>
        <p className="tips-intro">
          Help keep children safe by reporting concerns about childcare facilities.
          Tips are stored locally on your device. Contact authorities directly for urgent concerns.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="tips-actions">
        <button
          className={`tips-btn primary ${showForm ? 'active' : ''}`}
          onClick={() => setShowForm(!showForm)}
        >
          <Send size={18} />
          {showForm ? 'Cancel' : 'Submit a Tip'}
        </button>
        <button
          className={`tips-btn secondary ${showResources ? 'active' : ''}`}
          onClick={() => setShowResources(!showResources)}
        >
          <Phone size={18} />
          Reporting Resources
        </button>
        {tips.length > 0 && (
          <button className="tips-btn secondary" onClick={handleExportTips}>
            <Download size={18} />
            Export Tips ({tips.length})
          </button>
        )}
      </div>

      {/* Reporting Resources */}
      {showResources && (
        <div className="resources-panel">
          <h4><Shield size={16} /> Official Reporting Channels</h4>
          <p className="resources-note">
            For urgent safety concerns, contact these agencies directly:
          </p>
          <div className="resources-grid">
            {resources.map((resource, idx) => (
              <div key={idx} className="resource-card">
                <h5>{resource.name}</h5>
                <p>{resource.description}</p>
                <div className="resource-contacts">
                  {resource.phone && (
                    <a href={`tel:${resource.phone}`} className="resource-link">
                      <Phone size={14} /> {resource.phone}
                    </a>
                  )}
                  {resource.url && (
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                      <ExternalLink size={14} /> Visit Website
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip Submission Form */}
      {showForm && (
        <form className="tip-form" onSubmit={handleSubmit}>
          <h4>Submit a Concern</h4>

          <div className="form-row">
            <div className="form-group">
              <label><Building size={14} /> Facility</label>
              <select
                name="facilityLicense"
                value={formData.facilityLicense}
                onChange={handleFacilitySelect}
              >
                <option value="">Select a facility...</option>
                {facilities.map(f => (
                  <option key={f.license_number} value={f.license_number}>
                    {f.name} - {f.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label><AlertTriangle size={14} /> Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                {TIP_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label><Calendar size={14} /> Date Observed (optional)</label>
            <input
              type="date"
              name="dateObserved"
              value={formData.dateObserved}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label><MessageSquare size={14} /> Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe what you observed or your concern. Be as specific as possible (times, dates, locations, etc.)..."
              rows={5}
              required
            />
          </div>

          <div className="form-group checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isAnonymous"
                checked={formData.isAnonymous}
                onChange={handleInputChange}
              />
              {formData.isAnonymous ? <EyeOff size={14} /> : <Eye size={14} />}
              Submit anonymously
            </label>
          </div>

          {!formData.isAnonymous && (
            <div className="form-group">
              <label><Mail size={14} /> Contact Email (optional)</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                placeholder="your@email.com"
              />
            </div>
          )}

          <div className="form-disclaimer">
            <Info size={14} />
            <p>
              Tips are stored locally on your device only. To report to authorities,
              use the "Reporting Resources" above or export your tips.
            </p>
          </div>

          <div className="form-actions">
            <button type="submit" className="tips-btn primary">
              <Send size={16} /> Save Tip
            </button>
            <button type="button" className="tips-btn secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Saved Tips */}
      {tips.length > 0 && (
        <div className="saved-tips">
          <h4>Your Saved Tips ({tips.length})</h4>
          <div className="tips-list">
            {tips.map(tip => {
              const category = getCategoryInfo(tip.category);
              const CategoryIcon = category.icon;
              const facility = facilities.find(f => f.license_number === tip.facilityLicense);

              return (
                <div key={tip.id} className="tip-card">
                  <div className="tip-header">
                    <div className="tip-category">
                      <CategoryIcon size={16} />
                      <span>{category.label}</span>
                    </div>
                    <div className="tip-date">
                      {new Date(tip.submittedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="tip-facility">
                    <Building size={14} />
                    <strong>{tip.facilityName}</strong>
                    {facility && (
                      <span className="tip-address">
                        {facility.city}, {facility.state}
                      </span>
                    )}
                  </div>

                  <p className="tip-description">{tip.description}</p>

                  {tip.dateObserved && (
                    <div className="tip-observed">
                      <Calendar size={12} /> Observed: {tip.dateObserved}
                    </div>
                  )}

                  <div className="tip-actions">
                    <a
                      href={`mailto:?subject=Facility Concern: ${tip.facilityName}&body=${generateEmailBody(tip)}`}
                      className="tip-action-btn"
                    >
                      <Mail size={14} /> Email Report
                    </a>
                    <button
                      className="tip-action-btn"
                      onClick={() => onFacilitySelect && facility && onFacilitySelect(facility)}
                    >
                      <Eye size={14} /> View Facility
                    </button>
                    <button
                      className="tip-action-btn danger"
                      onClick={() => handleDeleteTip(tip.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tips.length === 0 && !showForm && (
        <div className="tips-empty">
          <MessageSquare size={48} />
          <h4>No Tips Yet</h4>
          <p>
            Submit tips about facilities you're concerned about.
            Your tips are stored privately on your device.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommunityTips;
