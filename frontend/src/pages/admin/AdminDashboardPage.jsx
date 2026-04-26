import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminDashboardPage() {
  return (
    <div>
      <div style={styles.head}>
        <h2 style={styles.h2}>Panel de administración</h2>
        <p style={styles.p}>Selecciona una vista para gestionar el sistema.</p>
      </div>

      <div style={styles.grid}>
        <Link to="/admin/dashboard" style={styles.card}>
          <div style={styles.cardTitle}>Dashboard</div>
          <div style={styles.cardDesc}>Resumen general (próximamente métricas reales)</div>
        </Link>

        <Link to="/admin/productos" style={styles.cardPrimary}>
          <div style={styles.cardTitleWhite}>Productos</div>
          <div style={styles.cardDescWhite}>Registrar, editar y eliminar productos</div>
        </Link>

        <div style={styles.cardDisabled} title="Próximamente">
          <div style={styles.cardTitle}>Stock</div>
          <div style={styles.cardDesc}>Actualizar cantidades y stock mínimo</div>
          <div style={styles.soon}>Próximamente</div>
        </div>

        <div style={styles.cardDisabled} title="Próximamente">
          <div style={styles.cardTitle}>Ventas</div>
          <div style={styles.cardDesc}>Registrar ventas e historial</div>
          <div style={styles.soon}>Próximamente</div>
        </div>

        <div style={styles.cardDisabled} title="Próximamente">
          <div style={styles.cardTitle}>Alertas</div>
          <div style={styles.cardDesc}>Productos con stock bajo</div>
          <div style={styles.soon}>Próximamente</div>
        </div>

        <div style={styles.cardDisabled} title="Próximamente">
          <div style={styles.cardTitle}>Reportes</div>
          <div style={styles.cardDesc}>Analítica de ventas e inventario</div>
          <div style={styles.soon}>Próximamente</div>
        </div>

        <div style={styles.cardDisabled} title="Próximamente">
          <div style={styles.cardTitle}>Usuarios</div>
          <div style={styles.cardDesc}>Gestión de accesos y roles</div>
          <div style={styles.soon}>Próximamente</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  head: {
    marginBottom: 14,
  },
  h2: { margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 },
  p: { margin: '8px 0 0', color: 'rgba(11, 42, 82, 0.75)' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
  },
  card: {
    textDecoration: 'none',
    background: 'rgba(235, 240, 255, 0.78)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.18)',
    backdropFilter: 'blur(14px)',
  },
  cardPrimary: {
    textDecoration: 'none',
    background: 'rgba(11, 42, 82, 0.92)',
    border: '1px solid rgba(11, 42, 82, 0.18)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.20)',
  },
  cardDisabled: {
    background: 'rgba(255,255,255,0.20)',
    border: '1px dashed rgba(11, 42, 82, 0.22)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.12)',
  },
  cardTitle: { fontWeight: 900, color: '#0b2a52', fontSize: 16 },
  cardDesc: { marginTop: 6, color: 'rgba(11, 42, 82, 0.72)', fontSize: 13, lineHeight: 1.35 },
  cardTitleWhite: { fontWeight: 900, color: 'rgba(255,255,255,0.96)', fontSize: 16 },
  cardDescWhite: { marginTop: 6, color: 'rgba(255,255,255,0.80)', fontSize: 13, lineHeight: 1.35 },
  soon: {
    marginTop: 10,
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(11, 42, 82, 0.10)',
    color: 'rgba(11, 42, 82, 0.75)',
    fontSize: 12,
    fontWeight: 900,
    width: 'fit-content',
  },
};
