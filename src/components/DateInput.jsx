import { useState, useEffect } from 'react'

/**
 * DateInput — Shows DD/MM/YYYY to the user, stores/emits YYYY-MM-DD internally.
 * Props mirror a standard <input> so it's a drop-in replacement.
 * onChange receives a synthetic event: { target: { name, value: 'YYYY-MM-DD' } }
 */
export default function DateInput({ name, value, onChange, required, className, disabled, id }) {
  // Convert YYYY-MM-DD → DD/MM/YYYY for display
  function toDisplay(iso) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
  }

  // Convert DD/MM/YYYY → YYYY-MM-DD for storage
  function toISO(display) {
    if (!display) return ''
    const parts = display.replace(/[.\-]/g, '/').split('/')
    if (parts.length !== 3) return ''
    const [d, m, y] = parts
    if (!d || !m || !y || y.length < 4) return ''
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const [displayVal, setDisplayVal] = useState(() => toDisplay(value))

  // Sync when parent value changes (e.g. edit mode pre-fill)
  useEffect(() => {
    setDisplayVal(toDisplay(value))
  }, [value])

  function handleChange(e) {
    let raw = e.target.value

    // Auto-insert slashes as user types
    raw = raw.replace(/[^\d/]/g, '')
    if (raw.length === 2 && displayVal.length === 1) raw += '/'
    if (raw.length === 5 && displayVal.length === 4) raw += '/'
    if (raw.length > 10) return

    setDisplayVal(raw)

    // Emit ISO value once fully entered
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const iso = toISO(raw)
      onChange({ target: { name, value: iso } })
    } else if (raw === '') {
      onChange({ target: { name, value: '' } })
    }
  }

  function handleBlur() {
    if (displayVal && !/^\d{2}\/\d{2}\/\d{4}$/.test(displayVal)) {
      // Revert to last valid value
      setDisplayVal(toDisplay(value))
    }
  }

  return (
    <input
      id={id}
      type="text"
      name={name}
      value={displayVal}
      onChange={handleChange}
      onBlur={handleBlur}
      required={required}
      disabled={disabled}
      placeholder="DD/MM/YYYY"
      maxLength={10}
      inputMode="numeric"
      className={className}
    />
  )
}
