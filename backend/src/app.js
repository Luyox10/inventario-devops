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

const app = express();

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

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
