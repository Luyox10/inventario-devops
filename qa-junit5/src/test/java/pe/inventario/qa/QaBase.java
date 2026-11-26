package pe.inventario.qa;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;

/** Base: conexión JDBC, tokens de usuarios seed y limpieza de datos QA. */
public abstract class QaBase {

    protected static Connection db;
    protected static String adminToken;
    protected static String empleadoToken;

    @BeforeAll
    static void initAll() throws SQLException {
        db = Db.connect();
        adminToken = ApiClient.login("admin@inventario.com", "123456");
        empleadoToken = ApiClient.login("empleado@inventario.com", "123456");
        Db.cleanupQaData(db);
    }

    @AfterEach
    void cleanEach() throws SQLException {
        Db.cleanupQaData(db);
    }

    @AfterAll
    static void tearDownAll() throws SQLException {
        if (db != null) {
            Db.cleanupQaData(db);
            db.close();
        }
    }

    /** DECIMAL llega como string ("31.50") o número; parsea ambos. */
    protected static BigDecimal money(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.isTextual() ? new BigDecimal(node.asText()) : node.decimalValue();
    }

    protected static String ventaJson(String key, Object[][] items) {
        StringBuilder sb = new StringBuilder("{\"items\":[");
        for (int i = 0; i < items.length; i++) {
            if (i > 0) sb.append(',');
            sb.append("{\"producto_id\":").append(items[i][0])
              .append(",\"cantidad\":").append(items[i][1]).append('}');
        }
        sb.append(']');
        if (key != null) sb.append(",\"idempotency_key\":\"").append(key).append('"');
        return sb.append('}').toString();
    }
}
