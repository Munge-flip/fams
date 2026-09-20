import { useEffect, useId, useRef, useState } from 'react';

// Filter-row dropdown. A native <select> brought OS chrome, a blue-highlight option list
// and clipped values, so this implements the ARIA "select-only combobox" pattern instead:
// focus stays on the trigger, Arrow keys move the active option, Enter selects, Escape
// closes. Trigger and option list reuse the chip/card visual language.
//
// Typography lives on the inner span: index.css sets `font: inherit` on button/input/select
// unlayered, which outranks Tailwind's utility layer on the control itself.
const triggerBase = 'inline-flex min-h-9 max-w-[12rem] items-center gap-1.5 rounded-full border px-3 outline-none transition focus:ring-2 focus:ring-black/15';
const triggerIdle = 'border-gray-300 bg-white text-gray-700 hover:border-gray-400';
const triggerSelected = 'border-blue-600 bg-blue-600 text-white';
const triggerLabel = 'truncate text-xs font-semibold';

export default function FilterDropdown({ disabled = false, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const optionId = (index) => `${listId}-option-${index}`;

  const selectedIndex = Math.max(options.findIndex((option) => option.value === value), 0);
  const selectedLabel = options[selectedIndex]?.label || '';

  const commit = (index) => {
    const option = options[index];
    setOpen(false);
    if (option) onChange(option.value);
    triggerRef.current?.focus();
  };

  // Closing on outside mousedown also closes a sibling dropdown when another chip is used.
  useEffect(() => {
    if (!open) return undefined;

    setActiveIndex(selectedIndex);
    const closeOnOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (open) listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const moveActive = (delta) => {
    setActiveIndex((index) => Math.min(options.length - 1, Math.max(0, index + delta)));
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          setActiveIndex(selectedIndex);
          setOpen(true);
        } else {
          moveActive(event.key === 'ArrowDown' ? 1 : -1);
        }
        return;
      case 'Home':
        if (open) { event.preventDefault(); setActiveIndex(0); }
        return;
      case 'End':
        if (open) { event.preventDefault(); setActiveIndex(options.length - 1); }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) commit(activeIndex); else setOpen(true);
        return;
      case 'Escape':
        if (open) { event.preventDefault(); setOpen(false); }
        return;
      case 'Tab':
        setOpen(false);
        return;
      default:
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${label}: ${selectedLabel}`}
        className={`${triggerBase} ${value ? triggerSelected : triggerIdle} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className={triggerLabel} title={selectedLabel}>{selectedLabel}</span>
        <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 20 20">
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
        </svg>
      </button>

      {open && !disabled && (
        <ul
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-1 max-h-64 w-max min-w-full max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          id={listId}
          ref={listRef}
          role="listbox"
        >
          {options.map((option, index) => (
            <li
              aria-selected={option.value === value}
              className={`cursor-pointer break-words px-3 py-2 text-sm leading-5 ${index === activeIndex ? 'bg-gray-50' : 'bg-white'} ${option.value === value ? 'font-semibold text-blue-700' : 'text-gray-700'}`}
              id={optionId(index)}
              key={option.value || 'all'}
              onMouseDown={(event) => { event.preventDefault(); commit(index); }}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
            >
              {option.value === value && <span aria-hidden="true" className="mr-1">✓</span>}
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
