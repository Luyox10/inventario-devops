import React, { useCallback, useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BrainCircuit, RefreshCw, Cpu, AlertTriangle,
  TrendingUp, Package, ShoppingCart, CheckCircle2, ArrowUp,
} from 'lucide-react';
import { useAuth } from '../../state/auth/AuthContext.jsx';
import { getMLHealth, trainModelo, getPredictiones } from '../../api/predicciones.js';

const DIAS_OPTS = [7, 14, 30];

function formatNum(n) {
  return Number(n ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });
}

export default function AdminPrediccionesPage() {
  const { token } = useAuth();

  const [mlStatus, setMlStatus]     = useState(null);
  const [result, setResult]         = useState(null);
  const [dias, setDias]             = useState(7);
  const [loading, setLoading]       = useState(false);
  const [training, setTraining]     = useState(false);
  const [error, setError]           = useState(null);
  const [selectedProd, setSelectedProd] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const h = await getMLHealth({ token });
      setMlStatus(h);
      return h;
    } catch {
      setMlStatus({ status: 'unavailable', modelo_entrenado: false });
      return null;
    }
  }, [token]);

  async function handleTrain() {
    setTraining(true); setError(null);
    try {
      await trainModelo({ token });
      await checkHealth();
    } catch (err) {
      setError(err.message);
    } finally {
      setTraining(false);
    }
  }

  async function handlePredict() {
    setLoading(true); setError(null);
    try {
      const data = await getPredictiones({ token, dias });
      setResult(data);
      setSelectedProd(data?.resultados?.[0] ?? null);
    } catch (err) {
      if (err.status === 503) {
        setError('El modelo aún no está entrenado. Usa "Entrenar modelo" primero.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const modeloListo = mlStatus?.modelo_entrenado === true;

  const chartData = selectedProd
    ? selectedProd.prediccion_diaria.map((v, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          dia: d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }),
          cantidad: v,
        };
      })
    : [];

  const necesitanReposicion = result?.resultados?.filter(r => r.necesita_reposicion) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrainCircuit size={24} color="#6366f1" />
            <h2 style={{ margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 }}>
              Predicción de Ventas
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 34px', color: 'rgba(11,42,82,0.55)', fontSize: 13 }}>
            Random Forest · Recomendación de inventario automatizada
          </p>
        </div>

        {/* Estado del modelo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 12,
          background: modeloListo ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
          border: `1px solid ${modeloListo ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
        }}>
          <Cpu size={15} color={modeloListo ? '#10b981' : '#f59e0b'} />
          <span style={{ fontSize: 12, fontWeight: 800, color: modeloListo ? '#065f46' : '#92400e' }}>
            {mlStatus === null ? 'Verificando...' : modeloListo ? 'Modelo listo' : 'Modelo no entrenado'}
          </span>
          {modeloListo && mlStatus?.registros_entrenamiento > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(11,42,82,0.45)', fontWeight: 700 }}>
              · {mlStatus.registros_entrenamiento} registros
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {/* ── Controles ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={handleTrain} disabled={training} style={{ ...s.btn, background: 'rgba(11,42,82,0.88)', color: '#fff', borderColor: 'transparent' }}>
          <Cpu size={14} style={{ animation: training ? 'spin 1s linear infinite' : 'none' }} />
          {training ? 'Entrenando...' : 'Entrenar modelo'}
        </button>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {DIAS_OPTS.map(d => (
            <button key={d} onClick={() => setDias(d)}
              style={{ ...s.pillBtn, ...(dias === d ? s.pillBtnActive : {}) }}>
              {d} días
            </button>
          ))}
        </div>

        <button onClick={handlePredict} disabled={loading || !modeloListo} style={{ ...s.btn, background: 'rgba(99,102,241,0.90)', color: '#fff', borderColor: 'transparent', opacity: (!modeloListo || loading) ? 0.6 : 1 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Generando...' : 'Generar predicción'}
        </button>
      </div>

      {/* ── Aviso sin modelo ── */}
      {!modeloListo && (
        <div style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
          <div style={{ fontWeight: 900, color: '#92400e', fontSize: 15, marginBottom: 6 }}>
            El modelo necesita entrenarse primero
          </div>
          <div style={{ fontSize: 13, color: 'rgba(11,42,82,0.60)', lineHeight: 1.6 }}>
            El sistema acumulará historial de ventas automáticamente con cada venta registrada.
            Una vez que haya suficientes registros (mínimo 10), haz clic en <b>"Entrenar modelo"</b> para
            que el algoritmo aprenda los patrones de consumo de la bodega.
          </div>
        </div>
      )}

      {/* ── Resultados ── */}
      {result && (
        <>
          {/* KPIs resumen */}
          <div style={s.kpiGrid}>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: 'rgba(99,102,241,0.10)' }}><ShoppingCart size={18} color="#6366f1" /></div>
              <div style={{ ...s.kpiNum, color: '#6366f1' }}>{result.resultados?.length ?? 0}</div>
              <div style={s.kpiLbl}>Productos analizados</div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: 'rgba(239,68,68,0.10)' }}><AlertTriangle size={18} color="#ef4444" /></div>
              <div style={{ ...s.kpiNum, color: '#ef4444' }}>{necesitanReposicion.length}</div>
              <div style={s.kpiLbl}>Requieren reposición</div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: 'rgba(16,185,129,0.10)' }}><CheckCircle2 size={18} color="#10b981" /></div>
              <div style={{ ...s.kpiNum, color: '#10b981' }}>{(result.resultados?.length ?? 0) - necesitanReposicion.length}</div>
              <div style={s.kpiLbl}>Stock suficiente</div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: 'rgba(245,158,11,0.10)' }}><TrendingUp size={18} color="#f59e0b" /></div>
              <div style={{ ...s.kpiNum, color: '#f59e0b' }}>
                {formatNum(result.resultados?.reduce((s, r) => s + r.prediccion_total, 0))}
              </div>
              <div style={s.kpiLbl}>Unidades estimadas ({dias}d)</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

            {/* Tabla de predicciones */}
            <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.55)', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(11,42,82,0.04)', borderBottom: '1.5px solid rgba(11,42,82,0.09)' }}>
                    <th style={s.th}>Producto</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Stock actual</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Predicción ({dias}d)</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Stock seguridad</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Inv. recomendado</th>
                    <th style={s.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {result.resultados.map((r, idx) => {
                    const activo = selectedProd?.producto_id === r.producto_id;
                    return (
                      <tr key={r.producto_id}
                        onClick={() => setSelectedProd(r)}
                        style={{
                          background: activo ? 'rgba(99,102,241,0.07)' : idx % 2 === 0 ? 'transparent' : 'rgba(11,42,82,0.02)',
                          borderBottom: '1px solid rgba(11,42,82,0.07)',
                          cursor: 'pointer',
                          borderLeft: activo ? '4px solid #6366f1' : '4px solid transparent',
                        }}>
                        <td style={s.td}>
                          <div style={{ fontWeight: 800, color: '#0b2a52', fontSize: 13 }}>{r.nombre}</div>
                          <div style={{ fontSize: 11, color: 'rgba(11,42,82,0.45)', fontWeight: 700 }}>{r.unidad}</div>
                        </td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: 'rgba(11,42,82,0.70)', fontSize: 13 }}>
                          {r.stock_actual}
                        </td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#6366f1', fontSize: 14 }}>
                          {formatNum(r.prediccion_total)}
                        </td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: 'rgba(11,42,82,0.55)', fontSize: 13 }}>
                          +{r.stock_seguridad}
                        </td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#0b2a52', fontSize: 14 }}>
                          {r.inventario_recomendado}
                        </td>
                        <td style={s.td}>
                          {r.necesita_reposicion ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 900, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)', color: '#dc2626' }}>
                              <ArrowUp size={10} />REPONER
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 900, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', color: '#065f46' }}>
                              <CheckCircle2 size={10} />OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(11,42,82,0.07)', fontSize: 12, color: 'rgba(11,42,82,0.40)', fontWeight: 700 }}>
                {result.resultados.length} productos · Haz clic en una fila para ver su gráfico
              </div>
            </div>

            {/* Panel detalle + gráfico */}
            {selectedProd && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.55)', padding: '16px 18px', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Package size={16} color="#6366f1" />
                    <span style={{ fontWeight: 900, color: '#0b2a52', fontSize: 14 }}>{selectedProd.nombre}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: 'Stock actual',      val: `${selectedProd.stock_actual} ${selectedProd.unidad}`,         color: '#0b2a52' },
                      { label: 'Predicción',        val: `${formatNum(selectedProd.prediccion_total)} ${selectedProd.unidad}`, color: '#6366f1' },
                      { label: 'Stock seguridad',   val: `+${selectedProd.stock_seguridad} ${selectedProd.unidad}`,    color: '#f59e0b' },
                      { label: 'Inv. recomendado',  val: `${selectedProd.inventario_recomendado} ${selectedProd.unidad}`, color: selectedProd.necesita_reposicion ? '#ef4444' : '#10b981' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(11,42,82,0.08)' }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(11,42,82,0.50)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color, marginTop: 3 }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(11,42,82,0.45)', marginBottom: 6 }}>
                    VENTAS ESTIMADAS — PRÓXIMOS {dias} DÍAS
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,42,82,0.07)" vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'rgba(11,42,82,0.45)', fontWeight: 700 }} axisLine={false} tickLine={false} interval={dias > 14 ? Math.floor(dias / 7) : 0} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v) => [formatNum(v), selectedProd.unidad]}
                        contentStyle={{ background: 'rgba(11,42,82,0.92)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}
                      />
                      <Area type="monotone" dataKey="cantidad" stroke="#6366f1" strokeWidth={2.5} fill="url(#predGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s = {
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 16px', borderRadius: 10, border: '1.5px solid rgba(11,42,82,0.15)',
    fontSize: 13, fontWeight: 800, cursor: 'pointer',
  },
  pillBtn: {
    padding: '6px 13px', borderRadius: 999, border: '1.5px solid rgba(11,42,82,0.13)',
    background: 'rgba(255,255,255,0.45)', color: 'rgba(11,42,82,0.65)',
    fontSize: 12, fontWeight: 800, cursor: 'pointer',
  },
  pillBtnActive: { background: '#0b2a52', color: '#fff', borderColor: '#0b2a52' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  kpiCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
    padding: '14px 16px', borderRadius: 16,
    background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.55)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiNum:  { fontSize: 26, fontWeight: 900, lineHeight: 1 },
  kpiLbl:  { fontSize: 12, fontWeight: 700, color: 'rgba(11,42,82,0.55)' },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 900, color: 'rgba(11,42,82,0.55)',
    textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap',
  },
  td: { padding: '10px 14px', verticalAlign: 'middle' },
};
