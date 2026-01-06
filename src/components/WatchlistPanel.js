import React, { useState, useEffect } from 'react';
import {
  Eye,
  Trash2,
  Download,
  Upload,
  Plus,
  MessageSquare,
  X,
  AlertTriangle,
  MapPin,
  Clock
} from 'lucide-react';
import {
  getWatchlist,
  removeFromWatchlist,
  getNotes,
  addNote,
  deleteNote,
  exportWatchlist,
  importWatchlist
} from '../utils/watchlist';

/**
 * WatchlistPanel - Track facilities of interest
 */
const WatchlistPanel = ({ onFacilityClick, facilities }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const handleRemove = (licenseNumber) => {
    const updated = removeFromWatchlist(licenseNumber);
    setWatchlist(updated);
    if (selectedFacility?.license_number === licenseNumber) {
      setSelectedFacility(null);
    }
  };

  const handleSelectFacility = (facility) => {
    setSelectedFacility(facility);
    setNotes(getNotes(facility.license_number));
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedFacility) return;
    const updatedNotes = addNote(selectedFacility.license_number, newNote.trim());
    setNotes(updatedNotes);
    setNewNote('');
  };

  const handleDeleteNote = (noteId) => {
    if (!selectedFacility) return;
    const updatedNotes = deleteNote(selectedFacility.license_number, noteId);
    setNotes(updatedNotes);
  };

  const handleExport = () => {
    const data = exportWatchlist();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daycarewatch-watchlist-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        if (importWatchlist(data)) {
          setWatchlist(getWatchlist());
          setShowImport(false);
        } else {
          alert('Failed to import watchlist. Invalid format.');
        }
      } catch {
        alert('Failed to parse watchlist file.');
      }
    };
    reader.readAsText(file);
  };

  const handleViewFacility = (watchlistEntry) => {
    // Find the full facility data
    const fullFacility = facilities?.find(f => f.license_number === watchlistEntry.license_number);
    if (fullFacility && onFacilityClick) {
      onFacilityClick(fullFacility);
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="watchlist-panel">
      <div className="watchlist-header">
        <h3><Eye size={20} /> Watchlist ({watchlist.length})</h3>
        <div className="watchlist-actions">
          <button className="icon-btn" onClick={handleExport} title="Export watchlist">
            <Download size={18} />
          </button>
          <button className="icon-btn" onClick={() => setShowImport(true)} title="Import watchlist">
            <Upload size={18} />
          </button>
        </div>
      </div>

      {showImport && (
        <div className="import-dialog">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
          />
          <button onClick={() => setShowImport(false)}>Cancel</button>
        </div>
      )}

      {watchlist.length === 0 ? (
        <div className="watchlist-empty">
          <Eye size={40} className="empty-icon" />
          <p>No facilities in watchlist</p>
          <p className="hint">Click the eye icon on any facility to add it to your watchlist for tracking.</p>
        </div>
      ) : (
        <div className="watchlist-content">
          <div className="watchlist-items">
            {watchlist.map((item) => (
              <div
                key={item.license_number}
                className={`watchlist-item ${selectedFacility?.license_number === item.license_number ? 'selected' : ''}`}
                onClick={() => handleSelectFacility(item)}
              >
                <div className="item-main">
                  <div className="item-header">
                    <span
                      className="item-name clickable-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewFacility(item);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {item.name}
                    </span>
                    {item.riskScore > 50 && (
                      <AlertTriangle size={16} className="risk-icon" />
                    )}
                  </div>
                  <div className="item-details">
                    <span className="item-address">
                      <MapPin size={12} />
                      {item.city}, {item.state}
                    </span>
                    <span className="item-added">
                      <Clock size={12} />
                      Added {formatDate(item.addedAt)}
                    </span>
                  </div>
                  {item.reason && (
                    <div className="item-reason">{item.reason}</div>
                  )}
                </div>
                <div className="item-actions">
                  <button
                    className="view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewFacility(item);
                    }}
                    title="View facility details"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.license_number);
                    }}
                    title="Remove from watchlist"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedFacility && (
            <div className="notes-panel">
              <div className="notes-header">
                <h4><MessageSquare size={16} /> Notes for {selectedFacility.name}</h4>
                <button onClick={() => setSelectedFacility(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="notes-list">
                {notes.length === 0 ? (
                  <p className="no-notes">No notes yet. Add observations below.</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="note-item">
                      <p className="note-text">{note.text}</p>
                      <div className="note-meta">
                        <span className="note-date">{formatDate(note.createdAt)}</span>
                        <button
                          className="delete-note"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="add-note">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note (e.g., 'Visited 1/2/26 - appeared closed during business hours')"
                  rows={3}
                />
                <button onClick={handleAddNote} disabled={!newNote.trim()}>
                  <Plus size={16} /> Add Note
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WatchlistPanel;
