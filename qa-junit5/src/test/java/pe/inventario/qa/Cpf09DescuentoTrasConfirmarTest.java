package pe.inventario.qa;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CPF-09 (RF-03): Descuento exitoso tras confirmar venta.
 * Precondición: P004 con stock inicial de 50 unidades.
 * Acción: agregar 5 unidades de P004 al detalle, proceder al cobro y confirmar.
 * Esperado: venta procesada con éxito y stock actualizado 50 -> 45.
 */
class Cpf09DescuentoTrasConfirmarTest extends QaBase {

    private int p4;

    @BeforeEach
    void fixtures() throws Exception {
        p4 = Db.upsertProducto(db, "QA-P004", "QA P004", "10.00", 50, 1);
    }

    @Test
    @DisplayName("CPF-09: confirmar venta de 5 unidades de P004 descuenta stock 50 -> 45")
    void cpf09_descuentoExitosoTrasConfirmar() throws Exception {
        assertEquals(50, Db.stock(db, p4), "Precondición: stock inicial de P004 debe ser 50");

        ApiResponse venta = ApiClient.post("/api/ventas",
                ventaJson("qa-cpf09", new Object[][]{{p4, 5}}), empleadoToken);
        assertEquals(201, venta.status(),
                "La venta debe procesarse exitosamente: " + venta.body());

        assertEquals(45, Db.stock(db, p4),
                "El inventario debe descontar exactamente 5 unidades (50 -> 45)");
        assertEquals(1, Db.countMovimientosVenta(db, venta.id()),
                "Debe registrarse un único movimiento de salida por la venta");
    }
}
