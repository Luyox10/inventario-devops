const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

function getSslConfig() {
  const sslRequired = process.env.DB_SSL_REQUIRED !== 'false';
  if (!sslRequired) return undefined;

  const sslCaPath = process.env.DB_SSL_CA_PATH;
  if (!sslCaPath) {
    return {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    };
  }

  const caPath = path.isAbsolute(sslCaPath)
    ? sslCaPath
    : path.resolve(__dirname, '../../', sslCaPath);

  if (!fs.existsSync(caPath)) {
    process.stderr.write(
      `DB SSL CA file not found at "${caPath}". Falling back to system CA trust store.\n`
    );
    return {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    };
  }

  return {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  };
}

function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
    database: process.env.DB_NAME,
    ssl: getSslConfig(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const pool = mysql.createPool(getDbConfig());

const tidbReplicaRead = process.env.TIDB_REPLICA_READ;
if (tidbReplicaRead && ['leader', 'follower', 'closest-adaptive', 'closest-replicas'].includes(tidbReplicaRead)) {
  pool.on('connection', (connection) => {
    connection
      .promise()
      .query(`SET SESSION tidb_replica_read = '${tidbReplicaRead}'`)
      .catch(() => {
        // Variable solo existe en TiDB; ignorar en otros motores si se reutiliza el código.
      });
  });
}

async function testConnection() {
  const [rows] = await pool.query('SELECT NOW() AS now');
  return rows[0] || null;
}

async function withTransaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (err) {
    try {
      await connection.rollback();
    } catch (_) {
      // ignore
    }
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { pool, withTransaction, testConnection };
