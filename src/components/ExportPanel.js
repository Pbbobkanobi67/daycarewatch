import React, { useState } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Filter,
  CheckSquare,
  AlertTriangle,
  Building,
  Printer
} from 'lucide-react';

/**
 * ExportPanel - Export facility data in various formats
 *
 * Supports CSV, JSON, and printable report generation
 */
const ExportPanel = ({ facilities, watchlist, countyName, stateName }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('all'); // all, filtered, watchlist, flagged
  const [includeFields, setIncludeFields] = useState({
    basic: true,
    contact: true,
    compliance: true,
    risk: true
  });
  const [isExporting, setIsExporting] = useState(false);

  // Field groups for export
  const fieldGroups = {
    basic: ['license_number', 'name', 'facility_type', 'address', 'city', 'state', 'zip_code', 'county', 'capacity', 'status'],
    contact: ['phone', 'license_holder'],
    compliance: ['total_visits', 'total_citations', 'visits_with_violations', 'last_inspection_date', 'has_maltreatment', 'maltreatment_info'],
    risk: ['riskScore', 'riskLevel', 'flagCount']
  };

  // Get facilities based on scope
  const getExportData = () => {
    let data = [];

    switch (exportScope) {
      case 'watchlist':
        // Get watchlist facilities
        const watchlistIds = new Set(watchlist.map(w => w.license_number));
        data = facilities.filter(f => watchlistIds.has(f.license_number));
        break;
      case 'flagged':
        data = facilities.filter(f => f.riskAssessment?.score > 50);
        break;
      case 'all':
      default:
        data = facilities;
        break;
    }

    return data;
  };

  // Format facility for export
  const formatFacility = (facility) => {
    const formatted = {};

    if (includeFields.basic) {
      fieldGroups.basic.forEach(field => {
        formatted[field] = facility[field] ?? '';
      });
    }

    if (includeFields.contact) {
      fieldGroups.contact.forEach(field => {
        formatted[field] = facility[field] ?? '';
      });
    }

    if (includeFields.compliance) {
      formatted.total_visits = facility.total_visits ?? '';
      formatted.total_citations = facility.total_citations ?? '';
      formatted.visits_with_violations = facility.visits_with_violations ?? '';
      formatted.last_inspection_date = facility.last_inspection_date ?? '';
      formatted.has_maltreatment = facility.has_maltreatment ? 'Yes' : 'No';
      formatted.maltreatment_info = facility.maltreatment_info ?? '';
    }

    if (includeFields.risk) {
      formatted.riskScore = facility.riskAssessment?.score ?? '';
      formatted.riskLevel = facility.riskAssessment?.level?.name ?? '';
      formatted.flagCount = facility.riskAssessment?.flagCount ?? '';
    }

    return formatted;
  };

  // Export as CSV
  const exportCSV = (data) => {
    if (data.length === 0) return '';

    const formatted = data.map(formatFacility);
    const headers = Object.keys(formatted[0]);

    const csvRows = [
      headers.join(','),
      ...formatted.map(row =>
        headers.map(header => {
          const value = row[header]?.toString() || '';
          // Escape quotes and wrap in quotes if contains comma or quote
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  };

  // Export as JSON
  const exportJSON = (data) => {
    const formatted = data.map(formatFacility);
    return JSON.stringify(formatted, null, 2);
  };

  // Generate printable HTML report
  const generateHTMLReport = (data) => {
    const timestamp = new Date().toLocaleString();
    const flaggedCount = data.filter(f => f.riskAssessment?.score > 50).length;
    const criticalCount = data.filter(f => f.riskAssessment?.score > 80).length;
    const totalCapacity = data.reduce((sum, f) => sum + (f.capacity || 0), 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DaycareWatch Report - ${countyName} County, ${stateName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a365d; }
    h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    h2 { color: #2c5282; margin-top: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .meta { color: #666; font-size: 0.9em; }
    .stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
    .stat { background: #f7fafc; padding: 15px 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 1.5em; font-weight: bold; color: #1a365d; }
    .stat-label { font-size: 0.85em; color: #666; }
    .stat.warning { background: #fef3c7; }
    .stat.danger { background: #fee2e2; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.85em; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #1a365d; color: white; }
    tr:hover { background: #f7fafc; }
    .risk-badge { padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em; }
    .risk-low { background: #c6f6d5; color: #22543d; }
    .risk-moderate { background: #fef3c7; color: #744210; }
    .risk-high { background: #fed7d7; color: #c53030; }
    .risk-critical { background: #c53030; color: white; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 0.8em; color: #666; }
    .disclaimer { background: #f7fafc; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 0.85em; }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DaycareWatch Facility Report</h1>
    <div class="meta">Generated: ${timestamp}</div>
  </div>

  <h2>${countyName} County, ${stateName}</h2>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${data.length}</div>
      <div class="stat-label">Total Facilities</div>
    </div>
    <div class="stat">
      <div class="stat-value">${totalCapacity.toLocaleString()}</div>
      <div class="stat-label">Total Capacity</div>
    </div>
    <div class="stat warning">
      <div class="stat-value">${flaggedCount}</div>
      <div class="stat-label">High Risk (50+)</div>
    </div>
    <div class="stat danger">
      <div class="stat-value">${criticalCount}</div>
      <div class="stat-label">Critical (80+)</div>
    </div>
  </div>

  <h2>Facility List</h2>
  <table>
    <thead>
      <tr>
        <th>License #</th>
        <th>Name</th>
        <th>Type</th>
        <th>Address</th>
        <th>City</th>
        <th>Capacity</th>
        <th>Status</th>
        <th>Risk</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(f => {
        const riskScore = f.riskAssessment?.score || 0;
        let riskClass = 'risk-low';
        if (riskScore > 80) riskClass = 'risk-critical';
        else if (riskScore > 50) riskClass = 'risk-high';
        else if (riskScore > 20) riskClass = 'risk-moderate';

        return `
          <tr>
            <td>${f.license_number || ''}</td>
            <td><strong>${f.name || ''}</strong></td>
            <td>${f.facility_type || ''}</td>
            <td>${f.address || ''}</td>
            <td>${f.city || ''}</td>
            <td>${f.capacity || 'N/A'}</td>
            <td>${f.status || ''}</td>
            <td><span class="risk-badge ${riskClass}">${riskScore}</span></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is generated from publicly available licensing data
    and does not constitute an official government document. Risk scores are calculated based on
    available data and should be verified with official sources. Inclusion in this report does not
    imply wrongdoing.
  </div>

  <div class="footer">
    <p>DaycareWatch - National Childcare Subsidy Transparency Project</p>
    <p>https://daycarewatch.vercel.app</p>
  </div>
</body>
</html>
    `;
  };

  // Handle export
  const handleExport = () => {
    setIsExporting(true);

    try {
      const data = getExportData();

      if (data.length === 0) {
        alert('No data to export for the selected scope.');
        setIsExporting(false);
        return;
      }

      let content, filename, mimeType;
      const dateStr = new Date().toISOString().split('T')[0];

      switch (exportFormat) {
        case 'csv':
          content = exportCSV(data);
          filename = `daycarewatch_${countyName.toLowerCase()}_${dateStr}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = exportJSON(data);
          filename = `daycarewatch_${countyName.toLowerCase()}_${dateStr}.json`;
          mimeType = 'application/json';
          break;
        case 'html':
          content = generateHTMLReport(data);
          filename = `daycarewatch_${countyName.toLowerCase()}_report_${dateStr}.html`;
          mimeType = 'text/html';
          break;
        default:
          return;
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle print report
  const handlePrint = () => {
    const data = getExportData();
    if (data.length === 0) {
      alert('No data to print for the selected scope.');
      return;
    }

    const htmlContent = generateHTMLReport(data);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const scopeLabels = {
    all: `All Facilities (${facilities.length})`,
    flagged: `High Risk Only (${facilities.filter(f => f.riskAssessment?.score > 50).length})`,
    watchlist: `Watchlist (${watchlist.length})`
  };

  return (
    <div className="export-panel">
      <h3><Download size={20} /> Export & Reports</h3>

      <div className="export-grid">
        {/* Export Scope */}
        <div className="export-section">
          <h4><Filter size={16} /> Data Scope</h4>
          <div className="radio-group">
            {Object.entries(scopeLabels).map(([value, label]) => (
              <label key={value} className="radio-label">
                <input
                  type="radio"
                  name="scope"
                  value={value}
                  checked={exportScope === value}
                  onChange={(e) => setExportScope(e.target.value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Export Format */}
        <div className="export-section">
          <h4><FileText size={16} /> Format</h4>
          <div className="format-buttons">
            <button
              className={`format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
              onClick={() => setExportFormat('csv')}
            >
              <FileSpreadsheet size={20} />
              <span>CSV</span>
              <small>Spreadsheet</small>
            </button>
            <button
              className={`format-btn ${exportFormat === 'json' ? 'active' : ''}`}
              onClick={() => setExportFormat('json')}
            >
              <File size={20} />
              <span>JSON</span>
              <small>Data</small>
            </button>
            <button
              className={`format-btn ${exportFormat === 'html' ? 'active' : ''}`}
              onClick={() => setExportFormat('html')}
            >
              <FileText size={20} />
              <span>HTML</span>
              <small>Report</small>
            </button>
          </div>
        </div>

        {/* Field Selection */}
        <div className="export-section">
          <h4><CheckSquare size={16} /> Include Fields</h4>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeFields.basic}
                onChange={(e) => setIncludeFields({ ...includeFields, basic: e.target.checked })}
              />
              <Building size={14} />
              Basic Info (name, address, type, capacity)
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeFields.contact}
                onChange={(e) => setIncludeFields({ ...includeFields, contact: e.target.checked })}
              />
              Contact (phone, license holder)
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeFields.compliance}
                onChange={(e) => setIncludeFields({ ...includeFields, compliance: e.target.checked })}
              />
              Compliance (visits, citations, maltreatment)
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeFields.risk}
                onChange={(e) => setIncludeFields({ ...includeFields, risk: e.target.checked })}
              />
              <AlertTriangle size={14} />
              Risk Assessment (score, level, flags)
            </label>
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="export-actions">
        <button
          className="export-btn primary"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download size={18} />
          {isExporting ? 'Exporting...' : `Download ${exportFormat.toUpperCase()}`}
        </button>
        <button
          className="export-btn secondary"
          onClick={handlePrint}
        >
          <Printer size={18} />
          Print Report
        </button>
      </div>

      {/* Quick Stats */}
      <div className="export-preview">
        <h4>Export Preview</h4>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="preview-value">{getExportData().length}</span>
            <span className="preview-label">Facilities</span>
          </div>
          <div className="preview-stat">
            <span className="preview-value">
              {Object.values(includeFields).filter(Boolean).length *
               (includeFields.basic ? 10 : 0) +
               (includeFields.contact ? 2 : 0) +
               (includeFields.compliance ? 6 : 0) +
               (includeFields.risk ? 3 : 0)}
            </span>
            <span className="preview-label">Fields</span>
          </div>
          <div className="preview-stat">
            <span className="preview-value">{exportFormat.toUpperCase()}</span>
            <span className="preview-label">Format</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
