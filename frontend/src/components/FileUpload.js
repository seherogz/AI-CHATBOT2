import React, { useRef, useState } from 'react';
import './FileUpload.css';

const FileUpload = ({ onFileSelect, disabled = false }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (file) => {
    if (file && (file.type.startsWith('image/') || file.type.startsWith('text/') || file.type === 'application/pdf')) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      alert('Sadece resim, metin ve PDF dosyaları desteklenir.');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    onFileSelect(null);
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''} compact`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,text/*,.pdf"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        
        {selectedFile ? (
          <div className="selected-file compact">
            <div className="file-info">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button 
              type="button" 
              className="remove-file-btn"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="upload-placeholder compact">
            <span className="upload-icon">📎</span>
            <span className="upload-text">Dosya ekle</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload; 