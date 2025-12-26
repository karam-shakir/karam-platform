// ============================================
// Operator SMS Management
// ============================================

class SMSManager {
    constructor() {
        this.currentBalance = 0;
        this.selectedRecipientType = null;
        this.templates = [];
        this.init();
    }

    async init() {
        // Check authentication
        if (!karamAuth.requireAuth(['operator'])) {
            return;
        }

        await this.loadBalance();
        await this.loadTemplates();
        await this.loadHistory();
        await this.loadStats();
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
        if (tabName === 'history') {
            this.loadHistory();
        } else if (tabName === 'stats') {
            this.loadStats();
        }
    }

    // ============================================
    // Load Balance
    // ============================================

    async loadBalance() {
        try {
            const { data, error } = await karamDB.select('sms_accounts', {
                eq: { is_active: true },
                single: true
            });

            if (error) throw error;

            this.currentBalance = data?.balance || 0;
            document.getElementById('sms-balance').textContent =
                i18n.formatNumber(this.currentBalance, 0);

        } catch (error) {
            console.error('Error loading SMS balance:', error);
        }
    }

    // ============================================
    // Recharge Balance
    // ============================================

    showRechargeModal() {
        document.getElementById('recharge-modal').style.display = 'flex';
    }

    hideRechargeModal() {
        document.getElementById('recharge-modal').style.display = 'none';
        document.getElementById('recharge-amount').value = '';
        document.getElementById('recharge-notes').value = '';
    }

    async processRecharge() {
        const amount = parseFloat(document.getElementById('recharge-amount').value);
        const notes = document.getElementById('recharge-notes').value;

        if (!amount || amount < 10) {
            alert('يرجى إدخال مبلغ صحيح (الحد الأدنى 10 ريال)');
            return;
        }

        try {
            const { user } = await karamDB.getCurrentUser();

            // Get SMS account
            const { data: account } = await karamDB.select('sms_accounts', {
                eq: { is_active: true },
                single: true
            });

            // Call recharge function
            const { data, error } = await karamDB.rpc('recharge_sms_balance', {
                p_sms_account_id: account.id,
                p_amount: amount,
                p_description: notes || `شحن رصيد - ${amount} رسالة`,
                p_operator_id: user.id
            });

            if (error) throw error;

            const result = data[0];

            if (result.success) {
                alert(`✅ تم شحن الرصيد بنجاح!\nالرصيد الجديد: ${i18n.formatNumber(result.new_balance, 0)} رسالة`);
                this.hideRechargeModal();
                await this.loadBalance();
            }

        } catch (error) {
            console.error('Error recharging balance:', error);
            alert('حدث خطأ أثناء شحن الرصيد');
        }
    }

    // ============================================
    // Recipient Selection
    // ============================================

    selectRecipient(element) {
        // Remove previous selection
        document.querySelectorAll('.recipient-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Add new selection
        element.classList.add('selected');
        this.selectedRecipientType = element.getAttribute('data-type');

        // Show/hide custom numbers field
        const customGroup = document.getElementById('custom-numbers-group');
        customGroup.style.display = this.selectedRecipientType === 'custom' ? 'block' : 'none';
    }

    // ============================================
    // Templates
    // ============================================

    async loadTemplates() {
        try {
            const { data, error } = await karamDB.select('sms_templates', {
                eq: { is_active: true }
            });

            if (error) throw error;

            this.templates = data || [];
            this.renderTemplates();
            this.populateTemplateSelect();

        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    populateTemplateSelect() {
        const select = document.getElementById('template-select');

        this.templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.template_name_ar;
            select.appendChild(option);
        });
    }

    renderTemplates() {
        const container = document.getElementById('template-list');

        if (this.templates.length === 0) {
            container.innerHTML = '<p>لا توجد قوالب متاحة</p>';
            return;
        }

        container.innerHTML = this.templates.map(template => `
            <div class="template-card" onclick="smsManager.useTemplate('${template.id}')">
                <h4>${template.template_name_ar}</h4>
                <p>${template.message_ar}</p>
            </div>
        `).join('');
    }

    loadTemplate() {
        const templateId = document.getElementById('template-select').value;
        if (!templateId) {
            document.getElementById('message-text').value = '';
            return;
        }

        this.useTemplate(templateId);
    }

    useTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const messageField = document.getElementById('message-text');
        messageField.value = template.message_ar;
        this.updateCharCount();

        // Switch to send tab
        this.switchTab('send');
    }

    // ============================================
    // Send SMS
    // ============================================

    updateCharCount() {
        const message = document.getElementById('message-text').value;
        document.getElementById('char-count').textContent = message.length;
    }

