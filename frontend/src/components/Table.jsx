import React from 'react';

export const Table = ({ headers, children, emptyMessage = "Không tìm thấy kết quả" }) => {
  return (
    <div className="app-card p-0 overflow-hidden border-0 shadow-sm bg-white rounded-4">
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="bg-light">
            <tr className="small text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              {headers.map((h, i) => (
                <th key={i} className={h.className || ''} style={h.style || {}}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="small fw-semibold">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
