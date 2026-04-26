import React from 'react';
import EmpleadoNavbar from './EmpleadoNavbar';

const EmpleadoLayout = ({ children }) => {
  return (
    <div style={layoutStyles.page}>
      {/**/}
      <EmpleadoNavbar />
      
      {/*Contenedor principal*/}
      <main style={layoutStyles.main}>
        <section style={layoutStyles.glassCard}>
          {children} 
        </section>
      </main>
    </div>
  );
};

const layoutStyles = {
  page: {
    minHeight: '100vh',
    // Gradiente idéntico al del Admin
    background: 'linear-gradient(135deg, #f2a1a5 0%, #b087b7 40%, #5377c8 100%)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start', // Para que el contenido empiece arriba
  },
  glassCard: {
    width: '100%',
    maxWidth: 1080,
    // Efecto de vidrio (Glassmorphism) extraído del Admin
    background: 'rgba(235, 240, 255, 0.78)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 24,
    padding: '30px',
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
  }
};

export default EmpleadoLayout;