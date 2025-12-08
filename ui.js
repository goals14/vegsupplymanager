// UI Logic & Rendering

// DOM Elements (UI Specific)
const transactionList = document.getElementById('transactionList');
const clientTransactionList = document.getElementById('clientTransactionList');
const clientVolumeEl = document.getElementById('clientVolume');
const clientAvgPriceEl = document.getElementById('clientAvgPrice');
const trendList = document.getElementById('trendList');
const clientSelector = document.getElementById('clientSelector');
const todayWeightEl = document.getElementById('todayWeight');
const todayCostEl = document.getElementById('todayCost');
const todayProfitEl = document.getElementById('todayProfit');
const privacyBtn = document.getElementById('privacyBtn');
const summaryPrivacyBtn = document.getElementById('summaryPrivacyBtn');
const listPrivacyBtn = document.getElementById('listPrivacyBtn');
const paymentModal = document.getElementById('paymentModal');
const deleteModal = document.getElementById('deleteModal');
const invoiceModal = document.getElementById('invoiceModal');
const remittanceModal = document.getElementById('remittanceModal');
const dataModal = document.getElementById('dataModal');
const nameModal = document.getElementById('nameModal');
const supplierView = document.getElementById('supplierView');
const clientView = document.getElementById('clientView');
const modeBtn = document.getElementById('modeBtn');
const mainHeader = document.getElementById('mainHeader');
const appTitle = document.getElementById('appTitle');
const dataBtn = document.getElementById('dataBtn');
const shortTripInput = document.getElementById('shortTripCost');
const freightInput = document.getElementById('freightCost');
const cloudBtn = document.getElementById('cloudBtn'); // New Button

// Sync UI Helper
function updateSyncUI(text, color) {
    if (cloudBtn) {
        cloudBtn.textContent = text;
        cloudBtn.style.color = color;
        if (text === 'Syncing...') {
            cloudBtn.style.opacity = '0.7';
        } else {
            cloudBtn.style.opacity = '1';
        }
    }
}

