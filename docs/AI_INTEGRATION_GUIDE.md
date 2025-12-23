# دليل استخدام الذكاء الاصطناعي في منصة كرم

## نظرة عامة

هذا الدليل يوضح كيفية دمج الذكاء الاصطناعي في منصة كرم لتحسين تجربة المستخدم وأتمتة العمليات.

---

## 1. نظام التوصيات الذ كية

### الهدف
اقتراح أفضل الأسر المستضيفة للمعتمرين بناءً على تفضيلاتهم وتاريخهم.

### التقنية المستخدمة
- **Google Gemini API** للتحليل
- **Vector Embeddings** للتشابه
- **تحليل السلوك** من قاعدة البيانات

### Implementation

```javascript
// services/recommendations.js

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class RecommendationService {
  
  async getSmartRecommendations(userId, preferences = {}) {
    // 1. جلب تاريخ المستخدم
    const userHistory = await this.getUserBookingHistory(userId);
    
    // 2. جلب جميع الأسر المتاحة
    const availableFamilies = await this.getAvailableFamilies(preferences.city);
    
    // 3. تحليل باستخدام Gemini
    const prompt = `
      You are an AI recommendation system for a hospitality platform in Saudi Arabia.
      
      User Profile:
      - Previous bookings: ${JSON.stringify(userHistory)}
      - Preferences: ${JSON.stringify(preferences)}
      
      Available Families:
      ${JSON.stringify(availableFamilies)}
      
      Based on the user's history and preferences, recommend the top 5 families.
      Consider: rating, location, price range, previous satisfaction, and package type.
      
      Return a JSON array with: family_id, match_score (0-100), and reasoning.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const recommendations = JSON.parse(result.response.text());
    
    return recommendations;
  }
  
  async getUserBookingHistory(userId) {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        family:host_families(*),
        package:packages(*),
        review:reviews(*)
      `)
      .eq('visitor_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);
    
    return data;
  }
  
  async getAvailableFamilies(city = null) {
    let query = supabase
      .from('host_families')
      .select(`
        *,
        packages(*),
        reviews(rating, comment)
      `)
      .eq('status', 'approved')
      .eq('is_active', true);
    
    if (city) {
      query = query.eq('city', city);
    }
    
    const { data } = await query;
    return data;
  }
}

export default new RecommendationService();
```

### الاستخدام

```javascript
// في صفحة تصفح الأسر
const recommendations = await RecommendationService.getSmartRecommendations(
  currentUser.id,
  {
    city: 'makkah',
    priceRange: { min: 100, max: 300 },
    packageType: 'meal'
  }
);

// عرض النتائج
renderRecommendedFamilies(recommendations);
```

---

## 2. Chatbot للدعم الفني

### الهدف
مساعدة المستخدمين في عملية الحجز والإجابة على الأسئلة الشائعة.

### التقنية
- **Gemini Pro** للمحادثة
- **Context Awareness** لفهم السياق
- **Memory** لتذكر المحادثة

### Implementation

```javascript
// services/chatbot.js

class ChatbotService {
  
  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: this.getSystemPrompt()
    });
    this.conversationHistory = [];
  }
  
  getSystemPrompt() {
    return `
      أنت مساعد ذكي لمنصة "كرم" - منصة تربط المعتمرين بالأسر المستضيفة في مكة والمدينة.

      مهامك:
      1. مساعدة المستخدمين في اختيار الأسر والباقات المناسبة
      2. شرح عملية الحجز والدفع
      3. الإجابة على الأسئلة حول الأسعار والخدمات
      4. تقديم نصائح للحصول على أفضل تجربة

      المعلومات المهمة:
      - الباقة البسيطة: 150 ريال (ضيافة + تصوير)
      - الباقة الكاملة: 300 ريال (ضيافة + وجبة + هدايا)
      - المدن: مكة والمدينة فقط
      - الدفع: بطاقات الدفع عبر Moyasar

      كن ودوداً ومحترماً. استخدم اللغة العربية الفصحى المبسطة.
    `;
  }
  
  async chat(userMessage, userId = null) {
    // إضافة السياق من قاعدة البيانات
    const context = userId ? await this.getUserContext(userId) : {};
    
    // بناء المحادثة
    const fullPrompt = `
      ${context.hasBookings ? `المستخدم لديه ${context.bookingCount} حجز سابق.` : 'مستخدم جديد.'}
      ${context.lastBooking ? `آخر حجز كان في ${context.lastBooking.city}` : ''}
      
      سؤال المستخدم: ${userMessage}
    `;
    
    // الحصول على الرد
    const chat = this.model.startChat({
      history: this.conversationHistory
    });
    
    const result = await chat.sendMessage(fullPrompt);
    const response = result.response.text();
    
    // حفظ المحادثة
    this.conversationHistory.push(
      { role: "user", parts: userMessage },
      { role: "model", parts: response }
    );
    
    // حفظ في قاعدة البيانات
    if (userId) {
      await this.saveMessage(userId, userMessage, response);
    }
    
    return response;
  }
  
  async getUserContext(userId) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('visitor_id', userId)
      .order('created_at', { ascending: false });
    
    return {
      hasBookings: bookings.length > 0,
      bookingCount: bookings.length,
      lastBooking: bookings[0]
    };
  }
  
  async saveMessage(userId, userMessage, botResponse) {
    await supabase.from('chat_messages').insert([
      {
        user_id: userId,
        message: userMessage,
        response: botResponse,
        timestamp: new Date()
      }
    ]);
  }
}

export default new ChatbotService();
```

### الاستخدام في الواجهة

```javascript
// components/Chatbot.js

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  async function sendMessage() {
    if (!input.trim()) return;
    
    // إضافة رسالة المستخدم
    setMessages([...messages, { type: 'user', text: input }]);
    setLoading(true);
    
    try {
      // الحصول على الرد
      const response = await ChatbotService.chat(input, currentUser?.id);
      
      // إضافة رد البوت
      setMessages(prev => [...prev, { type: 'bot', text: response }]);
    } catch (error) {
      console.error('Chatbot error:', error);
    } finally {
      setLoading(false);
      setInput('');
    }
  }
  
  return (
    <div className="chatbot-widget">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="اكتب سؤالك..."
      />
    </div>
  );
}
```

---

## 3. تحليل المشاعر من التقييمات

### الهدف
فهم رضا العملاء وتحديد المشاكل المتكررة تلقائياً.

### Implementation

```javascript
// services/sentiment-analysis.js

class SentimentAnalysisService {
  
  async analyzeReview(reviewText) {
    const prompt = `
      قم بتحليل هذا التقييم من عميل لأسرة مستضيفة:
      "${reviewText}"
      
      أعطني:
      1. sentiment: (positive/neutral/negative)
      2. score: (0-100)
      3. key_topics: [قائمة بالموضوعات الرئيسية]
      4. issues: [المشاكل إن وجدت]
      5. highlights: [النقاط الإيجابية]
      
      JSON format only.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());
    
    return analysis;
  }
  
  async generateFamilyReport(familyId) {
    // جلب جميع التقييمات
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('family_id', familyId);
    
    // تحليل كل تقييم
    const analyses = await Promise.all(
      reviews.map(r => this.analyzeReview(r.comment))
    );
    
    // توليد التقرير
    const prompt = `
      بناءً على تحليل ${reviews.length} تقييم:
      ${JSON.stringify(analyses)}
      
      اكتب تقريراً شاملاً يتضمن:
      1. ملخص عام
      2. نقاط القوة
      3. المشاكل المتكررة
      4. توصيات للتحسين
      
      بالعربية، احترافي ومختصر.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    
    return result.response.text();
  }
}

export default new SentimentAnalysisService();
```

---

## 4. توليد الوصف التلقائي

### الهدف
مساعدة الأسر في كتابة وصف جذاب ومُحسّن لمحركات البحث.

### Implementation

```javascript
// services/content-generator.js

class ContentGeneratorService {
  
  async generateFamilyDescription(familyData) {
    const prompt = `
      اكتب وصفاً جذاباً ومحترفاً لأسرة مستضيفة في منصة كرم:
      
      - اسم الأسرة: ${familyData.name}
      - المدينة: ${familyData.city === 'makkah' ? 'مكة المكرمة' : 'المدينة المنورة'}
      - السعة: ${familyData.capacity} ضيف
      - المميزات: ${familyData.features.join(', ')}
      
      الوصف يجب أن:
      1. يكون بين 100-150 كلمة
      2. يبرز التراث والأصالة
      3. يذكر القرب من الحرم
      4. يكون دافئاً ومرحباً
      5. مُحسّن لمحركات البحث (SEO)
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    
    return result.response.text();
  }
  
  async generatePackageDescription(packageData) {
    const prompt = `
      اكتب وصفاً تسويقياً لباقة ضيافة:
      
      - النوع: ${packageData.type}
      - السعر: ${packageData.price} ريال
      - المدة: ${packageData.duration} ساعة
      - يتضمن: ${packageData.includes.join(', ')}
      
      50-70 كلمة، مغري وجذاب.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    
    return result.response.text();
  }
  
  async improveSEO(currentDescription) {
    const prompt = `
      حسّن هذا الوصف لمحركات البحث:
      "${currentDescription}"
      
      أضف:
      - كلمات مفتاحية ذات صلة (عمرة، ضيافة، مكة، الخ)
      - عنوان Meta جذاب
      - وصف Meta (160 حرف)
      
      JSON: {title, description, keywords[]}
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    
    return JSON.parse(result.response.text());
  }
}

