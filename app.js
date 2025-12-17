// Main Application Logic
console.log('App.js loaded');

// Consolidated Initialization
function initializeApp() {
    try {
        // 1. Move Modals to Root (Fix Nesting)
        const modals = [
            'modal', 'deleteModal', 'paymentModal', 'invoiceModal',
            'remittanceModal', 'dataModal', 'nameModal', 'confirmModal', 'cloudModal'
        ];
        modals.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.parentElement !== document.body) {
                document.body.appendChild(el);
            }
        });

        // 2. Attach All Event Listeners
        attachEventListeners();

        // Initialize Summary Visibility State
        try {
            const savedVis = localStorage.getItem('veg_summary_vis');
            window.summaryVisibility = savedVis ? JSON.parse(savedVis) : { weight: true, cost: true, profit: true };
        } catch (e) {
            window.summaryVisibility = { weight: true, cost: true, profit: true };
        }

        // 3. Initial Render
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        } else {
            console.error('CRITICAL: Date input not found');
        }

        renderList();
        updateSummary();
        updateLists();
        updateClientSelector();

        console.log('App Initialized');
    } catch (error) {
        console.error('App Initialization Failed:', error);
        alert('App crashed on init: ' + error.message);
    }
}

function attachEventListeners() {
    // Payment Modal
    const confirmPaymentBtn = document.getElementById('confirmPayment');
    const cancelPaymentBtn = document.getElementById('cancelPayment');
    const closePaymentModalBtn = document.getElementById('closePaymentModal');

    if (confirmPaymentBtn) {
        confirmPaymentBtn.onclick = () => { // Use onclick to prevent duplicate listeners
            console.log('Confirm Payment Clicked');
            try {
                if (window.AppState.transactionToPay) {
                    const t = transactions.find(t => t.id === window.AppState.transactionToPay);
                    if (t) {
                        t.isPaid = true;
                        saveData();
                        renderList(document.getElementById('searchInput').value.toLowerCase());
                        updateSummary(document.getElementById('searchInput').value.toLowerCase());
                    }
                }
            } catch (error) {
                console.error('Error processing payment:', error);
                alert('Error processing payment');
            } finally {
                document.getElementById('paymentModal').classList.add('hidden');
                window.AppState.transactionToPay = null;
            }
        };
    }

    if (cancelPaymentBtn) {
        cancelPaymentBtn.onclick = () => {
            console.log('Cancel Payment Clicked');
            document.getElementById('paymentModal').classList.add('hidden');
            window.AppState.transactionToPay = null;
        };
    }

    if (closePaymentModalBtn) {
        closePaymentModalBtn.onclick = () => {
            console.log('Close Payment X Clicked');
            document.getElementById('paymentModal').classList.add('hidden');
            window.AppState.transactionToPay = null;
        };
    }

    // Delete Modal
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');

    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = () => {
            console.log('Delete button clicked for ID:', window.AppState.transactionToDelete);
            try {
                const idToDelete = window.AppState.transactionToDelete;
                if (idToDelete) {
                    const initialLength = transactions.length;
                    transactions = transactions.filter(t => t.id != idToDelete);
                    if (transactions.length === initialLength) {
                        console.error('Delete failed: ID not found:', idToDelete);
                        alert('Error: Item not found to delete.');
                    } else {
                        console.log('Delete successful');
                        saveData();
                        updateUI();
                        showToast('Transaction deleted', 'success');
                    }
                } else {
                    console.error('No ID to delete found in AppState');
                }
            } catch (error) {
                console.error('Error deleting transaction:', error);
                alert('An error occurred during deletion.');
            } finally {
                document.getElementById('deleteModal').classList.add('hidden');
                window.AppState.transactionToDelete = null;
            }
        };
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.onclick = () => {
            document.getElementById('deleteModal').classList.add('hidden');
            window.AppState.transactionToDelete = null;
        };
    }

    // Generic Confirmation Modal
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmOkBtn = document.getElementById('confirmOkBtn');

    if (confirmCancelBtn) {
        confirmCancelBtn.onclick = () => {
            document.getElementById('confirmModal').classList.add('hidden');
            onConfirmAction = null;
        };
    }

    if (confirmOkBtn) {
        confirmOkBtn.onclick = () => {
            if (onConfirmAction) {
                onConfirmAction();
            }
            document.getElementById('confirmModal').classList.add('hidden');
            onConfirmAction = null;
        };
    }

    // Global Modal Close (Backdrop)
    window.onclick = (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    };

    // Main UI Buttons
    if (document.getElementById('modeBtn')) {
        document.getElementById('modeBtn').onclick = () => {
            isClientMode = !isClientMode;
            updateModeUI();
        };
    }

    if (document.getElementById('addBtn')) {
        document.getElementById('addBtn').onclick = () => {
            resetForm();
            document.getElementById('modal').classList.remove('hidden');
        };
    }

    if (document.getElementById('addSupplierBtn')) {
        document.getElementById('addSupplierBtn').onclick = () => {
            isAddingClient = false;
            document.getElementById('nameModalTitle').textContent = 'Add New Supplier';
            document.getElementById('nameModalLabel').textContent = 'Supplier Name';
            document.getElementById('newNameInput').value = '';
            document.getElementById('nameModal').classList.remove('hidden');
            document.getElementById('newNameInput').focus();
        };
    }

    if (document.getElementById('addClientBtn')) {
        document.getElementById('addClientBtn').onclick = () => {
            isAddingClient = true;
            document.getElementById('nameModalTitle').textContent = 'Add New Client';
            document.getElementById('nameModalLabel').textContent = 'Client / Factory Name';
            document.getElementById('newNameInput').value = '';
            document.getElementById('nameModal').classList.remove('hidden');
            document.getElementById('newNameInput').focus();
        };
    }

    // Summary Visibility Toggles
    ['toggleWeightBtn', 'toggleCostBtn', 'toggleProfitBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = () => {
                const key = id.replace('toggle', '').replace('Btn', '').toLowerCase(); // weight, cost, profit
                window.summaryVisibility[key] = !window.summaryVisibility[key];
                localStorage.setItem('veg_summary_vis', JSON.stringify(window.summaryVisibility));
                updateSummary(document.getElementById('searchInput').value.toLowerCase());
            };
        }
    });

    // Close Handler for All Modals (delegate or specific)
    ['closeModal', 'closeNameModal', 'closeDataModal', 'closeInvoiceModal', 'closeRemittanceModal', 'closeCloudModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = () => {
                const modal = el.closest('.modal');
                if (modal) modal.classList.add('hidden');
            };
        }
    });

    // Save Name
    if (document.getElementById('saveNameBtn')) {
        document.getElementById('saveNameBtn').onclick = () => {
            const nameInput = document.getElementById('newNameInput');
            const name = nameInput.value.trim();
            if (!name) return;

            if (isAddingClient) {
                if (!savedClients.includes(name)) {
                    savedClients.push(name);
                    savedClients.sort();
                    try { localStorage.setItem('veg_clients', JSON.stringify(savedClients)); } catch (e) { console.warn('Save failed:', e); }
                    showToast(`Client "${name}" added!`, 'success');
                    updateLists();
                    updateClientSelector();
                    // Auto-select the new client
                    document.getElementById('clientSelector').value = name;
                    selectedClient = name;
                    renderClientDashboard();
                } else {
                    showToast('Client already exists!', 'error');
                }
            } else {
                if (!savedSuppliers.includes(name)) {
                    savedSuppliers.push(name);
                    savedSuppliers.sort();
                    try { localStorage.setItem('veg_suppliers', JSON.stringify(savedSuppliers)); } catch (e) { console.warn('Save failed:', e); }
                    showToast(`Supplier "${name}" added!`, 'success');
                    updateLists();
                } else {
                    showToast('Supplier already exists!', 'error');
                }
            }
            document.getElementById('nameModal').classList.add('hidden');
        };
    }

    // Other Event Listeners (Inputs, etc.)
    if (document.getElementById('clientSelector')) {
        document.getElementById('clientSelector').onchange = (e) => {
            selectedClient = e.target.value;
            renderClientDashboard();
        };
    }

    // Category Change Listener for DR Field
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.onchange = () => {
            const drGroup = document.getElementById('drGroup');
            if (drGroup) {
                if (categorySelect.value === 'Trinidad Invoice') {
                    drGroup.style.display = 'block';
                } else {
                    drGroup.style.display = 'none';
                }
            }
        };
    }

    if (document.getElementById('trendSearchInput')) {
        document.getElementById('trendSearchInput').oninput = (e) => {
            renderTrends(e.target.value.toLowerCase());
        };
    }

    if (document.getElementById('searchInput')) {
        document.getElementById('searchInput').oninput = (e) => {
            const term = e.target.value.toLowerCase();
            renderList(term);
            updateSummary(term);
        };
    }

    if (document.getElementById('dataBtn')) {
        document.getElementById('dataBtn').onclick = () => {
            document.getElementById('dataModal').classList.remove('hidden');
        };
    }

    if (document.getElementById('clientInvoiceBtn')) {
        document.getElementById('clientInvoiceBtn').onclick = () => {
            document.getElementById('invoiceDate').valueAsDate = new Date();
            document.getElementById('invoiceModal').classList.remove('hidden');
        };
    }

    if (document.getElementById('generateInvoiceBtn')) {
        document.getElementById('generateInvoiceBtn').onclick = generateAndCopyInvoice;
    }

    // Remittance
    if (document.getElementById('remittanceBtn')) {
        document.getElementById('remittanceBtn').onclick = openRemittanceModal;
    }

    if (document.getElementById('generateRemittanceBtn')) {
        document.getElementById('generateRemittanceBtn').onclick = () => {
            const supplier = document.getElementById('remittanceSupplier').value;
            const dateFilter = document.getElementById('remittanceDate').value;

            if (!supplier) {
                alert('Please select a supplier.');
                return;
            }

            // Filter Logic: Supplier + Unpaid + Optional Date
            let relevant = transactions.filter(t => t.supplier === supplier && !t.isPaid);

            if (dateFilter) {
                relevant = relevant.filter(t => t.date === dateFilter);
            }

            if (relevant.length === 0) {
                showToast('No unpaid transactions found.', 'error');
                return;
            }

            // Sort by Date
            relevant.sort((a, b) => new Date(a.date) - new Date(b.date));

            pendingRemittanceIds = relevant.map(t => t.id);

            // Generate Text
            let text = `PAYMENT SUMMARY\nTo: ${supplier}\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
            let total = 0;

            relevant.forEach(t => {
                const lineTotal = t.weight * t.cost;
                total += lineTotal;
                text += `${t.date}: ${t.weight}kg ${t.item} @ ${t.cost} = ${formatCurrency(lineTotal)}\n`;
            });

            text += `\nTOTAL PAYABLE: ${formatCurrency(total)}`;

            // Show Preview
            const remittancePreview = document.getElementById('remittancePreview');
            remittancePreview.textContent = text;
            remittancePreview.style.display = 'block';

            // Show "Mark Paid" button
            document.getElementById('generateRemittanceBtn').style.display = 'none';
            const markPaidBtn = document.getElementById('markPaidBtn');
            markPaidBtn.style.display = 'block';

            // Copy to Clipboard
            navigator.clipboard.writeText(text).then(() => {
                showToast('Summary copied! Review below.', 'success');
            });
        };
    }

    if (document.getElementById('markPaidBtn')) {
        document.getElementById('markPaidBtn').onclick = () => {
            showConfirmModal(
                'Confirm Payment',
                `Mark these ${pendingRemittanceIds.length} items as PAID?`,
                () => {
                    transactions.forEach(t => {
                        if (pendingRemittanceIds.includes(t.id)) {
                            t.isPaid = true;
                        }
                    });
                    saveData();
                    saveData();
                    updateUI();
                    showToast('Items marked as PAID! ✅', 'success');
                    document.getElementById('remittanceModal').classList.add('hidden');
                }
            );
        };
    }

    // Profit Preview
    ['weight', 'cost', 'markup'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.oninput = calculateProfitPreview;
        }
    });

    // Auto-Calculate Net Weight (Gross - Sacks)
    const calculateNetWeight = () => {
        const gross = parseFloat(document.getElementById('grossWeight').value) || 0;
        const sacks = parseFloat(document.getElementById('sackCount').value) || 0;
        const netInput = document.getElementById('weight');

        if (gross > 0) {
            const net = gross - sacks; // 1kg deduction per sack
            netInput.value = net > 0 ? net.toFixed(1) : 0;
            calculateProfitPreview(); // Update profit if weight changed
        }
    };

    ['grossWeight', 'sackCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = calculateNetWeight;
    });

    // Form Save (Converted to Button Click to prevent page reload issues)
    if (document.getElementById('saveBtn')) {
        document.getElementById('saveBtn').onclick = (e) => {
            e.preventDefault();
            try {
                // Safety: Ensure Net Weight is calculated if missing
                const weightInput = document.getElementById('weight');
                if (weightInput && !weightInput.value) {
                    const grossInput = document.getElementById('grossWeight');
                    const sacksInput = document.getElementById('sackCount');
                    const gross = grossInput ? (parseFloat(grossInput.value) || 0) : 0;
                    const sacks = sacksInput ? (parseFloat(sacksInput.value) || 0) : 0;

                    if (gross > 0) {
                        const net = gross - sacks;
                        if (net > 0) weightInput.value = net.toFixed(1);
                    }
                }

                // Default 'General' if validation skipped and empty
                const catVal = document.getElementById('category').value;
                const clientVal = document.getElementById('client').value || 'General';
                const dateInput = document.getElementById('date');
                const dateVal = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split('T')[0];

                const editIdInput = document.getElementById('editTransactionId');
                const editId = editIdInput ? editIdInput.value : '';
                const isEdit = !!editId;

                const weightVal = parseFloat(document.getElementById('weight').value); // Can be NaN
                const sackCountInput = document.getElementById('sackCount');
                const sackCount = sackCountInput ? (parseInt(sackCountInput.value) || 0) : 0;

                const drInput = document.getElementById('drNumber');
                const gradeInput = document.getElementById('grade');
                const costInput = document.getElementById('cost');
                const markupInput = document.getElementById('markup');
                const isPaidInput = document.getElementById('isPaidNow');

                const transactionData = {
                    id: isEdit ? parseInt(editId) : Date.now(),
                    date: dateVal,
                    category: catVal,
                    client: clientVal,
                    supplier: document.getElementById('supplier').value || 'Unknown',
                    item: document.getElementById('item').value || '',
                    weight: weightVal || 0, // Ensure 0 if NaN for safety
                    sackCount: sackCount,
                    grade: gradeInput ? gradeInput.value : '',
                    drNumber: drInput ? drInput.value : '',
                    cost: costInput ? (parseFloat(costInput.value) || 0) : 0,
                    markup: markupInput ? (parseFloat(markupInput.value) || 0) : 0,
                    isPaid: isPaidInput ? isPaidInput.checked : false,
                    timestamp: isEdit ? undefined : new Date().toISOString()
                };

                if (isEdit) {
                    // Use window.transactions to ensure global scope
                    const index = window.transactions.findIndex(t => t.id === parseInt(editId));
                    if (index !== -1) {
                        transactionData.timestamp = window.transactions[index].timestamp;
                        window.transactions[index] = transactionData;
                    }
                } else {
                    window.transactions.unshift(transactionData);
                }

                saveData(); // Global function
                updateUI(); // Global function
                updateLists(); // Global function
                updateClientSelector(); // Global function

                resetForm();
                document.getElementById('modal').classList.add('hidden');
                showToast(isEdit ? 'Transaction Updated' : 'Transaction Saved', 'success');

            } catch (err) {
                console.error('Save Error:', err);
                alert('Failed to save transaction: ' + err.message);
            }
        };
    }

    // Cloud
    if (document.getElementById('cloudBtn')) {
        document.getElementById('cloudBtn').onclick = () => {
            document.getElementById('cloudUrlInput').value = syncUrl || '';
            document.getElementById('cloudModal').classList.remove('hidden');
        };
    }

    if (document.getElementById('saveCloudBtn')) {
        document.getElementById('saveCloudBtn').onclick = () => {
            const btn = document.getElementById('saveCloudBtn');
            const urlInput = document.getElementById('cloudUrlInput');
            const url = urlInput.value.trim();

            const originalText = btn.textContent;
            btn.textContent = 'Saving...';
            btn.style.opacity = '0.7';

            setTimeout(() => {
                if (url) {
                    setSyncUrl(url);
                    document.getElementById('cloudModal').classList.add('hidden');
                    setTimeout(() => showToast('Cloud URL saved! Syncing... ☁️', 'success'), 300);
                } else {
                    showToast('Please enter a valid URL.', 'error');
                }

                btn.textContent = originalText;
                btn.style.opacity = '1';
            }, 200);
        };
    }

    // Backup/Restore
    if (document.getElementById('backupBtn')) {
        document.getElementById('backupBtn').onclick = () => {
            const btn = document.getElementById('backupBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Preparing...';

            setTimeout(() => {
                const data = {
                    transactions: transactions,
                    clients: savedClients,
                    suppliers: savedSuppliers,
                    timestamp: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `veg_backup_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert('Backup downloaded! 💾');
                btn.textContent = originalText;
            }, 100);
        };
    }

    if (document.getElementById('restoreBtn')) {
        document.getElementById('restoreBtn').onclick = () => {
            document.getElementById('restoreInput').click();
        };
    }

    if (document.getElementById('restoreInput')) {
        document.getElementById('restoreInput').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.transactions && Array.isArray(data.transactions)) {
                        if (confirm(`Replace current data with backup from ${data.timestamp || 'unknown date'}?`)) {
                            transactions = data.transactions;
                            savedClients = data.clients || [];
                            savedSuppliers = data.suppliers || [];
                            saveData();
                            updateUI();
                            updateLists();
                            updateLists();
                            showToast('Data restored! ✅');
                            document.getElementById('dataModal').classList.add('hidden');
                        }
                    } else {
                        showToast('Invalid backup file.', 'error');
                    }
                } catch (err) {
                    console.error('Restore failed:', err);
                    showToast('Error reading file.', 'error');
                } finally {
                    e.target.value = '';
                }
            };
            reader.readAsText(file);
        };
    }

    if (document.getElementById('exportCsvBtn')) {
        document.getElementById('exportCsvBtn').onclick = () => {
            if (transactions.length === 0) {
                showToast('No data to export.', 'error');
                return;
            }

            let csv = 'Date,Client,Supplier,Item,Weight,Cost,Markup,Total Cost,Total Profit,Status\n';

            transactions.forEach(t => {
                const totalCost = t.weight * t.cost;
                const totalProfit = t.weight * t.markup;
                const status = t.isPaid ? 'PAID' : 'UNPAID';

                const safeClient = (t.client || '').replace(/,/g, ' ');
                const safeSupplier = t.supplier.replace(/,/g, ' ');
                const safeItem = t.item.replace(/,/g, ' ');

                csv += `${t.date},${safeClient},${safeSupplier},${safeItem},${t.weight},${t.cost},${t.markup},${totalCost},${totalProfit},${status}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `veg_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    }
}


document.addEventListener('DOMContentLoaded', initializeApp);


// Real-time profit calculation
function calculateProfitPreview() {
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    // const cost = parseFloat(document.getElementById('cost').value) || 0; // Cost doesn't affect profit (= markup * weight)
    const markup = parseFloat(document.getElementById('markup').value) || 0;

    // Profit = Weight * Markup
    const totalProfit = weight * markup;

    const profitPreview = document.getElementById('profitPreview');
    if (profitPreview) {
        profitPreview.textContent = formatCurrency(totalProfit);
    }
}

// Make globally accessible if needed by UI
window.calculateProfitPreview = calculateProfitPreview;


// Generic Confirmation Modal Logic
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    onConfirmAction = onConfirm;
    document.getElementById('confirmModal').classList.remove('hidden');
}
window.showConfirmModal = showConfirmModal;

// Invoice & Production Logic
function generateAndCopyInvoice() {
    const date = document.getElementById('invoiceDate').value;
    const shortTrip = parseFloat(document.getElementById('shortTripCost').value) || 0;
    const freight = parseFloat(document.getElementById('freightCost').value) || 0;
    // const feePercent = parseFloat(document.getElementById('processingFee').value) || 0; // Removed per user request

    let text = `Shipment Date: ${formatDate(date)}\n${selectedClient}\n`;
    let subtotal = 0;

    if (selectedClient === 'All') {
        showToast('Please select a specific Client first!', 'error');
        // prompt user visually to change the dropdown?
        const dropdown = document.getElementById('clientSelector');
        if (dropdown) {
            dropdown.focus();
            dropdown.style.boxShadow = '0 0 0 2px var(--accent-red)';
            setTimeout(() => dropdown.style.boxShadow = 'none', 1000);
        }
        document.getElementById('invoiceModal').classList.add('hidden');
        return;
    }

    // Filter Items for Date & Client
    const items = transactions.filter(t => t.client === selectedClient && t.date === date);

    if (items.length === 0) {
        showToast('No items found for this date.', 'error');
        return;
    }

    // Group by Item to match the "Ord cu 700kg..." format if needed,
    // BUT the user's screenshot showed individual lines for different rates.
    // So we will list them, but maybe group by item name if price is same?
    // Let's stick to listing them.

    items.forEach(t => {
        // For Factory: Selling Price = Cost (pass-through) because Fee is separate?
        // OR does the user manually set Markup?
        // User said: "Processing fee is the factory's payment... That's my profit"
        // This implies the Item Line is at COST.
        // Let's assume the 'price' listed in the screenshot (45.00, 50.00) is the BASE COST.

        const price = t.cost;
        const lineTotal = t.weight * price;
        subtotal += lineTotal;

        text += `${t.item} ${t.weight}kg @ ${price} = ${formatCurrency(lineTotal)}\n`;
    });

    text += `\nSubtotal: ${formatCurrency(subtotal)}\n`;

    if (shortTrip > 0) text += `Short trip: ${formatCurrency(shortTrip)}\n`;
    if (freight > 0) text += `Freight: ${formatCurrency(freight)}\n`;

    // Removed Processing Fee Logic
    /*
    let feeAmount = 0;
    if (feePercent > 0) {
        feeAmount = subtotal * (feePercent / 100);
        text += `Processing fee (${feePercent}%): ${formatCurrency(feeAmount)}\n`;
    }
    */
    const grandTotal = subtotal + shortTrip + freight; // + feeAmount;
    text += `\nTOTAL: ${formatCurrency(grandTotal)}`;

    const preview = document.getElementById('invoicePreview');
    preview.textContent = text;
    preview.style.display = 'block';

    navigator.clipboard.writeText(text).then(() => showToast('Invoice copied!', 'success'));
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`; // MM/DD/YY
}

function generateProductionList() {
    const today = new Date().toISOString().split('T')[0]; // Default to today or handle selection?
    // Use the Invoice Date if modal is open, or just current constraints.
    // Actually, usually production is for "Tomorrow's shipment" or "Today's processing".
    // Let's filter by Selected Client and maybe show a prompt or just all 'unpaid/recent'?
    // User said: "Breakdown for Dec 11 shipment".
    // Let's use the Date Input from the Invoice Modal if available, or a new date picker?
    // Simpler: Just use current Client View filter (which is just 'All Time' usually).
    // Better: Add a date filter to Client View?
    // For now, let's grab ALL items for the Selected Client that are on the "Latest Date" found in the list?
    // Or just all items.

    // Correction: Production Text is usually "10 sacks cucumber".
    // I need to Aggregate by Item.

    // Let's use the latest date present in the transactions for this client.
    const clientTxs = transactions.filter(t => t.client === selectedClient);
    if (clientTxs.length === 0) return;

    // Find latest date
    const dates = clientTxs.map(t => t.date).sort();
    const latestDate = dates[dates.length - 1];

    const todayItems = clientTxs.filter(t => t.date === latestDate);

    const summary = {}; // { 'Cucumber': 10, 'Carrots': 5 }

    todayItems.forEach(t => {
        const key = t.item + (t.grade ? ` ${t.grade}` : ''); // Group by Item+Grade
        summary[key] = (summary[key] || 0) + (t.sackCount || 0);
    });

    let text = `Subject: Shipment for ${latestDate}\n\n`;
    for (const [item, sacks] of Object.entries(summary)) {
        text += `${sacks} sacks ${item}\n`;
    }

    navigator.clipboard.writeText(text).then(() => showToast('Production list copied!', 'success'));
}

// Attach listener for the new button
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'productionBtn') {
        generateProductionList();
    }
});
// Network Status Listeners
window.addEventListener('online', () => {
    console.log('Online: Attempting sync...');
    if (syncUrl) syncData();
});

// Helper to reset form
function resetForm() {
    const form = document.getElementById('transactionForm');
    if (form) form.reset();

    const editId = document.getElementById('editTransactionId');
    if (editId) editId.value = '';

    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.textContent = 'Save Transaction';

    const headerTitle = document.querySelector('.modal-header h2');
    if (headerTitle) headerTitle.textContent = 'New Delivery';

    // Set default date to today
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();

    // Hide DR group by default
    const drGroup = document.getElementById('drGroup');
    if (drGroup) drGroup.style.display = 'none';

    // Reset Profit Preview
    if (window.calculateProfitPreview) window.calculateProfitPreview();
    else if (typeof calculateProfitPreview === 'function') calculateProfitPreview();
}
