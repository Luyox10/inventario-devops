package pe.inventario.qa;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import static org.junit.jupiter.api.Assertions.*;

/**
 * RF-01: el sistema no debe permitir seleccionar ni vender productos inactivos.
 * Fixtures: P001 (activo), P002 (inactivo), P003 (activo).
 */
class Rf01ProductosInactivosTest extends QaBase {

    private int p1, p2, p3;

    @BeforeEach
    void fixtures() throws Exception {
        p1 = Db.upsertProducto(db, "QA-P001", "QA P001", "10.50", 20, 1);
        p2 = Db.upsertProducto(db, "QA-P002", "QA P002", "10.00", 10, 0);
        p3 = Db.upsertProducto(db, "QA-P003", "QA P003", "7.25", 20, 1);
    }

    @Test
    @DisplayName("CPF-02: producto inactivo (P002) no es seleccionable ni vendible")
    void cpf02_productoInactivoBloqueado() throws Exception {
        // a) El listado que alimenta el selector de la UI no incluye inactivos
        ApiResponse lista = ApiClient.get("/api/productos", empleadoToken);
        assertEquals(200, lista.status());
        boolean visibleEnSelector = false;
        for (JsonNode p : lista.json()) {
            if (p.get("id").asInt() == p2) visibleEnSelector = true;
        }
        assertFalse(visibleEnSelector,
                "El producto inactivo P002 no debe aparecer en el selector de productos");

        // b) Aun forzando la petición, la venta con P002 es rechazada (409)
        ApiResponse venta = ApiClient.post("/api/ventas",
                ventaJson("qa-cpf02", new Object[][]{{p2, 1}}), empleadoToken);
        assertEquals(409, venta.status(),
                "Venta con producto inactivo debe rechazarse con 409: " + venta.body());
        assertEquals(0, Db.countVentasByKey(db, "qa-cpf02"), "No debe crearse la venta");
        assertEquals(10, Db.stock(db, p2), "El stock no debe modificarse");
    }

    @Test
    @DisplayName("CPF-04: selección mixta (P001+P003 activos + P002 inactivo) es rechazada completa")
    void cpf04_seleccionMixtaRechazada() throws Exception {
        ApiResponse venta = ApiClient.post("/api/ventas",
                ventaJson("qa-cpf04", new Object[][]{{p1, 2}, {p3, 1}, {p2, 1}}), empleadoToken);
        assertEquals(409, venta.status(),
                "Venta mixta con un producto inactivo debe rechazarse: " + venta.body());
        assertEquals(0, Db.countVentasByKey(db, "qa-cpf04"),
                "La venta no debe registrarse parcialmente");
        assertEquals(20, Db.stock(db, p1), "Stock de P001 intacto");
        assertEquals(20, Db.stock(db, p3), "Stock de P003 intacto");
        assertEquals(10, Db.stock(db, p2), "Stock de P002 intacto");
    }
}
