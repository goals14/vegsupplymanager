// State Management
// State Management
var transactions = [];
var savedClients = [];
var savedSuppliers = [];

window.transactions = transactions; // Force Global
window.savedClients = savedClients;
window.savedSuppliers = savedSuppliers;

// Global State
// Global State
window.AppState = {
    transactionToDelete: null,
    transactionToPay: null
};

// Application State (Standard Globals)
let isPrivacyMode = false; // Global Master
let isSummaryHidden = false;
let isListHidden = false;
let privacyOverrides = new Set(); // Stores IDs of items with toggled state
let isClientMode = false; // New Mode
let selectedClient = 'All';
let isAddingClient = false; // Flag to know if we are adding Client or Supplier
let pendingRemittanceIds = []; // Store IDs to mark as paid


// Aliases for backward compatibility (optional, but safer to just update usage)
// We will update usage in app.js and ui.js


// Load Data
try {
    transactions = JSON.parse(localStorage.getItem('veg_transactions')) || [];
    savedClients = JSON.parse(localStorage.getItem('veg_clients')) || [];
    savedSuppliers = JSON.parse(localStorage.getItem('veg_suppliers')) || [];
} catch (e) {
    console.warn('LocalStorage access denied or error:', e);
}

let syncUrl = localStorage.getItem('veg_sync_url') || '';
let lastSyncTime = localStorage.getItem('veg_last_sync') || null;
let isSyncing = false;

// Save Data
function saveData() {
    try {
        localStorage.setItem('veg_transactions', JSON.stringify(transactions));

        // Auto-sync if URL exists and we are online
        if (syncUrl && navigator.onLine) {
            syncData();
        }
    } catch (e) {
        console.warn('LocalStorage save failed:', e);
    }
}

// Sync Data
async function syncData() {
    if (!syncUrl || isSyncing) return;
    if (!navigator.onLine) {
        console.log('Offline: Skipping sync');
        return;
    }

    isSyncing = true;
    updateSyncUI('Syncing...', 'orange');

    try {
        const response = await fetch(syncUrl, {
            method: 'POST',
            mode: 'no-cors', // Important for Google Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactions)
        });

        // With no-cors, we get an opaque response, so we can't check .ok or .json()
        // We assume success if no network error occurred.
        lastSyncTime = new Date().toISOString();
        localStorage.setItem('veg_last_sync', lastSyncTime);
        updateSyncUI('Synced', '#27ae60');

        setTimeout(() => {
            updateSyncUI('☁️', 'inherit'); // Reset after 2s
        }, 2000);

    } catch (error) {
        console.error('Sync failed:', error);
        updateSyncUI('Sync Failed', '#e74c3c');
    } finally {
        isSyncing = false;
    }
}

function setSyncUrl(url) {
    syncUrl = url;
    localStorage.setItem('veg_sync_url', url);
    if (url) syncData(); // Try initial sync
}
