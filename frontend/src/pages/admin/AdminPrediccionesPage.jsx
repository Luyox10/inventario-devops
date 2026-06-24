import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  BrainCircuit, RefreshCw, Cpu, AlertTriangle, FlaskConical,
  TrendingUp, Package, ShoppingCart, CheckCircle2, ArrowUp, BarChart2,
  ChevronDown, ChevronUp, Info, Zap, Target, Activity,
} from 'lucide-react';
import { useAuth } from '../../state/auth/AuthContext.jsx';
import {
  getMLHealth, trainModelo, simulateAndTrain, getPredictiones, getMetrics,
} from '../../api/predicciones.js';

const DIAS_OPTS = [7, 14, 30];

function formatNum(n, dec = 1) {
  return Number(n ?? 0).toLocaleString('es-PE', { maximumFractionDigits: dec });
}

function MetricCard({ label, value, desc, color, icon: Icon }) {
  const isNull = value === null || value === undefined;
  return (
    <div style={{
      flex: 1, minWidth: 120, padding: '14px 16px', borderRadius: 14,
      background: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.60)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(11,42,82,0.50)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: isNull ? 'rgba(11,42,82,0.30)' : color, lineHeight: 1 }}>
        {isNull ? '—' : formatNum(value, 4)}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(11,42,82,0.45)', marginTop: 4, fontWeight: 700 }}>{desc}</div>
    </div>
  );
}

