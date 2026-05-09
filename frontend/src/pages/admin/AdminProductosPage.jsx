import React, { useEffect, useMemo, useState } from 'react';

import { createProducto, deleteProducto, listProductos, updateProducto } from '../../api/productos';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function emptyForm() {
  return {
    nombre: '',
    sku: '',
    unidad: 'und',
    descripcion: '',
    precio: '',
    stock_actual: '',
    stock_minimo: '',
  };
}

export default function AdminProductosPage() {
  const { token, logout } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [hoverId, setHoverId] = useState(null);

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');

  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [editSaving, setEditSaving] = useState(false);

  const deleteConfirm = useMemo(() => {
    return (row) => {
      const sku = String(row?.sku || '').trim();
      const label = `${row?.nombre || ''}${sku ? ` (${sku})` : ''}`;
      return window.confirm(`¿Eliminar "${label}"?\n\nEsta acción eliminará el producto del catálogo.`);
    };
  }, []);

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const min = precioMin === '' ? null : Number(precioMin);
    const max = precioMax === '' ? null : Number(precioMax);

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

      const precio = Number(r.precio);
      const matchesMin = min === null || (!Number.isNaN(precio) && precio >= min);
      const matchesMax = max === null || (!Number.isNaN(precio) && precio <= max);

      return matchesQuery && matchesEstado && matchesMin && matchesMax;
    });
  }, [rows, q, estado, precioMin, precioMax]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'desc' ? -1 : 1;
    const safe = Array.isArray(filteredRows) ? [...filteredRows] : [];

    const getEstadoRank = (r) => {
      const actual = Number(r.stock_actual || 0);
      const minimo = Number(r.stock_minimo || 0);
      if (actual <= 0) return 2;
      if (actual <= minimo) return 1;
      return 0;
    };

    safe.sort((a, b) => {
      if (sortKey === 'nombre') {
        return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }) * dir;
      }
      if (sortKey === 'sku') {
        return String(a.sku || '').localeCompare(String(b.sku || ''), 'es', { sensitivity: 'base' }) * dir;
      }
      if (sortKey === 'precio') {
        return (Number(a.precio || 0) - Number(b.precio || 0)) * dir;
      }
      if (sortKey === 'stock') {
        return (Number(a.stock_actual || 0) - Number(b.stock_actual || 0)) * dir;
      }
      if (sortKey === 'estado') {
        return (getEstadoRank(a) - getEstadoRank(b)) * dir;
      }
      return 0;
    });

    return safe;
  }, [filteredRows, sortKey, sortDir]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, Number(pageSize || 10))));

  const pagedRows = useMemo(() => {
    const p = Math.max(1, Math.min(page, totalPages));
    const size = Math.max(1, Number(pageSize || 10));
    const start = (p - 1) * size;
    const end = start + size;
    return sortedRows.slice(start, end);
  }, [sortedRows, page, pageSize, totalPages]);

  const rangeLabel = useMemo(() => {
    if (total === 0) return 'Mostrando 0 de 0';
    const p = Math.max(1, Math.min(page, totalPages));
    const size = Math.max(1, Number(pageSize || 10));
    const start = (p - 1) * size + 1;
    const end = Math.min(total, p * size);
    return `Mostrando ${start}–${end} de ${total}`;
  }, [page, pageSize, total, totalPages]);

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

  useEffect(() => {
    setPage(1);
  }, [q, estado, precioMin, precioMax, pageSize, sortKey, sortDir]);

  useEffect(() => {
    setPage((p) => Math.max(1, Math.min(totalPages, p)));
  }, [totalPages]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onEditChange(name, value) {
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      nombre: row.nombre ?? '',
      sku: row.sku ?? '',
      unidad: row.unidad ?? 'und',
      descripcion: row.descripcion ?? '',
      precio: String(row.precio ?? ''),
      stock_actual: String(row.stock_actual ?? ''),
      stock_minimo: String(row.stock_minimo ?? ''),
    });
    setError('');
    setEditOpen(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const basePayload = {
        nombre: form.nombre.trim(),
        sku: form.sku.trim(),
        unidad: form.unidad,
        descripcion: form.descripcion.trim() || null,
        precio: Number(form.precio),
      };

      const payload = {
        ...basePayload,
        stock_actual: Number(form.stock_actual || 0),
        stock_minimo: Number(form.stock_minimo || 0),
      };

      if (!payload.nombre || Number.isNaN(payload.precio)) {
        setError('Completa nombre y precio correctamente');
        return;
      }

      if (!payload.sku) {
        setError('El SKU es obligatorio');
        return;
      }

      await createProducto({ token, data: payload });

      setForm(emptyForm());
      await refresh();
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitEdit(e) {
    e.preventDefault();
    setError('');
    setEditSaving(true);

    try {
      const payload = {
        nombre: editForm.nombre.trim(),
        sku: editForm.sku.trim(),
        unidad: editForm.unidad,
        descripcion: editForm.descripcion.trim() || null,
        precio: Number(editForm.precio),
        stock_minimo: Number(editForm.stock_minimo || 0),
      };

      if (!payload.nombre || Number.isNaN(payload.precio)) {
        setError('Completa nombre y precio correctamente');
        return;
      }

      if (!payload.sku) {
        setError('El SKU es obligatorio');
        return;
      }

      await updateProducto({ token, id: editingId, data: payload });
      setEditOpen(false);
      setEditingId(null);
      await refresh();
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setEditSaving(false);
    }
  }

  async function onDelete(row) {
    const ok = deleteConfirm(row);
    if (!ok) return;

    setError('');
    try {
      await deleteProducto({ token, id: row.id });
      await refresh();
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.h2}>Productos</h2>
          <p style={styles.p}>Gestiona el catálogo: registrar, editar y eliminar.</p>
        </div>
      </header>

      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.h3}>Registrar producto</h3>
          </div>

          <form onSubmit={onSubmit} style={styles.form}>
            <div style={styles.row2}>
              <label style={styles.label}>
                Nombre
                <input value={form.nombre} onChange={(e) => onChange('nombre', e.target.value)} style={styles.input} />
              </label>

              <label style={styles.label}>
                SKU
                <input value={form.sku} onChange={(e) => onChange('sku', e.target.value)} style={styles.input} />
              </label>
            </div>

            <div style={styles.row2}>
              <label style={styles.label}>
                Unidad
                <select value={form.unidad} onChange={(e) => onChange('unidad', e.target.value)} style={styles.select}>
                  <option value="und">Unidades</option>
                  <option value="kg">Kilogramos</option>
                  <option value="g">Gramos</option>
                  <option value="lt">Litros</option>
                  <option value="ml">Mililitros</option>
                  <option value="m">Metros</option>
                </select>
              </label>

              <div />
            </div>

            <label style={styles.label}>
              Descripción
              <input
                value={form.descripcion}
                onChange={(e) => onChange('descripcion', e.target.value)}
                style={styles.input}
              />
            </label>

            <div style={styles.row3}>
              <label style={styles.label}>
                Precio
                <input
                  value={form.precio}
                  onChange={(e) => onChange('precio', e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Stock actual
                <input
                  value={form.stock_actual}
                  onChange={(e) => onChange('stock_actual', e.target.value)}
                  type="number"
                  step="1"
                  min="0"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Stock mínimo
                <input
                  value={form.stock_minimo}
                  onChange={(e) => onChange('stock_minimo', e.target.value)}
                  type="number"
                  step="1"
                  min="0"
                  style={styles.input}
                />
              </label>
            </div>

            {error ? <div style={styles.error}>{error}</div> : null}

            <button disabled={saving} type="submit" style={styles.primaryBtn}>
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.h3}>Listado</h3>
            <div style={styles.headerActions}>
              <button onClick={refresh} style={styles.primaryBtnSmall} disabled={loading} type="button">
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
              <button
                onClick={() => {
                  setQ('');
                  setEstado('todos');
                  setPrecioMin('');
                  setPrecioMax('');
                }}
                style={styles.secondaryBtn}
                type="button"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div style={styles.filters}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o SKU"
              style={styles.input}
            />

            <select value={estado} onChange={(e) => setEstado(e.target.value)} style={styles.select}>
              <option value="todos">Estado: Todos</option>
              <option value="ok">Estado: OK</option>
              <option value="bajo">Estado: Bajo</option>
              <option value="sin_stock">Estado: Sin stock</option>
            </select>

            <input
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              placeholder="Precio mín."
              type="number"
              step="0.01"
              min="0"
              style={styles.input}
            />
            <input
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              placeholder="Precio máx."
              type="number"
              step="0.01"
              min="0"
              style={styles.input}
            />

            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={styles.select}>
              <option value={10}>10 / pág.</option>
              <option value={25}>25 / pág.</option>
              <option value={50}>50 / pág.</option>
            </select>
          </div>

          {loading ? (
            <div style={styles.muted}>Cargando...</div>
          ) : sortedRows.length === 0 ? (
            <div style={styles.muted}>No hay productos registrados.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.thSticky}>
                      <button type="button" style={styles.thBtn} onClick={() => {
                        setSortKey('nombre');
                        setSortDir((prev) => (sortKey === 'nombre' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
                        setPage(1);
                      }}>
                        Nombre{sortKey === 'nombre' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    </th>
                    <th style={styles.thSticky}>
                      <button type="button" style={styles.thBtn} onClick={() => {
                        setSortKey('sku');
                        setSortDir((prev) => (sortKey === 'sku' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
                        setPage(1);
                      }}>
                        SKU{sortKey === 'sku' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    </th>
                    <th style={styles.thSticky}>Unidad</th>
                    <th style={styles.thSticky}>
                      <button type="button" style={styles.thBtn} onClick={() => {
                        setSortKey('precio');
                        setSortDir((prev) => (sortKey === 'precio' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
                        setPage(1);
                      }}>
                        Precio{sortKey === 'precio' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    </th>
                    <th style={styles.thSticky}>
                      <button type="button" style={styles.thBtn} onClick={() => {
                        setSortKey('stock');
                        setSortDir((prev) => (sortKey === 'stock' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
                        setPage(1);
                      }}>
                        Stock{sortKey === 'stock' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    </th>
                    <th style={styles.thSticky}>
                      <button type="button" style={styles.thBtn} onClick={() => {
                        setSortKey('estado');
                        setSortDir((prev) => (sortKey === 'estado' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
                        setPage(1);
                      }}>
                        Estado{sortKey === 'estado' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    </th>
                    <th style={styles.thRightSticky}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r, idx) => {
                    const actual = Number(r.stock_actual || 0);
                    const minimo = Number(r.stock_minimo || 0);
                    const statusStyle = actual <= 0 ? styles.trDanger : actual <= minimo ? styles.trWarn : styles.trOk;
                    const zebra = idx % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.00)';
                    const isHover = hoverId === r.id;
                    const rowStyle = {
                      ...statusStyle,
                      background: isHover ? 'rgba(11, 42, 82, 0.10)' : `linear-gradient(0deg, ${zebra}, ${zebra}), ${statusStyle.background}`,
                      transition: 'background 0.15s ease',
                    };

                    return (
                      <tr
                        key={r.id}
                        style={rowStyle}
                        onMouseEnter={() => setHoverId(r.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <td style={styles.td}>{r.nombre}</td>
                        <td style={styles.td}>{r.sku || '-'}</td>
                        <td style={styles.td}>{r.unidad || 'und'}</td>
                        <td style={styles.td}>S/ {Number(r.precio).toFixed(2)}</td>
                        <td style={styles.td}>{Number(r.stock_actual || 0)}</td>
                        <td style={styles.td}>
                          {Number(r.stock_actual || 0) <= 0
                            ? 'SIN STOCK'
                            : Number(r.stock_actual || 0) <= Number(r.stock_minimo || 0)
                              ? 'BAJO'
                              : 'OK'}
                        </td>
                        <td style={styles.tdRight}>
                          <button style={styles.smallBtn} onClick={() => startEdit(r)} title="Editar">
                            ✏️ Editar
                          </button>
                          <button style={styles.smallDangerBtn} onClick={() => onDelete(r)} title="Eliminar">
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={styles.pagination}>
                <div style={styles.muted}>{rangeLabel}</div>
                <div style={styles.paginationBtns}>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Anterior
                  </button>
                  <div style={styles.pagePill}>
                    {page} / {totalPages}
                  </div>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {editOpen ? (
        <div style={styles.modalOverlay} onMouseDown={() => setEditOpen(false)}>
          <div style={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.h3}>Editar producto</h3>
              <button type="button" style={styles.secondaryBtn} onClick={() => setEditOpen(false)}>
                Cerrar
              </button>
            </div>

            <form onSubmit={onSubmitEdit} style={styles.form}>
              <div style={styles.row2}>
                <label style={styles.label}>
                  Nombre
                  <input value={editForm.nombre} onChange={(e) => onEditChange('nombre', e.target.value)} style={styles.input} />
                </label>

                <label style={styles.label}>
                  SKU
                  <input value={editForm.sku} onChange={(e) => onEditChange('sku', e.target.value)} style={styles.input} />
                </label>
              </div>

              <div style={styles.row2}>
                <label style={styles.label}>
                  Unidad
                  <select value={editForm.unidad} onChange={(e) => onEditChange('unidad', e.target.value)} style={styles.select}>
                    <option value="und">Unidades</option>
                    <option value="kg">Kilogramos</option>
                    <option value="g">Gramos</option>
                    <option value="lt">Litros</option>
                    <option value="ml">Mililitros</option>
                    <option value="m">Metros</option>
                  </select>
                </label>

                <div />
              </div>

              <label style={styles.label}>
                Descripción
                <input value={editForm.descripcion} onChange={(e) => onEditChange('descripcion', e.target.value)} style={styles.input} />
              </label>

              <div style={styles.row3}>
                <label style={styles.label}>
                  Precio
                  <input
                    value={editForm.precio}
                    onChange={(e) => onEditChange('precio', e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                    style={styles.input}
                  />
                </label>

                <div />

                <label style={styles.label}>
                  Stock mínimo
                  <input
                    value={editForm.stock_minimo}
                    onChange={(e) => onEditChange('stock_minimo', e.target.value)}
                    type="number"
                    step="1"
                    min="0"
                    style={styles.input}
                  />
                </label>
              </div>

              {error ? <div style={styles.error}>{error}</div> : null}

              <div style={styles.modalFooter}>
                <button type="button" style={styles.secondaryBtn} onClick={() => setEditOpen(false)}>
                  Cancelar
                </button>
                <button disabled={editSaving} type="submit" style={styles.primaryBtnSmall}>
                  {editSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
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
    maxWidth: 1080,
    margin: '0 auto 16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  h2: { margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 },
  p: { margin: '8px 0 0', color: 'rgba(11, 42, 82, 0.75)' },
  grid: {
    maxWidth: 1080,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
  },
  card: {
    background: 'rgba(235, 240, 255, 0.78)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(14px)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  h3: { margin: 0, color: '#0b2a52', fontSize: 18, fontWeight: 900 },
  filters: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.8fr',
    gap: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'rgba(11, 42, 82, 0.85)' },
  input: {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
  },
  error: {
    padding: 10,
    borderRadius: 12,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 6,
    padding: '12px 12px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(180deg, rgba(11, 42, 82, 0.94) 0%, rgba(11, 42, 82, 0.84) 100%)',
    color: 'rgba(255,255,255,0.96)',
    fontWeight: 900,
    letterSpacing: 0.4,
    cursor: 'pointer',
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
  primaryBtnSmall: {
    padding: '8px 10px',
    borderRadius: 12,
    border: 'none',
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.96)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: 10 },
  logoutBtn: {
    padding: '10px 12px',
    borderRadius: 14,
    border: 'none',
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  muted: { color: 'rgba(11, 42, 82, 0.75)', marginTop: 12 },
  tableWrap: { overflowX: 'auto', marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thSticky: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    textAlign: 'left',
    fontSize: 12,
    color: 'rgba(11, 42, 82, 0.75)',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.14)',
    whiteSpace: 'nowrap',
    background: 'rgba(235, 240, 255, 0.92)',
    backdropFilter: 'blur(10px)',
  },
  thRightSticky: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: 'rgba(11, 42, 82, 0.75)',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.14)',
    whiteSpace: 'nowrap',
    background: 'rgba(235, 240, 255, 0.92)',
    backdropFilter: 'blur(10px)',
  },
  thBtn: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    color: 'inherit',
    font: 'inherit',
    fontWeight: 900,
    cursor: 'pointer',
  },
  th: {
    textAlign: 'left',
    fontSize: 12,
    color: 'rgba(11, 42, 82, 0.75)',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.14)',
    whiteSpace: 'nowrap',
  },
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
  },
  tdRight: {
    fontSize: 13,
    color: '#0b2a52',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  trOk: {
    background: 'rgba(16, 185, 129, 0.08)',
  },
  trWarn: {
    background: 'rgba(245, 158, 11, 0.10)',
  },
  trDanger: {
    background: 'rgba(239, 68, 68, 0.10)',
  },
  smallBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.22)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 900,
    cursor: 'pointer',
    marginRight: 8,
  },
  smallDangerBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(239, 68, 68, 0.35)',
    background: 'rgba(239, 68, 68, 0.10)',
    color: '#7f1d1d',
    fontWeight: 900,
    cursor: 'pointer',
  },
  pagination: {
    marginTop: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  paginationBtns: { display: 'flex', alignItems: 'center', gap: 10 },
  pagePill: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 900,
    fontSize: 12,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(11, 42, 82, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    zIndex: 50,
  },
  modalCard: {
    width: 'min(820px, 96vw)',
    maxHeight: '90vh',
    overflow: 'auto',
    background: 'rgba(235, 240, 255, 0.92)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(14px)',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  modalFooter: { marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
};