// Rendering
function renderList(filterTerm = '') {
    transactionList.innerHTML = '';

    let filteredTransactions = transactions;

    if (filterTerm) {
        filteredTransactions = transactions.filter(t => {
            const searchStr = `${t.date} ${t.supplier} ${t.item} ${t.category || ''}`.toLowerCase();
            return searchStr.includes(filterTerm);
        });
    }

    if (filteredTransactions.length === 0) {
        if (filterTerm) {
            transactionList.innerHTML = '<div class="empty-state">No results found.</div>';
        } else {
            transactionList.innerHTML = '<div class="empty-state">No transactions yet. Tap "+ New Transaction" to start.</div>';
        }
        return;
    }

    filteredTransactions.forEach(t => {
        const totalCost = t.weight * t.cost;
        const categoryLabel = t.category ? `<span style="font-size: 11px; background: #ecf0f1; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">${t.category}</span>` : '';

        // Determine Privacy State for this Item
        const isItemHidden = (isListHidden !== privacyOverrides.has(t.id));

        let displaySupplier = t.supplier;
        let displayPrice = formatCurrency(totalCost);
        const itemEyeIcon = isItemHidden ? '🔒' : '👁️';

        if (isItemHidden) {
            // Mask supplier: "Mang Juan" -> "M..."
            displaySupplier = t.supplier.charAt(0) + '...';
            // Mask price
            displayPrice = '****';
        }

        // Payment Status Logic
        const isPaid = t.isPaid || false;
        const statusColor = isPaid ? '#27ae60' : '#e74c3c';
        const statusIcon = isPaid ? '✅' : '🔴';
        const statusText = isPaid ? 'PAID' : 'UNPAID';

        const card = document.createElement('div');
        card.className = 'transaction-card';
        card.style.position = 'relative';
        card.style.borderLeft = `5px solid ${statusColor}`; // Color code the card

        card.innerHTML = `
            <div class="card-info">
                <h3>${categoryLabel}${displaySupplier} <span style="font-size: 0.8em; margin-left: 5px;">${statusIcon}</span></h3>
                <p>${t.item} • ${t.weight}kg ${isItemHidden ? '' : `@ ${formatCurrency(t.cost)}/kg`}</p>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <p style="font-size: 12px; margin-top: 4px; color: #aaa;">${t.date}</p>
                    ${t.timestamp ? `<p style="font-size: 10px; margin-top: 4px; color: #bdc3c7;">Added: ${new Date(t.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>` : ''}
                </div>
            </div>
            <div class="card-actions">
                <div class="price-row">
                    <span class="price">${displayPrice}</span>
                    <button onclick="toggleItemPrivacy(${t.id})" class="privacy-toggle-btn">${itemEyeIcon}</button>
                </div>
                <div class="action-buttons">
                    <button onclick="togglePaymentStatus(${t.id})" class="status-btn" style="color: ${statusColor}; border-color: ${statusColor};">${statusText}</button>
                    <button class="edit-btn" onclick="editTransaction(${t.id})">Edit</button>
                    <button class="delete-btn" onclick="openDeleteModal(${t.id})">Delete</button>
                    <button class="copy-btn" onclick="${isPaid ? `copyReceipt(${t.id})` : `alert('🚫 Cannot copy receipt for UNPAID items.\\nPlease pay the supplier first.')`}" style="${isPaid ? '' : 'opacity: 0.5; cursor: not-allowed;'}">Copy Receipt</button>
                </div>
            </div>
        `;
        transactionList.appendChild(card);
    });
}

function updateSummary(filterTerm = '') {
    let filteredTransactions = transactions;

    if (filterTerm) {
        filteredTransactions = transactions.filter(t => {
            const searchStr = `${t.date} ${t.supplier} ${t.item} ${t.category || ''}`.toLowerCase();
            return searchStr.includes(filterTerm);
        });
    }

    const totalWeight = filteredTransactions.reduce((sum, t) => sum + t.weight, 0);
    const totalCost = filteredTransactions.reduce((sum, t) => sum + (t.weight * t.cost), 0);
    const totalProfit = filteredTransactions.reduce((sum, t) => sum + (t.weight * t.markup), 0);

    // Calculate Outstanding Balance (Unpaid)
    // Show TOTAL outstanding debt regardless of search filter, but respect Client Mode (hide in client mode)
    const totalUnpaid = transactions
        .filter(t => !t.isPaid)
        .reduce((sum, t) => sum + (t.cost * t.weight), 0);

    const outstandingAlert = document.getElementById('outstandingAlert');
    const outstandingAmount = document.getElementById('outstandingAmount');

    if (outstandingAlert && outstandingAmount) {
        if (totalUnpaid > 0 && !isClientMode) {
            outstandingAlert.style.display = 'block';
            outstandingAmount.textContent = formatCurrency(totalUnpaid);
        } else {
            outstandingAlert.style.display = 'none';
        }
    }

    todayWeightEl.textContent = `${totalWeight.toFixed(1)} kg`;

    if (isSummaryHidden) {
        todayCostEl.textContent = '****';
        todayProfitEl.textContent = '****';
    } else {
        todayCostEl.textContent = formatCurrency(totalCost);
        todayProfitEl.textContent = formatCurrency(totalProfit);
    }
}

function renderClientDashboard() {
    // Filter by Client
    let filtered = transactions;
    if (selectedClient !== 'All') {
        filtered = transactions.filter(t => t.client === selectedClient);
    }

    // Calculate Stats
    const totalVol = filtered.reduce((sum, t) => sum + t.weight, 0);
    const totalSales = filtered.reduce((sum, t) => sum + (t.weight * (t.cost + t.markup)), 0);
    const avgPrice = totalVol > 0 ? (totalSales / totalVol) : 0;

    clientVolumeEl.textContent = `${totalVol.toFixed(1)} kg`;
    clientAvgPriceEl.textContent = `${formatCurrency(avgPrice)} /kg`;

    // Render Safe List
    clientTransactionList.innerHTML = '';
    if (filtered.length === 0) {
        clientTransactionList.innerHTML = '<div class="empty-state">No sales history found.</div>';
    } else {
        filtered.forEach(t => {
            const sellingPrice = t.cost + t.markup;
            const total = t.weight * sellingPrice;

            const card = document.createElement('div');
            card.className = 'transaction-card';
            card.innerHTML = `
                <div class="card-info">
                    <h3>${t.item}</h3>
                    <p>${t.date} • ${t.weight}kg @ ${formatCurrency(sellingPrice)}/kg</p>
                    <p style="font-size: 11px; color: #7f8c8d; margin-top: 4px;">${t.client || 'General'}</p>
                </div>
                <div class="card-actions">
                    <span class="price" style="color: #2980b9;">${formatCurrency(total)}</span>
                </div>
            `;
            clientTransactionList.appendChild(card);
        });
    }

    // Render Trends (Initial load with empty search or 'all')
    renderTrends('');
}

function renderTrends(filterTerm) {
    trendList.innerHTML = '';

    if (selectedClient === 'All') {
        trendList.innerHTML = '<div class="empty-state">Please select a specific client to view trends.</div>';
        return;
    }

    // 1. Filter by Client
    let clientTransactions = transactions.filter(t => t.client === selectedClient);

    // 2. Group by Item
    const itemGroups = {};
    clientTransactions.forEach(t => {
        if (!itemGroups[t.item]) itemGroups[t.item] = [];
        itemGroups[t.item].push(t);
    });

    // 3. Filter by Search Term
    let itemsToShow = Object.keys(itemGroups);
    if (filterTerm) {
        itemsToShow = itemsToShow.filter(item => item.toLowerCase().includes(filterTerm));
    }

    if (itemsToShow.length === 0) {
        trendList.innerHTML = '<div class="empty-state">No matching items found.</div>';
        return;
    }

    // 4. Calculate Stats & Render (3-Month Window)
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    // Helper to get Month Name
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Calculate Previous Months
    const getPrevMonth = (offset) => {
        let m = currentMonth - offset;
        let y = currentYear;
        if (m < 0) {
            m += 12;
            y -= 1;
        }
        return { m, y, name: monthNames[m] };
    };

    const m0 = { m: currentMonth, y: currentYear, name: monthNames[currentMonth] }; // This Month
    const m1 = getPrevMonth(1); // Last Month
    const m2 = getPrevMonth(2); // 2 Months Ago

    itemsToShow.forEach(item => {
        const txs = itemGroups[item];
        const totalVol = txs.reduce((sum, t) => sum + t.weight, 0);

        // Helper to get stats for a specific month
        const getStats = (targetM, targetY) => {
            const monthTxs = txs.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === targetM && d.getFullYear() === targetY;
            });
            const vol = monthTxs.reduce((sum, t) => sum + t.weight, 0);
            const sales = monthTxs.reduce((sum, t) => sum + (t.weight * (t.cost + t.markup)), 0);
            const avg = vol > 0 ? (sales / vol) : 0;
            return avg;
        };

        const avg0 = getStats(m0.m, m0.y);
        const avg1 = getStats(m1.m, m1.y);
        const avg2 = getStats(m2.m, m2.y);

        // Determine Trend (Compare This Month vs The Most Recent Previous Data)
        let trendClass = 'trend-flat';
        let trendIcon = '➖';
        let trendText = 'Stable';
        let cardClass = '';

        // Compare against m1 if exists, else m2
        const baseline = avg1 > 0 ? avg1 : (avg2 > 0 ? avg2 : 0);

        if (avg0 > 0 && baseline > 0) {
            const diff = avg0 - baseline;
            if (diff > 0) {
                trendClass = 'trend-up';
                trendIcon = '📈';
                trendText = `+${formatCurrency(diff)}`;
                cardClass = 'bad';
            } else if (diff < 0) {
                trendClass = 'trend-down';
                trendIcon = '📉';
                trendText = `-${formatCurrency(Math.abs(diff))}`;
                cardClass = 'good';
            }
        } else if (avg0 > 0 && baseline === 0) {
            trendText = 'New';
        } else if (avg0 === 0) {
            trendText = 'No buys';
        }

        // Render Card
        const card = document.createElement('div');
        card.className = `trend-card ${cardClass}`;
        card.innerHTML = `
            <div class="trend-header">
                <h3>${item}</h3>
                <span style="font-size: 12px; font-weight: 600; color: #7f8c8d;">${totalVol.toFixed(0)}kg Total</span>
            </div>
            <div class="trend-stats three-col">
                <div class="stat-box">
                    <div class="stat-label">${m2.name}</div>
                    <div class="stat-value">${avg2 > 0 ? formatCurrency(avg2) : '-'}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">${m1.name}</div>
                    <div class="stat-value">${avg1 > 0 ? formatCurrency(avg1) : '-'}</div>
                </div>
                <div class="stat-box active">
                    <div class="stat-label">${m0.name} (Now)</div>
                    <div class="stat-value">${avg0 > 0 ? formatCurrency(avg0) : '-'}</div>
                    <div class="trend-indicator ${trendClass}">${trendIcon} ${trendText}</div>
                </div>
            </div>
        `;
        trendList.appendChild(card);
    });
}

