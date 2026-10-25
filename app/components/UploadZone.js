'use client';

import { useCallback } from 'react';
import styles from './UploadZone.module.css';

export default function UploadZone({ onFilesAdded }) {
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
      );
      if (files.length > 0) onFilesAdded(files);
    },
    [onFilesAdded]
  );

  const handleChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) onFilesAdded(files);
      e.target.value = '';
    },
    [onFilesAdded]
  );

  return (
    <div
      className={styles.zone}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => e.currentTarget.classList.add(styles.dragOver)}
      onDragLeave={(e) => e.currentTarget.classList.remove(styles.dragOver)}
    >
      <div className={styles.iconWrap}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" fill="rgba(79,142,247,0.12)" stroke="rgba(79,142,247,0.5)" strokeWidth="2" />
          <path d="M32 20 L32 44" stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M21 31 L32 20 L43 31" stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 46 L44 46" stroke="rgba(79,142,247,0.4)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className={styles.title}>Drop your memories here</h2>
      <p className={styles.subtitle}>Images & videos · JPG, PNG, GIF, MP4, MOV, WEBM</p>
      <label className={styles.btn}>
        <input
          id="file-upload-input"
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleChange}
          className={styles.hiddenInput}
        />
        <span className={styles.btnIcon}>+</span> Choose Files
      </label>
    </div>
  );
}
