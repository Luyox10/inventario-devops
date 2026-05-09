import React, { useEffect, useMemo, useState } from 'react';

import { listProductos } from '../../api/productos';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const ProductosPage = () => {
  const { token, logout } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [stockFilter, setStockFilter] = useState('todos');
  const [sort, setSort] = useState({ key: 'nombre', dir: 'asc' });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError('');
    listProductos({ token })
      .then((data) => {
        setProductos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err.status === 401) logout();
        setError(err.message || 'Error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, logout]);

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: key === 'stock_actual' ? 'asc' : 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  }

  function sortLabel(key, label) {
    if (sort.key !== key) return label;
    return `${label} ${sort.dir === 'asc' ? '↑' : '↓'}`;
  }

  const filteredSorted = useMemo(() => {
    const s = q.trim().toLowerCase();
    const dirMul = sort.dir === 'desc' ? -1 : 1;

    const arr = productos
      .filter((p) => {
        const nombre = String(p.nombre || '').toLowerCase();
        const sku = String(p.sku || '').toLowerCase();
        const matchesQ = !s || nombre.includes(s) || sku.includes(s);

        const stock = Number(p.stock_actual || 0);
        const matchesStock =
          stockFilter === 'todos' ? true : stockFilter === 'con' ? stock > 0 : stockFilter === 'sin' ? stock <= 0 : true;

        return matchesQ && matchesStock;
      })
      .sort((a, b) => {
        if (sort.key === 'nombre') {
          return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }) * dirMul;
        }
        if (sort.key === 'sku') {
          return String(a.sku || '').localeCompare(String(b.sku || ''), 'es', { sensitivity: 'base' }) * dirMul;
        }
        if (sort.key === 'precio') return (Number(a.precio || 0) - Number(b.precio || 0)) * dirMul;
        if (sort.key === 'stock_actual') return (Number(a.stock_actual || 0) - Number(b.stock_actual || 0)) * dirMul;
        return 0;
      });

    return arr;
  }, [productos, q, sort.dir, sort.key, stockFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredSorted.length / pageSize)), [filteredSorted.length, pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page, pageSize]);

  return (
    <div>
      {/* Encabezado con estética Admin */}
      <header style={{ marginBottom: '25px' }}>
        <h2 style={{ margin: 0, color: '#0b2a52', fontSize: '28px', fontWeight: 900 }}>
          Catálogo de Productos
        </h2>
        <p style={{ margin: '5px 0 0', color: 'rgba(11, 42, 82, 0.7)', fontSize: '15px' }}>
          Consulta de precios y disponibilidad en tiempo real.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(11, 42, 82, 0.5)', padding: '40px' }}>
          Cargando catálogo...
        </div>
      ) : error ? (
        <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#0b2a52' }}>
          {error}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={styles.controls}>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre o SKU..."
              style={styles.search}
            />
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setPage(1);
              }}
              style={styles.select}
            >
              <option value="todos">Todos</option>
              <option value="con">Con stock</option>
              <option value="sin">Sin stock</option>
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.thBtn} onClick={() => toggleSort('nombre')} role="button" title="Ordenar">
                  {sortLabel('nombre', 'NOMBRE DEL PRODUCTO')}
                </th>
                <th style={styles.thBtn} onClick={() => toggleSort('sku')} role="button" title="Ordenar">
                  {sortLabel('sku', 'SKU')}
                </th>
                <th style={styles.thBtn} onClick={() => toggleSort('precio')} role="button" title="Ordenar">
                  {sortLabel('precio', 'PRECIO UNITARIO')}
                </th>
                <th style={styles.thBtn} onClick={() => toggleSort('stock_actual')} role="button" title="Ordenar">
                  {sortLabel('stock_actual', 'STOCK DISPONIBLE')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((p, idx) => {
                const stock = Number(p.stock_actual || 0);
                const ok = stock > 5;
                const rowStyle = idx % 2 === 0 ? styles.tr : styles.trAlt;
                return (
                  <tr key={p.id} style={rowStyle}>
                    <td style={styles.tdStrong}>{p.nombre}</td>
                    <td style={styles.td}>{p.sku || '-'}</td>
                    <td style={styles.td}>S/ {parseFloat(p.precio).toFixed(2)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '10px',
                          backgroundColor: ok ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: ok ? '#065f46' : '#b91c1c',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        {stock} unidades
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && filteredSorted.length > 0 ? (
            <div style={styles.footer}>
              <div style={styles.footerLeft}>
                <span style={styles.footerMuted}>
                  Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredSorted.length)} de {filteredSorted.length}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) || 10);
                    setPage(1);
                  }}
                  style={styles.selectSmall}
                >
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
                <button type="button" style={styles.smallBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  ›
                </button>
                <button type="button" style={styles.smallBtn} onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                  »
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {filteredSorted.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(11, 42, 82, 0.5)' }}>
          No se encontraron productos registrados.
        </div>
      )}
    </div>
  );
};

// Estilos internos que imitan al Administrador
const styles = {
  controls: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  search: {
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(11, 42, 82, 0.1)',
    background: 'rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    color: '#0b2a52',
    outline: 'none',
    minWidth: 240,
    flex: '1 1 240px',
  },
  select: {
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(11, 42, 82, 0.1)',
    background: 'rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    color: '#0b2a52',
    outline: 'none',
    fontWeight: 800,
  },
  th: {
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 800,
    color: 'rgba(11, 42, 82, 0.6)',
    padding: '12px 15px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  thBtn: {
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 800,
    color: 'rgba(11, 42, 82, 0.6)',
    padding: '12px 15px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  tr: {
    borderBottom: '1px solid rgba(11, 42, 82, 0.05)',
    transition: 'background 0.2s',
  },
  trAlt: {
    borderBottom: '1px solid rgba(11, 42, 82, 0.05)',
    transition: 'background 0.2s',
    background: 'rgba(255, 255, 255, 0.15)',
  },
  td: {
    fontSize: '14px',
    color: '#0b2a52',
    padding: '16px 15px',
  },
  tdStrong: {
    fontSize: '14px',
    color: '#0b2a52',
    padding: '16px 15px',
    fontWeight: 800, // Estilo característico del admin
  }
  ,
  footer: {
    marginTop: 14,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  footerRight: { display: 'flex', alignItems: 'center', gap: 6 },
  footerMuted: { color: 'rgba(11, 42, 82, 0.72)', fontWeight: 800, fontSize: 12 },
  selectSmall: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
    fontWeight: 800,
  },
  smallBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.22)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 900,
    cursor: 'pointer',
  },
};

export default ProductosPage;