function updateLists() {
    // Clients
    const historyClients = [...new Set(transactions.map(t => t.client).filter(c => c))];
    const allClients = [...new Set([...savedClients, ...historyClients])].sort();

    const clientListEl = document.getElementById('clientList');
    if (clientListEl) {
        clientListEl.innerHTML = allClients.map(c => `<option value="${c}">`).join('');
    }

    // Suppliers
    const historySuppliers = [...new Set(transactions.map(t => t.supplier).filter(s => s))];
    const allSuppliers = [...new Set([...savedSuppliers, ...historySuppliers])].sort();

    const supplierListEl = document.getElementById('supplierList');
    if (supplierListEl) {
        supplierListEl.innerHTML = allSuppliers.map(s => `<option value="${s}">`).join('');
    }
}

function updateClientSelector() {
    const historyClients = [...new Set(transactions.map(t => t.client).filter(c => c))];
    const allClients = [...new Set([...savedClients, ...historyClients])].sort();

    const currentVal = clientSelector.value;

    clientSelector.innerHTML = '<option value="All">All Clients</option>' +
        allClients.map(c => `<option value="${c}">${c}</option>`).join('');

    if (allClients.includes(currentVal)) {
        clientSelector.value = currentVal;
    }
}

function updateModeUI() {
    if (isClientMode) {
        // Switch to Client View
        supplierView.classList.add('hidden');
        clientView.classList.remove('hidden');
        modeBtn.textContent = '🔄 Client View';
        modeBtn.style.background = 'rgba(255,255,255,0.4)';
        mainHeader.style.background = 'linear-gradient(135deg, #2980b9, #2c3e50)'; // Blue theme
        appTitle.textContent = 'Client Dashboard';
        privacyBtn.classList.add('hidden'); // Hide privacy toggle
        dataBtn.classList.add('hidden'); // Hide data options (Safety)
        renderClientDashboard();
    } else {
        // Switch to Supplier View
        clientView.classList.add('hidden');
        supplierView.classList.remove('hidden');
        modeBtn.textContent = '🔄 Supplier';
        modeBtn.style.background = 'rgba(255,255,255,0.2)';
        mainHeader.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)'; // Green theme
        appTitle.textContent = 'Veg Manager';
        privacyBtn.classList.remove('hidden');
        dataBtn.classList.remove('hidden');
        renderList(searchInput.value.toLowerCase());
    }
}