export default new ContentGeneratorService();
```

---

## 5. التحقق من الصور

### الهدف
التأكد من جودة ومناسبة صور الأسر المستضيفة.

### التقنية
- **Gemini Pro Vision** للتحليل البصري

### Implementation

```javascript
// services/image-verification.js

import { GoogleGenerativeAI } from "@google/generative-ai";

class ImageVerificationService {
  
  async verifyFamilyImage(imageUrl) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // تحميل الصورة
    const image = await this.fetchImage(imageUrl);
    
    const prompt = `
      قيّم هذه الصورة لأسرة مستضيفة:
      
      1. quality_score: (0-100) - جودة الصورة
      2. is_appropriate: (true/false) - مناسبة للمنصة
      3. shows_hospitality: (true/false) - توضح الضيافة
      4. suggestions: [] - اقتراحات للتحسين
      
      JSON only.
    `;
    
    const result = await model.generateContent([prompt, image]);
    return JSON.parse(result.response.text());
  }
  
  async categorizeImage(imageUrl) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    const image = await this.fetchImage(imageUrl);
    
    const prompt = `
      صنّف هذه الصورة:
      - category: (majlis/food/entrance/decoration/other)
      - tags: [قائمة بالعناصر في الصورة]
      - is_primary_worthy: (true/false) - مناسبة كصورة رئيسية
    `;
    
    const result = await model.generateContent([prompt, image]);
    return JSON.parse(result.response.text());
  }
  
  async fetchImage(url) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(buffer).toString('base64'),
        mimeType: response.headers.get('content-type')
      }
    };
  }
}

