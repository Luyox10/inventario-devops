import React, { useEffect, useMemo, useState } from 'react';

import { createUsuario, listUsuarios, updateUsuario } from '../../api/usuarios';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function emptyForm() {
  return {
    nombre: '',
    email: '',
    rol: 'EMPLEADO',
    password: '',
  };
}

export default function AdminUsuariosPage() {
  const { token, logout } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const nombre = String(r.nombre || '').toLowerCase();
      const email = String(r.email || '').toLowerCase();
      return nombre.includes(s) || email.includes(s);
    });
  }, [rows, q]);

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const data = await listUsuarios({ token });
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
      email: row.email ?? '',
      rol: row.rol ?? 'EMPLEADO',
      password: '',
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        rol: form.rol,
      };

      if (!payload.nombre || !payload.email || !payload.rol) {
        setError('Completa nombre, email y rol');
        return;
      }

      if (mode === 'create') {
        if (!form.password) {
          setError('La contraseña es requerida');
          return;
        }
        await createUsuario({
          token,
          data: {
            ...payload,
            password: form.password,
          },
        });
      } else {
        await updateUsuario({
          token,
          id: editingId,
          data: {
            ...payload,
            ...(form.password ? { password: form.password } : null),
          },
        });
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

  async function toggleActivo(row) {
    const ok = window.confirm(`${row.activo ? 'Desactivar' : 'Activar'} a "${row.nombre}"?`);
    if (!ok) return;

    setError('');
    try {
      await updateUsuario({ token, id: row.id, data: { activo: row.activo ? 0 : 1 } });
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
          <h2 style={styles.h2}>Usuarios</h2>
          <p style={styles.p}>Crea accesos y asigna roles.</p>
        </div>
      </header>

      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.h3}>{mode === 'edit' ? 'Editar usuario' : 'Crear usuario'}</h3>
            {mode === 'edit' ? (
              <button onClick={startCreate} style={styles.secondaryBtn} type="button">
                Cancelar
              </button>
            ) : null}
          </div>

          <form onSubmit={onSubmit} style={styles.form}>
            <div style={styles.row2}>
              <label style={styles.label}>
                Nombre
                <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} style={styles.input} />
              </label>
              <label style={styles.label}>
                Email
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={styles.input} />
              </label>
            </div>

            <div style={styles.row2}>
              <label style={styles.label}>
                Rol
                <select value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))} style={styles.select}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="EMPLEADO">EMPLEADO</option>
                </select>
              </label>

              <label style={styles.label}>
                {mode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
                <input
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  type="password"
                  style={styles.input}
                />
              </label>
            </div>

            {error ? <div style={styles.error}>{error}</div> : null}

            <button disabled={saving} type="submit" style={styles.primaryBtn}>
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear usuario'}
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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o email" style={styles.input} />
          </div>

          {loading ? (
            <div style={styles.muted}>Cargando...</div>
          ) : filtered.length === 0 ? (
            <div style={styles.muted}>No hay usuarios.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Activo</th>
                    <th style={styles.thRight}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} style={u.activo ? styles.trOk : styles.trDanger}>
                      <td style={styles.td}>{u.nombre}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>{u.rol}</td>
                      <td style={styles.td}>{u.activo ? 'Sí' : 'No'}</td>
                      <td style={styles.tdRight}>
                        <button style={styles.smallBtn} onClick={() => startEdit(u)}>
                          Editar
                        </button>
                        <button style={styles.smallDangerBtn} onClick={() => toggleActivo(u)}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
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
    maxWidth: 1180,
    margin: '0 auto 16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  h2: { margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 },
  p: { margin: '8px 0 0', color: 'rgba(11, 42, 82, 0.75)' },
  grid: {
    maxWidth: 1180,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    alignItems: 'start',
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
  form: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
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
  muted: { color: 'rgba(11, 42, 82, 0.75)', marginTop: 12 },
  filters: { marginTop: 12 },
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
  trOk: { background: 'rgba(16, 185, 129, 0.08)' },
  trDanger: { background: 'rgba(239, 68, 68, 0.10)' },
};
