package pe.inventario.qa;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas E2E visuales (UI) sobre http://localhost:5173 con navegador real.
 * Casos del PDF "Gestion de defectos" automatizados contra la pantalla de
 * Registro de Ventas del empleado.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class VentasUiE2ETest extends UiBaseTest {

    private long ventasBaseline;

    private int p1, p2, p4, p6;

    @BeforeEach
    void fixtures() throws Exception {
        // Fixtures QA de la matriz: activos/inactivos segun el caso
        p1 = Db.upsertProducto(db, "QA-P001", "Gaseosa 3L", "10.50", 20, 1);
        p2 = Db.upsertProducto(db, "QA-P002", "QA P002", "10.00", 10, 0);
        p4 = Db.upsertProducto(db, "QA-P004", "QA P004", "10.00", 50, 1);
        p6 = Db.upsertProducto(db, "QA-P006", "QA P006", "10.00", 10, 1);
        ventasBaseline = Db.maxVentaId(db);
    }

    @AfterEach
    void limpiarVentasUi() throws Exception {
        // Las ventas creadas desde la UI usan idempotency_key UUID (sin 'qa-');
        // se eliminan por id > baseline y luego el cleanup padre quita los QA-*.
        Db.deleteVentasDesde(db, ventasBaseline);
    }

    private void asegurarSesionEmpleado() {
        driver.get(FRONT + "/empleado/ventas");
        pause();
        if (driver.getCurrentUrl().contains("/login")) {
            loginUi("empleado@inventario.com", "123456");
        }
        wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//h2[contains(.,'Registro de Ventas')]")));
        pause();
    }

    @Test
    @Order(1)
    @DisplayName("CPNF-06 (UI): usuario sin sesion es redirigido al login al entrar a Ventas")
    void cpnf06_sinSesionRedirigeLogin() {
        driver.get(FRONT + "/empleado/ventas");
        pause();
        ((JavascriptExecutor) driver).executeScript("localStorage.removeItem('inventario_auth')");
        driver.get(FRONT + "/empleado/ventas");
        pause();
        wait.until(ExpectedConditions.urlContains("/login"));
        assertTrue(driver.getCurrentUrl().contains("/login"),
                "Sin sesion, la app debe redirigir a /login");
        assertTrue(textoPagina().contains("Iniciar sesión") || textoPagina().contains("Iniciar sesi"),
                "Debe mostrarse la pantalla de login");
    }

    @Test
    @Order(2)
    @DisplayName("Login + Navegacion: empleado ingresa y llega a Registro de Ventas")
    void loginYNavegacionAVentas() {
        loginUi("empleado@inventario.com", "123456");
        irAVentasEmpleado();
        assertTrue(textoPagina().contains("Registro de Ventas"),
                "Debe verse la pantalla de registro de ventas");
    }

    @Test
    @Order(3)
    @DisplayName("CPF-01 (UI): producto activo P001 se selecciona e incorpora al carrito")
    void cpf01_seleccionProductoActivo() {
        asegurarSesionEmpleado();

        buscarProductoEnVentas("Gaseosa");
        assertTrue(seleccionarDelAutocomplete("Gaseosa 3L"),
                "P001 debe ser seleccionable del autocomplete");

        ingresarCantidad("1");
        clickAgregarAlCarrito();

        assertTrue(textoPagina().contains("Gaseosa 3L"),
                "P001 debe quedar incorporado en el carrito");
        assertTrue(textoPagina().contains("TOTAL A COBRAR"),
                "Debe mostrarse el total del carrito");
    }

    @Test
    @Order(4)
    @DisplayName("CPF-02 (UI): producto inactivo P002 no puede seleccionarse ni agregarse")
    void cpf02_productoInactivoBloqueado() {
        asegurarSesionEmpleado();

        buscarProductoEnVentas("QA P002");
        pause();

        // El producto inactivo no se lista en el catalogo, por tanto el
        // autocomplete no ofrece ninguna opcion seleccionable
        long opciones = driver.findElements(By.xpath(
                "//button[.//div[contains(text(),'SKU:')]]")).size();
        assertEquals(0, opciones,
                "Un producto inactivo no debe aparecer como opcion seleccionable");

        WebElement agregar = botonAgregarAlCarrito();
        assertFalse(agregar.isEnabled(),
                "El boton 'Agregar al carrito' debe estar bloqueado sin producto valido");
        assertFalse(textoPagina().contains("TOTAL A COBRAR"),
                "El carrito debe permanecer vacio");
    }

    @Test
    @Order(5)
    @DisplayName("CPF-05 (UI): subtotal y total en pantalla exactos S/ 31.50 (10.50 x 3)")
    void cpf05_subtotalTotalEnPantalla() {
        asegurarSesionEmpleado();

        buscarProductoEnVentas("Gaseosa");
        assertTrue(seleccionarDelAutocomplete("Gaseosa 3L"));

        ingresarCantidad("3");
        pause();
        assertTrue(textoPagina().contains("31.50"),
                "El preview debe mostrar SUBTOTAL de S/ 31.50");

        clickAgregarAlCarrito();
        assertTrue(textoPagina().contains("TOTAL A COBRAR"),
                "Debe mostrarse el total del carrito");
        assertTrue(textoPagina().contains("31.50"),
                "El total cobrado en pantalla debe ser S/ 31.50");
    }

    @Test
    @Order(6)
    @DisplayName("CPF-11 (UI): cantidad que supera el stock muestra alerta y no agrega")
    void cpf11_cantidadSobreStockBloqueada() throws Exception {
        asegurarSesionEmpleado();

        buscarProductoEnVentas("QA P006");
        assertTrue(seleccionarDelAutocomplete("QA P006"));

        ingresarCantidad("15");
        clickAgregarAlCarrito();

        assertTrue(textoPagina().contains("Stock insuficiente"),
                "Debe mostrarse la alerta de stock insuficiente");
        assertFalse(textoPagina().contains("TOTAL A COBRAR"),
                "El producto no debe agregarse al carrito");
        assertEquals(10, Db.stock(db, p6),
                "El stock de P006 debe mantenerse intacto en 10");
    }

    @Test
    @Order(7)
    @DisplayName("CPF-09 (UI): confirmar venta de 5 unidades de P004 descuenta stock 50 -> 45")
    void cpf09_confirmarVentaDescuentaStock() throws Exception {
        asegurarSesionEmpleado();
        assertEquals(50, Db.stock(db, p4), "Precondicion: stock inicial 50");

        buscarProductoEnVentas("QA P004");
        assertTrue(seleccionarDelAutocomplete("QA P004"));
        ingresarCantidad("5");
        clickAgregarAlCarrito();

        click(By.xpath("//button[@type='submit' and contains(.,'Finalizar y Cobrar')]"));

        wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//*[contains(.,'Venta registrada exitosamente')]")));
        pause();
        assertTrue(textoPagina().contains("Venta registrada exitosamente"),
                "Debe verse la notificacion de exito");

        assertEquals(45, Db.stock(db, p4),
                "El inventario debe descontar exactamente 5 unidades (50 -> 45)");
    }

    @Test
    @Order(8)
    @DisplayName("CPNF-01 (UI): incorporar P001 a la venta excede 3 interacciones (FAIL documentado)")
    void cpnf01_flujoExcedeTresInteracciones() {
        asegurarSesionEmpleado();
        int interacciones = 0;

        buscarProductoEnVentas("Gaseosa");
        // Interaccion 1: elegir el producto en el autocomplete
        assertTrue(seleccionarDelAutocomplete("Gaseosa 3L"),
                "P001 debe ser seleccionable del autocomplete");
        interacciones++;

        // Interaccion 2: ingresar la cantidad
        ingresarCantidad("1");
        interacciones++;

        // Interaccion 3: agregar al carrito
        clickAgregarAlCarrito();
        interacciones++;

        // Interaccion 4: confirmar la venta para que P001 quede incorporado
        click(By.xpath("//button[@type='submit' and contains(.,'Finalizar y Cobrar')]"));
        wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//*[contains(.,'Venta registrada exitosamente')]")));
        interacciones++;
        pause();

        assertTrue(interacciones <= 3,
                "El flujo completo hasta incorporar P001 en la venta requiere "
                        + interacciones + " interacciones y excede el maximo permitido de 3");
    }
}
