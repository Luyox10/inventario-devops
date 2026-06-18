import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, RefreshCw, Bell, ArrowRight } from 'lucide-react';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const MODULES = [
  {
    path: '/empleado/ventas',
    Icon: ShoppingCart,
    label: 'Registrar Venta',
    desc: 'Cobra y descuenta stock',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.10)',
    border: 'rgba(99,102,241,0.22)',
  },
  {
    path: '/empleado/productos',
    Icon: Package,
    label: 'Productos',
    desc: 'Consulta precios y stock',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.10)',
    border: 'rgba(14,165,233,0.22)',
  },
  {
    path: '/empleado/reposicion',
    Icon: RefreshCw,
    label: 'Reposición',
    desc: 'Registra ingreso de lotes',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.22)',
  },
  {
    path: '/empleado/alertas',
    Icon: Bell,
    label: 'Alertas',
    desc: 'Stock bajo y vencimientos',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.22)',
  },
];

export default function EmpleadoDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const fecha = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Bienvenida ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(14,165,233,0.08) 100%)',
        border: '1px solid rgba(99,102,241,0.18)',
        borderRadius: 20, padding: '24px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(11,42,82,0.50)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {saludo}
          </div>
          <h2 style={{ margin: 0, color: '#0b2a52', fontSize: 28, fontWeight: 900 }}>
            {user?.nombre || 'Empleado'}
          </h2>
          <p style={{ margin: '6px 0 0', color: 'rgba(11,42,82,0.55)', fontSize: 14 }}>
            ¿Qué deseas hacer hoy?
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(11,42,82,0.45)', textTransform: 'capitalize' }}>{fecha}</div>
          <div style={{
            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 999, padding: '4px 12px',
            fontSize: 12, fontWeight: 800, color: '#065f46',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Sesión activa
          </div>
        </div>
      </div>

      {/* ── Módulos ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(11,42,82,0.45)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14 }}>
          Accesos rápidos
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          {MODULES.map(({ path, Icon, label, desc, color, bg, border }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                background: 'rgba(255,255,255,0.45)',
                border: `1.5px solid ${border}`,
                borderRadius: 18, padding: '20px 18px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'flex', flexDirection: 'column', gap: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color={color} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontWeight: 900, color: '#0b2a52', fontSize: 15 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'rgba(11,42,82,0.52)', marginTop: 3, fontWeight: 600 }}>{desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color }}>
                Ir al módulo <ArrowRight size={13} />
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}