import pkg from 'pg';

const { Client, Pool } = pkg; // ← You're missing Pool import!

export class PSQL {
    constructor(mode = 'client') {
        this.client = null;
        this.pool = null; // ← Add this property
        this.status = false;
        this.errors = [];
        this.mode = mode;
    }

    async createConnection(url) {
        if (this.status === true) {
            await this.disconnect();
        }

        if (this.mode === 'pool') {
            this.pool = new Pool({
                connectionString: url,
                max: 60, 
                min: 12,       
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 3000,
                acquireTimeoutMillis: 8000,
                createTimeoutMillis: 3000,
                destroyTimeoutMillis: 5000,
                reapIntervalMillis: 1000,
                createRetryIntervalMillis: 200,
                allowExitOnIdle: false,
                captureLogs: true,
            });

            // Set up pool monitoring
            this.setupPoolMonitoring();

            // Alias for session store compatibility
            this.client = { pool: this.pool };
        } else {
            this.client = new Client({ connectionString: url });
        }
    }

    // ← Add the missing setupPoolMonitoring method
    setupPoolMonitoring() {
        if (!this.pool) return;

        // Monitor pool health every 30 seconds
        setInterval(() => {
            const stats = {
                total: this.pool.totalCount,
                idle: this.pool.idleCount,
                waiting: this.pool.waitingCount,
                max: this.pool.options.max,
                usage: Math.round((this.pool.totalCount / this.pool.options.max) * 100)
            };
            
            console.log(`📊 DB Pool: ${stats.total}/${stats.max} (${stats.usage}%) | Idle: ${stats.idle} | Waiting: ${stats.waiting}`);
            
            if (stats.usage >= 85) {
                console.warn(`⚠️ Database pool at ${stats.usage}% capacity!`);
            }
            
            if (stats.waiting > 5) {
                console.warn(`⚠️ ${stats.waiting} queries waiting for connections!`);
            }
        }, 30000);

        // Log pool errors
        this.pool.on('error', (err) => {
            console.error('💥 Database pool error:', err);
            this.errors.push(err);
        });
    }

    async connect() {
        try {
            if (this.mode === 'pool') {
                // ← Fix: Pool connection logic
                if (this.pool) {
                    // Test the pool with a simple query
                    const testClient = await this.pool.connect();
                    await testClient.query('SELECT NOW()');
                    testClient.release();
                    
                    console.log('✅ Database pool connected successfully');
                    this.status = true;
                }
            } else {
                // ← Fix: Keep your original client logic
                if (this.client !== null) {
                    if (this.status === true) {
                        await this.disconnect();
                    }
                    await this.client.connect();
                    this.status = true;
                }
            }
        } catch (err) {
            console.error('❌ Database connection failed:', err);
            this.errors.push(err);
            this.status = false;
        }
    }

    async disconnect() {
        if (this.status === true) {
            try {
                if (this.mode === 'pool') {
                    // ← Fix: Pool disconnect logic
                    if (this.pool) {
                        console.log('🔄 Gracefully closing database pool...');
                        await this.pool.end();
                        console.log('✅ Database pool closed');
                    }
                } else {
                    // ← Keep your original client logic
                    await this.client.end();
                }
                this.status = false;
            } catch (err) {
                console.error('❌ Error closing database connection:', err);
                this.errors.push(err);
            }
        }
    }

    async clearConnection() {
        if (this.status === true) {
            await this.disconnect();
        }
        this.client = null;
        this.pool = null; // ← Add this line
    }

    async fetch(query, params = []) {
        if (this.status === true) {
            try {
                const start = Date.now();
                let res;
                
                if (this.mode === 'pool') {
                    // ← Fix: Use pool for queries
                    res = await this.pool.query(query, params);
                } else {
                    // ← Keep your original client logic
                    res = await this.client.query(query, params);
                }
                
                const duration = Date.now() - start;
                
                // Log slow queries (>100ms)
                if (duration > 100) {
                    console.warn(`🐌 Slow query (${duration}ms): ${query.substring(0, 50)}...`);
                }
                
                return { data: res.rows, error: '', duration };
            } catch (err) {
                console.error('💥 Query error:', err);
                return { data: null, error: err };
            }
        } else {
            return { data: null, error: 'Database not connected' };
        }
    }

    getConnectionStatus() {
        return this.status;
    }

    getErrors() {
        return this.errors;
    }

    // ← Add method to get pool statistics
    getPoolStats() {
        if (this.mode === 'pool' && this.pool) {
            return {
                totalConnections: this.pool.totalCount,
                idleConnections: this.pool.idleCount,
                waitingRequests: this.pool.waitingCount,
                maxConnections: this.pool.options.max,
                usagePercentage: Math.round((this.pool.totalCount / this.pool.options.max) * 100)
            };
        }
        return null;
    }
}