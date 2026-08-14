import { useEffect, useState, useRef } from 'react'
import christLogo from '../assets/christ_logo.png'
import christCrest from '../assets/christ_crest.png'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  // Campus roles
  admin:                  'Admin (App)',
  director:               'Director',
  assocdirector:          'Assoc. Director',
  campusadmin:            'Campus Admin',
  dean:                   'Dean',
  assocdean:              'Assoc. Dean',
  campusiqaccoordinator:  'Campus IQAC Coord.',
  campusiqaccoreteam:     'Campus IQAC Core',
  deansoffice:            "Dean's Office",
  campusalumniteam:       'Campus Alumni Team',
  // Department roles
  hod:                    'HoD',
  assochod:               'Assoc. HoD',
  coordinator:            'Coordinator',
  deptiqaccoordinator:    'Dept IQAC Coord.',
  deptiqaccoreteam:       'Dept IQAC Core',
  adminassist:            'Secretary',
  studentcounsellor:      'Student Counsellor',
  deptalumniteam:         'Dept Alumni Team',
  // Individual
  faculty:                'Faculty',
}

const ROLE_COLORS = {
  // Campus roles
  admin:                  'bg-red-100 text-red-800',
  director:               'bg-rose-100 text-rose-800',
  assocdirector:          'bg-pink-100 text-pink-800',
  campusadmin:            'bg-red-50 text-red-700',
  dean:                   'bg-orange-100 text-orange-800',
  assocdean:              'bg-amber-100 text-amber-800',
  campusiqaccoordinator:  'bg-violet-100 text-violet-800',
  campusiqaccoreteam:     'bg-purple-100 text-purple-800',
  deansoffice:            'bg-orange-50 text-orange-700',
  campusalumniteam:       'bg-teal-50 text-teal-700',
  // Department roles
  hod:                    'bg-yellow-100 text-yellow-800',
  assochod:               'bg-lime-100 text-lime-800',
  coordinator:            'bg-green-100 text-green-800',
  deptiqaccoordinator:    'bg-teal-100 text-teal-800',
  deptiqaccoreteam:       'bg-cyan-100 text-cyan-800',
  adminassist:            'bg-pink-100 text-pink-800',
  studentcounsellor:      'bg-indigo-100 text-indigo-800',
  deptalumniteam:         'bg-emerald-100 text-emerald-800',
  // Individual
  faculty:                'bg-blue-100 text-blue-800',
}


