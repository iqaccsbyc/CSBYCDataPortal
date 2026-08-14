import Navbar from './Navbar'

/**
 * Global layout wrapper — renders the Navbar at the top and
 * the page content below it. Applied to every route except /login.
 */
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
