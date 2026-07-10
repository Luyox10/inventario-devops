import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  BrainCircuit, RefreshCw, AlertTriangle,
  TrendingUp, Package, ShoppingCart, CheckCircle2, ArrowUp, Download,
} from 'lucide-react';
import { useAuth } from '../../state/auth/AuthContext.jsx';
import {
  getMLHealth, getPredictiones,
} from '../../api/predicciones.js';
import * as XLSX from 'xlsx';

const DIAS_OPTS = [7, 14, 30];

function formatNum(n, dec = 1) {
  return Number(n ?? 0).toLocaleString('es-PE', { maximumFractionDigits: dec });
}

function downloadExcel(rows, columns, filename, sheetName = 'Datos') {
  const header = columns.map(c => c.label);
  const data = rows.map(row => columns.map(c => c.get(row)));
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

  ws['!cols'] = columns.map(c => ({ wch: c.width || 18 }));

  for (let i = 0; i < header.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cellRef]) ws[cellRef] = { v: header[i] };
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '0B2A52' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  for (let r = 1; r <= data.length; r++) {
    for (let c = 0; c < columns.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;
      const style = { ...(ws[cellRef].s || {}) };
      if (columns[c].format) style.numFmt = columns[c].format;
      if (columns[c].align) style.alignment = { horizontal: columns[c].align, vertical: 'center' };
      ws[cellRef].s = style;
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}


export default function AdminPrediccionesPage() {
  const { token } = useAuth();

  const [mlStatus, setMlStatus]         = useState(null);
  const [result, setResult]             = useState(null);
  const [dias, setDias]                 = useState(7);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [selectedProd, setSelectedProd] = useState(null);
  const [catFilter, setCatFilter]       = useState('Todos');
  const [search, setSearch]             = useState('');
  const [tab, setTab]                   = useState('tabla');
  const [predType, setPredType]         = useState('demanda');
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE                       = 20;

  const checkHealth = useCallback(async (retryCount = 3) => {
    try {
      let lastErr;
      for (let i = 0; i < retryCount; i += 1) {
        try {
          const h = await getMLHealth({ token });
          setMlStatus(h);
          return h;
        } catch (err) {
          lastErr = err;
          if (i < retryCount - 1) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
        }
      }
      throw lastErr;
    } catch {
      setMlStatus({ status: 'unavailable', modelo_entrenado: false });
      return null;
    }
  }, [token]);

  async function handlePredict(diasToUse = dias) {
    setLoading(true); setError(null);
    try {
      const data = await getPredictiones({ token, dias: diasToUse });
      setResult(data);
      setCatFilter('Todos');
      setSearch('');
      setPage(1);
      setSelectedProd(data?.resultados?.[0] ?? null);
    } catch (err) {
      if (err.status === 503) {
        setError('El modelo aún no está listo. El sistema se entrena automáticamente con el historial de ventas. Intenta más tarde.');
      } else {
        setError(err.message || 'Error al generar predicciones.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { checkHealth(); }, [checkHealth]);

  useEffect(() => {
    if (mlStatus?.modelo_entrenado) return;
    const id = setInterval(() => checkHealth(), 5000);
    return () => clearInterval(id);
  }, [mlStatus, checkHealth]);

  const modeloListo = mlStatus?.modelo_entrenado === true;
  const entrenando = mlStatus?.status === 'training';

  const categorias = useMemo(() => {
    if (!result?.resultados) return [];
    const cats = [...new Set(result.resultados.map(r => r.categoria || 'Sin categoría'))];
    return ['Todos', ...cats.sort()];
  }, [result]);

  const resultadosFiltrados = useMemo(() => {
    if (!result?.resultados) return [];
    const s = search.trim().toLowerCase();
    return result.resultados.filter(r => {
      const matchesCat = catFilter === 'Todos' || (r.categoria || 'Sin categoría') === catFilter;
      const matchesSearch = !s || String(r.nombre || '').toLowerCase().includes(s);
      return matchesCat && matchesSearch;
    });
  }, [result, catFilter, search]);

  const totalPages = Math.max(1, Math.ceil(resultadosFiltrados.length / PAGE_SIZE));
  const resultadosVisibles = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return resultadosFiltrados.slice(start, start + PAGE_SIZE);
  }, [resultadosFiltrados, page]);

  useEffect(() => { setPage(1); }, [catFilter, search]);

  const necesitanReposicion = result?.resultados?.filter(r => r.necesita_reposicion) ?? [];
  const totalUnidades = result?.resultados?.reduce((acc, r) => acc + r.prediccion_total, 0) ?? 0;
  const totalRecomendado = result?.resultados?.reduce((acc, r) => acc + r.inventario_recomendado, 0) ?? 0;

  const ingresosData = useMemo(() => {
    if (!result?.resultados) return [];
    return [...result.resultados]
      .map(r => ({ ...r, ingreso_estimado: Number(r.prediccion_total || 0) * Number(r.precio || 0) }))
      .sort((a, b) => b.ingreso_estimado - a.ingreso_estimado);
  }, [result]);
  const totalIngresos = ingresosData.reduce((acc, r) => acc + r.ingreso_estimado, 0);

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
          background: modeloListo ? 'rgba(16,185,129,0.10)' : entrenando ? 'rgba(59,130,246,0.10)' : 'rgba(245,158,11,0.10)',
          border: `1px solid ${modeloListo ? 'rgba(16,185,129,0.25)' : entrenando ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: modeloListo ? '#10b981' : entrenando ? '#3b82f6' : '#f59e0b', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: modeloListo ? '#065f46' : entrenando ? '#1e40af' : '#92400e' }}>
            {mlStatus === null ? 'Verificando...' : modeloListo ? 'Modelo listo' : entrenando ? 'Entrenando...' : 'Sin entrenar'}
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
      {/* ── Controles de predicción ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(11,42,82,0.55)' }}>Horizonte:</span>
          {DIAS_OPTS.map(d => (
            <button key={d} onClick={() => { setDias(d); if (modeloListo) handlePredict(d); }}
              style={{ ...s.pillBtn, ...(dias === d ? s.pillBtnActive : {}) }}>
              {d} días
            </button>
          ))}
        </div>
        <button onClick={handlePredict} disabled={loading || !modeloListo || entrenando}
          style={{ ...s.btn, background: 'rgba(99,102,241,0.90)', color: '#fff', borderColor: 'transparent', opacity: (!modeloListo || loading || entrenando) ? 0.6 : 1 }}>
          <RefreshCw size={14} style={{ animation: (loading || entrenando) ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Generando...' : entrenando ? 'Entrenando...' : 'Generar predicción'}
        </button>
      </div>

      {/* ── Tipo de predicción ── */}
      {result && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { key: 'demanda', label: 'Demanda e inventario', icon: Package },
            { key: 'ingresos', label: 'Ingresos estimados', icon: TrendingUp },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setPredType(key)}
              style={{ ...s.pillBtn, ...(predType === key ? s.pillBtnActive : {}), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      )}

      {/* ── Resultados ── */}
      {result && predType === 'demanda' && (
        <>
          {/* KPIs */}
          <div style={s.kpiGrid}>
            {[
              { icon: ShoppingCart, color: '#6366f1', bg: 'rgba(99,102,241,0.10)', val: result.resultados?.length ?? 0, lbl: 'Productos analizados' },
              { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.10)', val: necesitanReposicion.length, lbl: 'Requieren reposición' },
              { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.10)', val: (result.resultados?.length ?? 0) - necesitanReposicion.length, lbl: 'Stock suficiente' },
              { icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', val: formatNum(totalUnidades, 0), lbl: `Uds. estimadas (${dias}d)` },
              { icon: Package, color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', val: formatNum(totalRecomendado, 0), lbl: 'Inv. total recomendado' },
            ].map(({ icon: Icon, color, bg, val, lbl }) => (
              <div key={lbl} style={s.kpiCard}>
                <div style={{ ...s.kpiIcon, background: bg }}><Icon size={18} color={color} /></div>
                <div style={{ ...s.kpiNum, color }}>{val}</div>
                <div style={s.kpiLbl}>{lbl}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => downloadExcel(resultadosFiltrados, [
              { label: 'Producto', get: r => r.nombre, width: 36, align: 'left' },
              { label: 'Categoría', get: r => r.categoria, width: 18, align: 'left' },
              { label: 'Unidad', get: r => r.unidad, width: 10, align: 'center' },
              { label: 'Stock actual', get: r => r.stock_actual, width: 14, align: 'right', format: '#,##0' },
              { label: `Predicción (${dias}d)`, get: r => r.prediccion_total, width: 14, align: 'right', format: '#,##0' },
              { label: 'Stock de seguridad', get: r => r.stock_seguridad, width: 18, align: 'right', format: '#,##0' },
              { label: 'Inventario recomendado', get: r => r.inventario_recomendado, width: 22, align: 'right', format: '#,##0' },
              { label: 'Cantidad a reponer', get: r => Math.max(0, r.inventario_recomendado - r.stock_actual), width: 18, align: 'right', format: '#,##0' },
              { label: 'Requiere reposición', get: r => r.necesita_reposicion ? 'Sí' : 'No', width: 18, align: 'center' },
            ], `prediccion_demanda_${dias}d_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Demanda e inventario')}
              style={{ ...s.btn, fontSize: 12, padding: '7px 14px' }}>
              <Download size={14} /> Exportar Excel
            </button>
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
                {/* Filtros */}
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(11,42,82,0.07)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 180 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(11,42,82,0.45)' }}>CATEGORÍA:</span>
                    <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                      style={{ ...s.select, flex: 1, fontSize: 12, padding: '6px 10px' }}>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(11,42,82,0.45)' }}>BUSCAR:</span>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nombre de producto..."
                      style={{ ...s.input, flex: 1, fontSize: 12, padding: '6px 10px' }}
                    />
                  </div>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
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
                      {resultadosVisibles.map((r, idx) => {
                        const idxGlobal = (page - 1) * PAGE_SIZE + idx;
                        const activo = selectedProd?.producto_id === r.producto_id;
                        return (
                          <tr key={r.producto_id} onClick={() => setSelectedProd(r)}
                            style={{
                              background: activo ? 'rgba(99,102,241,0.07)' : idxGlobal % 2 === 0 ? 'transparent' : 'rgba(11,42,82,0.02)',
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
                            <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#6366f1', fontSize: 14 }}>{formatNum(r.prediccion_total, 0)}</td>
                            <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: 'rgba(11,42,82,0.55)', fontSize: 13 }}>+{formatNum(r.stock_seguridad, 0)}</td>
                            <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#0b2a52', fontSize: 14 }}>{formatNum(r.inventario_recomendado, 0)}</td>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid rgba(11,42,82,0.07)', fontSize: 12, color: 'rgba(11,42,82,0.40)', fontWeight: 700 }}>
                  <span>
                    Página {page} de {totalPages} · {resultadosFiltrados.length} productos · Inventario recomendado = Predicción + Stock de seguridad (25%)
                  </span>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        style={{ ...s.pillBtn, fontSize: 11, padding: '4px 12px', opacity: page === 1 ? 0.5 : 1 }}>
                        Anterior
                      </button>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        style={{ ...s.pillBtn, fontSize: 11, padding: '4px 12px', opacity: page === totalPages ? 0.5 : 1 }}>
                        Siguiente
                      </button>
                    </div>
                  )}
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
                        { label: 'Stock actual',     val: `${formatNum(selectedProd.stock_actual, 0)} ${selectedProd.unidad}`,                  color: '#0b2a52' },
                        { label: `Predicción (${dias}d)`, val: `${formatNum(selectedProd.prediccion_total, 0)} ${selectedProd.unidad}`, color: '#6366f1' },
                        { label: 'Stock seguridad',  val: `+${formatNum(selectedProd.stock_seguridad, 0)} ${selectedProd.unidad}`,               color: '#f59e0b' },
                        { label: 'Inv. recomendado', val: `${formatNum(selectedProd.inventario_recomendado, 0)} ${selectedProd.unidad}`,         color: selectedProd.necesita_reposicion ? '#ef4444' : '#10b981' },
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
                          formatter={(v) => [formatNum(v, 0), selectedProd.unidad]}
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

      {result && predType === 'ingresos' && (
        <>
          <div style={s.kpiGrid}>
            {[
              { icon: ShoppingCart, color: '#6366f1', bg: 'rgba(99,102,241,0.10)', val: ingresosData.length, lbl: 'Productos analizados' },
              { icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.10)', val: `S/ ${formatNum(totalIngresos, 2)}`, lbl: `Ingresos estimados (${dias}d)` },
              { icon: Package, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', val: ingresosData[0]?.nombre || '-', lbl: 'Producto más rentable' },
              { icon: CheckCircle2, color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', val: `S/ ${formatNum(ingresosData[0]?.ingreso_estimado || 0, 2)}`, lbl: 'Ingreso top 1' },
            ].map(({ icon: Icon, color, bg, val, lbl }) => (
              <div key={lbl} style={s.kpiCard}>
                <div style={{ ...s.kpiIcon, background: bg }}><Icon size={18} color={color} /></div>
                <div style={{ ...s.kpiNum, color, fontSize: typeof val === 'string' && val.length > 12 ? 16 : 24 }}>{val}</div>
                <div style={s.kpiLbl}>{lbl}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => downloadExcel(ingresosData, [
              { label: 'Producto', get: r => r.nombre, width: 36, align: 'left' },
              { label: 'Categoría', get: r => r.categoria, width: 18, align: 'left' },
              { label: 'Unidad', get: r => r.unidad, width: 10, align: 'center' },
              { label: `Predicción (${dias}d)`, get: r => r.prediccion_total, width: 14, align: 'right', format: '#,##0' },
              { label: 'Precio', get: r => r.precio, width: 12, align: 'right', format: 'S/ #,##0.00' },
              { label: 'Ingreso estimado', get: r => r.ingreso_estimado, width: 20, align: 'right', format: 'S/ #,##0.00' },
            ], `prediccion_ingresos_${dias}d_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Ingresos estimados')}
              style={{ ...s.btn, fontSize: 12, padding: '7px 14px' }}>
              <Download size={14} /> Exportar Excel
            </button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.55)', padding: '20px 22px', boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 900, color: '#0b2a52', fontSize: 14, marginBottom: 4 }}>
              Top 10 productos — Ingresos estimados
            </div>
            <div style={{ fontSize: 12, color: 'rgba(11,42,82,0.50)', marginBottom: 16, fontWeight: 700 }}>
              Ingreso = Predicción ({dias}d) × Precio unitario
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={ingresosData.slice(0, 10).map(r => ({ nombre: r.nombre.length > 14 ? r.nombre.slice(0, 14) + '…' : r.nombre, ingreso: r.ingreso_estimado }))} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,42,82,0.07)" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: 'rgba(11,42,82,0.55)', fontWeight: 700 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(11,42,82,0.45)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [`S/ ${formatNum(v, 2)}`, 'Ingreso estimado']}
                  contentStyle={{ background: 'rgba(11,42,82,0.92)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}
                />
                <Bar dataKey="ingreso" name="Ingreso estimado" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.55)', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(11,42,82,0.04)', borderBottom: '1.5px solid rgba(11,42,82,0.09)' }}>
                    <th style={s.th}>Producto</th>
                    <th style={s.th}>Categoría</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Predicción ({dias}d)</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Precio</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Ingreso estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {ingresosData.slice(0, 50).map((r, idx) => (
                    <tr key={r.producto_id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(11,42,82,0.02)', borderBottom: '1px solid rgba(11,42,82,0.07)' }}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 800, color: '#0b2a52', fontSize: 13 }}>{r.nombre}</div>
                        <div style={{ fontSize: 11, color: 'rgba(11,42,82,0.45)', fontWeight: 700 }}>{r.unidad}</div>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: 'rgba(11,42,82,0.60)', fontWeight: 700 }}>{r.categoria}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#6366f1', fontSize: 14 }}>{formatNum(r.prediccion_total, 0)}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: 'rgba(11,42,82,0.70)', fontSize: 13 }}>S/ {formatNum(r.precio, 2)}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#10b981', fontSize: 14 }}>S/ {formatNum(r.ingreso_estimado, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(11,42,82,0.07)', fontSize: 12, color: 'rgba(11,42,82,0.40)', fontWeight: 700 }}>
              Mostrando top {Math.min(50, ingresosData.length)} productos · Ordenados por ingreso estimado
            </div>
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
    fontSize: 13, fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,0.5)',
  },
  pillBtn: {
    padding: '6px 13px', borderRadius: 999, border: '1.5px solid rgba(11,42,82,0.13)',
    background: 'rgba(255,255,255,0.45)', color: 'rgba(11,42,82,0.65)',
    fontSize: 12, fontWeight: 800, cursor: 'pointer',
  },
  input: {
    padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(11,42,82,0.15)',
    background: 'rgba(255,255,255,0.55)', color: '#0b2a52', fontSize: 13,
    outline: 'none', fontWeight: 700,
  },
  select: {
    padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(11,42,82,0.15)',
    background: 'rgba(255,255,255,0.55)', color: '#0b2a52', fontSize: 13,
    outline: 'none', fontWeight: 700, cursor: 'pointer',
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
