'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft, Users, Calendar, FileText, Phone, Heart } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  const quickLinks = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard Utama',
      description: 'Kembali ke beranda sistem PRIMA'
    },
    {
      href: '/dashboard/pasien',
      icon: Users,
      label: 'Data Pasien',
      description: 'Kelola data pasien kanker paliatif'
    },
    {
      href: '/dashboard/pengingat',
      icon: Calendar,
      label: 'Pengingat Obat',
      description: 'Atur jadwal dan pengingat medikasi'
    },
    {
      href: '/dashboard/cms',
      icon: FileText,
      label: 'Konten Edukasi',
      description: 'Artikel dan video untuk pasien'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Healthcare Pattern Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
        {/* Medical Cross Pattern */}
        <div className="absolute top-20 left-20 text-blue-100 opacity-30">
          <Heart className="h-16 w-16" />
        </div>
        <div className="absolute bottom-32 right-32 text-green-100 opacity-30">
          <Heart className="h-12 w-12" />
        </div>
        <div className="absolute top-1/3 right-20 text-red-100 opacity-20">
          <Heart className="h-20 w-20" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-4xl font-bold text-white">404</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-400 rounded-full flex items-center justify-center">
                  <Heart className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Halaman Tidak Ditemukan
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Maaf, halaman yang Anda cari tidak tersedia di sistem PRIMA
            </p>
            <p className="text-lg text-gray-500">
              Sistem Monitoring Paliatif untuk Pasien Kanker
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                onClick={() => router.back()}
                variant="outline" 
                size="lg"
                className="bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Kembali ke Halaman Sebelumnya
              </Button>
              <Button asChild size="lg">
                <Link href="/dashboard">
                  <Home className="h-5 w-5 mr-2" />
                  Dashboard Utama
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <Card key={link.href} className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span>{link.label}</span>
                    </CardTitle>
                    <CardDescription>
                      {link.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={link.href}>
                        Buka {link.label}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Healthcare Context */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-red-500" />
                Tentang Sistem PRIMA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                <strong>Palliative Remote Integrated Monitoring Assistant (PRIMA)</strong> adalah sistem 
                monitoring terintegrasi untuk membantu relawan kesehatan dalam merawat pasien kanker paliatif. 
                Sistem ini menyediakan:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Manajemen data pasien dan riwayat medis
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  Sistem pengingat obat otomatis via WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  Konten edukasi kesehatan untuk pasien dan keluarga
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-orange-500" />
                  Komunikasi terintegrasi dengan platform messaging
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Support Footer */}
          <div className="text-center mt-12 p-6 bg-white/50 rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-2">
              Masih mengalami kesulitan? Hubungi tim support untuk bantuan lebih lanjut.
            </p>
            <p className="text-sm text-gray-500">
              Sistem PRIMA - Membantu Perawatan Paliatif dengan Teknologi
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}