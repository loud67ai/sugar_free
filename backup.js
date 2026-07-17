// ============================================================
// Sugar Free — backup.js
// GitHub Gist backup/restore using a user-supplied PAT.
// The PAT is stored only in the user's own localStorage.
// ============================================================

const backup = {
  _filename:    'sugarfree-backup.json',
  _description: 'Sugar Free App — streak backup',

  // ── Helpers ───────────────────────────────────────────────

  _getPAT() {
    const inputVal = document.getElementById('pat-input').value.trim();
    if (inputVal) {
      // Persist for convenience (user's own device / localStorage only)
      const data = loadData();
      if (!data.settings) data.settings = {};
      data.settings.githubPAT = inputVal;
      saveData(data);
      return inputVal;
    }
    return loadData().settings?.githubPAT || '';
  },

  _setStatus(msg, type = '') {
    const el = document.getElementById('backup-status');
    el.textContent = msg;
    el.className   = 'backup-status ' + type;
  },

  _headers(pat) {
    return {
      'Authorization': `token ${pat}`,
      'Content-Type':  'application/json',
      'Accept':        'application/vnd.github.v3+json',
    };
  },

  // ── Back Up ───────────────────────────────────────────────

  async save() {
    const pat = this._getPAT();
    if (!pat) {
      this._setStatus('Please enter your GitHub Personal Access Token first.', 'error');
      return;
    }

    this._setStatus('Backing up…');

    const data    = loadData();
    const payload = JSON.stringify({ checkins: data.checkins }, null, 2);
    const gistId  = data.settings?.gistId;

    try {
      let res;
      if (gistId) {
        // Update existing gist
        res = await fetch(`https://api.github.com/gists/${gistId}`, {
          method:  'PATCH',
          headers: this._headers(pat),
          body:    JSON.stringify({
            description: this._description,
            files: { [this._filename]: { content: payload } },
          }),
        });
      } else {
        // Create a new private gist
        res = await fetch('https://api.github.com/gists', {
          method:  'POST',
          headers: this._headers(pat),
          body:    JSON.stringify({
            description: this._description,
            public: false,
            files: { [this._filename]: { content: payload } },
          }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const gist = await res.json();
      if (!data.settings) data.settings = {};
      data.settings.gistId = gist.id;
      saveData(data);

      this._setStatus('✅ Backed up successfully!', 'success');
    } catch (err) {
      this._setStatus(`❌ ${err.message}`, 'error');
    }
  },

  // ── Restore ───────────────────────────────────────────────

  async restore() {
    const pat = this._getPAT();
    if (!pat) {
      this._setStatus('Please enter your GitHub Personal Access Token first.', 'error');
      return;
    }

    this._setStatus('Restoring…');

    try {
      const data   = loadData();
      let gistId   = data.settings?.gistId;

      if (!gistId) {
        // Search user's gists for the backup by description + filename
        const listRes = await fetch('https://api.github.com/gists?per_page=100', {
          headers: this._headers(pat),
        });
        if (!listRes.ok) throw new Error(`Could not list gists (HTTP ${listRes.status})`);

        const gists = await listRes.json();
        const found = gists.find(
          g => g.description === this._description && g.files[this._filename]
        );
        if (!found) {
          throw new Error('No backup found. Create a backup from your original device first.');
        }
        gistId = found.id;
      }

      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: this._headers(pat),
      });
      if (!res.ok) throw new Error(`Could not fetch backup (HTTP ${res.status})`);

      const gist    = await res.json();
      const content = gist.files[this._filename]?.content;
      if (!content) throw new Error('Backup file missing from gist.');

      const restored = JSON.parse(content);
      if (!restored || typeof restored.checkins !== 'object') {
        throw new Error('Backup data appears corrupt.');
      }

      if (!data.settings) data.settings = {};
      data.checkins           = restored.checkins;
      data.settings.gistId    = gistId;
      data.settings.githubPAT = pat;
      saveData(data);

      updateHomeScreen();
      this._setStatus('✅ Restored successfully!', 'success');
    } catch (err) {
      this._setStatus(`❌ ${err.message}`, 'error');
    }
  },
};
