import React from 'react';

export const SearchInput = ({ value, onChange, placeholder = "Tìm kiếm...", width = "100%" }) => {
  return (
    <div className="input-group shadow-sm" style={{ width, borderRadius: '10px', overflow: 'hidden' }}>
      <span className="input-group-text bg-white border border-end-0 text-muted ps-3">
        <i className="fas fa-search"></i>
      </span>
      <input
        type="text"
        className="form-control border border-start-0 py-2.5 ps-2 text-dark font-semibold"
        placeholder={placeholder}
        style={{ outline: 'none', boxShadow: 'none', fontSize: '0.85rem' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default SearchInput;