export default new ImageVerificationService();
```

---

## 6. التسعير الديناميكي

### الهدف
اقتراح أسعار تنافسية بناءً على الطلب والعرض.

### Implementation

```javascript
// services/dynamic-pricing.js

class DynamicPricingService {
  
  async suggestPrice(familyId, packageType, targetDate) {
    // جمع البيانات
    const marketData = await this.getMarketData(packageType, targetDate);
    const familyData = await this.getFamilyPerformance(familyId);
    const demandData = await this.getDemandForecast(targetDate);
    
    const prompt = `
      اقترح سعراً مثالياً لباقة ضيافة:
      
      بيانات السوق:
      - متوسط السعر: ${marketData.averagePrice} ريال
      - النطاق: ${marketData.minPrice}-${marketData.maxPrice}
      - عدد المنافسين: ${marketData.competitors}
      
      أداء الأسرة:
      - التقييم: ${familyData.rating}/5
      - معدل الحجز: ${familyData.bookingRate}%
      - التقييمات: ${familyData.totalReviews}
      
      توقعات الطلب:
      - الموسم: ${demandData.season}
      - الطلب المتوقع: ${demandData.demand}
      
      أعطني:
      1. recommended_price: السعر الموصى به
      2. reasoning: السبب
      3. discount_suggestion: نسبة الخصم المقترحة (إن وجدت)
      
      JSON only.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    
    return JSON.parse(result.response.text());
  }
  
  async getMarketData(packageType, date) {
    const { data } = await supabase
      .from('packages')
      .select('price')
      .eq('package_type', packageType)
      .eq('is_active', true);
    
    const prices = data.map(p => p.price);
    
    return {
      averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      competitors: prices.length
    };
  }
  
  async getDemandForecast(date) {
    // تحليل الطلب التاريخي
    const { data: historicalBookings } = await supabase
      .from('bookings')
      .select('*')
      .gte('booking_date', new Date(date.getFullYear(), date.getMonth(), 1))
      .lt('booking_date', new Date(date.getFullYear(), date.getMonth() + 1, 1));
    
    // تحديد الموسم (رمضان، حج، عادي)
    const month = date.getMonth();
    const season = this.determineSeason(month);
    
    return {
      season,
      demand: historicalBookings.length > 20 ? 'high' : historicalBookings.length > 10 ? 'medium' : 'low'
    };
  }
  
  determineSeason(month) {
    // منطق تحديد الموسم
    const hijriMonth = this.getHijriMonth();
    if (hijriMonth === 9) return 'ramadan';
    if (hijriMonth === 12) return 'hajj';
    return 'regular';
  }
}

export default new DynamicPricingService();
```

---

## 7. خطة التنفيذ

### المرحلة 1: الأساسيات (الشهر الأول)
1. ✅ إعداد Gemini API
2. ✅ Chatbot بسيط للدعم
3. ✅ توليد الوصف للأسر

### المرحلة 2: التحليل (الشهر الثاني)
1. ✅ تحليل التقييمات
2. ✅ نظام التوصيات الأساسي
3. ✅ التحقق من الصور

### المرحلة 3: التحسين (الشهر الثالث)
1. ✅ التسعير الديناميكي
2. ✅ تحسينات الـ Chatbot
3. ✅ تحليلات متقدمة

---

## التكاليف المتوقعة

### Google Gemini API Pricing
- **Gemini Pro**: $0.00025 / 1000 characters (إدخال)
- **Gemini Pro Vision**: $0.0025 / image
- **التقدير الشهري**: ~$20-50 (لـ 1000 مستخدم)

### ROI المتوقع
- زيادة معدل التحويل: +15-25%
- تحسين رضا العملاء: +20%
- تقليل تكلفة الدعم: -40%

---

## الخلاصة

استخدام الذكاء الاصطناعي في منصة كرم سيحسن التجربة بشكل كبير ويزيد الكفاءة. ابدأ بالميزات الأساسية (Chatbot + توليد المحتوى) ثم توسع تدريجياً.

**الأولوية:**
1. Chatbot 
2. توليد الوصف
3. التوصيات
4. تحليل التقييمات
5. التسعير الديناميkي

**🎯 الهدف:** منصة ذكية تُسهّل حياة المستخدمين وتزيد الأرباح!
