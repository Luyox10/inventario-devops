# Diseño e Implementación de un Mecanismo de Autenticación Resistente a Fuerza Bruta basado en Argon2id y Tokens JWT Firmados

**Proyecto**: Bodega Helena — Sistema de Inventario
**Rama**: `lettuxe-cripto`
**Curso**: Criptografía y Seguridad — 2026

---

## 1. Diagnóstico Inicial

El sistema Bodega Helena ya contaba con un mecanismo de autenticación **funcional pero básico**:

- **Hashing**: `bcrypt` (cost 10) vía `bcryptjs`.
- **Sesiones**: JWT con `jsonwebtoken`, firma HS256 implícita, expiración de 1 día, sin claims estándar.
- **Anti fuerza bruta**: solo `express-rate-limit` por IP (5 intentos/15 min).
- **Sin**: bloqueo por cuenta, auditoría de intentos, revocación de tokens, ni protección contra enumeración por timing.

### Debilidades identificadas

| Debilidad | Riesgo |
|-----------|--------|
| bcrypt es costo-CPU únicamente | GPUs/ASICs pueden probar miles de contraseñas en paralelo si el hash se filtra |
| Sin bloqueo por cuenta | Un atacante puede rotar IPs (botnet) para evadir el rate limit |
| Respuestas con tiempos distintos | Permite enumerar si un email está registrado (timing attack) |
| JWT sin revocación | Un token robado es válido hasta que expire (1 día) |
| `jwt.verify` sin `algorithms` | Expuesto a ataques `alg:none` y confusión de algoritmo |
| Sin auditoría | No hay evidencia de intentos de intrusión |

---

## 2. Diseño del Mecanismo

### 2.1. Justificación de Argon2id

Se migró de bcrypt a **Argon2id** (ganador del Password Hashing Competition 2015) por:

- **Memory-hard**: cada verificación consume ~64 MB de RAM, lo que impide la paralelización masiva en GPUs (poca memoria por núcleo).
- **Híbrido**: combina la resistencia de Argon2i (side-channel) y Argon2d (GPU resistance).
- **Recomendación OWASP** para almacenamiento de contraseñas moderno.

**Parámetros implementados** (recomendación OWASP mínima):

```text
memoryCost = 65536 KiB (64 MB)
timeCost   = 3 iteraciones
parallelism = 4 hilos
hashLength = 32 bytes
```

### 2.2. Defensa en capas contra fuerza bruta

```text
Intento de login
      |
      v
[1] Rate limit por IP (express-rate-limit: 5/15min)
      |
      v
[2] Timing-safe: Argon2id dummy si el email no existe
      |
      v
[3] Verificación Argon2id (64 MB RAM por intento)
      |
      v
[4] Bloqueo por cuenta: 5 fallos -> locked_until +15min (HTTP 423)
      |
      v
[5] Auditoría: cada intento registrado en login_attempts
```

### 2.3. JWT firmado y revocable

- **Firma**: HS256 explícito (simétrico; un solo emisor-verificador lo justifica — ver §4.3).
- **Claims**: `iss` (bodega-helena), `aud` (bodega-helena-web), `exp` (1h), `jti` (UUID v4), `token_version`.
- **Verificación restringida**: `jwt.verify` acepta solo `algorithms: ['HS256']` — evita `alg:none` y confusión RS256→HS256.
- **Revocación stateful**: campo `token_version` en `usuarios`; el middleware compara el del JWT contra BD. `POST /auth/logout` y cambio de contraseña incrementan la versión e invalidan todos los tokens anteriores.

---

## 3. Implementación

### 3.1. Componentes nuevos

| Archivo | Función |
|---------|---------|
| `backend/src/utils/password.js` | Wrapper Argon2id: `hashPassword`, `verifyPassword` (soporta bcrypt heredado), `verifyDummy` (timing-safe) |
| `database/migration-cripto.sql` | `ALTER usuarios` (failed_attempts, locked_until, token_version) + `CREATE login_attempts` |
| `backend/scripts/argon2-benchmark.js` | Benchmark comparativo bcrypt vs Argon2id |

### 3.2. Componentes modificados

| Archivo | Cambio |
|---------|--------|
| `auth.service.js` | login con timing-safe, lockout por cuenta, auditoría, lazy rehash bcrypt→Argon2id, logout |
| `jwt.js` | HS256 explícito, iss/aud/jti, verify con algorithms restringido |
| `auth.middleware.js` | verificación de `token_version` contra BD + usuario activo |
| `usuario.model.js` | funciones `registerFailedAttempt`, `resetFailedAttempts`, `incrementTokenVersion`, `insertLoginAttempt` |
| `usuario.service.js` | hashing Argon2id + revocación de sesiones en cambio de password |
| `auth.controller.js` | pasa `req` (IP/user-agent) a login; endpoint `logout` |
| `auth.routes.js` | `POST /logout` protegido |
| `schema.sql` | columnas y tabla nuevas para instalaciones frescas |
| `backend/Dockerfile` | `python3 make g++` para compilar el módulo nativo `argon2` en Alpine |
| `backend/.env.example` | `JWT_ISSUER`, `JWT_AUDIENCE`, `ARGON2_*`, `AUTH_*` |
| `AuthContext.jsx` (frontend) | `logout()` revoca server-side vía `POST /auth/logout` antes de limpiar localStorage |
| `api/auth.js` (frontend) | `logoutRequest` |

