'use client';

import { useState, useRef } from 'react';
import styles from './MediaTray.module.css';

export default function MediaTray({
  items,
  onReorder,
  onRemove,
  onCaptionChange,
  onTagChange,
  onSelect,
  selectedId,
  onItemBorderColorChange,
  onFilesAdded,
}) {
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    const reordered = [...items];
    const [dragged] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, dragged);
    onReorder(reordered);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const exportedCount = items.filter((i) => i.isExportedVideo).length;

  return (
    <div className={styles.tray}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Media ({items.length})
        </span>
        <span className={styles.hint}>Drag to reorder</span>
      </div>

      {exportedCount > 0 && (
        <div className={styles.trayAlert}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong>Re-exported video detected:</strong> If you see &quot;frames inside frames&quot;, click ✕ on the exported reel item below to remove it.
          </div>
        </div>
      )}

      <div className={styles.list}>
        {items.map((item, index) => (
          <TrayItem
            key={item.id}
            item={item}
            index={index}
            isSelected={item.id === selectedId}
            onSelect={() => onSelect(item.id)}
            onRemove={() => onRemove(item.id)}
            onCaptionChange={(caption) => onCaptionChange(item.id, caption)}
            onTagChange={onTagChange}
            onItemBorderColorChange={onItemBorderColorChange}
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
          />
        ))}

        {onFilesAdded && (
          <label className={styles.addMoreRow} title="Add more photos or videos">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                if (files.length) onFilesAdded(files);
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Add photos / videos</span>
          </label>
        )}
      </div>
    </div>
  );
}

function TrayItem({
  item,
  index,
  isSelected,
  onSelect,
  onRemove,
  onCaptionChange,
  onTagChange,
  onItemBorderColorChange,
  onDragStart,
  onDragEnter,
  onDragEnd,
}) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(item.caption || '');
  const [editingTag, setEditingTag] = useState(false);
  const [tag, setTag] = useState(item.tag || '');

  const saveCaption = () => {
    onCaptionChange(caption);
    setEditing(false);
  };

  const saveTag = () => {
    if (onTagChange) onTagChange(item.id, tag);
    setEditingTag(false);
  };

  return (
    <div
      className={`${styles.item} ${isSelected ? styles.selected : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className={styles.dragHandle}>
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
          <circle cx="4" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="4" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="4" cy="13" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
        </svg>
      </div>

      <div className={styles.thumb} onClick={onSelect}>
        <span className={styles.index}>{index + 1}</span>
        {item.type === 'video' ? (
          <video src={item.src} className={styles.thumbMedia} muted />
        ) : (
          <img src={item.src} alt={item.name} className={styles.thumbMedia} />
        )}
        {item.type === 'video' && (
          <span className={styles.videoBadge}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </span>
        )}
      </div>

      <div className={styles.meta}>
        <div className={styles.name} title={item.name}>{item.name}</div>
        {item.isExportedVideo && (
          <span
            className={styles.nestedWarningBadge}
            title="This file is a previously exported video reel, which already has frames and an escalator animation inside it."
          >
            ⚠️ Exported Reel (has inner frames)
          </span>
        )}

        {/* Caption row */}
        {editing ? (
          <div className={styles.captionEdit}>
            <input
              autoFocus
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={saveCaption}
              onKeyDown={(e) => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditing(false); }}
              className={styles.captionInput}
              placeholder="Add caption..."
            />
          </div>
        ) : (
          <div className={styles.captionRow}>
            <span className={styles.captionText} onClick={() => setEditing(true)}>
              {item.caption || <em>+ add caption</em>}
            </span>
            <label className={styles.itemColorPickerWrap} title={item.borderColor ? `Frame color: ${item.borderColor}` : 'Click to pick custom frame color'}>
              <input
                type="color"
                value={item.borderColor || '#2252cc'}
                onChange={(e) => onItemBorderColorChange && onItemBorderColorChange(item.id, e.target.value)}
                className={styles.itemColorInput}
              />
              <span
                className={styles.itemColorDot}
                style={{
                  backgroundColor: item.borderColor || 'transparent',
                  backgroundImage: !item.borderColor
                    ? 'conic-gradient(#2252cc, #e11d48, #059669, #d97706, #7c3aed, #2252cc)'
                    : 'none',
                }}
              />
            </label>
          </div>
        )}

        {/* Tag / @Mention / Scribble row */}
        {editingTag ? (
          <div className={styles.tagEdit}>
            <input
              autoFocus
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onBlur={saveTag}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTag();
                if (e.key === 'Escape') setEditingTag(false);
              }}
              className={styles.tagInput}
              placeholder="e.g. @sarah #hiking Love you! ✨"
            />
          </div>
        ) : (
          <div className={styles.tagRow}>
            <span
              className={styles.tagText}
              onClick={() => setEditingTag(true)}
              title="Click to add/edit handwritten tag, mention or scribble"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              {item.tag ? (
                <span className={styles.tagValue}>{item.tag}</span>
              ) : (
                <em className={styles.addTagHint}>+ tag / @mention</em>
              )}
            </span>
          </div>
        )}
      </div>

      <button className={styles.removeBtn} onClick={onRemove} title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}
