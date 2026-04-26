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

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');

  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const formTitle = useMemo(() => (mode === 'edit' ? 'Editar producto' : 'Registrar producto'), [mode]);

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

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startCreate() {
    setMode('create');
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  }

  function startEdit(row) {
    setMode('edit');
    setEditingId(row.id);
    setForm({
      nombre: row.nombre ?? '',
      sku: row.sku ?? '',
      unidad: row.unidad ?? 'und',
      descripcion: row.descripcion ?? '',
      precio: String(row.precio ?? ''),
      stock_actual: '',
      stock_minimo: '',
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const basePayload = {
        nombre: form.nombre.trim(),
        sku: form.sku.trim() || null,
        unidad: form.unidad,
        descripcion: form.descripcion.trim() || null,
        precio: Number(form.precio),
      };

      const payload =
        mode === 'edit'
          ? basePayload
          : {
              ...basePayload,
              stock_actual: Number(form.stock_actual || 0),
              stock_minimo: Number(form.stock_minimo || 0),
            };

      if (!payload.nombre || Number.isNaN(payload.precio)) {
        setError('Completa nombre y precio correctamente');
        return;
      }

      if (mode === 'edit') {
        await updateProducto({ token, id: editingId, data: payload });
      } else {
        await createProducto({ token, data: payload });
      }

      startCreate();
      await refresh();
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row) {
    const ok = window.confirm(`¿Eliminar "${row.nombre}"?`);
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
        <button onClick={logout} style={styles.logoutBtn}>
          Cerrar sesión
        </button>
      </header>

      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.h3}>{formTitle}</h3>
            {mode === 'edit' ? (
              <button onClick={startCreate} style={styles.secondaryBtn}>
                Cancelar
              </button>
            ) : null}
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

              {mode === 'create' ? (
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
              ) : (
                <div />
              )}

              {mode === 'create' ? (
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
              ) : (
                <div />
              )}
            </div>

            {error ? <div style={styles.error}>{error}</div> : null}

            <button disabled={saving} type="submit" style={styles.primaryBtn}>
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Registrar'}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.h3}>Listado</h3>
            <button onClick={refresh} style={styles.secondaryBtn} disabled={loading}>
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
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

          {loading ? (
            <div style={styles.muted}>Cargando...</div>
          ) : filteredRows.length === 0 ? (
            <div style={styles.muted}>No hay productos registrados.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>SKU</th>
                    <th style={styles.th}>Unidad</th>
                    <th style={styles.th}>Precio</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.thRight}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => {
                    const actual = Number(r.stock_actual || 0);
                    const minimo = Number(r.stock_minimo || 0);
                    const rowStyle =
                      actual <= 0 ? styles.trDanger : actual <= minimo ? styles.trWarn : styles.trOk;

                    return (
                      <tr key={r.id} style={rowStyle}>
                      <td style={styles.td}>{r.nombre}</td>
                      <td style={styles.td}>{r.sku || '-'}</td>
                      <td style={styles.td}>{r.unidad || 'und'}</td>
                      <td style={styles.td}>S/ {Number(r.precio).toFixed(2)}</td>
                      <td style={styles.td}>
                        {Number(r.stock_actual || 0) <= 0
                          ? 'SIN STOCK'
                          : Number(r.stock_actual || 0) <= Number(r.stock_minimo || 0)
                            ? 'BAJO'
                            : 'OK'}
                      </td>
                      <td style={styles.tdRight}>
                        <button style={styles.smallBtn} onClick={() => startEdit(r)}>
                          Editar
                        </button>
                        <button style={styles.smallDangerBtn} onClick={() => onDelete(r)}>
                          Eliminar
                        </button>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
    gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
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
};
