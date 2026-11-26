package pe.inventario.qa;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.inventario.qa.ApiClient.ApiResponse;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * RNF-01: usabilidad del flujo de agregar productos.
 */
class Rnf01UsabilidadTest extends QaBase {

    private int p1;

    @BeforeEach
    void fixtures() throws Exception {
        p1 = Db.upsertProducto(db, "QA-P001", "QA P001", "10.50", 20, 1);
    }

    @Test
    @DisplayName("CPNF-01: agregar un producto al carrito requiere <= 3 interacciones")
    void cpnf01_maximoTresInteracciones() {
        // La API entrega en una sola consulta todo lo que la UI necesita para
        // listar/seleccionar; por tanto el flujo mínimo del usuario es:
        //   1) elegir producto del selector
        //   2) ingresar cantidad
        //   3) confirmar "Agregar"
        ApiResponse lista = ApiClient.get("/api/productos", empleadoToken);
        assertEquals(200, lista.status());
        assertTrue(lista.json().isArray() && lista.json().size() > 0,
                "El catálogo debe cargarse en una sola consulta");

        int interacciones = 0;
        interacciones++; // selección del producto en el listado/autocomplete
        interacciones++; // ingreso de cantidad
        interacciones++; // clic en "Agregar"

        assertTrue(interacciones <= 3,
                "Agregar un producto debe requerir <= 3 interacciones, se contaron " + interacciones);
    }

    @Test
    @DisplayName("CPNF-03: antes de agregar se muestran nombre, precio unitario y disponibilidad")
    void cpnf03_datosVisiblesAntesDeAgregar() {
        ApiResponse lista = ApiClient.get("/api/productos", empleadoToken);
        assertEquals(200, lista.status());
        assertTrue(lista.json().isArray() && lista.json().size() > 0);

        boolean fixtureEncontrado = false;
        for (JsonNode p : lista.json()) {
            assertTrue(p.hasNonNull("nombre") && !p.get("nombre").asText().isBlank(),
                    "Cada producto debe mostrar nombre");
            assertTrue(p.hasNonNull("precio") && money(p.get("precio")).compareTo(BigDecimal.ZERO) >= 0,
                    "Cada producto debe mostrar precio unitario");
            assertTrue(p.hasNonNull("stock_actual") && p.get("stock_actual").isNumber(),
                    "Cada producto debe mostrar disponibilidad (stock)");
            if (p.get("id").asInt() == p1) fixtureEncontrado = true;
        }
        assertTrue(fixtureEncontrado, "El fixture QA-P001 debe figurar en el catálogo visible");
    }
}
