/**
 * Google Drive Cloud Sync Module for QuickFacts CS & IT MCQ Quiz
 * Uses Google Identity Services (GIS) and Google Drive API appDataFolder.
 */
(function (window) {
  'use strict';

  // --- CONFIGURATION ---
  const CLIENT_ID = "37196814040-27m6s841akoul5cnu5r079ufj257nfj8.apps.googleusercontent.com";
  const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
  const CLOUD_FILENAME = "quiz-progress.json";
  const AUTH_STORAGE_KEY = "quickfacts_gdrive_auth_v1";

  // --- STATE ---
  let tokenClient = null;
  let accessToken = null;
  let tokenExpirationTime = 0;
  let driveFileId = null;
  let syncDebounceTimer = null;
  let isSyncing = false;
  let isConnected = false;
  let lastSyncedTime = null;

  // Registered callbacks from app core
  let getLocalStateCallback = null;
  let applyCloudStateCallback = null;

  // --- STORAGE HELPERS FOR AUTH METADATA ---
  function loadAuthMeta() {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        accessToken = parsed.accessToken || null;
        tokenExpirationTime = parsed.tokenExpirationTime || 0;
        driveFileId = parsed.driveFileId || null;
        isConnected = !!parsed.isConnected;
        lastSyncedTime = parsed.lastSyncedTime || null;
      }
    } catch (e) {
      console.warn("Failed to load GDrive auth metadata", e);
    }
  }

  function saveAuthMeta() {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        accessToken,
        tokenExpirationTime,
        driveFileId,
        isConnected,
        lastSyncedTime
      }));
    } catch (e) {
      console.warn("Failed to save GDrive auth metadata", e);
    }
  }

  function clearAuthMeta() {
    accessToken = null;
    tokenExpirationTime = 0;
    driveFileId = null;
    isConnected = false;
    lastSyncedTime = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear GDrive auth metadata", e);
    }
  }

  function isTokenValid() {
    return accessToken && Date.now() < (tokenExpirationTime - 60000); // 1 min buffer
  }

  // --- UI INDICATOR UPDATES ---
  function updateUI(status, message) {
    // Header status badge
    const headerBadge = document.getElementById("cloudSyncHeaderBadge");
    const headerText = document.getElementById("cloudSyncHeaderText");
    const headerIcon = document.getElementById("cloudSyncHeaderIcon");

    // Sidebar status card elements
    const sidebarStatusBadge = document.getElementById("cloudSyncSidebarStatusBadge");
    const sidebarInfoMsg = document.getElementById("cloudSyncSidebarInfoMsg");
    const connectBtn = document.getElementById("btnConnectGDrive");
    const connectedControls = document.getElementById("gdriveConnectedControls");

    if (headerBadge) {
      headerBadge.className = `cloud-sync-badge sync-${status}`;
    }

    if (sidebarStatusBadge) {
      sidebarStatusBadge.className = `sidebar-sync-badge sync-${status}`;
    }

    let badgeLabel = "Not connected";
    let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;

    switch (status) {
      case "connected":
      case "synced":
        badgeLabel = "Synced";
        if (lastSyncedTime) {
          const timeAgo = formatTimeAgo(new Date(lastSyncedTime));
          message = message || `Synced ${timeAgo}`;
        } else {
          message = message || "Connected to Google Drive";
        }
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        break;
      case "syncing":
        badgeLabel = "Syncing...";
        message = message || "Synchronizing with Google Drive...";
        iconSvg = `<svg class="spin-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
        break;
      case "restoring":
        badgeLabel = "Restoring...";
        message = message || "Downloading progress from Google Drive...";
        iconSvg = `<svg class="spin-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
        break;
      case "error":
        badgeLabel = "Sync failed";
        message = message || "Cloud sync unavailable. Saved locally.";
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        break;
      case "disconnected":
      default:
        badgeLabel = "Not connected";
        message = message || "Connect Google Drive for cross-device backup.";
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
        break;
    }

    if (headerText) headerText.textContent = badgeLabel;
    if (headerIcon) headerIcon.innerHTML = iconSvg;

    if (sidebarStatusBadge) {
      sidebarStatusBadge.innerHTML = `${iconSvg} <span>${badgeLabel}</span>`;
    }

    if (sidebarInfoMsg) {
      sidebarInfoMsg.textContent = message;
    }

    if (connectBtn && connectedControls) {
      if (isConnected) {
        connectBtn.style.display = "none";
        connectedControls.style.display = "flex";
      } else {
        connectBtn.style.display = "inline-flex";
        connectedControls.style.display = "none";
      }
    }
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // --- GOOGLE DRIVE REST API OPERATIONS ---
  async function findCloudFile(token) {
    const query = encodeURIComponent(`name='${CLOUD_FILENAME}' and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Drive list error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  async function downloadCloudContent(token, fileId) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Drive download error: ${res.status}`);
    }

    return await res.json();
  }

  async function uploadCloudContent(token, fileId, payload) {
    const bodyStr = JSON.stringify(payload, null, 2);

    if (fileId) {
      // Update existing file using PATCH
      const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: bodyStr
      });

      if (!res.ok) {
        throw new Error(`Drive update error: ${res.status}`);
      }
      return fileId;
    } else {
      // Create new file in appDataFolder using Multipart Upload
      const metadata = {
        name: CLOUD_FILENAME,
        parents: ["appDataFolder"]
      };

      const boundary = "-------QuickFactsBoundary" + Math.random().toString(36).substring(2);
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelim = "\r\n--" + boundary + "--";

      const multipartBody =
        delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        bodyStr +
        closeDelim;

      const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });

      if (!res.ok) {
        throw new Error(`Drive create error: ${res.status}`);
      }

      const data = await res.json();
      return data.id;
    }
  }

  // --- TOKEN CLIENT INITIALIZATION & AUTHORIZATION ---
  function initTokenClient(callbackOnSuccess, callbackOnError) {
    if (typeof window.google === "undefined" || !window.google.accounts || !window.google.accounts.oauth2) {
      if (callbackOnError) callbackOnError("Google Identity Services script not loaded");
      return;
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          console.error("GIS Token Error:", tokenResponse);
          if (callbackOnError) callbackOnError(tokenResponse.error_description || tokenResponse.error);
          return;
        }

        accessToken = tokenResponse.access_token;
        const expiresIn = tokenResponse.expires_in || 3600;
        tokenExpirationTime = Date.now() + (expiresIn * 1000);
        isConnected = true;
        saveAuthMeta();

        if (callbackOnSuccess) {
          callbackOnSuccess(accessToken);
        }
      }
    });
  }

  function getValidAccessToken() {
    return new Promise((resolve, reject) => {
      if (isTokenValid()) {
        resolve(accessToken);
        return;
      }

      if (!isConnected) {
        reject(new Error("User not connected to Google Drive"));
        return;
      }

      // Token expired, request silently or prompt
      if (!tokenClient) {
        initTokenClient();
      }

      if (!tokenClient) {
        reject(new Error("Google Identity Services not ready"));
        return;
      }

      tokenClient.callback = (res) => {
        if (res.error) {
          isConnected = false;
          saveAuthMeta();
          updateUI("error", "Google authentication expired. Please reconnect.");
          reject(new Error("Token refresh failed: " + res.error));
          return;
        }
        accessToken = res.access_token;
        tokenExpirationTime = Date.now() + ((res.expires_in || 3600) * 1000);
        saveAuthMeta();
        resolve(accessToken);
      };

      // Request token with minimal prompt
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  // --- CORE SYNC PUBLIC METHODS ---

  /**
   * User clicks "Connect Google Drive"
   */
  function connect() {
    updateUI("syncing", "Connecting to Google Drive...");

    if (!tokenClient) {
      initTokenClient(
        async (token) => {
          updateUI("syncing", "Connected! Checking cloud backup...");
          try {
            await syncOnConnect(token);
          } catch (err) {
            console.error("Sync error after connect:", err);
            updateUI("error", "Connected, but cloud sync failed: " + err.message);
          }
        },
        (err) => {
          updateUI("disconnected", "Authorization failed or cancelled.");
        }
      );
    }

    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  }

  /**
   * Disconnect Google Drive connection
   */
  function disconnect() {
    if (accessToken && typeof window.google !== "undefined" && window.google.accounts && window.google.accounts.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(accessToken, () => {
          console.log("Google access token revoked");
        });
      } catch (e) {
        console.warn("Revoke token error:", e);
      }
    }
    clearAuthMeta();
    updateUI("disconnected", "Disconnected from Google Drive. Local progress remains safe.");
  }

  /**
   * Initial sync flow on explicit user connection
   */
  async function syncOnConnect(token) {
    updateUI("syncing", "Locating cloud backup file...");

    // Find file
    let fileId = await findCloudFile(token);
    driveFileId = fileId;

    let cloudContent = null;
    if (fileId) {
      try {
        cloudContent = await downloadCloudContent(token, fileId);
      } catch (e) {
        console.warn("Cloud file found but failed to download", e);
      }
    }

    const localState = getLocalStateCallback ? getLocalStateCallback() : null;
    const localUpdated = localState && localState.lastUpdated ? new Date(localState.lastUpdated).getTime() : 0;
    const cloudUpdated = cloudContent && cloudContent.lastUpdated ? new Date(cloudContent.lastUpdated).getTime() : 0;

    if (cloudContent && cloudContent.state && cloudUpdated > localUpdated) {
      // Cloud state is strictly newer
      updateUI("restoring", "Restoring newer progress from Google Drive...");
      if (applyCloudStateCallback) {
        applyCloudStateCallback(cloudContent.state);
      }
      lastSyncedTime = new Date().toISOString();
      saveAuthMeta();
      updateUI("synced", "Progress restored successfully from Google Drive!");
    } else {
      // Local state is newer or equal, or cloud file doesn't exist -> upload local
      updateUI("syncing", "Uploading current progress to Google Drive...");
      await performUpload(token, localState);
    }
  }

  /**
   * Perform upload of state data
   */
  async function performUpload(token, localStateData) {
    if (!localStateData) return;

    const payload = {
      schemaVersion: 1,
      appVersion: "1.0",
      lastUpdated: localStateData.lastUpdated || new Date().toISOString(),
      state: localStateData
    };

    const newFileId = await uploadCloudContent(token, driveFileId, payload);
    driveFileId = newFileId;
    lastSyncedTime = new Date().toISOString();
    saveAuthMeta();
    updateUI("synced", `Synced ${formatTimeAgo(new Date(lastSyncedTime))}`);
  }

  /**
   * Manual "Sync Now" action
   */
  async function syncNow() {
    if (isSyncing) return;
    isSyncing = true;
    updateUI("syncing", "Syncing with Google Drive...");

    try {
      const token = await getValidAccessToken();
      const localState = getLocalStateCallback ? getLocalStateCallback() : null;

      if (!driveFileId) {
        driveFileId = await findCloudFile(token);
      }

      await performUpload(token, localState);
    } catch (err) {
      console.error("Manual sync failed:", err);
      updateUI("error", "Sync failed. Local data is safe.");
    } finally {
      isSyncing = false;
    }
  }

  /**
   * Manual "Restore Cloud Data" action
   */
  async function restoreCloud() {
    if (isSyncing) return;
    isSyncing = true;
    updateUI("restoring", "Downloading backup from Google Drive...");

    try {
      const token = await getValidAccessToken();
      let fileId = driveFileId || (await findCloudFile(token));

      if (!fileId) {
        updateUI("error", "No cloud backup file found in Google Drive.");
        alert("No backup file found in your Google Drive app data folder.");
        return;
      }

      driveFileId = fileId;
      const cloudContent = await downloadCloudContent(token, fileId);

      if (!cloudContent || !cloudContent.state) {
        throw new Error("Invalid or empty cloud backup file format.");
      }

      if (applyCloudStateCallback) {
        applyCloudStateCallback(cloudContent.state);
      }

      lastSyncedTime = new Date().toISOString();
      saveAuthMeta();
      updateUI("synced", "Progress restored successfully from cloud!");
      alert("✓ Quiz progress restored successfully from Google Drive!");
    } catch (err) {
      console.error("Restore failed:", err);
      updateUI("error", "Restore failed: " + err.message);
      alert("Failed to restore cloud backup: " + err.message);
    } finally {
      isSyncing = false;
    }
  }

  /**
   * Debounced automatic cloud sync triggered by local state save
   */
  function scheduleAutoSync() {
    if (!isConnected) return;

    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }

    updateUI("syncing", "Pending cloud sync...");

    syncDebounceTimer = setTimeout(async () => {
      if (isSyncing) return;
      isSyncing = true;

      try {
        const token = await getValidAccessToken();
        const localState = getLocalStateCallback ? getLocalStateCallback() : null;

        if (!driveFileId) {
          driveFileId = await findCloudFile(token);
        }

        await performUpload(token, localState);
      } catch (err) {
        console.warn("Background auto sync failed:", err);
        updateUI("error", "Auto-sync failed. Saved locally.");
      } finally {
        isSyncing = false;
      }
    }, 3000); // 3-second debounce
  }

  /**
   * Perform silent startup check if user previously connected
   */
  async function startupCheck() {
    loadAuthMeta();

    if (!isConnected) {
      updateUI("disconnected");
      return;
    }

    updateUI("syncing", "Checking Google Drive backup...");

    try {
      const token = await getValidAccessToken();
      let fileId = driveFileId || (await findCloudFile(token));
      driveFileId = fileId;

      if (fileId) {
        const cloudContent = await downloadCloudContent(token, fileId);
        const localState = getLocalStateCallback ? getLocalStateCallback() : null;

        const localUpdated = localState && localState.lastUpdated ? new Date(localState.lastUpdated).getTime() : 0;
        const cloudUpdated = cloudContent && cloudContent.lastUpdated ? new Date(cloudContent.lastUpdated).getTime() : 0;

        if (cloudContent && cloudContent.state && cloudUpdated > localUpdated) {
          console.log("Cloud state is newer. Restoring...");
          updateUI("restoring", "Restoring newer progress from Google Drive...");
          if (applyCloudStateCallback) {
            applyCloudStateCallback(cloudContent.state);
          }
          lastSyncedTime = new Date().toISOString();
          saveAuthMeta();
          updateUI("synced", "Restored latest progress from Google Drive.");
        } else if (localUpdated > cloudUpdated) {
          console.log("Local state is newer. Uploading...");
          await performUpload(token, localState);
        } else {
          updateUI("synced", `Synced ${formatTimeAgo(new Date(lastSyncedTime || Date.now()))}`);
        }
      } else {
        // No file yet, upload initial
        const localState = getLocalStateCallback ? getLocalStateCallback() : null;
        await performUpload(token, localState);
      }
    } catch (err) {
      console.warn("Startup cloud check warning:", err);
      updateUI("error", "Offline or cloud sync pending. Local data active.");
    }
  }

  /**
   * Module Initialization
   */
  function init(options) {
    if (options) {
      if (options.getLocalState) getLocalStateCallback = options.getLocalState;
      if (options.applyCloudState) applyCloudStateCallback = options.applyCloudState;
    }

    loadAuthMeta();

    // Attach click listeners if DOM is ready
    const connectBtn = document.getElementById("btnConnectGDrive");
    const syncNowBtn = document.getElementById("btnSyncNowGDrive");
    const restoreBtn = document.getElementById("btnRestoreGDrive");
    const disconnectBtn = document.getElementById("btnDisconnectGDrive");

    if (connectBtn) connectBtn.addEventListener("click", connect);
    if (syncNowBtn) syncNowBtn.addEventListener("click", syncNow);
    if (restoreBtn) restoreBtn.addEventListener("click", restoreCloud);
    if (disconnectBtn) disconnectBtn.addEventListener("click", disconnect);

    // Initial UI state
    if (isConnected) {
      updateUI("synced", lastSyncedTime ? `Synced ${formatTimeAgo(new Date(lastSyncedTime))}` : "Connected to Google Drive");
    } else {
      updateUI("disconnected");
    }

    // Delay startup check slightly to ensure page loads fast
    setTimeout(startupCheck, 1500);
  }

  // --- EXPOSE GLOBAL API ---
  window.GoogleDriveSync = {
    init,
    connect,
    disconnect,
    syncNow,
    restoreCloud,
    scheduleAutoSync,
    updateUI
  };

})(window);
