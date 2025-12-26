// ============================================
// Family Wallet Management
// ============================================

class WalletManager {
    constructor() {
        this.familyData = null;
        this.walletData = null;
        this.init();
    }

    async init() {
        if (!karamAuth.requireAuth(['family'])) {
            return;
        }

        await this.loadFamilyData();
        await this.loadWallet();
        await this.loadTransactions();
        await this.loadWithdrawals();
    }

    async loadFamilyData() {
        try {
            const { user } = await karamDB.getCurrentUser();
            const { data } = await karamDB.select('families', {
                eq: { user_id: user.id },
                single: true
            });

            this.familyData = data;
            document.getElementById('family-name').textContent = data.family_name;
        } catch (error) {
            console.error('Error loading family data:', error);
        }
    }

    async loadWallet() {
        try {
            const { data } = await karamDB.select('wallets', {
                eq: { family_id: this.familyData.id },
                single: true
            });

            this.walletData = data;

            document.getElementById('wallet-balance').textContent =
                i18n.formatCurrency(data.balance);

            document.getElementById('last-updated').textContent =
                i18n.formatDate(data.updated_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' });

            // Calculate stats
            const { data: transactions } = await karamDB.select('wallet_transactions', {
                eq: { wallet_id: data.id }
            });

            const totalEarned = transactions
                ?.filter(t => ['booking_payment', 'payout_received'].includes(t.transaction_type))
                ?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

            const totalWithdrawn = transactions
                ?.filter(t => t.transaction_type === 'withdrawal')
                ?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

            const { data: pending } = await karamDB.select('wallet_transactions', {
                eq: {
                    wallet_id: data.id,
                    payout_status: 'pending'
                }
            });

            const pendingAmount = pending?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

            document.getElementById('total-earned').textContent = i18n.formatCurrency(totalEarned);
            document.getElementById('total-withdrawn').textContent = i18n.formatCurrency(totalWithdrawn);
            document.getElementById('pending-amount').textContent = i18n.formatCurrency(pendingAmount);

        } catch (error) {
            console.error('Error loading wallet:', error);
        }
    }

    switchTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        if (tab === 'transactions') {
            this.loadTransactions();
        } else if (tab === 'withdrawals') {
            this.loadWithdrawals();
        }
    }

    async loadTransactions() {
        try {
            const { data } = await karamDB.select('wallet_transactions', {
                eq: { wallet_id: this.walletData.id },
                order: { column: 'created_at', ascending: false },
                limit: 50
            });

            this.renderTransactions(data || []);
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    renderTransactions(transactions) {
        const tbody = document.getElementById('transactions-tbody');

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد معاملات</td></tr>';
            return;
        }

        tbody.innerHTML = transactions.map(tx => {
            const isIncoming = ['booking_payment', 'payout_received'].includes(tx.transaction_type);
            const amountClass = isIncoming ? 'text-success' : 'text-danger';
            const amountPrefix = isIncoming ? '+' : '-';

            return `
                <tr>
                    <td>${i18n.formatDate(tx.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</td>
                    <td>${this.getTransactionTypeText(tx.transaction_type)}</td>
                    <td>${tx.description || '-'}</td>
                    <td class="${amountClass}"><strong>${amountPrefix}${i18n.formatCurrency(tx.amount)}</strong></td>
                    <td>${i18n.formatCurrency(tx.balance_after)}</td>
                </tr>
            `;
        }).join('');
    }

    getTransactionTypeText(type) {
        const types = {
            'booking_payment': '💰 دفعة حجز',
            'payout_received': '✅ صرف دفعة',
            'withdrawal': '💸 سحب',
            'refund': '↩️ استرداد'
        };
        return types[type] || type;
    }

    async loadWithdrawals() {
        try {
            const { data } = await karamDB.select('withdrawal_requests', {
                eq: { wallet_id: this.walletData.id },
                order: { column: 'requested_at', ascending: false }
            });

            this.renderWithdrawals(data || []);
        } catch (error) {
            console.error('Error loading withdrawals:', error);
        }
    }

    renderWithdrawals(withdrawals) {
        const tbody = document.getElementById('withdrawals-tbody');

        if (withdrawals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد طلبات سحب</td></tr>';
            return;
        }

        tbody.innerHTML = withdrawals.map(w => `
            <tr>
                <td>${i18n.formatDate(w.requested_at, { month: 'short', day: 'numeric' })}</td>
                <td><strong>${i18n.formatCurrency(w.amount)}</strong></td>
                <td>${w.bank_name}</td>
                <td><span class="badge badge-${this.getStatusClass(w.status)}">${this.getStatusText(w.status)}</span></td>
                <td>${w.notes || '-'}</td>
            </tr>
        `).join('');
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'warning',
            'approved': 'info',
            'completed': 'success',
            'rejected': 'danger'
        };
        return classes[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            'pending': 'قيد المراجعة',
            'approved': 'موافق عليه',
            'completed': 'مكتمل',
            'rejected': 'مرفوض'
        };
        return texts[status] || status;
    }

    showWithdrawModal() {
        document.getElementById('withdraw-modal').style.display = 'block';
        document.getElementById('modal-balance').textContent =
            i18n.formatCurrency(this.walletData.balance);
    }

    closeWithdrawModal() {
        document.getElementById('withdraw-modal').style.display = 'none';
        document.getElementById('withdraw-amount').value = '';
        document.getElementById('bank-name').value = '';
        document.getElementById('iban').value = '';
        document.getElementById('withdraw-notes').value = '';
    }

    async submitWithdrawal() {
        const amount = parseFloat(document.getElementById('withdraw-amount').value);
        const bankName = document.getElementById('bank-name').value.trim();
        const iban = document.getElementById('iban').value.trim();
        const notes = document.getElementById('withdraw-notes').value.trim();

        if (!amount || amount < 50) {
            alert('المبلغ يجب أن يكون 50 ريال على الأقل');
            return;
        }

        if (amount > this.walletData.balance) {
            alert('المبلغ المطلوب أكبر من رصيدك المتاح');
            return;
        }

        if (!bankName) {
            alert('يرجى إدخال اسم البنك');
            return;
        }

        if (!iban || iban.length < 24) {
            alert('يرجى إدخال IBAN صحيح');
            return;
        }

        try {
            const { error } = await karamDB.insert('withdrawal_requests', {
                wallet_id: this.walletData.id,
                amount: amount,
                bank_name: bankName,
                iban: iban,
                notes: notes,
                status: 'pending'
            });

            if (error) throw error;

            alert('✅ تم إرسال طلب السحب بنجاح!\nسيتم مراجعته من قبل الإدارة.');
            this.closeWithdrawModal();
            await this.loadWithdrawals();

        } catch (error) {
            console.error('Error submitting withdrawal:', error);
            alert('حدث خطأ أثناء إرسال الطلب');
        }
    }
}

const walletManager = new WalletManager();
