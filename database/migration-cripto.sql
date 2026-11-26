-- =============================================================
-- Migracion: endurecimiento de autenticacion (lettuxe-cripto)
-- Argon2id + JWT firmados + resistencia a fuerza bruta
-- =============================================================
-- Ejecutar sobre la base de datos existente:
--   docker compose exec mysql mysql -uroot -prootpass inventario < database/migration-cripto.sql
-- o copiar el archivo al contenedor y aplicarlo.
-- =============================================================

USE inventario;

-- 1. Columnas para bloqueo por cuenta (anti fuerza bruta)
-- Nota: MySQL 8 no soporta "ADD COLUMN IF NOT EXISTS" (solo MariaDB/TiDB).
-- Se usan prepared statements contra information_schema para idempotencia.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'failed_attempts'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0, ADD COLUMN locked_until DATETIME NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Version de token para revocacion de JWT (logout / cambio de password)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'token_version'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN token_version INT NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Tabla de auditoria de intentos de login
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  usuario_id INT NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  motivo VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_login_attempts_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_login_attempts_email (email),
  INDEX idx_login_attempts_created (created_at),
  INDEX idx_login_attempts_success (success)
) ENGINE=InnoDB;
