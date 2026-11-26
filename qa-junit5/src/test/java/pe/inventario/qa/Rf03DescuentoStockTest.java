package pe.inventario.qa;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * RF-03: el sistema debe descontar del stock una sola vez las cantidades de la
 * venta confirmada (prueba conservada de la iteración anterior).
 */
class Rf03DescuentoStockTest extends QaBase {

    private int p5;

    @BeforeEach
    void fixtures() throws Exception {
        p5 = Db.upsertProducto(db, "QA-P005", "QA P005", "10.00", 20, 1);
    }

    @Test
    @DisplayName("CPF-10: envíos repetidos/rápidos de la misma venta descuentan una sola vez (20 -> 18)")
    void cpf10_sinDobleDescuento() throws Exception {
        String key = "qa-cpf10";
        String body = ventaJson(key, new Object[][]{{p5, 2}});

        // 5 confirmaciones concurrentes + 2 reintentos secuenciales (doble/triple clic)
        ExecutorService pool = Executors.newFixedThreadPool(5);
        List<CompletableFuture<ApiResponse>> futures = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            futures.add(CompletableFuture.supplyAsync(
                    () -> ApiClient.post("/api/ventas", body, empleadoToken), pool));
        }
        List<ApiResponse> respuestas = new ArrayList<>(
                futures.stream().map(CompletableFuture::join).toList());
        pool.shutdown();
        for (int i = 0; i < 2; i++) {
            respuestas.add(ApiClient.post("/api/ventas", body, empleadoToken));
        }

        Set<Long> ventaIds = new HashSet<>();
        for (ApiResponse r : respuestas) {
            assertTrue(r.status() == 200 || r.status() == 201,
                    "Toda repetición debe resolverse OK (200/201): " + r.status() + " " + r.body());
            ventaIds.add(r.id());
        }
        assertEquals(1, ventaIds.size(), "Todas las repeticiones deben resolver a la MISMA venta");
        assertEquals(1, Db.countVentasByKey(db, key), "Solo debe existir 1 venta registrada");
        assertEquals(18, Db.stock(db, p5),
                "Stock final debe ser 18 (2 unidades descontadas una sola vez)");
        assertEquals(1, Db.countMovimientosVenta(db, ventaIds.iterator().next()),
                "Debe existir exactamente 1 movimiento de salida");
    }
}
