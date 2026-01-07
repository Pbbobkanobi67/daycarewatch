/**
 * Watchlist Management for DaycareWatch
 *
 * Allows users to save facilities of interest for tracking.
 * Uses localStorage for persistence.
 */

const WATCHLIST_KEY = 'daycarewatch_watchlist';
const NOTES_KEY = 'daycarewatch_notes';

/**
 * Get the current watchlist
 */
export const getWatchlist = () => {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Add a facility to the watchlist
 */
export const addToWatchlist = (facility, reason = '') => {
  const watchlist = getWatchlist();

  // Check if already exists
  if (watchlist.some(f => f.license_number === facility.license_number)) {
    return watchlist;
  }

  const entry = {
    license_number: facility.license_number,
    name: facility.name,
    address: facility.address,
    city: facility.city,
    state: facility.state,
    county: facility.county,
    capacity: facility.capacity,
    status: facility.status,
    addedAt: new Date().toISOString(),
    reason: reason,
    riskScore: facility.riskAssessment?.score || 0,
  };

  watchlist.push(entry);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));

  return watchlist;
};

/**
 * Remove a facility from the watchlist
 */
export const removeFromWatchlist = (licenseNumber) => {
  const watchlist = getWatchlist();
  const updated = watchlist.filter(f => f.license_number !== licenseNumber);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Check if a facility is in the watchlist
 */
export const isInWatchlist = (licenseNumber) => {
  const watchlist = getWatchlist();
  return watchlist.some(f => f.license_number === licenseNumber);
};

/**
 * Update watchlist entry reason
 */
export const updateWatchlistReason = (licenseNumber, reason) => {
  const watchlist = getWatchlist();
  const entry = watchlist.find(f => f.license_number === licenseNumber);
  if (entry) {
    entry.reason = reason;
    entry.updatedAt = new Date().toISOString();
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }
  return watchlist;
};

/**
 * Get notes for a facility
 */
export const getNotes = (licenseNumber) => {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    const notes = stored ? JSON.parse(stored) : {};
    return notes[licenseNumber] || [];
  } catch {
    return [];
  }
};

/**
 * Add a note to a facility
 */
export const addNote = (licenseNumber, note) => {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    const notes = stored ? JSON.parse(stored) : {};

    if (!notes[licenseNumber]) {
      notes[licenseNumber] = [];
    }

    notes[licenseNumber].push({
      id: Date.now(),
      text: note,
      createdAt: new Date().toISOString(),
    });

    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return notes[licenseNumber];
  } catch {
    return [];
  }
};

/**
 * Delete a note
 */
export const deleteNote = (licenseNumber, noteId) => {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    const notes = stored ? JSON.parse(stored) : {};

    if (notes[licenseNumber]) {
      notes[licenseNumber] = notes[licenseNumber].filter(n => n.id !== noteId);
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    }

    return notes[licenseNumber] || [];
  } catch {
    return [];
  }
};

/**
 * Export watchlist as JSON
 */
export const exportWatchlist = () => {
  const watchlist = getWatchlist();
  const notes = {};

  watchlist.forEach(f => {
    const facilityNotes = getNotes(f.license_number);
    if (facilityNotes.length > 0) {
      notes[f.license_number] = facilityNotes;
    }
  });

  return {
    exportedAt: new Date().toISOString(),
    watchlist,
    notes,
  };
};

/**
 * Import watchlist from JSON
 */
export const importWatchlist = (data) => {
  try {
    if (data.watchlist && Array.isArray(data.watchlist)) {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(data.watchlist));
    }
    if (data.notes && typeof data.notes === 'object') {
      localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes));
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Clear all watchlist data
 */
export const clearWatchlist = () => {
  localStorage.removeItem(WATCHLIST_KEY);
  localStorage.removeItem(NOTES_KEY);
};

const watchlistUtils = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  updateWatchlistReason,
  getNotes,
  addNote,
  deleteNote,
  exportWatchlist,
  importWatchlist,
  clearWatchlist,
};

export default watchlistUtils;
