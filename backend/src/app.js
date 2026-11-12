require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { notFoundMiddleware } = require('./middlewares/notFound.middleware');
const { errorMiddleware } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const productoRoutes = require('./routes/producto.routes');
const stockRoutes = require('./routes/stock.routes');
const ventaRoutes = require('./routes/venta.routes');
const alertaRoutes = require('./routes/alerta.routes');
const reporteRoutes = require('./routes/reporte.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const loteRoutes = require('./routes/lote.routes');
const prediccionRoutes = require('./routes/prediccion.routes');
const kardexRoutes = require('./routes/kardex.routes');

const app = express();

// Render entrega las peticiones a través de su proxy: usar la IP real del cliente.
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

// Respuestas dinámicas/autenticadas: ningún navegador, proxy o CDN debe guardarlas.
const disableCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

app.use(['/api', '/health'], disableCache);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/alertas', alertaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/lotes', loteRoutes);
app.use('/api/predicciones', prediccionRoutes);
app.use('/api/kardex', kardexRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
