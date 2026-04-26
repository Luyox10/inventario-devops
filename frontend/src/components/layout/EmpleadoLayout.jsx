import React from 'react';
import EmpleadoNavbar from './EmpleadoNavbar';

const EmpleadoLayout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      <EmpleadoNavbar />
      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
};

export default EmpleadoLayout;