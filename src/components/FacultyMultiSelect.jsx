import { useState, useEffect, useRef } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { getDocsEncrypted as getDocs } from '../firebase/encryptedStore'
import { db } from '../firebase/config'

export default function FacultyMultiSelect({ selected, onChange }) {
  const [allFaculty, setAllFaculty] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    getDocs(
      query(
        collection(db, 'faculty'),
        where('facStatus', '==', 'Active'),
        where('deptCode', '==', 'CS-BYC'),
      )
    ).then(snap => setAllFaculty(snap.docs.map(d => d.data())))
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = allFaculty.filter(
    f =>
      f.facName.toLowerCase().includes(search.toLowerCase()) &&
      !selected.some(s => s.facId === f.facId)
  )

  function add(fac) {
    onChange([...selected, { facId: fac.facId, facName: fac.facName, facEmail: fac.facEmail }])
    setSearch('')
  }

  function remove(facId) {
    onChange(selected.filter(s => s.facId !== facId))
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap gap-1.5 min-h-10 p-2 border border-gray-300 rounded-lg cursor-text focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400"
        onClick={() => { setOpen(true); containerRef.current?.querySelector('input')?.focus() }}
      >
        {selected.map(s => (
          <span
            key={s.facId}
            className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full"
          >
            {s.facName}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove(s.facId) }}
              className="text-indigo-400 hover:text-indigo-700 leading-none ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? 'Search and select faculty…' : ''}
          className="flex-1 min-w-32 outline-none text-sm bg-transparent placeholder-gray-400"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(f => (
            <button
              key={f.facId}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => add(f)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 text-gray-800 flex items-center justify-between"
            >
              <span>{f.facName}</span>
              <span className="text-gray-400 text-xs">{f.facDesig}</span>
            </button>
          ))}
        </div>
      )}

      {open && search && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          No matching faculty found.
        </div>
      )}
    </div>
  )
}
