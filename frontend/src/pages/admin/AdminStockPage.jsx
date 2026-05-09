import React, { useEffect, useMemo, useState } from 'react';

import { listProductos } from '../../api/productos';
import { setStockActual, updateStockMinimo, updateStockMovimiento } from '../../api/stock';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const MOTIVO_OPTIONS = [
  { value: '', label: 'Motivo (opcional)' },
  { value: 'Compra', label: 'Compra' },
  { value: 'Devolución', label: 'Devolución' },
  { value: 'Merma', label: 'Merma' },
  { value: 'Ajuste inventario', label: 'Ajuste inventario' },
  { value: 'Corrección', label: 'Corrección' },
  { value: 'OTRO', label: 'Otro...' },
];

function emptyRowAction() {
  return {
    cantidad: '',
    modo: 'ENTRADA',
    motivoPreset: '',
    motivoOtro: '',
    minimo: '',
    saving: false,
  };
}

export default function AdminStockPage() {
  const { token, logout, user } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [actions, setActions] = useState({});
  const [sort, setSort] = useState({ key: 'nombre', dir: 'asc' });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [hoverId, setHoverId] = useState(null);

  const isAdmin = user?.rol === 'ADMIN';

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return rows.filter((r) => {
      const nombre = String(r.nombre || '').toLowerCase();
      const sku = String(r.sku || '').toLowerCase();
      const matchesQuery = !s || nombre.includes(s) || sku.includes(s);

      const actual = Number(r.stock_actual || 0);
      const minimo = Number(r.stock_minimo || 0);
      const matchesEstado =
        estado === 'todos'
          ? true
          : estado === 'ok'
            ? actual > minimo && actual > 0
            : estado === 'bajo'
              ? actual > 0 && actual <= minimo
              : estado === 'sin_stock'
                ? actual <= 0
                : true;

      return matchesQuery && matchesEstado;
    });
  }, [rows, q, estado]);

  const sorted = useMemo(() => {
    const dirMul = sort.dir === 'desc' ? -1 : 1;

    function estadoRank(r) {
      const actual = Number(r.stock_actual || 0);
      const minimo = Number(r.stock_minimo || 0);
      if (actual <= 0) return 0;
      if (actual <= minimo) return 1;
      return 2;
    }

    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sort.key === 'nombre') {
        return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }) * dirMul;
      }
      if (sort.key === 'stock_actual') return (Number(a.stock_actual || 0) - Number(b.stock_actual || 0)) * dirMul;
      if (sort.key === 'stock_minimo') return (Number(a.stock_minimo || 0) - Number(b.stock_minimo || 0)) * dirMul;
      if (sort.key === 'estado') return (estadoRank(a) - estadoRank(b)) * dirMul;
      return 0;
    });
    return arr;
  }, [filtered, sort.dir, sort.key]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / pageSize)), [sorted.length, pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  function getAction(id) {
    return actions[id] || emptyRowAction();
  }

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  }

  function sortLabel(key, label) {
    if (sort.key !== key) return label;
    return `${label} ${sort.dir === 'asc' ? '↑' : '↓'}`;
  }

  function resolvedMotivo(a) {
    if (a.motivoPreset === 'OTRO') return a.motivoOtro?.trim() || null;
    return a.motivoPreset?.trim() || null;
  }

  function setAction(id, patch) {
    setActions((prev) => ({
      ...prev,
      [id]: { ...getAction(id), ...patch },
    }));
  }

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const data = await listProductos({ token });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function badgeFor(r) {
    const actual = Number(r.stock_actual || 0);
    const minimo = Number(r.stock_minimo || 0);
    if (actual <= 0) return { text: 'SIN STOCK', style: styles.badgeDanger };
    if (actual <= minimo) return { text: 'BAJO', style: styles.badgeWarn };
    return { text: 'OK', style: styles.badgeOk };
  }

  async function doMovimiento(r, tipo) {
    const a = getAction(r.id);
    const qty = Number(a.cantidad);

    if (!a.cantidad || Number.isNaN(qty) || qty <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setError('');
    setAction(r.id, { saving: true });
    try {
      await updateStockMovimiento({ token, productoId: r.id, tipo, cantidad: qty, motivo: resolvedMotivo(a) });
      setAction(r.id, { cantidad: '', motivoPreset: '', motivoOtro: '', saving: false });
      await refresh();
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
      setAction(r.id, { saving: false });
    }
  }

  async function doAjuste(r) {
    const a = getAction(r.id);
    const nextStock = Number(a.cantidad);

    if (a.cantidad === '' || Number.isNaN(nextStock) || nextStock < 0) {
      setError('Ingresa un stock válido para ajustar');
      return;
    }

    setError('');
    setAction(r.id, { saving: true });
    try {
      await setStockActual({ token, productoId: r.id, stock_actual: nextStock, motivo: resolvedMotivo(a) });
      setAction(r.id, { cantidad: '', motivoPreset: '', motivoOtro: '', saving: false });
      await refresh();
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
      setAction(r.id, { saving: false });
    }
  }

  async function doApply(r) {
    const a = getAction(r.id);
    if (a.modo === 'AJUSTE') return doAjuste(r);
    return doMovimiento(r, a.modo);
  }

  async function doMinimo(r) {
    const a = getAction(r.id);
    const nextMin = Number(a.minimo);
    if (a.minimo === '' || Number.isNaN(nextMin) || nextMin < 0) {
      setError('Ingresa un mínimo válido');
      return;
    }

    setError('');
    setAction(r.id, { saving: true });
    try {
      await updateStockMinimo({ token, productoId: r.id, stock_minimo: nextMin });
      setAction(r.id, { minimo: '', saving: false });
      await refresh();
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
      setAction(r.id, { saving: false });
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.h2}>Stock</h2>
          <p style={styles.p}>Actualiza cantidades (entrada/salida/ajuste) y define el stock mínimo.</p>
        </div>
      </header>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.h3}>Inventario</h3>
          <div style={styles.headerActions}>
            <div style={styles.tabs}>
              <button
                type="button"
                onClick={() => setEstado('todos')}
                style={{ ...styles.tab, ...(estado === 'todos' ? styles.tabActive : null) }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setEstado('ok')}
                style={{ ...styles.tab, ...(estado === 'ok' ? styles.tabActive : null) }}
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setEstado('bajo')}
                style={{ ...styles.tab, ...(estado === 'bajo' ? styles.tabActive : null) }}
              >
                Bajo
              </button>
              <button
                type="button"
                onClick={() => setEstado('sin_stock')}
                style={{ ...styles.tab, ...(estado === 'sin_stock' ? styles.tabActive : null) }}
              >
                Sin stock
              </button>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o SKU"
              style={styles.input}
            />
            <button onClick={refresh} style={styles.secondaryBtn} disabled={loading}>
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}

        {loading ? (
          <div style={styles.muted}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.muted}>No hay productos.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, ...styles.thSticky, ...styles.thClickable }} onClick={() => toggleSort('nombre')}>
                    {sortLabel('nombre', 'Producto')}
                  </th>
                  <th style={styles.th}>Unidad</th>
                  <th style={{ ...styles.th, ...styles.thSticky, ...styles.thClickable }} onClick={() => toggleSort('stock_actual')}>
                    {sortLabel('stock_actual', 'Stock')}
                  </th>
                  <th style={{ ...styles.th, ...styles.thSticky, ...styles.thClickable }} onClick={() => toggleSort('stock_minimo')}>
                    {sortLabel('stock_minimo', 'Mínimo')}
                  </th>
                  <th style={{ ...styles.th, ...styles.thSticky, ...styles.thClickable }} onClick={() => toggleSort('estado')}>
                    {sortLabel('estado', 'Estado')}
                  </th>
                  <th style={{ ...styles.th, ...styles.thSticky }}>Movimiento</th>
                  <th style={{ ...styles.th, ...styles.thSticky }}>Cantidad</th>
                  <th style={{ ...styles.th, ...styles.thSticky }}>Motivo</th>
                  <th style={{ ...styles.thRight, ...styles.thSticky }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, idx) => {
                  const a = getAction(r.id);
                  const badge = badgeFor(r);
                  const isHover = hoverId === r.id;
                  const rowBase = idx % 2 === 0 ? styles.rowEven : styles.rowOdd;
                  const qty = a.cantidad === '' ? NaN : Number(a.cantidad);
                  const qtyValid = a.modo === 'AJUSTE' ? !Number.isNaN(qty) && qty >= 0 : !Number.isNaN(qty) && qty > 0;
                  const motivoIsOther = a.motivoPreset === 'OTRO';
                  const canApply = !a.saving && qtyValid;
                  const applyLabel = a.modo === 'ENTRADA' ? 'Aplicar + Entrada' : a.modo === 'SALIDA' ? 'Aplicar - Salida' : 'Aplicar Ajuste';
                  return (
                    <tr
                      key={r.id}
                      style={{ ...rowBase, ...(isHover ? styles.rowHover : null) }}
                      onMouseEnter={() => setHoverId(r.id)}
                      onMouseLeave={() => setHoverId(null)}
                    >
                      <td style={styles.tdStrong}>
                        {r.nombre}
                        <div style={styles.sub}>{r.sku || '—'}</div>
                      </td>
                      <td style={styles.td}>{r.unidad || 'und'}</td>
                      <td style={styles.td}>{r.stock_actual}</td>
                      <td style={styles.td}>{r.stock_minimo}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badgeBase, ...badge.style }}>{badge.text}</span>
                      </td>
                      <td style={styles.td}>
                        <select
                          value={a.modo}
                          onChange={(e) => setAction(r.id, { modo: e.target.value })}
                          style={styles.selectSmall}
                        >
                          <option value="ENTRADA">Entrada</option>
                          <option value="SALIDA">Salida</option>
                          <option value="AJUSTE">Ajuste</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        <input
                          value={a.cantidad}
                          onChange={(e) => setAction(r.id, { cantidad: e.target.value })}
                          type="number"
                          step="1"
                          min="0"
                          placeholder={a.modo === 'AJUSTE' ? 'Stock' : 'Cantidad'}
                          style={styles.inputSmall}
                        />
                      </td>
                      <td style={styles.td}>
                        <div style={styles.motivoWrap}>
                          <select
                            value={a.motivoPreset}
                            onChange={(e) => {
                              const next = e.target.value;
                              setAction(r.id, { motivoPreset: next, ...(next === 'OTRO' ? null : { motivoOtro: '' }) });
                            }}
                            style={styles.selectSmall}
                          >
                            {MOTIVO_OPTIONS.map((opt) => (
                              <option key={opt.value || 'empty'} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {motivoIsOther ? (
                            <input
                              value={a.motivoOtro}
                              onChange={(e) => setAction(r.id, { motivoOtro: e.target.value })}
                              placeholder="Especifica motivo"
                              style={styles.inputSmall}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td style={styles.tdRight}>
                        <button
                          style={{
                            ...styles.smallBtn,
                            ...(a.modo === 'ENTRADA'
                              ? styles.btnEntrada
                              : a.modo === 'SALIDA'
                                ? styles.btnSalida
                                : styles.btnAjuste),
                          }}
                          onClick={() => doApply(r)}
                          disabled={!canApply}
                          title={applyLabel}
                        >
                          Aplicar
                        </button>

                        {isAdmin ? (
                          <div style={styles.minimoRow}>
                            <input
                              value={a.minimo}
                              onChange={(e) => setAction(r.id, { minimo: e.target.value })}
                              type="number"
                              step="1"
                              min="0"
                              placeholder="Nuevo mínimo"
                              style={styles.inputSmall}
                            />
                            <button style={styles.smallBtn} onClick={() => doMinimo(r)} disabled={a.saving}>
                              Guardar mínimo
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={styles.tableFooter}>
              <div style={styles.footerLeft}>
                <span style={styles.footerMuted}>
                  Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} de {sorted.length}
                </span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) || 10)} style={styles.selectSmall}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div style={styles.footerRight}>
                <button type="button" style={styles.smallBtn} onClick={() => setPage(1)} disabled={page <= 1}>
                  «
                </button>
                <button type="button" style={styles.smallBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  ‹
                </button>
                <span style={styles.footerMuted}>
                  Página {page} / {totalPages}
                </span>
                <button
                  type="button"
                  style={styles.smallBtn}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  ›
                </button>
                <button type="button" style={styles.smallBtn} onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: 20,
    background: 'linear-gradient(135deg, #f2a1a5 0%, #b087b7 40%, #5377c8 100%)',
    fontFamily: 'system-ui, Arial',
  },
  header: {
    maxWidth: 1180,
    margin: '0 auto 16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  h2: { margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 },
  p: { margin: '8px 0 0', color: 'rgba(11, 42, 82, 0.75)' },
  card: {
    maxWidth: 1180,
    margin: '0 auto',
    background: 'rgba(235, 240, 255, 0.78)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(14px)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  tabs: {
    display: 'flex',
    gap: 8,
    padding: 6,
    borderRadius: 14,
    border: '1px solid rgba(11, 42, 82, 0.14)',
    background: 'rgba(255,255,255,0.22)',
  },
  tab: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.12)',
    background: 'rgba(255,255,255,0.25)',
    color: 'rgba(11, 42, 82, 0.86)',
    fontWeight: 900,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.96)',
    border: '1px solid rgba(11, 42, 82, 0.18)',
  },
  h3: { margin: 0, color: '#0b2a52', fontSize: 18, fontWeight: 900 },
  muted: { color: 'rgba(11, 42, 82, 0.75)', marginTop: 12 },
  tableWrap: { overflowX: 'auto', marginTop: 12 },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: {
    textAlign: 'left',
    fontSize: 12,
    color: 'rgba(11, 42, 82, 0.75)',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.14)',
    whiteSpace: 'nowrap',
  },
  thSticky: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: 'rgba(235, 240, 255, 0.92)',
    backdropFilter: 'blur(10px)',
  },
  thClickable: { cursor: 'pointer', userSelect: 'none' },
  thRight: {
    textAlign: 'right',
    fontSize: 12,
    color: 'rgba(11, 42, 82, 0.75)',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.14)',
    whiteSpace: 'nowrap',
  },
  td: {
    fontSize: 13,
    color: '#0b2a52',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
  },
  tdStrong: {
    fontSize: 13,
    color: '#0b2a52',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
    fontWeight: 900,
  },
  sub: { marginTop: 4, fontSize: 12, fontWeight: 700, color: 'rgba(11, 42, 82, 0.65)' },
  tdRight: {
    fontSize: 13,
    color: '#0b2a52',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    whiteSpace: 'nowrap',
    textAlign: 'right',
    verticalAlign: 'top',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
    minWidth: 260,
  },
  inputSmall: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
    width: 140,
  },
  selectSmall: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
    fontWeight: 800,
    width: 140,
  },
  motivoWrap: { display: 'flex', gap: 8, alignItems: 'center' },
  error: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontSize: 14,
  },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.2)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 800,
    cursor: 'pointer',
  },
  smallBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.22)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 900,
    cursor: 'pointer',
    marginLeft: 8,
  },
  btnEntrada: {
    border: '1px solid rgba(16, 185, 129, 0.45)',
    background: 'rgba(16, 185, 129, 0.18)',
    color: '#065f46',
  },
  btnSalida: {
    border: '1px solid rgba(245, 158, 11, 0.55)',
    background: 'rgba(245, 158, 11, 0.18)',
    color: '#92400e',
  },
  btnAjuste: {
    border: '1px solid rgba(59, 130, 246, 0.45)',
    background: 'rgba(59, 130, 246, 0.16)',
    color: '#1e3a8a',
  },
  minimoRow: {
    marginTop: 8,
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  badgeBase: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  badgeOk: { background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#065f46' },
  badgeWarn: { background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#92400e' },
  badgeDanger: { background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#7f1d1d' },
  rowEven: { background: 'rgba(255,255,255,0.10)' },
  rowOdd: { background: 'rgba(255,255,255,0.04)' },
  rowHover: { background: 'rgba(11, 42, 82, 0.06)' },
  tableFooter: {
    marginTop: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  footerRight: { display: 'flex', alignItems: 'center', gap: 6 },
  footerMuted: { color: 'rgba(11, 42, 82, 0.72)', fontWeight: 800, fontSize: 12 },
};
