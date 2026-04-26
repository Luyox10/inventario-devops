USE inventario;

-- Nota: password_hash debe ser un hash bcrypt (NO texto plano).
-- Inserta usuarios reales desde el backend o reemplaza estos hashes por unos válidos.

INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
VALUES
('Admin', 'admin@inventario.com', '$2a$10$ux.zYE139Lm6AQdzyp0.3.Rhb.JoNyVHucoEgKchdFE22y5eD8cxm', 'ADMIN', 1),
('Empleado', 'empleado@inventario.com', '$2a$10$fnjBCVe0WZSEJlpqQssyXeYQ5YYpxuBwnpndU5a/vOzfrw0kxb1Ai', 'EMPLEADO', 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  password_hash = VALUES(password_hash),
  rol = VALUES(rol),
  activo = VALUES(activo);

INSERT INTO productos (nombre, sku, descripcion, precio, stock_actual, stock_minimo, activo)
VALUES
('Producto A', 'SKU-A', 'Producto de ejemplo A', 10.00, 20, 5, 1),
('Producto B', 'SKU-B', 'Producto de ejemplo B', 25.50, 8, 3, 1),
('Producto C', 'SKU-C', 'Producto de ejemplo C', 5.75, 2, 5, 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  precio = VALUES(precio),
  stock_actual = VALUES(stock_actual),
  stock_minimo = VALUES(stock_minimo),
  activo = VALUES(activo);