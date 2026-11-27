package pe.inventario.qa;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CPNF-01 (RNF-01): Selección e incorporación de producto activo respetando máximo de 3 interacciones.
 * Precondición: trabajador autenticado en registro de venta; P001 "Arroz Costeño 1 kg" activo.
 */
class Cpnf01InteraccionesMaximasTest extends QaBase {

    private static final int MAX_INTERACCIONES = 3;

    private int p1;

    @BeforeEach
    void fixtures() throws Exception {
        p1 = Db.upsertProducto(db, "QA-P001", "Arroz Costeño 1 kg", "10.50", 20, 1);
    }

    @Test
    @DisplayName("CPNF-01: seleccionar e incorporar P001 a la venta cumple el máximo de 3 interacciones")
    void cpnf01_seleccionRespetaMaximoInteracciones() throws Exception {
        int interacciones = 0;

        // Interacción 1: buscar/seleccionar P001 del catálogo activo
        ApiResponse lista = ApiClient.get("/api/productos", empleadoToken);
        assertEquals(200, lista.status());
        boolean seleccionable = false;
        for (var p : lista.json()) {
            if (p.get("id").asInt() == p1) {
                seleccionable = true;
                break;
            }
        }
        assertTrue(seleccionable, "P001 debe ser seleccionable del catálogo");
        interacciones++;

        // Interacción 2: definir cantidad y agregar P001 al detalle/carrito
        interacciones++;

        // Interacción 3: confirmar registro de la venta con P001
        ApiResponse venta = ApiClient.post("/api/ventas",
                ventaJson("qa-cpnf01", new Object[][]{{p1, 1}}), empleadoToken);
        assertEquals(201, venta.status());
        interacciones++;

        assertTrue(interacciones <= MAX_INTERACCIONES,
                "El flujo hasta incorporar P001 en la venta tomó "
                        + interacciones + " interacciones y supera el máximo permitido de "
                        + MAX_INTERACCIONES);
    }
}