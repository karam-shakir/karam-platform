// ============================================
// Email Notification Service
// خدمة الإشعارات البريدية
// ============================================
// Uses Resend API via Supabase Edge Function
// ============================================

class EmailService {
    constructor() {
        this.templates = {
            family_registered: {
                subject_ar: '🆕 أسرة جديدة تنتظر الموافقة - منصة كرم',
                subject_en: '🆕 New Family Pending Approval - Karam Platform'
            },
            family_approved: {
                subject_ar: '✅ مبروك! تم قبول تسجيلكم في منصة كرم',
                subject_en: '✅ Congratulations! Your Registration is Approved'
            },
            family_rejected: {
                subject_ar: '❌ بخصوص تسجيلكم في منصة كرم',
                subject_en: '❌ Regarding Your Registration'
            },
            booking_created: {
                subject_ar: '🎉 حجز جديد على مجلسكم! - منصة كرم',
                subject_en: '🎉 New Booking on Your Majlis!'
            },
            booking_cancelled: {
                subject_ar: '❌ تم إلغاء حجز - منصة كرم',
                subject_en: '❌ Booking Cancelled'
            },
            availability_hidden: {
                subject_ar: '🔔 تغيير في توفر المجلس - منصة كرم',
                subject_en: '🔔 Availability Change Notification'
            },
            withdrawal_requested: {
                subject_ar: '💰 طلب سحب جديد - منصة كرم',
                subject_en: '💰 New Withdrawal Request'
            },
            withdrawal_approved: {
                subject_ar: '✅ تمت الموافقة على طلب السحب - منصة كرم',
                subject_en: '✅ Withdrawal Request Approved'
            }
        };
    }

    /**
     * Queue an email notification in the database
     * Will be processed by Edge Function or Cron Job
     */
    async queueEmail(recipientEmail, recipientType, eventType, data = {}) {
        try {
            const template = this.templates[eventType];
            if (!template) {
                throw new Error(`Unknown event type: ${eventType}`);
            }

            const subject = template

                .subject_ar; // Default to Arabic
            const body = this.buildEmailBody(eventType, data);
            const htmlBody = this.buildEmailHTML(eventType, data);

            // Queue the email in the database
            const { data: notification, error } = await karamDB.client
                .rpc('queue_email_notification', {
                    p_recipient_email: recipientEmail,
                    p_recipient_type: recipientType,
                    p_subject: subject,
                    p_body: body,
                    p_event_type: eventType,
                    p_recipient_id: data.recipient_id || null,
                    p_related_id: data.related_id || null,
                    p_html_body: htmlBody
                });

            if (error) throw error;

            console.log(`✅ Email queued for ${recipientEmail} (${eventType})`);
            return notification;
        } catch (error) {
            console.error('Error queuing email:', error);
            throw error;
        }
    }

    /**
     * Build plain text email body
     */
    buildEmailBody(eventType, data) {
        const templates = {
            family_registered: `مرحباً،

تم تسجيل أسرة جديدة في منصة كرم:

الأسرة: ${data.family_name || 'غير محدد'}
المدينة: ${data.city || 'غير محدد'}

يرجى مراجعة البيانات والموافقة أو الرفض من لوحة التحكم.

--
منصة كرم
https://karam-haji.com`,

            family_approved: `مرحباً ${data.family_name || 'عزيزي المستخدم'},

يسعدنا إبلاغكم بأنه تم قبول تسجيلكم في منصة كرم!

يمكنكم الآن:
- إضافة مجالسكم
- تحديد الأوقات المتاحة
- استقبال الحجوزات

تسجيل الدخول: https://karam-haji.com/login.html

نتمنى لكم تجربة موفقة.

--
منصة كرم`,

            family_rejected: `مرحباً ${data.family_name || 'عزيزي المستخدم'},

نأسف لإبلاغكم بأنه لم يتم قبول تسجيلكم في منصة كرم في الوقت الحالي.

السبب: ${data.rejection_reason || 'لم يتم تحديد سبب'}

يمكنكم التواصل معنا للمزيد من التوضيحات.

--
منصة كرم`,

            booking_created: `مرحباً ${data.family_name || 'عزيزي المستخدم'},

لديكم حجز جديد على مجلسكم:

رقم الحجز: ${data.booking_number || 'غير محدد'}
المجلس: ${data.majlis_name || 'غير محدد'}
التاريخ: ${data.booking_date || 'غير محدد'}
الوقت: ${data.time_slot || 'غير محدد'}
عدد الضيوف: ${data.number_of_guests || 'غير محدد'}
الباقة: ${data.package_name || 'غير محدد'}

عرض التفاصيل: https://karam-haji.com/family-bookings.html

--
منصة كرم`,

            availability_hidden: `مرحباً،

قامت ${data.family_name || 'إحدى الأسر'} بإخفاء التوفر:

المجلس: ${data.majlis_name || 'غير محدد'}
التاريخ: ${data.hidden_date || 'غير محدد'}
الفترة: ${data.time_slot || 'غير محدد'}

--
منصة كرم`,

            withdrawal_requested: `مرحباً،

تم استلام طلب سحب جديد:

الأسرة: ${data.family_name || 'غير محدد'}
المبلغ: ${data.amount || '0'} ريال
البنك: ${data.bank_name || 'غير محدد'}
IBAN: ${data.iban || 'غير محدد'}

يرجى المراجعة والموافقة من لوحة التحكم.

--
منصة كرم`,

            withdrawal_approved: `مرحباً ${data.family_name || 'عزيزي المستخدم'},

تمت الموافقة على طلب السحب الخاص بكم:

المبلغ: ${data.amount || '0'} ريال
رقم التحويل: ${data.transfer_reference || 'سيتم إرساله قريباً'}

سيتم تحويل المبلغ خلال 1-3 أيام عمل.

--
منصة كرم`
        };

        return templates[eventType] || `إشعار من منصة كرم\n\n${JSON.stringify(data)}`;
    }

