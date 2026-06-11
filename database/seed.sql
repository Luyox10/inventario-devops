USE inventario;

-- Nota: password_hash debe ser un hash bcrypt (NO texto plano).
-- Inserta usuarios reales desde el backend o reemplaza estos hashes por unos válidos.

INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
VALUES
('Admin', 'admin@inventario.com', '$2a$10$cl0EtRLgETfk.cTBY7NQoeEeK4C9YQE/0VC2EGOL0CN0I4qvenOTy', 'ADMIN', 1),
('Empleado', 'empleado@inventario.com', '$2a$10$ta7/ryBL5/qMyxGG/H3DTO9rH8hyDDZQ.bUII4UXHpIRnnmDKguBK', 'EMPLEADO', 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  password_hash = VALUES(password_hash),
  rol = VALUES(rol),
  activo = VALUES(activo);

INSERT INTO productos (nombre, sku, descripcion, expiry_date, precio, stock_actual, stock_minimo, activo)
VALUES
('Producto A', 'SKU-A', 'Producto de ejemplo A', DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY), 10.00, 20, 5, 1),
('Producto B', 'SKU-B', 'Producto de ejemplo B', DATE_ADD(CURRENT_DATE(), INTERVAL 5 DAY), 25.50, 8, 3, 1),
('Producto C', 'SKU-C', 'Producto de ejemplo C', DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY), 5.75, 2, 5, 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  precio = VALUES(precio),
  stock_actual = VALUES(stock_actual),
  stock_minimo = VALUES(stock_minimo),
  activo = VALUES(activo);

DELETE FROM lotes WHERE producto_id IN (
  SELECT id FROM productos WHERE sku IN ('SKU-A','SKU-B','SKU-C')
);

INSERT INTO lotes (producto_id, cantidad, expiry_date)
SELECT id, 20, DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY) FROM productos WHERE sku = 'SKU-A'
UNION ALL
SELECT id, 8, DATE_ADD(CURRENT_DATE(), INTERVAL 5 DAY) FROM productos WHERE sku = 'SKU-B'
UNION ALL
SELECT id, 2, DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY) FROM productos WHERE sku = 'SKU-C';