'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Menu, X, User } from 'lucide-react'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const { user } = useUser()

  const menuItems = [
    { name: 'Beranda', href: '/', active: false },
    { name: 'Berita', href: '/berita', active: false },
    { name: 'Pengingat', href: '/pengingat', active: false },
  ]

  const handleNavigation = (href: string) => {
    router.push(href)
    setIsMenuOpen(false)
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-blue-600">PRIMA</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  item.active
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {item.name}
              </button>
            ))}
            
            {/* Desktop Auth Button */}
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Hi, {user.fullName || user.primaryEmailAddress?.emailAddress}</span>
                <button
                  onClick={() => handleNavigation('/dashboard')}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
                >
                  Dashboard
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavigation('/sign-in')}
                className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
              >
                Masuk
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`block w-full text-left px-3 py-2 text-base font-medium transition-colors duration-200 ${
                    item.active
                      ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </button>
              ))}
              
              {/* Mobile Auth Button */}
              {user ? (
                <div className="mt-4 space-y-2">
                  <p className="text-center text-sm text-gray-600">Hi, {user.fullName || user.primaryEmailAddress?.emailAddress}</p>
                  <button
                    onClick={() => handleNavigation('/dashboard')}
                    className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg text-base font-medium hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
                  >
                    Dashboard
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleNavigation('/sign-in')}
                  className="w-full mt-4 bg-blue-500 text-white px-4 py-3 rounded-lg text-base font-medium hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
                >
                  Masuk
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}