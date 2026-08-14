import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
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
            const data = userDoc.data()
            setUser(firebaseUser)
            const roles = data.roles || (data.role ? [data.role] : [])
            setUserRoles(roles)
            setFacId(data.facId)
            setDeptCode(data.deptCode || null)
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