export default function AdminPrediccionesPage() {
  const { token } = useAuth();

  const [mlStatus, setMlStatus]         = useState(null);
  const [result, setResult]             = useState(null);
  const [dias, setDias]                 = useState(7);
  const [loading, setLoading]           = useState(false);
  const [training, setTraining]         = useState(false);
  const [simulating, setSimulating]     = useState(false);
  const [error, setError]               = useState(null);
  const [successMsg, setSuccessMsg]     = useState(null);
  const [selectedProd, setSelectedProd] = useState(null);
  const [catFilter, setCatFilter]       = useState('Todos');
  const [showMetrics, setShowMetrics]   = useState(true);
  const [tab, setTab]                   = useState('tabla');

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
    setTraining(true); setError(null); setSuccessMsg(null);
    try {
      const res = await trainModelo({ token });
      setSuccessMsg(`Modelo entrenado con ${res.registros} registros reales.`);
      await checkHealth();
    } catch (err) {
      setError(err.message || 'Error al entrenar el modelo.');
    } finally {
      setTraining(false);
    }
  }

  async function handleSimulate() {
    setSimulating(true); setError(null); setSuccessMsg(null);
    try {
      const res = await simulateAndTrain({ token, dias: 90 });
      setSuccessMsg(
        `Simulación completada: ${res.simulacion.registros} registros generados para ${res.simulacion.productos} productos (${res.simulacion.dias} días). Modelo entrenado.`
      );
      await checkHealth();
    } catch (err) {
      setError(err.message || 'Error al simular datos.');
    } finally {
      setSimulating(false);
    }
  }

  async function handlePredict() {
    setLoading(true); setError(null); setSuccessMsg(null);
    try {
      const data = await getPredictiones({ token, dias });
      setResult(data);
      setCatFilter('Todos');
      setSelectedProd(data?.resultados?.[0] ?? null);
    } catch (err) {
      if (err.status === 503) {
        setError('El modelo aún no está entrenado. Usa "Entrenar modelo" o "Simular datos" primero.');
      } else {
        setError(err.message || 'Error al generar predicciones.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const modeloListo = mlStatus?.modelo_entrenado === true;
  const metricas = result?.metricas ?? mlStatus?.metricas ?? null;

  const categorias = useMemo(() => {
    if (!result?.resultados) return [];
    const cats = [...new Set(result.resultados.map(r => r.categoria || 'Sin categoría'))];
    return ['Todos', ...cats.sort()];
  }, [result]);

  const resultadosFiltrados = useMemo(() => {
    if (!result?.resultados) return [];
    if (catFilter === 'Todos') return result.resultados;
    return result.resultados.filter(r => (r.categoria || 'Sin categoría') === catFilter);
  }, [result, catFilter]);

  const necesitanReposicion = result?.resultados?.filter(r => r.necesita_reposicion) ?? [];
  const totalUnidades = result?.resultados?.reduce((acc, r) => acc + r.prediccion_total, 0) ?? 0;
  const totalRecomendado = result?.resultados?.reduce((acc, r) => acc + r.inventario_recomendado, 0) ?? 0;

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

  const barData = useMemo(() => {
    if (!result?.resultados) return [];
    return result.resultados.slice(0, 10).map(r => ({
      nombre: r.nombre.length > 14 ? r.nombre.slice(0, 14) + '…' : r.nombre,
      prediccion: r.prediccion_total,
      recomendado: r.inventario_recomendado,
      stock: r.stock_actual,
    }));
  }, [result]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrainCircuit size={24} color="#6366f1" />
            <h2 style={{ margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 }}>Predicción de Ventas</h2>
          </div>
          <p style={{ margin: '4px 0 0 34px', color: 'rgba(11,42,82,0.55)', fontSize: 13 }}>
            Random Forest Regressor · Recomendación de inventario automatizada
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12,
          background: modeloListo ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
          border: `1px solid ${modeloListo ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
        }}>
          <Cpu size={15} color={modeloListo ? '#10b981' : '#f59e0b'} />
          <span style={{ fontSize: 12, fontWeight: 800, color: modeloListo ? '#065f46' : '#92400e' }}>
            {mlStatus === null ? 'Verificando...' : modeloListo ? 'Modelo listo' : 'Sin entrenar'}
          </span>
          {modeloListo && mlStatus?.registros_entrenamiento > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(11,42,82,0.45)', fontWeight: 700 }}>
              · {mlStatus.registros_entrenamiento} registros
            </span>
          )}
        </div>
      </div>

      {/* ── Alertas ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
          <AlertTriangle size={16} />{error}
        </div>
      )}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#065f46', fontSize: 13, fontWeight: 700 }}>
          <CheckCircle2 size={16} />{successMsg}
        </div>
      )}

      {/* ── Panel de Entrenamiento ── */}
      <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.60)', padding: '20px 22px', boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 900, color: '#0b2a52', fontSize: 15, marginBottom: 4 }}>Entrenamiento del Modelo</div>
        <div style={{ fontSize: 13, color: 'rgba(11,42,82,0.55)', marginBottom: 16, lineHeight: 1.6 }}>
          Entrena el modelo con el historial real de ventas o genera datos simulados si la bodega aún no tiene registros suficientes.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleTrain} disabled={training || simulating}
            style={{ ...s.btn, background: 'rgba(11,42,82,0.88)', color: '#fff', borderColor: 'transparent' }}>
            <Cpu size={14} style={{ animation: training ? 'spin 1s linear infinite' : 'none' }} />
            {training ? 'Entrenando...' : 'Entrenar con datos reales'}
          </button>
          <button onClick={handleSimulate} disabled={training || simulating}
            style={{ ...s.btn, background: 'rgba(99,102,241,0.15)', color: '#4338ca', borderColor: 'rgba(99,102,241,0.30)' }}>
            <FlaskConical size={14} style={{ animation: simulating ? 'spin 1s linear infinite' : 'none' }} />
            {simulating ? 'Simulando...' : 'Simular datos históricos (90 días)'}
          </button>
        </div>
        {!modeloListo && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)', fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
            <strong>Sin modelo entrenado.</strong> Si la bodega aún no tiene historial de ventas, usa <strong>"Simular datos históricos"</strong>
            {' '}para que el sistema genere patrones de consumo representativos y pueda aprender.
          </div>
        )}
      </div>

      {/* ── Métricas del modelo ── */}
      {modeloListo && (
        <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.60)', padding: '18px 22px', boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
          <button
            onClick={() => setShowMetrics(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}>
            <BarChart2 size={16} color="#6366f1" />
            <span style={{ fontWeight: 900, color: '#0b2a52', fontSize: 15 }}>Métricas de Evaluación del Modelo</span>
            {showMetrics ? <ChevronUp size={16} color="rgba(11,42,82,0.45)" style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} color="rgba(11,42,82,0.45)" style={{ marginLeft: 'auto' }} />}
          </button>
          {showMetrics && (
            <>
              <p style={{ margin: '8px 0 14px', fontSize: 13, color: 'rgba(11,42,82,0.55)', lineHeight: 1.6 }}>
                Calculadas mediante validación hold-out (80% entrenamiento / 20% prueba). Estas métricas miden la precisión del algoritmo Random Forest.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <MetricCard
                  label="MAE" icon={Target}
                  value={metricas?.mae}
                  desc="Error promedio absoluto (unidades)"
                  color="#6366f1"
                />
                <MetricCard
                  label="RMSE" icon={Activity}
                  value={metricas?.rmse}
                  desc="Penaliza errores grandes"
                  color="#f59e0b"
                />
                <MetricCard
                  label="R² Score" icon={Zap}
                  value={metricas?.r2}
                  desc={metricas?.r2 != null ? (metricas.r2 >= 0.8 ? 'Precisión alta ✓' : metricas.r2 >= 0.6 ? 'Precisión aceptable' : 'Mejorable — más datos') : 'Precisión general del modelo'}
                  color={metricas?.r2 != null ? (metricas.r2 >= 0.8 ? '#10b981' : metricas.r2 >= 0.6 ? '#f59e0b' : '#ef4444') : '#6b7280'}
                />
              </div>
              {metricas?.nota && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(11,42,82,0.50)', fontWeight: 700 }}>
                  <Info size={13} />{metricas.nota}
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(11,42,82,0.40)', fontWeight: 700 }}>
                Última actualización: {mlStatus?.ultima_actualizacion ? new Date(mlStatus.ultima_actualizacion).toLocaleString('es-PE') : '—'}
                {' '}· {mlStatus?.registros_entrenamiento ?? 0} registros
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Controles de predicción ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(11,42,82,0.55)' }}>Horizonte:</span>
          {DIAS_OPTS.map(d => (
            <button key={d} onClick={() => setDias(d)}
              style={{ ...s.pillBtn, ...(dias === d ? s.pillBtnActive : {}) }}>
              {d} días
            </button>
          ))}
        </div>
        <button onClick={handlePredict} disabled={loading || !modeloListo}
          style={{ ...s.btn, background: 'rgba(99,102,241,0.90)', color: '#fff', borderColor: 'transparent', opacity: (!modeloListo || loading) ? 0.6 : 1 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Generando...' : 'Generar predicción'}
        </button>
      </div>

      {/* ── Resultados ── */}
      {result && (
        <>
          {/* KPIs */}
          <div style={s.kpiGrid}>
            {[
              { icon: ShoppingCart, color: '#6366f1', bg: 'rgba(99,102,241,0.10)', val: result.resultados?.length ?? 0, lbl: 'Productos analizados' },
              { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.10)', val: necesitanReposicion.length, lbl: 'Requieren reposición' },
              { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.10)', val: (result.resultados?.length ?? 0) - necesitanReposicion.length, lbl: 'Stock suficiente' },
              { icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', val: formatNum(totalUnidades), lbl: `Uds. estimadas (${dias}d)` },
              { icon: Package, color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', val: formatNum(totalRecomendado), lbl: 'Inv. total recomendado' },
            ].map(({ icon: Icon, color, bg, val, lbl }) => (
              <div key={lbl} style={s.kpiCard}>
                <div style={{ ...s.kpiIcon, background: bg }}><Icon size={18} color={color} /></div>
                <div style={{ ...s.kpiNum, color }}>{val}</div>
                <div style={s.kpiLbl}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['tabla', 'grafico'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ ...s.pillBtn, ...(tab === t ? s.pillBtnActive : {}) }}>
                {t === 'tabla' ? 'Tabla de predicciones' : 'Gráfico comparativo'}
              </button>
            ))}
          </div>

          {tab === 'tabla' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

              {/* Tabla */}
              <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.55)', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
                {/* Filtro categoría */}
                <div style={{ display: 'flex', gap: 6, padding: '12px 14px', borderBottom: '1px solid rgba(11,42,82,0.07)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(11,42,82,0.45)', alignSelf: 'center' }}>CATEGORÍA:</span>
                  {categorias.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)}
                      style={{ ...s.pillBtn, fontSize: 11, padding: '4px 10px', ...(catFilter === c ? s.pillBtnActive : {}) }}>{c}</button>
                  ))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(11,42,82,0.04)', borderBottom: '1.5px solid rgba(11,42,82,0.09)' }}>
                        <th style={s.th}>Producto</th>
                        <th style={s.th}>Categoría</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Stock actual</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Predicción ({dias}d)</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Stock seg.</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Inv. recomendado</th>
                        <th style={s.th}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadosFiltrados.map((r, idx) => {
                        const activo = selectedProd?.producto_id === r.producto_id;
                        return (
                          <tr key={r.producto_id} onClick={() => setSelectedProd(r)}
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
                            <td style={{ ...s.td, fontSize: 12, color: 'rgba(11,42,82,0.60)', fontWeight: 700 }}>{r.categoria}</td>
                            <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: 'rgba(11,42,82,0.70)', fontSize: 13 }}>{r.stock_actual}</td>
                            <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#6366f1', fontSize: 14 }}>{formatNum(r.prediccion_total)}</td>
                            <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: 'rgba(11,42,82,0.55)', fontSize: 13 }}>+{r.stock_seguridad}</td>
                            <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#0b2a52', fontSize: 14 }}>{r.inventario_recomendado}</td>
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
                </div>
                <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(11,42,82,0.07)', fontSize: 12, color: 'rgba(11,42,82,0.40)', fontWeight: 700 }}>
                  {resultadosFiltrados.length} productos · Inventario recomendado = Predicción + Stock de seguridad (25%) · Haz clic en una fila para ver su gráfico
                </div>
              </div>

              {/* Panel detalle */}
              {selectedProd && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.55)', padding: '16px 18px', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <Package size={16} color="#6366f1" />
                      <span style={{ fontWeight: 900, color: '#0b2a52', fontSize: 14 }}>{selectedProd.nombre}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(11,42,82,0.40)', marginBottom: 10 }}>
                      {selectedProd.categoria} · S/ {formatNum(selectedProd.precio, 2)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                      {[
                        { label: 'Stock actual',     val: `${selectedProd.stock_actual} ${selectedProd.unidad}`,                  color: '#0b2a52' },
                        { label: `Predicción (${dias}d)`, val: `${formatNum(selectedProd.prediccion_total)} ${selectedProd.unidad}`, color: '#6366f1' },
                        { label: 'Stock seguridad',  val: `+${selectedProd.stock_seguridad} ${selectedProd.unidad}`,               color: '#f59e0b' },
                        { label: 'Inv. recomendado', val: `${selectedProd.inventario_recomendado} ${selectedProd.unidad}`,         color: selectedProd.necesita_reposicion ? '#ef4444' : '#10b981' },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(11,42,82,0.08)' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(11,42,82,0.50)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 900, color, marginTop: 3 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {selectedProd.necesita_reposicion && (
                      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', marginBottom: 14, fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
                        ⚠ Reponer {selectedProd.inventario_recomendado - selectedProd.stock_actual} {selectedProd.unidad} adicionales
                      </div>
                    )}

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
          )}

          {tab === 'grafico' && (
            <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.55)', padding: '20px 22px', boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 900, color: '#0b2a52', fontSize: 14, marginBottom: 4 }}>
                Top 10 productos — Predicción vs Stock actual vs Inventario recomendado
              </div>
              <div style={{ fontSize: 12, color: 'rgba(11,42,82,0.50)', marginBottom: 16, fontWeight: 700 }}>
                Fórmula: Inventario recomendado = Predicción ({dias}d) + Stock de seguridad (25%)
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,42,82,0.07)" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: 'rgba(11,42,82,0.55)', fontWeight: 700 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(11,42,82,0.45)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(11,42,82,0.92)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 8 }} />
                  <Bar dataKey="stock" name="Stock actual" fill="rgba(11,42,82,0.30)" radius={[4,4,0,0]} />
                  <Bar dataKey="prediccion" name="Predicción" fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="recomendado" name="Inv. recomendado" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
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
    fontSize: 13, fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,0.5)',
  },
  pillBtn: {
    padding: '6px 13px', borderRadius: 999, border: '1.5px solid rgba(11,42,82,0.13)',
    background: 'rgba(255,255,255,0.45)', color: 'rgba(11,42,82,0.65)',
    fontSize: 12, fontWeight: 800, cursor: 'pointer',
  },
  pillBtnActive: { background: '#0b2a52', color: '#fff', borderColor: '#0b2a52' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 },
  kpiCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
    padding: '14px 16px', borderRadius: 16,
    background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.55)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiNum:  { fontSize: 24, fontWeight: 900, lineHeight: 1 },
  kpiLbl:  { fontSize: 12, fontWeight: 700, color: 'rgba(11,42,82,0.55)' },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 900, color: 'rgba(11,42,82,0.55)',
    textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap',
  },
  td: { padding: '10px 14px', verticalAlign: 'middle' },
};
