package pe.inventario.qa;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

/** Cliente HTTP mínimo contra la API + helpers de auth/JWT. */
public final class ApiClient {

    public record ApiResponse(int status, JsonNode json, String body) {
        public String text(String field) {
            JsonNode n = json == null ? null : json.get(field);
            return n == null || n.isNull() ? null : n.asText();
        }
        public long id() { return json == null || json.get("id") == null ? -1 : json.get("id").asLong(); }
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();

    private ApiClient() {}

    private static ApiResponse send(HttpRequest.Builder b) {
        try {
            HttpResponse<String> res = HTTP.send(b.build(), HttpResponse.BodyHandlers.ofString());
            JsonNode node = null;
            String body = res.body();
            if (body != null && !body.isBlank()) {
                try { node = MAPPER.readTree(body); } catch (Exception ignored) {}
            }
            return new ApiResponse(res.statusCode(), node, body);
        } catch (Exception e) {
            throw new RuntimeException("HTTP request failed: " + e.getMessage(), e);
        }
    }

    private static HttpRequest.Builder req(String method, String path, String token, String jsonBody) {
        HttpRequest.Builder b = HttpRequest.newBuilder()
                .uri(URI.create(QaEnv.API_BASE + path))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json");
        if (token != null) b.header("Authorization", "Bearer " + token);
        if (jsonBody == null) {
            b.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            b.method(method, HttpRequest.BodyPublishers.ofString(jsonBody));
        }
        return b;
    }

    public static ApiResponse post(String path, String jsonBody, String token) {
        return send(req("POST", path, token, jsonBody));
    }

    public static ApiResponse put(String path, String jsonBody, String token) {
        return send(req("PUT", path, token, jsonBody));
    }

    public static ApiResponse get(String path, String token) {
        return send(req("GET", path, token, null));
    }

    public static String login(String email, String password) {
        ApiResponse res = post("/api/auth/login",
                "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}", null);
        if (res.status() != 200 || res.json == null || res.json.get("token") == null) {
            throw new IllegalStateException("Login falló (" + res.status() + "): " + res.body());
        }
        return res.json.get("token").asText();
    }

    /** JWT HS256 válido en firma pero con exp en el pasado (sesión expirada). */
    public static String expiredToken() {
        String secret = QaEnv.env("JWT_SECRET");
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET no disponible en backend/.env");
        }
        long now = System.currentTimeMillis() / 1000;
        String header = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = b64(("{\"id\":1,\"rol\":\"ADMIN\",\"iat\":" + (now - 7200)
                + ",\"exp\":" + (now - 3600) + "}").getBytes(StandardCharsets.UTF_8));
        String signingInput = header + "." + payload;
        return signingInput + "." + b64(hmacSha256(signingInput, secret));
    }

    private static byte[] hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
