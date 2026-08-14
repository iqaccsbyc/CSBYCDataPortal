import { useState, useEffect } from 'react'
import { collection, query, or, where } from 'firebase/firestore'
import { getDocsEncrypted as getDocs } from '../firebase/encryptedStore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

const ELEVATED_ROLES = [
  'director', 'assocdirector', 'dean', 'assocdean', 
  'campusiqaccoordinator', 'campusiqaccoreteam', 
  'hod', 'assochod', 'coordinator', 
  'deptiqaccoordinator', 'deptiqaccoreteam', 'adminassist'
]

export default function FacultyProfileModal({ faculty, onClose }) {
  const { userRoles, deptCode: myDeptCode } = useAuth()
  const [loading, setLoading] = useState(true)
  const [contributions, setContributions] = useState({
    publications: [],
    presentations: [],
    iprOutcomes: [],
    participations: [],
    achievements: []
  })
  const [expandedSection, setExpandedSection] = useState(null)

  const isElevated = userRoles?.some(role => ELEVATED_ROLES.includes(role))
  const isSameDept = Boolean(myDeptCode && faculty.deptCode && myDeptCode === faculty.deptCode)
  const canViewDetails = isElevated || isSameDept

  useEffect(() => {
    if (faculty) {
      fetchContributions()
    }
  }, [faculty])

  async function fetchContributions() {
    setLoading(true)
    try {
      const email = faculty.facEmail
      const name = faculty.facName
      
      const collectionsToFetch = ['publications', 'presentations', 'iprOutcomes', 'participations', 'achievements']
      const fetchedData = {}

      for (const colName of collectionsToFetch) {
        let q
        if (name) {
          q = query(
            collection(db, colName),
            or(
              where('submittedBy', '==', email),
              where('csbyFacultyAuthors', 'array-contains', name)
            )
          )
        } else {
          q = query(collection(db, colName), where('submittedBy', '==', email))
        }

        const snap = await getDocs(q)
        fetchedData[colName] = snap.docs.map(d => d.data())
      }

      setContributions(fetchedData)
    } catch (err) {
      console.error("Error fetching contributions:", err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section) => {
    if (!canViewDetails) return
    if (expandedSection === section) {
      setExpandedSection(null)
    } else {
      setExpandedSection(section)
    }
  }

  const renderNumberCard = (title, count, sectionKey, bgColor, textColor) => {
    const isClickable = canViewDetails && count > 0
    const isExpanded = expandedSection === sectionKey

    return (
      <div 
        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
          isClickable ? 'cursor-pointer hover:shadow-md ' + (isExpanded ? `ring-2 ring-offset-1 ring-${textColor.split('-')[1]}-400` : '') : 'opacity-80'
        } ${bgColor} border-transparent`}
        onClick={() => isClickable && toggleSection(sectionKey)}
      >
        <span className={`text-3xl font-bold ${textColor}`}>{count}</span>
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide mt-1 text-center">{title}</span>
        {canViewDetails && (
          <span className={`text-[10px] mt-1 ${isClickable ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
            {isClickable ? (isExpanded ? 'Hide Details' : 'View Details') : 'No records'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-2xl flex-shrink-0">
              {faculty.facName ? faculty.facName.charAt(0).toUpperCase() : 'F'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{faculty.facName}</h2>
              <p className="text-sm font-medium text-gray-600">{faculty.facDesig}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {faculty.deptCode || '—'}
                </span>
                <span className="text-sm text-gray-500">{faculty.facEmail}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* General Profile Section */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">General Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Joining</span>
                <span className="block text-sm text-gray-900 mt-1">{faculty.facDOJ || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">City</span>
                <span className="block text-sm text-gray-900 mt-1">{faculty.facCity || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience Outside</span>
                <span className="block text-sm text-gray-900 mt-1">{faculty.facExpOutside ? `${faculty.facExpOutside} Years` : 'N/A'}</span>
              </div>
              
              <div className="md:col-span-2 lg:col-span-3">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Specializations</span>
                {faculty.specializations && faculty.specializations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {faculty.specializations.map((spec, idx) => (
                      <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {spec}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Not specified</span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Professional Links & IDs</span>
              <div className="flex flex-wrap gap-4">
                {faculty.orcidId && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                    <span className="font-semibold">ORCID:</span> {faculty.orcidId}
                  </div>
                )}
                {faculty.scopusId && (
                  <div className="flex items-center gap-2 text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100">
                    <span className="font-semibold">SCOPUS:</span> {faculty.scopusId}
                  </div>
                )}
                {faculty.linkedIn && (
                  <a href={faculty.linkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg border border-sky-100 hover:bg-sky-100 transition-colors">
                    LinkedIn Profile ↗
                  </a>
                )}
                {faculty.website && (
                  <a href={faculty.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    Individual Web ↗
                  </a>
                )}
                {faculty.institutionalWebsite && (
                  <a href={faculty.institutionalWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    Inst. Web ↗
                  </a>
                )}
                {(!faculty.orcidId && !faculty.scopusId && !faculty.linkedIn && !faculty.website && !faculty.institutionalWebsite) && (
                  <span className="text-sm text-gray-500">No links or IDs provided.</span>
                )}
              </div>
            </div>
          </section>

          {/* Contributions Summary */}
          <section>
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h3 className="text-lg font-bold text-gray-900">Contributions Summary</h3>
              {!canViewDetails && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  Viewing basic summary. Full details restricted.
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {renderNumberCard('Publications', contributions.publications.length, 'publications', 'bg-blue-50', 'text-blue-700')}
                {renderNumberCard('Presentations', contributions.presentations.length, 'presentations', 'bg-emerald-50', 'text-emerald-700')}
                {renderNumberCard('IPR Outcomes', contributions.iprOutcomes.length, 'iprOutcomes', 'bg-purple-50', 'text-purple-700')}
                {renderNumberCard('Participations', contributions.participations.length, 'participations', 'bg-amber-50', 'text-amber-700')}
                {renderNumberCard('Achievements', contributions.achievements.length, 'achievements', 'bg-rose-50', 'text-rose-700')}
              </div>
            )}
            
            {/* Expanded Details Section */}
            {expandedSection && canViewDetails && (
              <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-bold text-gray-800 capitalize">
                    {expandedSection} Details ({contributions[expandedSection].length})
                  </h4>
                  <button onClick={() => setExpandedSection(null)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {contributions[expandedSection].map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200 shadow-sm text-sm">
                      {expandedSection === 'publications' && (
                        <>
                          <div className="font-semibold text-gray-900">{item.pubTitle}</div>
                          <div className="text-gray-600 text-xs mt-1">{item.journalName} • {item.academicYear}</div>
                          <div className="text-gray-500 text-xs mt-1">Indexed: {item.indexedBy?.join(', ') || 'None'}</div>
                        </>
                      )}
                      {expandedSection === 'presentations' && (
                        <>
                          <div className="font-semibold text-gray-900">{item.presTitle}</div>
                          <div className="text-gray-600 text-xs mt-1">{item.forumName} • {item.academicYear}</div>
                        </>
                      )}
                      {expandedSection === 'iprOutcomes' && (
                        <>
                          <div className="font-semibold text-gray-900">{item.iprTitle}</div>
                          <div className="text-gray-600 text-xs mt-1">{item.iprType} • Status: {item.iprStatus} • {item.academicYear}</div>
                        </>
                      )}
                      {expandedSection === 'participations' && (
                        <>
                          <div className="font-semibold text-gray-900">{item.partProgramTitle}</div>
                          <div className="text-gray-600 text-xs mt-1">{item.partType} at {item.partOrg} • {item.academicYear}</div>
                        </>
                      )}
                      {expandedSection === 'achievements' && (
                        <>
                          <div className="font-semibold text-gray-900">{item.achievementTitle}</div>
                          <div className="text-gray-600 text-xs mt-1">{item.awardingAgency} • {item.academicYear}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