    async sendSMS() {
        const message = document.getElementById('message-text').value.trim();

        if (!this.selectedRecipientType) {
            alert('يرجى اختيار المستلمين');
            return;
        }

        if (!message) {
            alert('يرجى كتابة نص الرسالة');
            return;
        }

        if (!confirm(`هل أنت متأكد من إرسال الرسالة إلى ${this.getRecipientText()}؟`)) {
            return;
        }

        try {
            const recipients = await this.getRecipients();

            if (recipients.length === 0) {
                alert('لا يوجد مستلمين للرسالة');
                return;
            }

            // Check balance
            if (this.currentBalance < recipients.length) {
                alert(`رصيدك الحالي (${this.currentBalance}) غير كافٍ لإرسال ${recipients.length} رسالة`);
                return;
            }

            const { user } = await karamDB.getCurrentUser();

            // Send to each recipient
            let sentCount = 0;
            for (const recipient of recipients) {
                const { error } = await karamDB.rpc('send_sms', {
                    p_recipient_phone: recipient.phone,
                    p_message: message,
                    p_message_type: 'manual',
                    p_recipient_id: recipient.userId || null,
                    p_created_by: user.id
                });

                if (!error) sentCount++;
            }

            alert(`✅ تم إرسال ${sentCount} رسالة بنجاح!`);

            // Clear form
            document.getElementById('message-text').value = '';
            this.selectedRecipientType = null;
            document.querySelectorAll('.recipient-option').forEach(opt => {
                opt.classList.remove('selected');
            });

            // Reload data
            await this.loadBalance();
            await this.loadHistory();

        } catch (error) {
            console.error('Error sending SMS:', error);
            alert('حدث خطأ أثناء إرسال الرسالة');
        }
    }

    async getRecipients() {
        const recipients = [];

        if (this.selectedRecipientType === 'custom') {
            const numbers = document.getElementById('custom-numbers').value
                .split('\n')
                .map(n => n.trim())
                .filter(n => n.length > 0);

            return numbers.map(phone => ({ phone }));
        }

        // Get from database
        const tables = {
            'all': ['families', 'visitors', 'companies'],
            'families': ['families'],
            'visitors': ['visitors'],
            'companies': ['companies']
        };

        const tablesToQuery = tables[this.selectedRecipientType] || [];

        for (const table of tablesToQuery) {
            const phoneColumn = table === 'visitors' ? 'phone' :
                table === 'companies' ? 'responsible_person_phone' :
                    'contact_phone';

            const { data, error } = await karamDB.select(table, {
                select: `${phoneColumn}, user_id`
            });

            if (!error && data) {
                recipients.push(...data.map(item => ({
                    phone: item[phoneColumn],
                    userId: item.user_id
                })));
            }
        }

        return recipients;
    }

    getRecipientText() {
        const texts = {
            'all': 'جميع المستخدمين',
            'families': 'جميع العوائل',
            'visitors': 'جميع الزوار',
            'companies': 'جميع الشركات',
            'custom': 'الأرقام المحددة'
        };
        return texts[this.selectedRecipientType] || '';
    }

    // ============================================
    // History
    // ============================================

    async loadHistory() {
        try {
            const { data, error } = await karamDB.select('sms_messages', {
                order: { column: 'created_at', ascending: false },
                limit: 50
            });

            if (error) throw error;

            this.renderHistory(data || []);

        } catch (error) {
            console.error('Error loading SMS history:', error);
        }
    }

    renderHistory(messages) {
        const tbody = document.getElementById('sms-history-tbody');

        if (messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد رسائل</td></tr>';
            return;
        }

        tbody.innerHTML = messages.map(msg => `
            <tr>
                <td>${i18n.formatDate(msg.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</td>
                <td>${msg.recipient_phone}</td>
                <td>${msg.message_text.substring(0, 50)}${msg.message_text.length > 50 ? '...' : ''}</td>
                <td>${this.getMessageTypeText(msg.message_type)}</td>
                <td><span class="status-badge status-${msg.status}">${this.getStatusText(msg.status)}</span></td>
                <td>${msg.cost ? i18n.formatNumber(msg.cost, 2) : '-'}</td>
            </tr>
        `).join('');
    }

    getMessageTypeText(type) {
        const types = {
            'manual': 'يدوية',
            'booking_confirmation': 'تأكيد حجز',
            'payment_confirmation': 'تأكيد دفع',
            'otp_verification': 'رمز تحقق',
            'payout_notification': 'إشعار دفع'
        };
        return types[type] || type;
    }

    getStatusText(status) {
        const statuses = {
            'pending': 'قيد الانتظار',
            'sent': 'تم الإرسال',
            'delivered': 'تم التوصيل',
            'failed': 'فشل'
        };
        return statuses[status] || status;
    }

    // ============================================
    // Statistics
    // ============================================

    async loadStats() {
        try {
            const { data, error } = await karamDB.select('sms_statistics', {
                order: { column: 'month', ascending: false },
                limit: 1,
                single: true
            });

            if (error) throw error;

            if (data) {
                document.getElementById('total-sent').textContent = i18n.formatNumber(data.total_sent, 0);
                document.getElementById('total-delivered').textContent = i18n.formatNumber(data.delivered, 0);
                document.getElementById('total-failed').textContent = i18n.formatNumber(data.failed, 0);
                document.getElementById('total-cost').textContent = i18n.formatCurrency(data.total_cost);
            }

        } catch (error) {
            console.error('Error loading SMS stats:', error);
        }
    }
}

// Initialize
const smsManager = new SMSManager();