const HOME_MENU = [
  { label: 'Home', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'About', path: '/about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
]

const FACULTY_MENU = [
  { label: 'Dashboard', path: '/faculty-entry', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { label: 'Publication Entry', path: '/faculty-entry/publication', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { label: 'Presentation Entry', path: '/faculty-entry/presentation', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
  { label: 'IPR Entry', path: '/faculty-entry/ipr-outcome', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  { label: 'Participation Entry', path: '/faculty-entry/participation', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Achievement Entry', path: '/faculty-entry/achievements', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { label: 'Project Entry', path: '/faculty-entry/project', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { label: 'Consultancy Entry', path: '/faculty-entry/consultancy', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { label: 'Financial Incentive', path: '/faculty-entry/incentive', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
]

const CAMPUS_ROLE_KEYS = ['admin','director','assocdirector','campusadmin','dean','assocdean','campusiqaccoordinator','campusiqaccoreteam','deansoffice']

const DEPARTMENT_MENU = [
  { label: 'Activity Entry', path: '/', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', auth: true },
  { label: 'Activity Abstract', path: '/abstract', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', auth: false },
  { label: 'Faculty Contribution Abstract', path: '/faculty-contribution-abstract', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', auth: false },
  { label: 'Placement Abstract', path: '/placement-abstract', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', auth: true },
  { label: 'Placement Entry', path: '/placement-entry', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', auth: true },
  { label: 'Manage Departments', path: '/manage-departments', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', auth: true, roles: CAMPUS_ROLE_KEYS },
  { label: 'Manage Faculty', path: '/manage-faculty', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', auth: true, roles: ['admin', 'hod', 'assochod', 'adminassist', ...CAMPUS_ROLE_KEYS] },
  { label: 'Manage Students', path: '/manage-students', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', auth: true, roles: ['admin', 'hod', 'assochod', 'coordinator', 'adminassist', 'faculty', ...CAMPUS_ROLE_KEYS] },
  { label: 'Manage PhD Scholars', path: '/manage-phd-scholars', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222', auth: true },
  { label: 'Manage Programmes', path: '/manage-programmes', icon: 'M12 14l9-5-9-5-9 5 9 5z', auth: true, roles: ['admin', 'hod', 'assochod', 'coordinator', 'adminassist', ...CAMPUS_ROLE_KEYS] },
  { label: 'Manage Classes', path: '/manage-classes', icon: 'M12 14l9-5-9-5-9 5 9 5z', auth: true, roles: ['admin', 'hod', 'assochod', 'coordinator', 'adminassist', 'faculty', ...CAMPUS_ROLE_KEYS] },
  { label: 'Disciplinary Report', path: '/disciplinary-report', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', auth: true },
  { label: 'Manage Documents', path: '/manage-documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', auth: true },
  { label: 'Industry Collaborators', path: '/manage-collaborators', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', auth: true },
  { label: 'Research Collaborators', path: '/manage-research-collaborators', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9', auth: true },
  { label: 'Task Management', path: '/manage-tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', auth: true },
  { label: 'Alumni Network', path: '/manage-alumni', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', auth: true },
]

const EXPLORE_MENU = [
  { label: 'Faculty Directory', path: '/explore/faculty-directory', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', auth: true }
]

export default function Navbar() {
  const { user, facId, userRoles } = useAuth()
  const [facName, setFacName] = useState('')
  const [homeDropdownOpen, setHomeDropdownOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false)
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileHomeOpen, setMobileHomeOpen] = useState(false)
  const [mobileFacultyOpen, setMobileFacultyOpen] = useState(false)
  const [mobileDeptOpen, setMobileDeptOpen] = useState(false)
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false)
  const homeDropdownRef = useRef(null)
  const dropdownRef = useRef(null)
  const deptDropdownRef = useRef(null)
  const exploreDropdownRef = useRef(null)
  const homeHoverTimeoutRef = useRef(null)
  const hoverTimeoutRef = useRef(null)
  const deptHoverTimeoutRef = useRef(null)
  const exploreHoverTimeoutRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!facId) return
    getDoc(doc(db, 'faculty', facId)).then((snap) => {
      if (snap.exists()) setFacName(snap.data().facName)
    })
  }, [facId])

  useEffect(() => {
    function handleClickOutside(event) {
      if (homeDropdownRef.current && !homeDropdownRef.current.contains(event.target)) {
        setHomeDropdownOpen(false)
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) {
        setDeptDropdownOpen(false)
      }
      if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(event.target)) {
        setExploreDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setHomeDropdownOpen(false)
    setDropdownOpen(false)
    setDeptDropdownOpen(false)
    setExploreDropdownOpen(false)
    setMobileMenuOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await signOut(auth)
    navigate('/login')
  }

  const isFacultyEntryActive = FACULTY_MENU.some(m => location.pathname === m.path)
  const isDeptEntryActive = DEPARTMENT_MENU.some(m => location.pathname === m.path)
  const isExploreActive = EXPLORE_MENU.some(m => location.pathname === m.path)

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            {/* Logo + Portal Name */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img
                src={christLogo}
                alt="CHRIST University Logo"
                className="hidden md:block h-9 w-auto object-contain"
              />
              <span className="text-base font-bold text-indigo-700 tracking-tight leading-tight">
                <span className="block text-sm font-bold text-indigo-700">CS-BYC Data Portal</span>
                <span className="hidden md:block text-xs font-normal text-gray-400 leading-none">Dept. of Computer Science · CHRIST University</span>
              </span>
            </div>

            {/* Mobile Crest - Centered */}
            <div className="absolute left-1/2 -translate-x-1/2 md:hidden">
              <img
                src={christCrest}
                alt="Christ Crest"
                className="h-8 w-auto object-contain opacity-80"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex gap-6 items-center">
              <div 
                className="relative"
                ref={homeDropdownRef}
                onMouseEnter={() => {
                  if (homeHoverTimeoutRef.current) clearTimeout(homeHoverTimeoutRef.current)
                  setHomeDropdownOpen(true)
                }}
                onMouseLeave={() => {
                  homeHoverTimeoutRef.current = setTimeout(() => {
                    setHomeDropdownOpen(false)
                  }, 150)
                }}
              >
                <Link
                  to="/"
                  className={`text-sm font-medium flex items-center gap-1 transition-colors ${location.pathname === '/' || location.pathname === '/about' ? 'text-indigo-700' : 'text-gray-600 hover:text-indigo-700'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                  <svg className={`w-4 h-4 transition-transform ${homeDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>

                {homeDropdownOpen && (
                  <div className="absolute top-full left-0 w-48 pt-1">
                    <div className="py-1 bg-white border border-gray-100 rounded-lg shadow-lg">
                    {HOME_MENU.map(item => {
                      const isActive = location.pathname === item.path
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                          </svg>
                          {item.label}
                        </Link>
                      )
                    })}
                    </div>
                  </div>
                )}
              </div>
              
              {user && (
                <div 
                  className="relative"
                  ref={dropdownRef}
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                    setDropdownOpen(true)
                  }}
                  onMouseLeave={() => {
                    hoverTimeoutRef.current = setTimeout(() => {
                      setDropdownOpen(false)
                    }, 150)
                  }}
                >
                  <Link 
                    to="/faculty-entry"
                    className={`text-sm font-medium flex items-center gap-1 transition-colors ${isFacultyEntryActive ? 'text-indigo-700' : 'text-gray-600 hover:text-indigo-700'}`}
                  >
                    Faculty
                    <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Link>

                  {dropdownOpen && (
                    <div className="absolute top-full left-0 w-56 pt-1">
                      <div className="py-1 bg-white border border-gray-100 rounded-lg shadow-lg">
                      {FACULTY_MENU.map(item => {
                        const isActive = location.pathname === item.path
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                            </svg>
                            {item.label}
                          </Link>
                        )
                      })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {user && (
                <div 
                  className="relative"
                  ref={deptDropdownRef}
                  onMouseEnter={() => {
                    if (deptHoverTimeoutRef.current) clearTimeout(deptHoverTimeoutRef.current)
                    setDeptDropdownOpen(true)
                  }}
                  onMouseLeave={() => {
                    deptHoverTimeoutRef.current = setTimeout(() => {
                      setDeptDropdownOpen(false)
                    }, 150)
                  }}
                >
                  <div className={`cursor-pointer text-sm font-medium flex items-center gap-1 transition-colors ${isDeptEntryActive ? 'text-indigo-700' : 'text-gray-600 hover:text-indigo-700'}`}>
                    Department
                    <svg className={`w-4 h-4 transition-transform ${deptDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {deptDropdownOpen && (
                    <div className="absolute top-full left-0 w-64 pt-1">
                      <div className="py-1 bg-white border border-gray-100 rounded-lg shadow-lg">
                      {DEPARTMENT_MENU.filter(item => {
                        if (!item.auth) return true;
                        if (!user) return false;
                        if (item.roles && (!userRoles || !item.roles.some(r => userRoles.includes(r)))) return false;
                        return true;
                      }).map(item => {
                        const isActive = location.pathname === item.path
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                            </svg>
                            {item.label}
                          </Link>
                        )
                      })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {user && (
                <div 
                  className="relative"
                  ref={exploreDropdownRef}
                  onMouseEnter={() => {
                    if (exploreHoverTimeoutRef.current) clearTimeout(exploreHoverTimeoutRef.current)
                    setExploreDropdownOpen(true)
                  }}
                  onMouseLeave={() => {
                    exploreHoverTimeoutRef.current = setTimeout(() => {
                      setExploreDropdownOpen(false)
                    }, 150)
                  }}
                >
                  <div className={`cursor-pointer text-sm font-medium flex items-center gap-1 transition-colors ${isExploreActive ? 'text-indigo-700' : 'text-gray-600 hover:text-indigo-700'}`}>
                    Explore
                    <svg className={`w-4 h-4 transition-transform ${exploreDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {exploreDropdownOpen && (
                    <div className="absolute top-full left-0 w-56 pt-1">
                      <div className="py-1 bg-white border border-gray-100 rounded-lg shadow-lg">
                      {EXPLORE_MENU.map(item => {
                        const isActive = location.pathname === item.path
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                            </svg>
                            {item.label}
                          </Link>
                        )
                      })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {facName && (
              <span className="text-sm text-gray-700 font-medium hidden md:block">
                {facName}
              </span>
            )}
            {userRoles && userRoles.length > 0 && (
              <div className="hidden sm:flex gap-1">
                {userRoles.map(role => (
                  <span
                    key={role}
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ROLE_LABELS[role] ?? role}
                  </span>
                ))}
              </div>
            )}
            
            <div className="hidden sm:block">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                location.pathname !== '/login' && (
                  <Link
                    to="/login"
                    className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition-colors"
                  >
                    Login
                  </Link>
                )
              )}
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <div className="space-y-1">
              <div className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/' || location.pathname === '/about' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}>
                <Link to="/" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                <button onClick={() => setMobileHomeOpen(!mobileHomeOpen)} className="p-2 -mr-2">
                  <svg className={`w-4 h-4 transition-transform ${mobileHomeOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {mobileHomeOpen && (
                <div className="pl-4 space-y-1 pb-1">
                  {HOME_MENU.map(item => {
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                        </svg>
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {user && (
              <div className="space-y-1">
                <div className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${isFacultyEntryActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}>
                  <Link to="/faculty-entry" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    Faculty
                  </Link>
                  <button onClick={() => setMobileFacultyOpen(!mobileFacultyOpen)} className="p-2 -mr-2">
                    <svg className={`w-4 h-4 transition-transform ${mobileFacultyOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {mobileFacultyOpen && (
                  <div className="pl-4 space-y-1 pb-1">
                    {FACULTY_MENU.map(item => {
                      const isActive = location.pathname === item.path
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                          </svg>
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <div className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${isDeptEntryActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}>
                <div className="flex-1 cursor-pointer" onClick={() => setMobileDeptOpen(!mobileDeptOpen)}>
                  Department
                </div>
                <button onClick={() => setMobileDeptOpen(!mobileDeptOpen)} className="p-2 -mr-2">
                  <svg className={`w-4 h-4 transition-transform ${mobileDeptOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {mobileDeptOpen && (
                <div className="pl-4 space-y-1 pb-1">
                  {DEPARTMENT_MENU.filter(item => {
                    if (!item.auth) return true;
                    if (!user) return false;
                    if (item.roles && (!userRoles || !item.roles.some(r => userRoles.includes(r)))) return false;
                    return true;
                  }).map(item => {
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                        </svg>
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {user && (
              <div className="space-y-1">
                <div className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${isExploreActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}>
                  <div className="flex-1 cursor-pointer" onClick={() => setMobileExploreOpen(!mobileExploreOpen)}>
                    Explore
                  </div>
                  <button onClick={() => setMobileExploreOpen(!mobileExploreOpen)} className="p-2 -mr-2">
                    <svg className={`w-4 h-4 transition-transform ${mobileExploreOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {mobileExploreOpen && (
                  <div className="pl-4 space-y-1 pb-1">
                    {EXPLORE_MENU.map(item => {
                      const isActive = location.pathname === item.path
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                          </svg>
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <div className="px-4 space-y-3">
                {facName && <div className="text-sm font-medium text-gray-800">{facName}</div>}
                {userRoles && userRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {userRoles.map(role => (
                      <span key={role} className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[role] ?? role}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full text-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="px-4">
                <Link
                  to="/login"
                  className="block w-full text-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
