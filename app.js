// Main Application Logic

// DOM Elements (For Event Listeners)
// Note: Many elements are already selected in ui.js, but we re-select here for clarity in event binding
// or we could rely on them being global if we exported them, but local selection is safer.

// Global State (Shared between ui.js and app.js)
window.transactionToPay = null;
window.transactionToDelete = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').valueAsDate = new Date();
    renderList();
    updateSummary();
    updateLists(); // Updates both Client and Supplier lists
    updateClientSelector();
});

// Privacy Toggle for Summary
if (document.getElementById('summaryPrivacyBtn')) {
    document.getElementById('summaryPrivacyBtn').addEventListener('click', () => {
        isSummaryHidden = !isSummaryHidden;
        updateSummary(document.getElementById('searchInput').value.toLowerCase());
        document.getElementById('summaryPrivacyBtn').textContent = isSummaryHidden ? '🔒' : '👁️';
    });
}

// Mode Toggle
document.getElementById('modeBtn').addEventListener('click', () => {
    isClientMode = !isClientMode;
    updateModeUI();
});

// Add Buttons
document.getElementById('addBtn').addEventListener('click', () => {
    resetForm();
    document.getElementById('modal').classList.remove('hidden');
});

document.getElementById('addSupplierBtn').addEventListener('click', () => {
    isAddingClient = false;
    document.getElementById('nameModalTitle').textContent = 'Add New Supplier';
    document.getElementById('nameModalLabel').textContent = 'Supplier Name';
    document.getElementById('newNameInput').value = '';
    document.getElementById('nameModal').classList.remove('hidden');
    document.getElementById('newNameInput').focus();
});

document.getElementById('addClientBtn').addEventListener('click', () => {
    isAddingClient = true;
    document.getElementById('nameModalTitle').textContent = 'Add New Client';
    document.getElementById('nameModalLabel').textContent = 'Client / Factory Name';
    document.getElementById('newNameInput').value = '';
    document.getElementById('nameModal').classList.remove('hidden');
    document.getElementById('newNameInput').focus();
});

// Close Modals
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('modal').classList.add('hidden');
});
document.getElementById('closeNameModal').addEventListener('click', () => {
    document.getElementById('nameModal').classList.add('hidden');
});
document.getElementById('closeDataModal').addEventListener('click', () => {
    document.getElementById('dataModal').classList.add('hidden');
});
document.getElementById('closeInvoiceModal').addEventListener('click', () => {
    document.getElementById('invoiceModal').classList.add('hidden');
});
if (document.getElementById('closeRemittanceModal')) {
    document.getElementById('closeRemittanceModal').addEventListener('click', () => {
        document.getElementById('remittanceModal').classList.add('hidden');
    });
}

// Save Name Logic
document.getElementById('saveNameBtn').addEventListener('click', () => {
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
});

// Client Selector
document.getElementById('clientSelector').addEventListener('change', (e) => {
    selectedClient = e.target.value;
    renderClientDashboard();
});

// Trend Search
document.getElementById('trendSearchInput').addEventListener('input', (e) => {
    renderTrends(e.target.value.toLowerCase());
});

// Search
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    renderList(term);
    updateSummary(term);
});

// Data Button
document.getElementById('dataBtn').addEventListener('click', () => {
    document.getElementById('dataModal').classList.remove('hidden');
});

// Invoice Button
document.getElementById('clientInvoiceBtn').addEventListener('click', () => {
    document.getElementById('invoiceDate').valueAsDate = new Date(); // Default to Today
    document.getElementById('invoiceModal').classList.remove('hidden');
});

document.getElementById('generateInvoiceBtn').addEventListener('click', generateAndCopyInvoice);

// Remittance Logic
const remittanceBtn = document.getElementById('remittanceBtn');
if (remittanceBtn) {
    remittanceBtn.addEventListener('click', openRemittanceModal);
}

