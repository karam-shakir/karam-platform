// ============================================
// Operator Financial Management
// ============================================

class FinanceManager {
    constructor() {
        this.platformWalletId = '00000000-0000-0000-0000-000000000001';
        this.init();
    }

    async init() {
        // Check authentication
        if (!karamAuth.requireAuth(['operator'])) {
            return;
        }

        await this.loadWalletOverview();
        await this.loadPendingPayouts();
        await this.loadWithdrawalRequests();
        await this.loadTransactionHistory();
    }

    // ============================================
    // Tab Management
    // ============================================

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        event.target.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Reload data if needed
        if (tabName === 'payouts') {
            this.loadPendingPayouts();
        } else if (tabName === 'withdrawals') {
            this.loadWithdrawalRequests();
        } else if (tabName === 'history') {
            this.loadTransactionHistory();
        }
    }

    // ============================================
    // Wallet Overview
    // ============================================

    async loadWalletOverview() {
        try {
            const { data, error } = await karamDB.select('platform_wallet', {
                eq: { id: this.platformWalletId },
                single: true
            });

            if (error) throw error;

            document.getElementById('platform-balance').textContent =
                i18n.formatCurrency(data.balance);

            document.getElementById('total-paid').textContent =
                i18n.formatCurrency(data.total_paid_to_families);

            // Get pending payouts amount
            await this.loadPendingStats();

        } catch (error) {
            console.error('Error loading wallet overview:', error);
        }
    }

    async loadPendingStats() {
        try {
            const { data, error } = await karamDB.select('pending_payouts', {});

            if (error) throw error;

            const totalPending = data?.reduce((sum, payout) => sum + parseFloat(payout.amount), 0) || 0;
            const count = data?.length || 0;

            document.getElementById('pending-amount').textContent =
                i18n.formatCurrency(totalPending);

            document.getElementById('pending-count').textContent =
                `${count} ${count === 1 ? 'دفعة' : 'دفعات'} قيد الانتظار`;

        } catch (error) {
            console.error('Error loading pending stats:', error);
        }
    }

    // ============================================
    // Pending Payouts
    // ============================================

    async loadPendingPayouts() {
        try {
            const { data, error } = await karamDB.select('pending_payouts', {
                order: { column: 'created_at', ascending: true }
            });

            if (error) throw error;

            this.renderPayouts(data || []);

        } catch (error) {
            console.error('Error loading pending payouts:', error);
        }
    }

    renderPayouts(payouts) {
        const tbody = document.getElementById('payouts-tbody');

        if (payouts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-state-icon">✅</div>
                        <p>لا توجد دفعات معلقة</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = payouts.map(payout => {
            const isAutoEligible = new Date(payout.auto_payout_eligible_at) <= new Date();
            const balanceIndicatorClass = payout.has_sufficient_balance ? 'sufficient' : 'insufficient';

            return `
                <tr>
                    <td>
                        ${payout.family_name}<br>
                        <small style="color:#999;">${payout.contact_phone}</small>
                    </td>
                    <td>#${payout.booking_number}</td>
                    <td><strong>${i18n.formatCurrency(payout.amount)}</strong></td>
                    <td>
                        ${i18n.formatDate(payout.auto_payout_eligible_at, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            })}
                        ${isAutoEligible ? '<br><span class="status-badge status-approved">✅ مؤهل للصرف التلقائي</span>' : ''}
                    </td>
                    <td>
                        <span class="balance-indicator ${balanceIndicatorClass}"></span>
                        ${i18n.formatCurrency(payout.current_wallet_balance)}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-approve" onclick="financeManager.approvePayout('${payout.id}', true)">
                                ✅ موافقة
                            </button>
                            <button class="btn-reject" onclick="financeManager.approvePayout('${payout.id}', false)">
                                ❌ رفض
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async approvePayout(payoutId, approve) {
        const action = approve ? 'الموافقة على' : 'رفض';

        if (!confirm(`هل أنت متأكد من ${action} هذه الدفعة؟`)) {
            return;
        }

        let rejectionReason = null;
        if (!approve) {
            rejectionReason = prompt('سبب الرفض (اختياري):');
        }

        try {
            const { user } = await karamDB.getCurrentUser();

            const { data, error } = await karamDB.rpc('approve_family_payout', {
                p_transaction_id: payoutId,
                p_operator_id: user.id,
                p_approve: approve,
                p_rejection_reason: rejectionReason
            });

            if (error) throw error;

            const result = data[0];

            if (result.success) {
                alert(`✅ ${result.message}`);
                await this.loadPendingPayouts();
                await this.loadWalletOverview();
            } else {
                alert(`❌ ${result.message}`);
            }

        } catch (error) {
            console.error('Error approving payout:', error);
            alert('حدث خطأ أثناء معالجة الطلب');
        }
    }

    async processAllAutomaticPayouts() {
        if (!confirm('هل تريد معالجة جميع الدفعات المؤهلة للصرف التلقائي؟')) {
            return;
        }

        try {
            const { data, error } = await karamDB.rpc('process_automatic_payouts');

            if (error) throw error;

            const result = data[0];
            alert(`✅ تمت معالجة ${result.processed_count} دفعة بنجاح`);

            await this.loadPendingPayouts();
            await this.loadWalletOverview();

        } catch (error) {
            console.error('Error processing automatic payouts:', error);
            alert('حدث خطأ أثناء معالجة الدفعات');
        }
    }

    // ============================================
    // Withdrawal Requests
    // ============================================

    async loadWithdrawalRequests() {
        try {
            const { data, error } = await karamDB.select('pending_withdrawals', {});

            if (error) throw error;

            this.renderWithdrawals(data || []);

        } catch (error) {
            console.error('Error loading withdrawal requests:', error);
        }
    }

    renderWithdrawals(withdrawals) {
        const tbody = document.getElementById('withdrawals-tbody');

        if (withdrawals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-icon">✅</div>
                        <p>لا توجد طلبات سحب</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = withdrawals.map(withdrawal => {
            const balanceIndicatorClass = withdrawal.has_sufficient_balance ? 'sufficient' : 'insufficient';

            return `
                <tr>
                    <td>
                        ${withdrawal.family_name}<br>
                        <small style="color:#999;">${withdrawal.contact_phone}</small>
                    </td>
                    <td><strong>${i18n.formatCurrency(withdrawal.amount)}</strong></td>
                    <td>${withdrawal.bank_name}</td>
                    <td style="direction:ltr; text-align:right;">${withdrawal.iban}</td>
                    <td>
                        <span class="balance-indicator ${balanceIndicatorClass}"></span>
                        ${i18n.formatCurrency(withdrawal.current_wallet_balance)}
                        ${!withdrawal.has_sufficient_balance ? '<br><small style="color:#dc3545;">رصيد غير كافٍ</small>' : ''}
                    </td>
                    <td>
                        ${i18n.formatDate(withdrawal.requested_at, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            })}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-approve" 
                                onclick="financeManager.approveWithdrawal('${withdrawal.id}', true)"
                                ${!withdrawal.has_sufficient_balance ? 'disabled' : ''}>
                                ✅ موافقة
                            </button>
                            <button class="btn-reject" onclick="financeManager.approveWithdrawal('${withdrawal.id}', false)">
                                ❌ رفض
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async approveWithdrawal(withdrawalId, approve) {
        const action = approve ? 'الموافقة على' : 'رفض';

        if (!confirm(`هل أنت متأكد من ${action} طلب السحب؟`)) {
            return;
        }

        let rejectionReason = null;
        if (!approve) {
            rejectionReason = prompt('سبب الرفض (اختياري):');
        }

        try {
            const { user } = await karamDB.getCurrentUser();

            const { data, error } = await karamDB.rpc('approve_withdrawal_request', {
                p_withdrawal_id: withdrawalId,
                p_operator_id: user.id,
                p_approve: approve,
                p_rejection_reason: rejectionReason
            });

            if (error) throw error;

            const result = data[0];

            if (result.success) {
                alert(`✅ ${result.message}`);

                // If approved, ask for bank transfer reference
                if (approve) {
                    const transferRef = prompt('رقم التحويل البنكي (بعد إتمام التحويل):');
                    if (transferRef) {
                        await this.completeWithdrawal(withdrawalId, transferRef);
                    }
                }

                await this.loadWithdrawalRequests();
            } else {
                alert(`❌ ${result.message}`);
            }

        } catch (error) {
            console.error('Error approving withdrawal:', error);
            alert('حدث خطأ أثناء معالجة الطلب');
        }
    }

    async completeWithdrawal(withdrawalId, transactionRef) {
        try {
            const { data, error } = await karamDB.rpc('complete_withdrawal', {
                p_withdrawal_id: withdrawalId,
                p_transaction_reference: transactionRef
            });

            if (error) throw error;

            const result = data[0];

            if (result.success) {
                alert(`✅ ${result.message}`);
                await this.loadWithdrawalRequests();
                await this.loadWalletOverview();
            }

        } catch (error) {
            console.error('Error completing withdrawal:', error);
            alert('حدث خطأ أثناء إتمام السحب');
        }
    }

    // ============================================
    // Transaction History
    // ============================================

    async loadTransactionHistory() {
        try {
            const { data, error } = await karamDB.select('platform_transactions', {
                order: { column: 'created_at', ascending: false },
                limit: 50
            });

            if (error) throw error;

            this.renderHistory(data || []);

        } catch (error) {
            console.error('Error loading transaction history:', error);
        }
    }

    renderHistory(transactions) {
        const tbody = document.getElementById('history-tbody');

        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-icon">📜</div>
                        <p>لا توجد معاملات</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transactions.map(tx => {
            const isIncoming = ['payment_received', 'commission_earned'].includes(tx.transaction_type);
            const amountClass = isIncoming ? 'color:#28a745' : 'color:#dc3545';
            const amountPrefix = isIncoming ? '+' : '-';

            return `
                <tr>
                    <td>
                        ${i18n.formatDate(tx.created_at, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            })}
                    </td>
                    <td>${this.getTransactionTypeText(tx.transaction_type)}</td>
                    <td style="${amountClass}">
                        <strong>${amountPrefix}${i18n.formatCurrency(tx.amount)}</strong>
                    </td>
                    <td>${tx.description || '-'}</td>
                    <td>${i18n.formatCurrency(tx.balance_after)}</td>
                </tr>
            `;
        }).join('');
    }

    getTransactionTypeText(type) {
        const types = {
            'payment_received': '💰 دفع مستلم',
            'commission_earned': '📈 عمولة محصّلة',
            'payout_to_family': '💸 دفع لعائلة',
            'refund_issued': '↩️ استرداد صادر',
            'adjustment': '⚙️ تعديل'
        };
        return types[type] || type;
    }
}

// Initialize
const financeManager = new FinanceManager();
