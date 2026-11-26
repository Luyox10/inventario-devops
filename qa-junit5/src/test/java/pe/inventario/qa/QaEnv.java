package pe.inventario.qa;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/** Configuración del entorno QA: lee backend/.env y permite overrides por -D. */
public final class QaEnv {

    public static final String API_BASE =
            System.getProperty("qa.api.url", "http://localhost:3001");

    private static final Properties ENV = loadEnv();

    private QaEnv() {}

    public static String env(String key) {
        String sys = System.getProperty("qa.env." + key);
        if (sys != null) return sys;
        return ENV.getProperty(key);
    }

    public static String env(String key, String def) {
        String v = env(key);
        return (v == null || v.isBlank()) ? def : v;
    }

    private static Properties loadEnv() {
        Properties p = new Properties();
        Path f = Path.of("../backend/.env");
        if (!Files.exists(f)) f = Path.of("backend/.env");
        if (!Files.exists(f)) return p;
        try {
            for (String line : Files.readAllLines(f)) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int eq = line.indexOf('=');
                if (eq <= 0) continue;
                p.setProperty(line.substring(0, eq).trim(), line.substring(eq + 1).trim());
            }
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo leer " + f, e);
        }
        return p;
    }
}
