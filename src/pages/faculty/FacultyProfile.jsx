import DateInput from '../../components/DateInput'
import TagsInput from '../../components/TagsInput'
import { useState, useEffect } from 'react'
import { doc, collection, query, or, where } from 'firebase/firestore'
import { getDocEncrypted as getDoc, updateDocEncrypted as updateDoc, getDocsEncrypted as getDocs } from '../../firebase/encryptedStore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import { getCurrentAcademicYear } from '../../utils/academicYear'

export default function FacultyProfile() {
  const { user, facId } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({})
  const [contributions, setContributions] = useState({})

  useEffect(() => {
    if (!user || !facId) return

    const loadProfile = async () => {
      setLoading(true)
      try {
        const facSnap = await getDoc(doc(db, 'faculty', facId))
        if (facSnap.exists()) {
          setFormData(facSnap.data())
          await loadContributions(facSnap.data().facName)
        } else {
          setError('Profile not found.')
        }
      } catch (err) {
        console.error(err)
        setError('Error loading profile.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user, facId])

  const loadContributions = async (facName) => {
    try {
      const collectionsToFetch = ['publications', 'iprOutcomes', 'presentations', 'participations', 'achievements']
      const fetchedData = {}

      for (const colName of collectionsToFetch) {
        let q
        if (facName) {
          q = query(
            collection(db, colName),
            or(
              where('submittedBy', '==', user.email),
              where('csbyFacultyAuthors', 'array-contains', facName)
            )
          )
        } else {
          q = query(collection(db, colName), where('submittedBy', '==', user.email))
        }

        const snap = await getDocs(q)
        fetchedData[colName] = snap.docs.map(d => d.data())
      }

      // Group by academicYear
      const grouped = {}

      const initYear = (year) => {
        if (!grouped[year]) {
          grouped[year] = {
            publicationsIndexed: 0,
            publicationsNonIndexed: 0,
            iprOutcomes: 0,
            presentations: 0,
            participations: 0,
            achievements: 0
          }
        }
      }

      const getYear = (entry) => entry.academicYear || getCurrentAcademicYear()

      fetchedData.publications.forEach(pub => {
        const year = getYear(pub)
        initYear(year)
        
        // UGC CARE is non-indexed based on user requirement
        const isIndexed = pub.indexedBy && pub.indexedBy.some(idx => ['SCOPUS', 'WOS', 'ABDC', 'SCI'].includes(idx))
        if (isIndexed) {
          grouped[year].publicationsIndexed++
        } else {
          grouped[year].publicationsNonIndexed++
        }
      })

      fetchedData.iprOutcomes.forEach(ipr => {
        const year = getYear(ipr)
        initYear(year)
        grouped[year].iprOutcomes++
      })

      fetchedData.presentations.forEach(pres => {
        const year = getYear(pres)
        initYear(year)
        grouped[year].presentations++
      })

      fetchedData.participations.forEach(part => {
        const year = getYear(part)
        initYear(year)
        grouped[year].participations++
      })

      fetchedData.achievements.forEach(ach => {
        // filter out student achievements if any, though the query might not
        if (ach.achievementFor === 'Student') return
        const year = getYear(ach)
        initYear(year)
        grouped[year].achievements++
      })

      setContributions(grouped)
    } catch (err) {
      console.error("Error loading contributions:", err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateDoc(doc(db, 'faculty', facId), {
        facDOJ: formData.facDOJ || '',
        facExpOutside: formData.facExpOutside || '',
        facGender: formData.facGender || '',
        facDOB: formData.facDOB || '',
        facMob: formData.facMob || '',
        facCity: formData.facCity || '',
        facTAddress: formData.facTAddress || '',
        facPAddress: formData.facPAddress || '',
        facPEmail: formData.facPEmail || '',
        orcidId: formData.orcidId || '',
        scopusId: formData.scopusId || '',
        linkedIn: formData.linkedIn || '',
        website: formData.website || '',
        institutionalWebsite: formData.institutionalWebsite || '',
        specializations: formData.specializations || []
      })
      setSuccess('Profile updated successfully.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      console.error(err)
      setError('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const calculateChristExp = (doj) => {
    if (!doj) return 'N/A'
    const joinDate = new Date(doj)
    const now = new Date()
    let diff = (now - joinDate) / (1000 * 60 * 60 * 24 * 365.25)
    return diff > 0 ? diff.toFixed(1) + ' Years' : '0 Years'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-4">
        <Link to="/faculty-entry" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <span>&larr;</span> Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-2xl">
              {formData.facName ? formData.facName.charAt(0).toUpperCase() : 'F'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formData.facName}</h1>
              <p className="text-sm text-gray-500">{formData.facDesig}</p>
              <p className="text-sm font-medium text-indigo-600">{formData.facEmail}</p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'contributions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Contributions Summary
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            ✓ {success}
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Experience Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Joining (CHRIST)</label>
                  <DateInput  name="facDOJ" value={formData.facDOJ || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CHRIST Experience</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600 font-medium">
                    {calculateChristExp(formData.facDOJ)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Experience Outside (Years)</label>
                  <input type="number" step="0.1" name="facExpOutside" value={formData.facExpOutside || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <select name="facGender" value={formData.facGender || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <DateInput  name="facDOB" value={formData.facDOB || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                  <input type="text" name="facMob" value={formData.facMob || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Personal Email</label>
                  <input type="email" name="facPEmail" value={formData.facPEmail || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input type="text" name="facCity" value={formData.facCity || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temporary Address</label>
                  <textarea name="facTAddress" rows={2} value={formData.facTAddress || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
                  <textarea name="facPAddress" rows={2} value={formData.facPAddress || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Professional IDs & Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ORCID iD</label>
                  <input type="text" name="orcidId" value={formData.orcidId || ''} onChange={handleInputChange} placeholder="0000-0000-0000-0000" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SCOPUS ID</label>
                  <input type="text" name="scopusId" value={formData.scopusId || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">LinkedIn Profile URL</label>
                  <input type="url" name="linkedIn" value={formData.linkedIn || ''} onChange={handleInputChange} placeholder="https://linkedin.com/in/..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Individual Website</label>
                  <input type="url" name="website" value={formData.website || ''} onChange={handleInputChange} placeholder="https://" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Institutional Website (Profile)</label>
                  <input type="url" name="institutionalWebsite" value={formData.institutionalWebsite || ''} onChange={handleInputChange} placeholder="https://" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Specializations</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Press Enter or Comma to add)</label>
                <TagsInput 
                  tags={formData.specializations || []} 
                  onChange={(newTags) => setFormData(prev => ({ ...prev, specializations: newTags }))} 
                  placeholder="e.g. Machine Learning, Cloud Computing"
                />
              </div>
            </section>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'contributions' && (
          <div>
            <p className="text-sm text-gray-500 mb-6">Year-wise summary of your contributions submitted in the portal. UGC CARE publications are categorized as Non-Indexed.</p>
            
            {Object.keys(contributions).length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-500 font-medium">No contributions found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Academic Year</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Pubs (Indexed)</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Pubs (Non-Indexed)</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">IPR</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Presentations</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Participations</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Achievements</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.keys(contributions).sort((a,b) => b.localeCompare(a)).map(year => (
                      <tr key={year} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600">{contributions[year].publicationsIndexed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-400">{contributions[year].publicationsNonIndexed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-purple-600">{contributions[year].iprOutcomes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-emerald-600">{contributions[year].presentations}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-amber-600">{contributions[year].participations}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-rose-600">{contributions[year].achievements}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