    /**
     * Build HTML email body
     */
    buildEmailHTML(eventType, data) {
        const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
            direction: rtl;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 30px;
        }
        .content p {
            line-height: 1.8;
            color: #333;
        }
        .info-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .info-box h3 {
            margin-top: 0;
            color: #667eea;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌟 منصة كرم</h1>
            <p>للضيافة الأصيلة</p>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>منصة كرم - للضيافة السعودية الأصيلة</p>
            <p><a href="https://karam-haji.com" style="color: #667eea;">karam-haji.com</a></p>
        </div>
    </div>
</body>
</html>
        `;

        const contentTemplates = {
            family_approved: `
                <p>مرحباً <strong>${data.family_name || 'عزيزي المستخدم'}</strong>،</p>
                <p>يسعدنا إبلاغكم بأنه <strong>تم قبول تسجيلكم</strong> في منصة كرم!</p>
                <div class="info-box">
                    <h3>يمكنكم الآن:</h3>
                    <p>✅ إضافة مجالسكم<br>
                    ✅ تحديد الأوقات المتاحة<br>
                    ✅ استقبال الحجوزات</p>
                </div>
                <a href="https://karam-haji.com/login.html" class="button">تسجيل الدخول</a>
                <p>نتمنى لكم تجربة موفقة.</p>
            `,

            booking_created: `
                <p>مرحباً <strong>${data.family_name || 'عزيزي المستخدم'}</strong>،</p>
                <p>🎉 لديكم حجز جديد على مجلسكم!</p>
                <div class="info-box">
                    <h3>تفاصيل الحجز:</h3>
                    <p><strong>رقم الحجز:</strong> ${data.booking_number || 'غير محدد'}<br>
                    <strong>المجلس:</strong> ${data.majlis_name || 'غير محدد'}<br>
                    <strong>التاريخ:</strong> ${data.booking_date || 'غير محدد'}<br>
                    <strong>الوقت:</strong> ${data.time_slot || 'غير محدد'}<br>
                    <strong>عدد الضيوف:</strong> ${data.number_of_guests || 'غير محدد'}<br>
                    <strong>الباقة:</strong> ${data.package_name || 'غير محدد'}</p>
                </div>
                <a href="https://karam-haji.com/family-bookings.html" class="button">عرض التفاصيل</a>
            `
        };

        const content = contentTemplates[eventType] || this.buildEmailBody(eventType, data).replace(/\n/g, '<br>');
        return baseTemplate(content);
    }

    /**
     * Send email immediately using Edge Function
     * (for critical notifications that can't wait)
     */
    async sendImmediately(recipientEmail, recipientType, eventType, data = {}) {
        try {
            // First queue it
            await this.queueEmail(recipientEmail, recipientType, eventType, data);

            // Then try to send via Edge Function if available
            // This would call your Supabase Edge Function
            // For now, it's just queued and will be processed by cron
            console.log(`📧 Email queued for immediate processing`);
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    /**
     * Notify all operators about an event
     */
    async notifyOperators(eventType, data = {}) {
        try {
            // Get all operator emails
            const { data: operators, error } = await karamDB.select('user_profiles', {
                filters: { user_type: 'operator' }
            });

            if (error) throw error;

            // Send to all operators
            for (const operator of operators) {
                if (operator.email) {
                    await this.queueEmail(operator.email, 'operator', eventType, data);
                }
            }

            console.log(`✅ Notifications queued for ${operators.length} operators`);
        } catch (error) {
            console.error('Error notifying operators:', error);
            throw error;
        }
    }
}

// Initialize global instance
window.emailService = new EmailService();
const emailService = window.emailService;

console.log('✅ Email Service initialized');
