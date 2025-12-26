// ============================================
// Karam Platform - Enhanced Supabase Client
// عميل Supabase المحسّن
// ============================================
// Version: 2.0
// Author: Dr. Shakir Alhuthali
// ============================================

// ============================================
// Configuration & Initialization
// ============================================

// Use supabase client from config.js (window.supabaseClient)
// Make sure config.js is loaded first

// ============================================
// Enhanced Supabase Client Class
// ============================================

class KaramSupabaseClient {
    constructor() {
        this.client = window.supabaseClient || window.supabase.createClient(
            SUPABASE_CONFIG?.url || window.supabaseUrl,
            SUPABASE_CONFIG?.key || window.supabaseKey
        );
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        // Initialize event listeners
        this.initAuthListener();
    }

    // ============================================
    // Authentication Listener
    // ============================================

    initAuthListener() {
        this.client.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);

            if (event === 'SIGNED_IN') {
                this.onSignIn(session);
            } else if (event === 'SIGNED_OUT') {
                this.onSignOut();
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Token refreshed successfully');
            }
        });
    }

    onSignIn(session) {
        console.log('User signed in:', session.user.email);
        this.clearCache();

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('karamAuth', {
            detail: { event: 'signIn', session }
        }));
    }

    onSignOut() {
        console.log('User signed out');
        this.clearCache();

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('karamAuth', {
            detail: { event: 'signOut' }
        }));
    }

    // ============================================
    // Query with Retry Logic
    // ============================================

    async queryWithRetry(queryFunction, attempts = this.retryAttempts) {
        try {
            const result = await queryFunction();

            if (result.error) {
                throw result.error;
            }

            return result;
        } catch (error) {
            if (attempts > 1 && this.isRetryableError(error)) {
                console.warn(`Query failed, retrying... (${this.retryAttempts - attempts + 1}/${this.retryAttempts})`);
                await this.delay(this.retryDelay);
                return this.queryWithRetry(queryFunction, attempts - 1);
            }

            throw this.formatError(error);
        }
    }

    isRetryableError(error) {
        // Network errors, timeouts, temporary server errors
        const retryableCodes = ['PGRST301', 'PGRST302', 'ETIMEDOUT', 'ECONNRESET'];
        return retryableCodes.some(code => error.code === code || error.message.includes(code));
    }

    formatError(error) {
        return {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message || 'An unknown error occurred',
            details: error.details || null,
            hint: error.hint || null
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // Cache Management
    // ============================================

    getCacheKey(tableName, query) {
        return `${tableName}_${JSON.stringify(query)}`;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('Cache hit:', key);
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
        console.log('Cache cleared');
    }

    // ============================================
    // Enhanced Query Methods
    // ============================================

    async select(tableName, query = {}, useCache = false) {
        const cacheKey = this.getCacheKey(tableName, query);

        // Check cache
        if (useCache) {
            const cached = this.getFromCache(cacheKey);
            if (cached) return { data: cached, error: null };
        }

        const result = await this.queryWithRetry(async () => {
            let builder = this.client.from(tableName).select(query.select || '*');

            // Apply filters
            if (query.eq) {
                Object.entries(query.eq).forEach(([column, value]) => {
                    builder = builder.eq(column, value);
                });
            }

            if (query.neq) {
                Object.entries(query.neq).forEach(([column, value]) => {
                    builder = builder.neq(column, value);
                });
            }

            if (query.gt) {
                Object.entries(query.gt).forEach(([column, value]) => {
                    builder = builder.gt(column, value);
                });
            }

            if (query.gte) {
                Object.entries(query.gte).forEach(([column, value]) => {
                    builder = builder.gte(column, value);
                });
            }

            if (query.lt) {
                Object.entries(query.lt).forEach(([column, value]) => {
                    builder = builder.lt(column, value);
                });
            }

            if (query.lte) {
                Object.entries(query.lte).forEach(([column, value]) => {
                    builder = builder.lte(column, value);
                });
            }

            if (query.like) {
                Object.entries(query.like).forEach(([column, pattern]) => {
                    builder = builder.like(column, pattern);
                });
            }

            if (query.in) {
                Object.entries(query.in).forEach(([column, values]) => {
                    builder = builder.in(column, values);
                });
            }

            if (query.is) {
                Object.entries(query.is).forEach(([column, value]) => {
                    builder = builder.is(column, value);
                });
            }

            // Apply ordering
            if (query.order) {
                const { column, ascending = true } = query.order;
                builder = builder.order(column, { ascending });
            }

            // Apply limit
            if (query.limit) {
                builder = builder.limit(query.limit);
            }

            // Apply offset
            if (query.offset) {
                builder = builder.range(query.offset, query.offset + (query.limit || 10) - 1);
            }

            // Single record
            if (query.single) {
                builder = builder.single();
            }

            return await builder;
        });

        // Store in cache
        if (useCache && result.data) {
            this.setCache(cacheKey, result.data);
        }

        return result;
    }

    async insert(tableName, data, options = {}) {
        return await this.queryWithRetry(async () => {
            let builder = this.client.from(tableName).insert(data);

            if (options.select) {
                builder = builder.select(options.select);
            }

            return await builder;
        });
    }

    async update(tableName, data, match, options = {}) {
        this.clearCache(); // Clear cache on update

        return await this.queryWithRetry(async () => {
            let builder = this.client.from(tableName).update(data);

            // Apply match conditions
            Object.entries(match).forEach(([column, value]) => {
                builder = builder.eq(column, value);
            });

            if (options.select) {
                builder = builder.select(options.select);
            }

            return await builder;
        });
    }

    async delete(tableName, match) {
        this.clearCache(); // Clear cache on delete

        return await this.queryWithRetry(async () => {
            let builder = this.client.from(tableName).delete();

            // Apply match conditions
            Object.entries(match).forEach(([column, value]) => {
                builder = builder.eq(column, value);
            });

            return await builder;
        });
    }

    async rpc(functionName, params = {}) {
        return await this.queryWithRetry(async () => {
            return await this.client.rpc(functionName, params);
        });
    }

    // ============================================
    // Storage Methods
    // ============================================

    async uploadFile(bucketName, path, file, options = {}) {
        try {
            const result = await this.client.storage
                .from(bucketName)
                .upload(path, file, options);

            if (result.error) throw result.error;

            // Get public URL if bucket is public
            const { data: { publicUrl } } = this.client.storage
                .from(bucketName)
                .getPublicUrl(path);

            return {
                data: {
                    path: result.data.path,
                    fullPath: result.data.fullPath,
                    publicUrl
                },
                error: null
            };
        } catch (error) {
            return {
                data: null,
                error: this.formatError(error)
            };
        }
    }

    async downloadFile(bucketName, path) {
        try {
            const result = await this.client.storage
                .from(bucketName)
                .download(path);

            if (result.error) throw result.error;

            return result;
        } catch (error) {
            return {
                data: null,
                error: this.formatError(error)
            };
        }
    }

    async deleteFile(bucketName, paths) {
        try {
            const result = await this.client.storage
                .from(bucketName)
                .remove(Array.isArray(paths) ? paths : [paths]);

            if (result.error) throw result.error;

            return result;
        } catch (error) {
            return {
                data: null,
                error: this.formatError(error)
            };
        }
    }

    getPublicUrl(bucketName, path) {
        const { data } = this.client.storage
            .from(bucketName)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    // ============================================
    // Auth Helper Methods
    // ============================================

    async getCurrentUser() {
        const { data: { user }, error } = await this.client.auth.getUser();
        return { user, error };
    }

    async getCurrentSession() {
        const { data: { session }, error } = await this.client.auth.getSession();
        return { session, error };
    }

    async signOut() {
        return await this.client.auth.signOut();
    }
}

// ============================================
// Initialize Global Instance
// ============================================

// Create instance and attach to window for global access
window.karamDB = new KaramSupabaseClient();
const karamDB = window.karamDB;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { karamDB, supabase };
}

console.log('✅ Karam Supabase Client initialized');
