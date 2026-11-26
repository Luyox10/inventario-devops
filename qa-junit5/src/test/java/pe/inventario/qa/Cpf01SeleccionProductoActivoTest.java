package pe.inventario.qa;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CPF-01 (RF-01): Selección exitosa de producto activo.
 * Precondición: usuario autenticado en registro de venta; P001 existe activo.
 * Acción: consultar productos disponibles e incorporar P001 al detalle de venta.
 * Esperado: el sistema permite seleccionar P001 y lo incorpora al detalle.
 */
class Cpf01SeleccionProductoActivoTest extends QaBase {

    private int p1;

    @BeforeEach
    void fixtures() throws Exception {
        p1 = Db.upsertProducto(db, "QA-P001", "Gaseosa 3L", "10.50", 20, 1);
    }

    @Test
    @DisplayName("CPF-01: P001 activo es seleccionable e incorporable al detalle de venta")
    void cpf01_seleccionProductoActivo() throws Exception {
        // 1) Consultar productos disponibles: P001 debe figurar como seleccionable
        ApiResponse lista = ApiClient.get("/api/productos", empleadoToken);
        assertEquals(200, lista.status());
        JsonNode encontrado = null;
        for (JsonNode p : lista.json()) {
            if (p.get("id").asInt() == p1) encontrado = p;
        }
        assertNotNull(encontrado, "P001 debe aparecer en el catálogo de productos disponibles");
        assertEquals(1, encontrado.get("activo").asInt(), "P001 debe estar en estado Activo");

        // 2) Incorporar P001 al detalle de la venta
        ApiResponse venta = ApiClient.post("/api/ventas",
                ventaJson("qa-cpf01", new Object[][]{{p1, 1}}), empleadoToken);
        assertEquals(201, venta.status(),
                "La venta con P001 debe registrarse correctamente: " + venta.body());
        assertTrue(venta.id() > 0, "La venta debe tener un id asignado");

        // 3) Verificar que P001 quedó incorporado en el detalle
        ApiResponse detalle = ApiClient.get("/api/ventas/" + venta.id(), adminToken);
        assertEquals(200, detalle.status());
        boolean incorporado = false;
        for (JsonNode item : detalle.json().get("items")) {
            if ("Gaseosa 3L".equals(item.get("producto_nombre").asText())) incorporado = true;
        }
        assertTrue(incorporado, "P001 debe quedar incorporado en el detalle de la venta");
    }
}