### 3.3. Migración de datos (lazy rehash)

Los hashes bcrypt existentes **no se reescriben** por lotes (no se conocen las contraseñas). Estrategia:

1. Login con hash `$2b$` válido → `verifyPassword` lo verifica con bcrypt y devuelve `needsRehash: true`.
2. El servicio regenera el hash con Argon2id y actualiza `password_hash` en la misma petición.
3. Tras el primer login exitoso, el usuario queda 100% Argon2id.

Esto permite migrar sin downtime ni resets de contraseña.

---

## 4. Decisiones de Diseño

### 4.1. ¿Por qué no scrypt o PBKDF2?

- **scrypt**: memory-hard también, pero Argon2id es su sucesor con mejor resistencia a time-memory trade-offs y recomendación actual de OWASP.
- **PBKDF2**: solo costo-CPU, no memory-hard; válido por compatibilidad pero inferior ante hardware dedicado.

### 4.2. ¿Por qué lockout por cuenta además de rate limit por IP?

El rate limit por IP se evade con rotación de IPs (botnets/proxies). El lockout por cuenta protege la cuenta atacada independientemente del origen del tráfico. Ambas capas coexisten.

### 4.3. ¿Por qué HS256 y no RS256?

- **Un solo servicio** firma y verifica tokens; no hay verificadores externos que necesiten una clave pública.
- RS256 aporta cuando hay un IdP o microservicios que validan sin conocer la clave privada — no aplica aquí y añadiría gestión de pares de claves.
- HS256 con secreto ≥256 bits + `algorithms` restringido cubre los ataques relevantes.

### 4.4. Revocación: `token_version` vs blacklist

- **Blacklist de jti**: requiere tabla/cache por cada token revocado.
- **`token_version`**: una sola columna; un incremento revoca *todos* los tokens del usuario (logout global). Costo: 1 `SELECT` por request autenticado — aceptable para esta escala.

---

## 5. Resultados del Benchmark

Ejecutado en el entorno de desarrollo (`node scripts/argon2-benchmark.js`):

```text
bcrypt (cost 10):               ~220 ms por operación
Argon2id (m=64MB, t=3, p=4):    ~147 ms por operación
```

- Tiempo por intento comparable para el usuario legítimo (~150-220 ms, imperceptible).
- **Diferencia clave**: cada intento Argon2id reserva 64 MB — un atacante con GPU de 8 GB solo puede probar ~128 contraseñas en paralelo, vs miles con bcrypt.
- Throughput atacante offline: ~6-7 intentos/s/núcleo con Argon2id, y memoria como cuello de botella.

---

## 6. Cómo Probar el Mecanismo

```bash
# 1. Aplicar migración (BD existente)
docker compose exec -T mysql mysql -uroot -prootpass inventario < database/migration-cripto.sql

# 2. Levantar sistema
docker compose up -d --build

# 3. Probar bloqueo por cuenta (6 intentos fallidos)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bodega.com","password":"incorrecta"}'
# -> intentos 1-5: 401 | intento 6: 423 "Cuenta bloqueada..."

# 4. Ver auditoría
docker compose exec mysql mysql -uroot -prootpass inventario \
  -e "SELECT email, success, motivo, created_at FROM login_attempts ORDER BY id DESC LIMIT 10;"

# 5. Probar revocación: login -> logout -> reutilizar token -> 401 "Token revocado"
```

---

## 7. Conclusiones

- Se migró el hashing a **Argon2id** con parámetros OWASP, obteniendo resistencia **memory-hard** frente a ataques offline con GPU/ASIC.
- Se implementó **defensa en capas** contra fuerza bruta: rate limit IP + lockout por cuenta + timing-safe verification + auditoría.
- El JWT pasó de firma implícita a **HS256 endurecido** con claims estándar, verificación restringida y **revocación por versión**.
- La migración fue **transparente** para usuarios existentes (lazy rehash) y no requirió reset de contraseñas.

## 8. Mejoras Futuras

- Cookie `HttpOnly; Secure; SameSite=Strict` en lugar de localStorage (requiere protección CSRF).
- CAPTCHA tras N intentos (defensa sin bloquear legítimos).
- Refresh tokens con rotación y detección de reutilización.
- Retención/rotación de `login_attempts` (TTL) y alertas a administrador ante patrones anómalos.
