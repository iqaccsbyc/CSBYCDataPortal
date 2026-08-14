import React from 'react'

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all hover:shadow-2xl">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-8 py-10 text-white">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-2">
            About CS-BYC Data Portal
          </h1>
          <p className="text-indigo-100 text-lg font-medium opacity-90">
            A comprehensive information management system for academic excellence.
          </p>
        </div>

        <div className="p-8 sm:p-12 space-y-12 text-gray-700">
          {/* Portal By Section */}
          <section className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-indigo-500 rounded-full hidden sm:block"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Portal by
            </h2>
            <div className="space-y-1 pl-2 sm:pl-0">
              <p className="text-xl font-semibold text-gray-800">The Department of Computer Science</p>
              <p className="text-lg">CHRIST (Deemed to be University)</p>
              <p className="text-gray-600">Bangalore Yeshwanthpur Campus</p>
              <p className="text-gray-500 mt-2">Bengaluru - 560073, India</p>
            </div>
          </section>

          {/* Concept Section */}
          <section className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-violet-500 rounded-full hidden sm:block"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-6.364l-.707-.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M12 13a3 3 0 110-6 3 3 0 010 6z" />
              </svg>
              Concept and Development
            </h2>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <p className="text-xl font-bold text-indigo-900">Dr Balakrishnan C</p>
              <p className="text-gray-700 font-medium mt-1 text-lg">Associate Professor & Associate Head</p>
              <p className="text-gray-600">Department of Computer Science - BYC</p>
              <a
                href="mailto:balakrishnan.c@christuniversity.in"
                className="inline-flex items-center gap-2 mt-4 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                balakrishnan.c@christuniversity.in
              </a>
            </div>
          </section>

          {/* Copyright Section */}
          <footer className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-400">Copyright @ CS-BYC 2026-27</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-gray-100 rounded-full">v1.2.0</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