function updateUI() {
    // Update Icons
    privacyBtn.textContent = isPrivacyMode ? '🔒' : '👁️';
    summaryPrivacyBtn.textContent = isSummaryHidden ? '🔒' : '👁️';
    listPrivacyBtn.textContent = isListHidden ? '🔒' : '👁️';

    // Render
    const term = searchInput.value.toLowerCase();
    renderList(term);
    updateSummary(term);
}

// Item Privacy Toggle
window.toggleItemPrivacy = (id) => {
    if (privacyOverrides.has(id)) {
        privacyOverrides.delete(id);
    } else {
        privacyOverrides.add(id);
    }
    renderList(searchInput.value.toLowerCase());
};

// Payment Status Toggle
// Payment Status Toggle
window.togglePaymentStatus = (id) => {
    const t = transactions.find(t => t.id === id);
    if (t) {
        if (!t.isPaid) {
            transactionToPay = id;
            if (paymentModal) {
                paymentModal.classList.remove('hidden');
            } else {
                console.error('paymentModal is undefined!');
            }
        } else {
            showConfirmModal(
                'Unpay Transaction',
                'Mark this item as UNPAID? 🔴',
                () => {
                    t.isPaid = false;
                    saveData();
                    renderList(document.getElementById('searchInput').value.toLowerCase());
                    updateSummary(document.getElementById('searchInput').value.toLowerCase());
                }
            );
        }
    } else {
        console.error('Transaction not found for ID:', id);
    }
};

// Delete Modal
window.openDeleteModal = (id) => {
    transactionToDelete = id;
    deleteModal.classList.remove('hidden');
};

