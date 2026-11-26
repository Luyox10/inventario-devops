package pe.inventario.qa;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * RF-02: cálculo exacto de subtotales y total de la venta.
 * Fixtures: P001 = 10.50, P003 = 7.25.
 */
class Rf02CalculosVentaTest extends QaBase {

    private int p1, p3;

    @BeforeEach
    void fixtures() throws Exception {
        p1 = Db.upsertProducto(db, "QA-P001", "QA P001", "10.50", 20, 1);
        p3 = Db.upsertProducto(db, "QA-P003", "QA P003", "7.25", 20, 1);
    }

    @Test
    @DisplayName("CPF-05: subtotal exacto P001 10.50 x 3 = 31.50")
    void cpf05_subtotalExacto() throws Exception {
        ApiResponse venta = ApiClient.post("/api/ventas",
                ventaJson("qa-cpf05", new Object[][]{{p1, 3}}), empleadoToken);
        assertEquals(201, venta.status(), "La venta debe registrarse: " + venta.body());

        ApiResponse detalle = ApiClient.get("/api/ventas/" + venta.id(), adminToken);
        assertEquals(200, detalle.status());
        JsonNode item = detalle.json().get("items").get(0);
        assertEquals(0, money(item.get("precio_unitario")).compareTo(new BigDecimal("10.50")),
                "precio_unitario debe ser 10.50");
        assertEquals(3, item.get("cantidad").asInt());
        assertEquals(0, money(item.get("subtotal")).compareTo(new BigDecimal("31.50")),
                "subtotal debe ser 31.50");
        assertEquals(0, money(detalle.json().get("total")).compareTo(new BigDecimal("31.50")),
                "total debe ser 31.50");
        assertEquals(17, Db.stock(db, p1), "Stock debe descontar 3 unidades (20 -> 17)");
    }

    @Test
    @DisplayName("CPF-06: total exacto multi-producto P001x2 (21.00) + P003x4 (29.00) = 50.00")
    void cpf06_totalExacto() throws Exception {
        ApiResponse venta = ApiClient.post("/api/ventas",
                ventaJson("qa-cpf06", new Object[][]{{p1, 2}, {p3, 4}}), empleadoToken);
        assertEquals(201, venta.status(), "La venta debe registrarse: " + venta.body());

        ApiResponse detalle = ApiClient.get("/api/ventas/" + venta.id(), adminToken);
        assertEquals(200, detalle.status());
        JsonNode items = detalle.json().get("items");
        assertEquals(2, items.size());
        assertEquals(0, money(items.get(0).get("subtotal")).compareTo(new BigDecimal("21.00")),
                "Subtotal P001 debe ser 21.00");
        assertEquals(0, money(items.get(1).get("subtotal")).compareTo(new BigDecimal("29.00")),
                "Subtotal P003 debe ser 29.00");
        assertEquals(0, money(detalle.json().get("total")).compareTo(new BigDecimal("50.00")),
                "Total general debe ser 50.00");
    }
}
