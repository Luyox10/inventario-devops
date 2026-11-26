package pe.inventario.qa;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import static org.junit.jupiter.api.Assertions.*;

/**
 * RNF-02: operaciones que modifican datos solo para usuarios autenticados.
 * Sin sesión o con sesión expirada: rechazo 401 y stock intacto.
 */
class Rnf02SeguridadTest extends QaBase {

    private int p1;

    @BeforeEach
    void fixtures() throws Exception {
        p1 = Db.upsertProducto(db, "QA-P001", "QA P001", "10.50", 20, 1);
    }

    @Test
    @DisplayName("CPNF-06: registro de venta sin sesión o con sesión expirada es rechazado")
    void cpnf06_ventaSinSesionRechazada() throws Exception {
        String body = ventaJson("qa-cpnf06", new Object[][]{{p1, 2}});

        // a) Sin autenticación
        ApiResponse sinToken = ApiClient.post("/api/ventas", body, null);
        assertEquals(401, sinToken.status(),
                "Venta sin token debe rechazarse con 401: " + sinToken.status());

        // b) Sesión expirada (JWT con exp pasado)
        String expirado = ApiClient.expiredToken();
        ApiResponse tokenExpirado = ApiClient.post("/api/ventas", body, expirado);
        assertEquals(401, tokenExpirado.status(),
                "Venta con token expirado debe rechazarse con 401");

        assertEquals(20, Db.stock(db, p1), "El stock debe mantenerse intacto");
        assertEquals(0, Db.countVentasByKey(db, "qa-cpnf06"), "No debe registrarse la venta");
    }

    @Test
    @DisplayName("CPNF-08: modificación de inventario sin sesión o expirada es rechazada")
    void cpnf08_inventarioSinSesionRechazado() throws Exception {
        String ajuste = "{\"stock_actual\": 999}";

        // a) Sin autenticación
        ApiResponse sinToken = ApiClient.put("/api/stock/" + p1, ajuste, null);
        assertEquals(401, sinToken.status(),
                "Ajuste de stock sin token debe rechazarse con 401");

        // b) Sesión expirada
        ApiResponse tokenExpirado = ApiClient.put("/api/stock/" + p1, ajuste, ApiClient.expiredToken());
        assertEquals(401, tokenExpirado.status(),
                "Ajuste de stock con token expirado debe rechazarse con 401");

        // c) Alta de producto sin autenticación (también modifica inventario)
        ApiResponse altaSinToken = ApiClient.post("/api/productos",
                "{\"nombre\":\"Intruso\",\"precio\":1,\"stock_actual\":1}", null);
        assertEquals(401, altaSinToken.status(),
                "Crear producto sin token debe rechazarse con 401");

        assertEquals(20, Db.stock(db, p1), "El stock debe mantenerse intacto");
    }
}
