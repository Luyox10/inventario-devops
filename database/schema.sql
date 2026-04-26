CREATE DATABASE IF NOT EXISTS inventario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventario;

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ADMIN','EMPLEADO') NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

-- Tabla: productos
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  sku VARCHAR(80) NULL,
  descripcion VARCHAR(255) NULL,
  precio DECIMAL(10,2) NOT NULL,
  stock_actual INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_productos_sku (sku)
) ENGINE=InnoDB;

-- Tabla: ventas
CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  INDEX idx_ventas_usuario (usuario_id),
  INDEX idx_ventas_created_at (created_at)
) ENGINE=InnoDB;

-- Tabla: detalle_ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_detalle_ventas_venta FOREIGN KEY (venta_id) REFERENCES ventas(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_detalle_ventas_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  INDEX idx_detalle_venta (venta_id),
  INDEX idx_detalle_producto (producto_id)
) ENGINE=InnoDB;

-- Tabla: movimientos (entradas/salidas de stock)
CREATE TABLE IF NOT EXISTS movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  usuario_id INT NOT NULL,
  venta_id INT NULL,
  tipo ENUM('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  cantidad INT NOT NULL,
  motivo VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_movimientos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_movimientos_venta FOREIGN KEY (venta_id) REFERENCES ventas(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  INDEX idx_mov_producto (producto_id),
  INDEX idx_mov_usuario (usuario_id),
  INDEX idx_mov_created_at (created_at)
) ENGINE=InnoDB;
