package pe.inventario.qa;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Acceso JDBC a la BD (MariaDB) para preparar fixtures deterministas (productos QA-*)
 * y limpiar los datos generados por los tests (ventas con idempotency_key 'qa-%').
 */
public final class Db {

    private Db() {}

    public static Connection connect() throws SQLException {
        String url = "jdbc:mariadb://" + QaEnv.env("DB_HOST", "127.0.0.1") + ":"
                + QaEnv.env("DB_PORT", "3306") + "/" + QaEnv.env("DB_NAME", "inventario");
        return DriverManager.getConnection(url,
                QaEnv.env("DB_USER", "root"), QaEnv.env("DB_PASSWORD", ""));
    }

    /** Crea o fija el estado exacto del producto fixture. Devuelve su id. */
    public static int upsertProducto(Connection c, String sku, String nombre,
                                     String precio, int stock, int activo) throws SQLException {
        Integer id = productoIdPorSku(c, sku);
        if (id == null) {
            try (PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO productos (nombre, sku, unidad, precio, stock_actual, stock_minimo, activo) "
                            + "VALUES (?, ?, 'und', ?, ?, 0, ?)", Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, nombre);
                ps.setString(2, sku);
                ps.setBigDecimal(3, new BigDecimal(precio));
                ps.setInt(4, stock);
                ps.setInt(5, activo);
                ps.executeUpdate();
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    rs.next();
                    return rs.getInt(1);
                }
            }
        }
        try (PreparedStatement ps = c.prepareStatement(
                "UPDATE productos SET nombre = ?, precio = ?, stock_actual = ?, activo = ? WHERE id = ?")) {
            ps.setString(1, nombre);
            ps.setBigDecimal(2, new BigDecimal(precio));
            ps.setInt(3, stock);
            ps.setInt(4, activo);
            ps.setInt(5, id);
            ps.executeUpdate();
        }
        return id;
    }

    public static Integer productoIdPorSku(Connection c, String sku) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT id FROM productos WHERE sku = ? LIMIT 1")) {
            ps.setString(1, sku);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt(1) : null;
            }
        }
    }

    public static int stock(Connection c, int productoId) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT stock_actual FROM productos WHERE id = ?")) {
            ps.setInt(1, productoId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) throw new IllegalStateException("Producto " + productoId + " no existe");
                return rs.getInt(1);
            }
        }
    }

    public static int countVentasByKey(Connection c, String key) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT COUNT(*) FROM ventas WHERE idempotency_key = ?")) {
            ps.setString(1, key);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }

    public static int countMovimientosVenta(Connection c, long ventaId) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT COUNT(*) FROM movimientos WHERE venta_id = ?")) {
            ps.setLong(1, ventaId);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }

    /** Borra datos generados por los tests (prefijos QA) y restaura fixtures. */
    public static void cleanupQaData(Connection c) throws SQLException {
        try (Statement st = c.createStatement()) {
            st.execute("DELETE m FROM movimientos m JOIN ventas v ON m.venta_id = v.id "
                    + "WHERE v.idempotency_key LIKE 'qa-%'");
            st.execute("DELETE d FROM detalle_ventas d JOIN ventas v ON d.venta_id = v.id "
                    + "WHERE v.idempotency_key LIKE 'qa-%'");
            st.execute("DELETE FROM ventas WHERE idempotency_key LIKE 'qa-%'");
            st.execute("DELETE m FROM movimientos m JOIN productos p ON m.producto_id = p.id "
                    + "WHERE p.sku LIKE 'QA-%'");
            st.execute("DELETE FROM lotes WHERE producto_id IN "
                    + "(SELECT id FROM productos WHERE sku LIKE 'QA-%')");
            st.execute("DELETE FROM productos WHERE sku LIKE 'QA-%'");
        }
    }
}
