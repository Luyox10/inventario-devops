package pe.inventario.qa;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CPF-05 (RF-02): Cálculo correcto del total para un solo producto.
 * Precondición: P001 "Gaseosa 3L" con precio unitario S/ 10.50.
 * Acción: seleccionar P001, ingresar cantidad 3 y calcular subtotal/total.
 * Esperado: subtotal y total exactos de S/ 31.50 (3 * 10.50).
 */
class Cpf05CalculoTotalUnProductoTest extends QaBase {

    private int p1;

    @BeforeEach
    void fixtures() throws Exception {
        p1 = Db.upsertProducto(db, "QA-P001", "Gaseosa 3L", "10.50", 20, 1);
    }

    @Test
    @DisplayName("CPF-05: subtotal y total exactos de S/ 31.50 para P001 (10.50 x 3)")
    void cpf05_calculoTotalUnProducto() throws Exception {
        ApiResponse venta = ApiClient.post("/api/ventas",
                ventaJson("qa-cpf05", new Object[][]{{p1, 3}}), empleadoToken);
        assertEquals(201, venta.status(), "La venta debe registrarse: " + venta.body());

        ApiResponse detalle = ApiClient.get("/api/ventas/" + venta.id(), adminToken);
        assertEquals(200, detalle.status());

        JsonNode items = detalle.json().get("items");
        assertEquals(1, items.size(), "El detalle debe tener exactamente 1 item");
        JsonNode item = items.get(0);
        assertEquals(0, money(item.get("precio_unitario")).compareTo(new BigDecimal("10.50")),
                "El precio unitario debe ser S/ 10.50");
        assertEquals(3, item.get("cantidad").asInt(), "La cantidad debe ser 3");
        assertEquals(0, money(item.get("subtotal")).compareTo(new BigDecimal("31.50")),
                "El subtotal debe ser exactamente S/ 31.50");
        assertEquals(0, money(detalle.json().get("total")).compareTo(new BigDecimal("31.50")),
                "El monto total debe ser exactamente S/ 31.50");
    }
}