function openRemittanceModal() {
    const remittanceSupplier = document.getElementById('remittanceSupplier');
    const remittanceModal = document.getElementById('remittanceModal');
    const remittancePreview = document.getElementById('remittancePreview');
    const markPaidBtn = document.getElementById('markPaidBtn');
    const generateRemittanceBtn = document.getElementById('generateRemittanceBtn');

    // Populate Supplier Dropdown
    const suppliers = [...new Set(transactions.map(t => t.supplier))].sort();
    remittanceSupplier.innerHTML = '<option value="" disabled selected>Select a Supplier</option>' +
        suppliers.map(s => `<option value="${s}">${s}</option>`).join('');

    remittanceModal.classList.remove('hidden');
    remittancePreview.style.display = 'none';
    markPaidBtn.style.display = 'none';
    generateRemittanceBtn.style.display = 'block';
};

const generateRemittanceBtn = document.getElementById('generateRemittanceBtn');
if (generateRemittanceBtn) {
    generateRemittanceBtn.addEventListener('click', () => {
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
        generateRemittanceBtn.style.display = 'none';
        const markPaidBtn = document.getElementById('markPaidBtn');
        markPaidBtn.style.display = 'block';

        // Copy to Clipboard
        navigator.clipboard.writeText(text).then(() => {
            showToast('Summary copied! Review below.', 'success');
        });
    });
}

const markPaidBtn = document.getElementById('markPaidBtn');
if (markPaidBtn) {
    markPaidBtn.addEventListener('click', () => {
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
    });
}

// Real-time profit calculation
['weight', 'cost', 'markup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', calculateProfitPreview);
    }
});

// Form Submission
const transactionForm = document.getElementById('transactionForm');
if (transactionForm) {
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const editId = document.getElementById('editTransactionId').value;
        const isEdit = !!editId;

        // Auto-Deduction Logic
        let weight = parseFloat(document.getElementById('weight').value);
        const sackCount = parseInt(document.getElementById('sackCount').value) || 0;

        // Use basic assumption: User enters Net Weight directly in the "Net Weight" field
        // But if they entered a sack count, we assume they might want to deduct?
        // Actually, the label says "Net Weight", so we trust their input.
        // We just store the sack count for record.

        const transactionData = {
            id: isEdit ? parseInt(editId) : Date.now(),
            date: document.getElementById('date').value,
            category: document.getElementById('category').value,
            client: document.getElementById('client').value || 'General',
            supplier: document.getElementById('supplier').value,
            item: document.getElementById('item').value,
            weight: weight,
            sackCount: sackCount,
            grade: document.getElementById('grade').value,
            drNumber: document.getElementById('drNumber').value,
            cost: parseFloat(document.getElementById('cost').value),
            markup: parseFloat(document.getElementById('markup').value) || 0,
            isPaid: document.getElementById('isPaidNow').checked,
            timestamp: isEdit ? undefined : new Date().toISOString()
        };

        if (isEdit) {
            const index = transactions.findIndex(t => t.id === parseInt(editId));
            if (index !== -1) {
                transactionData.timestamp = transactions[index].timestamp;
                transactions[index] = transactionData;
            }
        } else {
            transactions.unshift(transactionData);
        }

        saveData();
        updateUI();
        updateLists();
        updateClientSelector();

        resetForm();
        document.getElementById('modal').classList.add('hidden');
        showToast(isEdit ? 'Transaction Updated' : 'Transaction Saved', 'success');
    });
}

// Payment Modal Actions
document.getElementById('confirmPayment').addEventListener('click', () => {
    try {
        if (transactionToPay) {
            const t = transactions.find(t => t.id === transactionToPay);
            if (t) {
                t.isPaid = true;
                saveData();
                renderList(document.getElementById('searchInput').value.toLowerCase());
                updateSummary(document.getElementById('searchInput').value.toLowerCase());
            }
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('An error occurred while updating the payment status.');
    } finally {
        document.getElementById('paymentModal').classList.add('hidden');
        transactionToPay = null;
    }
});

document.getElementById('cancelPayment').addEventListener('click', () => {
    document.getElementById('paymentModal').classList.add('hidden');
    transactionToPay = null;
});

// Delete Modal Actions
document.getElementById('confirmDelete').addEventListener('click', () => {
    try {
        if (transactionToDelete) {
            transactions = transactions.filter(t => t.id !== transactionToDelete);
            saveData();
            updateUI();
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('An error occurred while deleting the transaction.');
    } finally {
        document.getElementById('deleteModal').classList.add('hidden');
        transactionToDelete = null;
    }
});

document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.add('hidden');
    transactionToDelete = null;
});

