package pe.inventario.qa;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.openqa.selenium.By;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

/**
 * Base para pruebas E2E visuales con Selenium WebDriver.
 * Navegador REAL (NO headless): intenta Chrome y cae a Edge (Selenium Manager
 * resuelve el driver automaticamente). La pausa SLOW_MS hace visible cada
 * accion para la demostracion en pantalla.
 *
 * Configurable:
 *   -Dqa.ui.url=http://localhost:5173   (URL del frontend)
 *   -Dui.slow.ms=600  o  env UI_SLOW_MS (pausa entre acciones, ms)
 */
public abstract class UiBaseTest extends QaBase {

    protected static final String FRONT =
            System.getProperty("qa.ui.url", "http://localhost:5173");

    protected static final long SLOW_MS = Long.parseLong(
            System.getProperty("ui.slow.ms",
                    System.getenv().getOrDefault("UI_SLOW_MS", "600")));

    protected static WebDriver driver;
    protected static WebDriverWait wait;

    @BeforeAll
    static void initBrowser() {
        driver = createDriver();
        driver.manage().window().maximize();
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    @AfterAll
    static void closeBrowser() {
        if (driver != null) {
            driver.quit();
            driver = null;
        }
    }

    private static WebDriver createDriver() {
        try {
            return new ChromeDriver();
        } catch (Throwable chromeFail) {
            System.out.println("[UiBaseTest] Chrome no disponible (" + chromeFail.getMessage()
                    + "). Usando Microsoft Edge.");
            return new EdgeDriver();
        }
    }

    /** Pausa visible para la demo. */
    protected static void pause() {
        try {
            Thread.sleep(SLOW_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** Escribe texto tecla a tecla (visible) en un input localizado por By. */
    protected void escribir(By by, String texto) {
        WebElement el = wait.until(ExpectedConditions.elementToBeClickable(by));
        el.click();
        el.clear();
        for (char ch : texto.toCharArray()) {
            el.sendKeys(String.valueOf(ch));
            try {
                Thread.sleep(Math.min(90, SLOW_MS / 8));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        pause();
    }

    protected void click(By by) {
        wait.until(ExpectedConditions.elementToBeClickable(by)).click();
        pause();
    }

    /** Login visual: completa el formulario y espera salir de /login. */
    protected void loginUi(String email, String password) {
        driver.get(FRONT + "/login");
        pause();
        escribir(By.cssSelector("input[type='email']"), email);
        escribir(By.cssSelector("input[type='password']"), password);
        click(By.xpath("//button[@type='submit' and contains(.,'Ingresar')]"));
        wait.until(ExpectedConditions.not(ExpectedConditions.urlContains("/login")));
        pause();
    }

    protected void irAVentasEmpleado() {
        driver.get(FRONT + "/empleado/ventas");
        wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//h2[contains(.,'Registro de Ventas')]")));
        pause();
    }

    /** Busca un producto en el autocomplete de la pantalla de ventas. */
    protected void buscarProductoEnVentas(String texto) {
        escribir(By.cssSelector("input[placeholder*='Buscar por SKU o nombre']"), texto);
    }

    /** Devuelve los items visibles del dropdown del autocomplete. */
    protected List<WebElement> itemsAutocomplete() {
        return driver.findElements(By.xpath(
                "//input[contains(@placeholder,'Buscar por SKU o nombre')]"
                        + "/following::button[.//div or contains(.,'SKU')]"));
    }

    /**
     * Selecciona el item del autocomplete que contiene el texto dado.
     * El dropdown se re-renderiza con cada tecla (React), asi que el elemento
     * puede quedar stale entre localizarlo y clicarlo: se reintenta con
     * Actions (dispara mousedown+click reales, necesarios porque el item
     * usa onMouseDown+preventDefault) durante ~15s.
     */
    protected boolean seleccionarDelAutocomplete(String texto) {
        By item = By.xpath("//button[.//div[contains(.,'" + texto + "')]]");
        long deadline = System.currentTimeMillis() + 15000;
        while (System.currentTimeMillis() < deadline) {
            try {
                WebElement el = wait.until(ExpectedConditions.elementToBeClickable(item));
                new Actions(driver).moveToElement(el).pause(Duration.ofMillis(150)).click().perform();
                pause();
                return true;
            } catch (StaleElementReferenceException stale) {
                // React re-renderizo el item; reintentar con el elemento fresco
            } catch (Exception e) {
                return false;
            }
        }
        return false;
    }

    protected void ingresarCantidad(String qty) {
        escribir(By.cssSelector("input[type='number']"), qty);
    }

    protected void clickAgregarAlCarrito() {
        click(By.xpath("//button[contains(.,'Agregar al carrito')]"));
    }

    protected WebElement botonAgregarAlCarrito() {
        return driver.findElement(By.xpath("//button[contains(.,'Agregar al carrito')]"));
    }

    /** Texto completo visible de la pagina (para aserciones de mensajes). */
    protected String textoPagina() {
        return driver.findElement(By.tagName("body")).getText();
    }
}
