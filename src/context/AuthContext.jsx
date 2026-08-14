import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc } from 'firebase/firestore'
import { getDocEncrypted as getDoc } from '../firebase/encryptedStore'
import { decryptData } from '../utils/encryption'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [facId, setFacId] = useState(null)
  const [deptCode, setDeptCode] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.email))
          if (userDoc.exists()) {
            const rawData = userDoc.data()
            const data = decryptData(rawData)
            setUser(firebaseUser)
            const rawRoles = data.roles || (data.role ? [data.role] : [])
            const rolesArray = Array.isArray(rawRoles) ? rawRoles : [rawRoles]
            const roles = rolesArray.map(r => typeof r === 'string' ? decryptData(r) : r)
            setUserRoles(roles)
            setFacId(data.facId ? (typeof data.facId === 'string' ? decryptData(data.facId) : data.facId) : null)
            setDeptCode(data.deptCode ? (typeof data.deptCode === 'string' ? decryptData(data.deptCode) : data.deptCode) : null)
          } else {
            await signOut(auth)
            setUser(null)
            setUserRoles([])
            setFacId(null)
            setDeptCode(null)
          }
        } catch {
          setUser(null)
          setUserRoles([])
          setFacId(null)
          setDeptCode(null)
        }
      } else {
        setUser(null)
        setUserRoles([])
        setFacId(null)
        setDeptCode(null)
      }
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, userRoles, facId, deptCode, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
