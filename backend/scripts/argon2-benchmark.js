// Benchmark: comparacion de tiempos bcrypt vs Argon2id.
// Evidencia cuantitativa de resistencia a fuerza bruta para el informe.
// Uso: node scripts/argon2-benchmark.js

const argon2 = require('argon2');
const bcrypt = require('bcryptjs');
const { performance } = require('perf_hooks');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
};

async function measure(name, fn, iterations = 3) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${name}: avg ${avg.toFixed(1)} ms (${times.map((t) => t.toFixed(0)).join(', ')} ms)`);
  return avg;
}

async function main() {
  const password = 'ContraPrueba123!';
  console.log('=== Benchmark hashing de contrasenas ===\n');

  // bcrypt cost 10 (configuracion anterior del sistema)
  const bcryptTime = await measure('bcrypt (cost 10)', async () => {
    const h = await bcrypt.hash(password, 10);
    await bcrypt.compare(password, h);
  });

  // Argon2id parametros OWASP (nueva configuracion)
  const argon2Time = await measure('Argon2id (m=64MB,t=3,p=4)', async () => {
    const h = await argon2.hash(password, ARGON2_OPTIONS);
    await argon2.verify(h, password);
  });

  console.log('\n=== Analisis ===');
  console.log(`Tiempo por intento: Argon2id ${argon2Time.toFixed(0)} ms | bcrypt ${bcryptTime.toFixed(0)} ms`);
  console.log(`Intentos estimados/segundo/nucleo: Argon2id ~${Math.floor(1000 / argon2Time)} | bcrypt ~${Math.floor(1000 / bcryptTime)}`);
  console.log('\nLa ventaja de Argon2id no es solo el tiempo de CPU: consume ~64 MB de');
  console.log('RAM por intento (memory-hard), lo que impide que un atacante paralelice');
  console.log('miles de intentos en GPU/ASIC. bcrypt solo es costoso en CPU y las GPUs');
  console.log('tienen poca RAM por nucleo, por lo que Argon2id reduce drasticamente el');
  console.log('throughput real de un ataque offline de diccionario/fuerza bruta.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
