import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('crime_data.db');

export const initCrimeDatabase = async () => {
    try {
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS crimes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        type TEXT,
        severity INTEGER DEFAULT 1
      );
    `);
        console.log('Crime Database initialized');
    } catch (e) {
        console.error('Error initializing crime database', e);
    }
};

export const insertCrimeBatch = async (crimes) => {
    // crimes: [{lat, lng, type, severity}]
    if (!crimes || crimes.length === 0) return;

    try {
        await db.withTransactionAsync(async () => {
            // Prepared statement would be better but simple exec for batch is okay if constructed carefully
            // or loop with runAsync. 
            // For performance with many rows, creating one big insert string is often faster in SQLite plugin if supported,
            // but execAsync supports multiple statements.
            // Safest and reasonably fast way:
            for (const c of crimes) {
                await db.runAsync(
                    'INSERT INTO crimes (lat, lng, type, severity) VALUES (?, ?, ?, ?)',
                    c.lat, c.lng, c.type, c.severity
                );
            }
        });
        console.log(`Inserted ${crimes.length} crime records`);
    } catch (e) {
        console.error('Error inserting crimes', e);
    }
};

export const getCrimePoints = async (region) => {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    const minLat = latitude - latitudeDelta / 2;
    const maxLat = latitude + latitudeDelta / 2;
    const minLng = longitude - longitudeDelta / 2;
    const maxLng = longitude + longitudeDelta / 2;

    try {
        const result = await db.getAllAsync(
            `SELECT lat as latitude, lng as longitude, severity as weight 
       FROM crimes 
       WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? 
       LIMIT 2000`, // Limit to avoid crashes
            [minLat, maxLat, minLng, maxLng]
        );
        return result;
    } catch (e) {
        console.error('Error fetching crime points', e);
        return [];
    }
};

// Simple risk calculation for a specific point (The Engine needs this)
export const getRiskScoreNodes = async (lat, lng, radiusKm = 1) => {
    // 1 degree lat approx 111km. 1km approx 0.009 degrees.
    const delta = 0.009 * radiusKm;
    const minLat = lat - delta;
    const maxLat = lat + delta;
    const minLng = lng - delta;
    const maxLng = lng + delta;

    try {
        const result = await db.getAllAsync(
            `SELECT severity FROM crimes 
             WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`,
            [minLat, maxLat, minLng, maxLng]
        );

        // Sum severity (1 = theft, 5 = violent)
        const totalRisk = result.reduce((acc, curr) => acc + (curr.severity || 1), 0);
        return Math.min(totalRisk, 100); // Cab at 100
    } catch (e) {
        return 0;
    }
}
