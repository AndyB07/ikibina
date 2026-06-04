const mysql = require('mysql2/promise');
const { Client } = require('pg');

async function testMySQL() {
    const creds = [
        { host: 'localhost', user: 'root', password: '' },
        { host: 'localhost', user: 'root', password: 'root' },
        { host: 'localhost', user: 'root', password: 'password' },
        { host: 'localhost', user: 'root', password: 'admin' },
    ];
    for (const cred of creds) {
        try {
            const conn = await mysql.createConnection(cred);
            console.log(`[MySQL Success] Connected to MySQL with user: ${cred.user}, pass: "${cred.password}"`);
            
            // Check if tontine DB exists
            const [rows] = await conn.query("SHOW DATABASES LIKE 'tontine'");
            if (rows.length > 0) {
                console.log(`[MySQL Success] Database 'tontine' found!`);
                await conn.end();
                return { engine: 'mysql', cred };
            }
            console.log(`[MySQL Info] Connected but database 'tontine' not found.`);
            await conn.end();
        } catch (e) {
            // console.log(`[MySQL Fail] User: ${cred.user}, password: "${cred.password}" - Error: ${e.message}`);
        }
    }
    return null;
}

async function testPostgreSQL() {
    const creds = [
        { host: 'localhost', port: 5432, user: 'postgres', password: '', database: 'postgres' },
        { host: 'localhost', port: 5432, user: 'postgres', password: 'root', database: 'postgres' },
        { host: 'localhost', port: 5432, user: 'postgres', password: 'password', database: 'postgres' },
        { host: 'localhost', port: 5432, user: 'postgres', password: 'admin', database: 'postgres' },
        { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'postgres' }
    ];
    for (const cred of creds) {
        try {
            const client = new Client(cred);
            await client.connect();
            console.log(`[Postgres Success] Connected to Postgres with user: ${cred.user}, pass: "${cred.password}"`);
            
            // Check databases
            const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'tontine'");
            if (res.rows.length > 0) {
                console.log(`[Postgres Success] Database 'tontine' found!`);
                await client.end();
                // return credentials with actual database set to tontine
                return { engine: 'postgres', cred: { ...cred, database: 'tontine' } };
            }
            console.log(`[Postgres Info] Connected but database 'tontine' not found.`);
            await client.end();
        } catch (e) {
            // console.log(`[Postgres Fail] User: ${cred.user}, password: "${cred.password}" - Error: ${e.message}`);
        }
    }
    return null;
}

async function main() {
    console.log("Starting DB Probe...");
    const mysqlResult = await testMySQL();
    const pgResult = await testPostgreSQL();
    
    console.log("\n--- RESULT ---");
    if (mysqlResult) {
        console.log(`Found tontine in MySQL! Credentials:`, JSON.stringify(mysqlResult.cred));
    }
    if (pgResult) {
        console.log(`Found tontine in Postgres! Credentials:`, JSON.stringify(pgResult.cred));
    }
    if (!mysqlResult && !pgResult) {
        console.log("No tontine database found in MySQL or Postgres with tested credentials.");
    }
}

main().catch(console.error);