// Copy Receipt
window.copyReceipt = (id) => {
    const t = transactions.find(trans => trans.id === id);
    if (!t) return;

    const totalCost = t.weight * t.cost;
    const text = `
RECEIPT
Date: ${t.date}
From: ${t.supplier}
Item: ${t.item}
Qty: ${t.weight}kg
Rate: ${formatCurrency(t.cost)}/kg
Total: ${formatCurrency(totalCost)}
- Received
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
        alert('Receipt copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Could not copy text. Please select and copy manually.');
    });
};

// Invoice Generation
function generateAndCopyInvoice() {
    const invoiceDateInput = document.getElementById('invoiceDate');
    const selectedDate = invoiceDateInput.value;

    if (!selectedDate) {
        alert('Please select a date.');
        return;
    }

    // Filter by Date AND Client (if in Client Mode)
    let relevantTransactions = transactions.filter(t => t.date === selectedDate);

    if (isClientMode && selectedClient !== 'All') {
        relevantTransactions = relevantTransactions.filter(t => t.client === selectedClient);
    }

    if (relevantTransactions.length === 0) {
        alert(`No transactions found for ${selectedDate}!`);
        return;
    }

    // Group by Category
    const grouped = {
        'Baguio Market': [],
        'Fixed Priced': [],
        'Trading Post': []
    };

    // Also catch any legacy/other categories just in case
    relevantTransactions.forEach(t => {
        const cat = t.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(t);
    });

    let invoiceText = `INVOICE\nDate: ${selectedDate}\n`;
    if (isClientMode && selectedClient !== 'All') {
        invoiceText += `Client: ${selectedClient}\n`;
    }
    invoiceText += `\n`;

    let grandTotal = 0;

    // Build Category Sections
    for (const [category, items] of Object.entries(grouped)) {
        if (items.length === 0) continue; // Skip empty categories

        invoiceText += `${category}\n`;
        items.forEach(t => {
            const sellingPrice = t.cost + t.markup;
            const lineTotal = t.weight * sellingPrice;
            grandTotal += lineTotal;
            // Format: 100kg Carrots at 30php = 3,000php
            invoiceText += `${t.weight}kg ${t.item} at ${sellingPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}php = ${lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}php\n`;
        });
        invoiceText += '\n';
    }

    // Add Extra Costs
    const shortTrip = parseFloat(shortTripInput.value) || 0;
    const freight = parseFloat(freightInput.value) || 0;

    if (shortTrip > 0) {
        invoiceText += `Short trip: ${shortTrip.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`;
        grandTotal += shortTrip;
    }

    if (freight > 0) {
        invoiceText += `freight: ${freight.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`;
        grandTotal += freight;
    }

    invoiceText += `\nTOTAL: ${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}php`;

    // Show Preview
    const previewEl = document.getElementById('invoicePreview');
    previewEl.textContent = invoiceText;
    previewEl.style.display = 'block';

    // Copy to Clipboard
    navigator.clipboard.writeText(invoiceText).then(() => {
        alert('Invoice generated! Copied to clipboard.\nYou can also screenshot the preview below.');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Generated! Could not auto-copy. Please select the text below and copy.');
    });
}

// Form Logic
function calculateProfitPreview() {
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const markup = parseFloat(document.getElementById('markup').value) || 0;
    const totalProfit = weight * markup;
    document.getElementById('profitPreview').textContent = formatCurrency(totalProfit);
}

function resetForm() {
    const transactionForm = document.getElementById('transactionForm');
    transactionForm.reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('editTransactionId').value = '';
    document.getElementById('saveBtn').textContent = 'Save Transaction';
    document.querySelector('.modal-header h2').textContent = 'New Delivery';
    document.getElementById('isPaidNow').checked = false; // Reset Checkbox
    calculateProfitPreview();
}

window.editTransaction = (id) => {
    const t = transactions.find(trans => trans.id === id);
    if (!t) return;

    document.getElementById('date').value = t.date;
    document.getElementById('category').value = t.category || 'Baguio Market';
    document.getElementById('client').value = t.client || '';
    document.getElementById('supplier').value = t.supplier;
    document.getElementById('item').value = t.item;
    document.getElementById('weight').value = t.weight;
    document.getElementById('cost').value = t.cost;
    document.getElementById('markup').value = t.markup;
    document.getElementById('editTransactionId').value = t.id;

    calculateProfitPreview();

    // Update UI for Edit Mode
    document.getElementById('saveBtn').textContent = 'Update Transaction';
    document.querySelector('.modal-header h2').textContent = 'Edit Transaction';

    modal.classList.remove('hidden');
};
