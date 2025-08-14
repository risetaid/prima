'use client';
import { useRouter } from 'next/navigation';
import { Bell, BarChart3, HelpCircle, Plus } from 'lucide-react';
import { useCallback, memo } from 'react';
function DashboardClient() {
    const router = useRouter();
    const handlePengingatClick = useCallback(() => {
        router.push('/pengingat');
    }, [router]);
    const handleStatistikClick = useCallback(() => {
        router.push('/statistik');
    }, [router]);
    const handleTutorialClick = useCallback(() => {
        router.push('/tutorial');
    }, [router]);
    return (<>
      {/* Main Feature Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Pengingat Card */}
        <div onClick={handlePengingatClick} className="bg-blue-500 text-white rounded-xl p-4 text-center shadow-lg cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95">
          <div className="rounded-lg p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
            <Bell className="w-8 h-8 text-white"/>
          </div>
          <h3 className="font-semibold text-sm">Pengingat</h3>
        </div>

        {/* Statistik Card */}
        <div onClick={handleStatistikClick} className="bg-blue-500 text-white rounded-xl p-4 text-center shadow-lg cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95">
          <div className="rounded-lg p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
            <BarChart3 className="w-8 h-8 text-white"/>
          </div>
          <h3 className="font-semibold text-sm">Statistik</h3>
        </div>

        {/* Tutorial Card */}
        <div onClick={handleTutorialClick} className="bg-blue-500 text-white rounded-xl p-4 text-center shadow-lg cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95">
          <div className="rounded-lg p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
            <HelpCircle className="w-8 h-8 text-white"/>
          </div>
          <h3 className="font-semibold text-sm">Tutorial</h3>
        </div>
      </div>

      {/* Status Badge */}
      <div className="bg-blue-500 text-white rounded-full px-6 py-2 text-center mb-6 shadow-lg">
        <span className="font-medium">8 pasien dalam pengawasan</span>
      </div>

      {/* Daftar Pasien Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Daftar Pasien</h2>
          <div className="bg-blue-500 rounded-full p-2">
            <Plus className="w-6 h-6 text-white"/>
          </div>
        </div>

        {/* Patient List */}
        <div className="space-y-3">
          {/* Maria Indriani */}
          <div className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">MI</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Maria Indriani</h3>
                <p className="text-sm text-gray-500">Kepatuhan: 95%</p>
              </div>
            </div>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Tinggi
            </span>
          </div>

          {/* Siti Hartini */}
          <div className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">SH</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Siti Hartini</h3>
                <p className="text-sm text-gray-500">Kepatuhan: 75%</p>
              </div>
            </div>
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              Sedang
            </span>
          </div>

          {/* Yani Susanti */}
          <div className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">YS</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Yani Susanti</h3>
                <p className="text-sm text-gray-500">Kepatuhan: 45%</p>
              </div>
            </div>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              Rendah
            </span>
          </div>

          {/* Agus Setiawan */}
          <div className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">AS</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Agus Setiawan</h3>
                <p className="text-sm text-gray-500">Kepatuhan: 100%</p>
              </div>
            </div>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Tinggi
            </span>
          </div>
        </div>
      </div>
    </>);
}
export default memo(DashboardClient);
