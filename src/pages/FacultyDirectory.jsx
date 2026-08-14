import { useState, useEffect } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { getDocsEncrypted as getDocs } from '../firebase/encryptedStore'
import { db } from '../firebase/config'
import FacultyProfileModal from '../components/FacultyProfileModal'
import { useAuth } from '../context/AuthContext'

export default function FacultyDirectory() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [filterSearch, setFilterSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [depts, setDepts] = useState([])

  const [selectedFaculty, setSelectedFaculty] = useState(null)
  
  useEffect(() => {
    fetchData()
    getDocs(collection(db, 'departments')).then(snap => {
      setDepts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.deptName?.localeCompare(b.deptName)))
    })
  }, [])

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      // Only fetch active faculty
      const q = query(collection(db, 'faculty'), where('facStatus', '==', 'Active'))
      const snapshot = await getDocs(q)
      const fetchedData = snapshot.docs.map(doc => doc.data())
      // Sort alphabetically by name
      fetchedData.sort((a, b) => (a.facName || '').localeCompare(b.facName || ''))
      setData(fetchedData)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch directory data.')
    } finally {
      setLoading(false)
    }
  }

  const filteredData = data.filter(item => {
    if (filterDept !== 'all' && item.deptCode !== filterDept) return false
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      const searchStr = `${item.facName} ${item.facEmail} ${item.facId} ${(item.specializations || []).join(' ')}`.toLowerCase()
      if (!searchStr.includes(q)) return false
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Explore faculty profiles, specializations, and research contributions.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search</label>
          <input
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Name, email, or specialization…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[180px]"
          >
            <option value="all">All Departments</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.deptName || d.id}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 self-end">
          <span className="text-xs text-gray-400 pb-2">
            Showing {filteredData.length} of {data.length}
          </span>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No faculty found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredData.map(faculty => (
            <div key={faculty.facId} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
              <div className="p-5 flex-grow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl flex-shrink-0">
                    {faculty.facName ? faculty.facName.charAt(0).toUpperCase() : 'F'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1" title={faculty.facName}>{faculty.facName}</h3>
                    <p className="text-xs font-medium text-gray-500 line-clamp-1">{faculty.facDesig}</p>
                    <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {faculty.deptCode || '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${faculty.facEmail}`} className="hover:text-indigo-600 truncate">{faculty.facEmail}</a>
                  </div>
                  {faculty.linkedIn && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      <a href={faculty.linkedIn} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 truncate">LinkedIn Profile</a>
                    </div>
                  )}
                  {faculty.orcidId && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="truncate">ORCID: {faculty.orcidId}</span>
                    </div>
                  )}
                </div>

                {faculty.specializations && faculty.specializations.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Specializations</div>
                    <div className="flex flex-wrap gap-1">
                      {faculty.specializations.slice(0, 3).map((spec, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                          {spec}
                        </span>
                      ))}
                      {faculty.specializations.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200">
                          +{faculty.specializations.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 mt-auto">
                <button
                  onClick={() => setSelectedFaculty(faculty)}
                  className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors py-1"
                >
                  View Full Profile & Contributions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedFaculty && (
        <FacultyProfileModal 
          faculty={selectedFaculty} 
          onClose={() => setSelectedFaculty(null)} 
        />
      )}
    </div>
  )
}