// Global Click (Close Modals)
window.addEventListener('click', (e) => {
    const modal = document.getElementById('modal');
    const deleteModal = document.getElementById('deleteModal');
    const paymentModal = document.getElementById('paymentModal');
    const invoiceModal = document.getElementById('invoiceModal');
    const remittanceModal = document.getElementById('remittanceModal');
    const dataModal = document.getElementById('dataModal');
    const nameModal = document.getElementById('nameModal');

    if (e.target === modal) modal.classList.add('hidden');
    if (e.target === deleteModal) deleteModal.classList.add('hidden');
    if (e.target === paymentModal) paymentModal.classList.add('hidden');
    if (e.target === invoiceModal) invoiceModal.classList.add('hidden');
    if (e.target === remittanceModal) remittanceModal.classList.add('hidden');
    if (e.target === dataModal) dataModal.classList.add('hidden');
    if (e.target === nameModal) nameModal.classList.add('hidden');
    if (e.target === nameModal) nameModal.classList.add('hidden');
    if (e.target === document.getElementById('cloudModal')) document.getElementById('cloudModal').classList.add('hidden');
    if (e.target === document.getElementById('confirmModal')) document.getElementById('confirmModal').classList.add('hidden');
});

// Generic Confirmation Modal Logic
let onConfirmAction = null;

function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    onConfirmAction = onConfirm;
    document.getElementById('confirmModal').classList.remove('hidden');
}

document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.add('hidden');
    onConfirmAction = null;
});

document.getElementById('confirmOkBtn').addEventListener('click', () => {
    if (onConfirmAction) {
        onConfirmAction();
    }
    document.getElementById('confirmModal').classList.add('hidden');
    onConfirmAction = null;
});

// Cloud Sync Logic
document.getElementById('cloudBtn').addEventListener('click', () => {
    document.getElementById('cloudUrlInput').value = syncUrl || '';
    document.getElementById('cloudModal').classList.remove('hidden');
});

document.getElementById('closeCloudModal').addEventListener('click', () => {
    document.getElementById('cloudModal').classList.add('hidden');
});

document.getElementById('saveCloudBtn').addEventListener('click', () => {
    const btn = document.getElementById('saveCloudBtn');
    const urlInput = document.getElementById('cloudUrlInput');
    const url = urlInput.value.trim();

    // Visual Feedback
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.style.opacity = '0.7';

    setTimeout(() => {
        if (url) {
            setSyncUrl(url);
            // Close modal immediately for better responsiveness
            document.getElementById('cloudModal').classList.add('hidden');
            // Show toast/alert after a slight delay
            setTimeout(() => showToast('Cloud URL saved! Syncing... ☁️', 'success'), 300);
        } else {
            showToast('Please enter a valid URL.', 'error');
        }

        // Reset button
        btn.textContent = originalText;
        btn.style.opacity = '1';
    }, 200); // Artificial delay to show the click registered
});

// Data Management (Backup/Restore/Export)
document.getElementById('backupBtn').addEventListener('click', () => {
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
});

document.getElementById('restoreBtn').addEventListener('click', () => {
    document.getElementById('restoreInput').click();
});

document.getElementById('restoreInput').addEventListener('change', (e) => {
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
            e.target.value = ''; // Reset input so same file can be selected again
        }
    };
    reader.readAsText(file);
});

document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (transactions.length === 0) {
        showToast('No data to export.', 'error');
        return;
    }

    // CSV Header
    let csv = 'Date,Client,Supplier,Item,Weight,Cost,Markup,Total Cost,Total Profit,Status\n';

    // CSV Rows
    transactions.forEach(t => {
        const totalCost = t.weight * t.cost;
        const totalProfit = t.weight * t.markup;
        const status = t.isPaid ? 'PAID' : 'UNPAID';

        // Escape commas in strings
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
});

// Network Status Listeners
window.addEventListener('online', () => {
    console.log('Online: Attempting sync...');
    if (syncUrl) syncData();
});
