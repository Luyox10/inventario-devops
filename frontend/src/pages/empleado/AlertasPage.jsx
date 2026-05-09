import React, { useEffect, useMemo, useState } from 'react';

import { listStockBajo } from '../../api/alertas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const AlertasPage = () => {
  const { token, logout } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function severityFor(a) {
    const actual = Number(a?.stock_actual || 0);
    const minimo = Number(a?.stock_minimo || 0);
    if (actual <= 0) {
      return {
        key: 'critico',
        title: 'CRÍTICO',
        subtitle: 'Sin stock',
        badge: {
          background: 'rgba(239, 68, 68, 0.14)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#7f1d1d',
        },
        accent: '#ef4444',
      };
    }
    if (actual <= minimo) {
      return {
        key: 'bajo',
        title: 'BAJO',
        subtitle: 'Bajo mínimo',
        badge: {
          background: 'rgba(245, 158, 11, 0.16)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: '#92400e',
        },
        accent: '#f59e0b',
      };
    }
    return {
      key: 'ok',
      title: 'OK',
      subtitle: 'Nivel óptimo',
      badge: {
        background: 'rgba(16, 185, 129, 0.16)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        color: '#065f46',
      },
      accent: '#10b981',
    };
  }

  const alertasSorted = useMemo(() => {
    const arr = [...alertas];
    arr.sort((a, b) => {
      const sa = severityFor(a);
      const sb = severityFor(b);
      const sevA = sa.key === 'critico' ? 2 : sa.key === 'bajo' ? 1 : 0;
      const sevB = sb.key === 'critico' ? 2 : sb.key === 'bajo' ? 1 : 0;
      if (sevB !== sevA) return sevB - sevA;

      const faltA = Math.max(0, Number(a?.stock_minimo || 0) - Number(a?.stock_actual || 0));
      const faltB = Math.max(0, Number(b?.stock_minimo || 0) - Number(b?.stock_actual || 0));
      if (faltB !== faltA) return faltB - faltA;

      return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' });
    });
    return arr;
  }, [alertas]);

  const resumen = useMemo(() => {
    let criticos = 0;
    let bajos = 0;
    let faltanteTotal = 0;
    for (const a of alertas) {
      const st = severityFor(a).key;
      const falt = Math.max(0, Number(a?.stock_minimo || 0) - Number(a?.stock_actual || 0));
      faltanteTotal += falt;
      if (st === 'critico') criticos += 1;
      else if (st === 'bajo') bajos += 1;
    }
    return { criticos, bajos, faltanteTotal };
  }, [alertas]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listStockBajo({ token })
      .then((data) => {
        setAlertas(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err.status === 401) logout();
        setError(err.message || 'No se pudieron cargar las alertas.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, logout]);

  return (
    <div>
      {/* Títulos con el peso visual del Admin (fontWeight 900) */}
      <header style={{ marginBottom: '25px' }}>
        <h2 style={{ margin: 0, color: '#0b2a52', fontSize: '28px', fontWeight: 900 }}>
          Alertas de Stock Bajo
        </h2>
        <p style={{ margin: '5px 0 0', color: 'rgba(11, 42, 82, 0.7)', fontSize: '15px' }}>
          Productos que requieren reposición inmediata.
        </p>
      </header>

      {/* Manejo de Error con estilo consistente */}
      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          borderRadius: '12px', 
          color: '#b91c1c', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(11, 42, 82, 0.5)', padding: '20px' }}>
          Verificando niveles de inventario...
        </div>
      ) : alertas.length === 0 ? (
        /* Cuadro de éxito estilizado */
        <div style={{ 
          padding: '30px', 
          backgroundColor: 'rgba(52, 211, 153, 0.1)', 
          color: '#065f46', 
          borderRadius: '15px', 
          textAlign: 'center',
          fontWeight: 600,
          border: '1px solid rgba(52, 211, 153, 0.2)'
        }}>
          ✅ Todo el inventario se encuentra en niveles óptimos.
        </div>
      ) : (
        /* Lista de alertas con diseño de tarjeta "Glass" interna */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={styles.summaryRow}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Críticos</div>
              <div style={styles.summaryValue}>{resumen.criticos}</div>
              <div style={styles.summarySub}>Stock 0 o menor</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Bajo mínimo</div>
              <div style={styles.summaryValue}>{resumen.bajos}</div>
              <div style={styles.summarySub}>Requieren reposición</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Faltante total</div>
              <div style={styles.summaryValue}>{resumen.faltanteTotal}</div>
              <div style={styles.summarySub}>Unidades para llegar al mínimo</div>
            </div>
          </div>

          {alertasSorted.map((alerta) => {
            const sev = severityFor(alerta);
            const actual = Number(alerta.stock_actual || 0);
            const minimo = Number(alerta.stock_minimo || 0);
            const faltante = Math.max(0, minimo - actual);
            const ratio = minimo > 0 ? Math.max(0, Math.min(1, actual / minimo)) : 0;
            const barPct = Math.round(ratio * 100);

            return (
              <div
                key={alerta.id}
                style={{
                  ...styles.card,
                  borderLeft: `6px solid ${sev.accent}`,
                }}
              >
                <div style={styles.cardMain}>
                  <div style={styles.leftCol}>
                    <div style={styles.topRow}>
                      <span style={{ ...styles.badge, ...sev.badge }}>{sev.title}</span>
                      <span style={styles.smallMuted}>{sev.subtitle}</span>
                    </div>

                    <div style={styles.nameRow}>
                      <div style={styles.name}>{alerta.nombre}</div>
                      {alerta.sku ? <div style={styles.sku}>SKU: {alerta.sku}</div> : null}
                    </div>

                    <div style={styles.metricsRow}>
                      <div style={styles.metricChip}>
                        <div style={styles.metricLabel}>Mínimo</div>
                        <div style={styles.metricValue}>{minimo}</div>
                      </div>
                      <div style={styles.metricChip}>
                        <div style={styles.metricLabel}>Faltante</div>
                        <div style={styles.metricValue}>{faltante}</div>
                      </div>
                      <div style={styles.metricChip}>
                        <div style={styles.metricLabel}>Unidad</div>
                        <div style={styles.metricValue}>{alerta.unidad || 'und'}</div>
                      </div>
                    </div>

                    <div style={styles.barWrap}>
                      <div style={styles.barTop}>
                        <span style={styles.barLabel}>Nivel vs mínimo</span>
                        <span style={styles.barLabel}>{barPct}%</span>
                      </div>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${barPct}%`, background: sev.accent }} />
                      </div>
                    </div>
                  </div>

                  <div style={styles.rightCol}>
                    <div style={styles.stockLabel}>Stock actual</div>
                    <div style={{ ...styles.stockValue, color: sev.accent }}>
                      {actual} <span style={styles.stockUnit}>unid.</span>
                    </div>
                    <div style={styles.tip}>
                      {sev.key === 'critico'
                        ? 'Prioridad alta: repón primero este producto.'
                        : 'Sugerencia: repón antes de que llegue a 0.'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 6,
  },
  summaryCard: {
    padding: 14,
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.5)',
    background: 'rgba(255, 255, 255, 0.35)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
  },
  summaryLabel: { fontSize: 11, fontWeight: 900, color: 'rgba(11, 42, 82, 0.6)', textTransform: 'uppercase', letterSpacing: 0.6 },
  summaryValue: { marginTop: 8, fontSize: 22, fontWeight: 1000, color: '#0b2a52' },
  summarySub: { marginTop: 6, fontSize: 12, fontWeight: 800, color: 'rgba(11, 42, 82, 0.72)' },
  card: {
    padding: '18px',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 10px 28px rgba(0,0,0,0.06)',
  },
  cardMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: 14, flexWrap: 'wrap' },
  leftCol: { minWidth: 260, flex: '1 1 360px' },
  rightCol: { minWidth: 180, flex: '0 1 220px', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6 },
  topRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, fontWeight: 1000, fontSize: 11, letterSpacing: 0.6 },
  smallMuted: { fontSize: 12, fontWeight: 800, color: 'rgba(11, 42, 82, 0.65)' },
  nameRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  name: { color: '#0b2a52', fontWeight: 900, fontSize: '16px' },
  sku: { fontSize: 12, fontWeight: 900, color: 'rgba(11, 42, 82, 0.72)' },
  metricsRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 },
  metricChip: {
    padding: '8px 10px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.30)',
    border: '1px solid rgba(11, 42, 82, 0.10)',
    minWidth: 92,
  },
  metricLabel: { fontSize: 11, fontWeight: 900, color: 'rgba(11, 42, 82, 0.62)' },
  metricValue: { marginTop: 4, fontSize: 14, fontWeight: 1000, color: '#0b2a52' },
  barWrap: { marginTop: 12 },
  barTop: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  barLabel: { fontSize: 11, fontWeight: 900, color: 'rgba(11, 42, 82, 0.60)' },
  barTrack: { height: 10, borderRadius: 999, background: 'rgba(11, 42, 82, 0.10)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  stockLabel: { fontSize: 12, color: 'rgba(11, 42, 82, 0.6)', fontWeight: 900 },
  stockValue: { fontSize: '22px', fontWeight: 1000 },
  stockUnit: { fontSize: '12px', fontWeight: 700, color: 'rgba(11, 42, 82, 0.65)' },
  tip: { fontSize: 12, fontWeight: 800, color: 'rgba(11, 42, 82, 0.70)' },
};

export default AlertasPage;