'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminUsersTableSkeleton } from '@/components/ui/dashboard-skeleton'
import { CheckCircle, XCircle, Clock, User, Mail, Calendar, Crown, UserCheck, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  clerkId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: 'SUPERADMIN' | 'ADMIN' | 'MEMBER'
  isActive: boolean
  isApproved: boolean
  createdAt: string
  approvedAt: string | null
  approver?: {
    firstName: string | null
    lastName: string | null
    email: string
  } | null
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // Fetch both users list and current user info
      const [usersResponse, profileResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/user/profile')
      ])
      
      const usersData = await usersResponse.json()
      const profileData = await profileResponse.json()
      
      if (usersData.success) {
        setUsers(usersData.users)
      } else {
        toast.error('Failed to fetch users')
      }
      
      if (profileResponse.ok && profileData.id) {
        setCurrentUser(profileData)
      }
      
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
        fetchUsers() // Refresh the list
      } else {
        toast.error(data.error || `Failed to ${action} user`)
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error)
      toast.error(`Failed to ${action} user`)
    } finally {
      setActionLoading(null)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`)
        fetchUsers()
      } else {
        toast.error(data.error || 'Failed to update user status')
      }
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast.error('Failed to update user status')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleUserRole = async (user: User, currentRole: 'SUPERADMIN' | 'ADMIN' | 'MEMBER') => {
    try {
      setActionLoading(user.id)
      
      // Prevent Superadmin from demoting themselves
      if (currentUser?.id === user.id && currentRole === 'SUPERADMIN') {
        toast.error('Tidak dapat demote diri sendiri sebagai Superadmin')
        return
      }
      
      // Option B: Smart role cycling based on hierarchy
      // Priority: Always allow promotion up, and demotion down
      let newRole: 'SUPERADMIN' | 'ADMIN' | 'MEMBER'
      
      if (currentRole === 'MEMBER') {
        // MEMBER can only go up to ADMIN
        newRole = 'ADMIN'
      } else if (currentRole === 'ADMIN') {
        // ADMIN can go up to SUPERADMIN or down to MEMBER
        // Default to promotion (up), but we'll add separate demotion button
        newRole = 'SUPERADMIN'  
      } else { // currentRole === 'SUPERADMIN'
        // SUPERADMIN can go down to ADMIN (gradual demotion)
        newRole = 'ADMIN'
      }
      const response = await fetch(`/api/admin/users/${user.clerkId}/toggle-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`User role updated to ${newRole} successfully`)
        fetchUsers()
      } else {
        toast.error(data.error || 'Failed to update user role')
      }
    } catch (error) {
      console.error('Error toggling user role:', error)
      toast.error('Failed to update user role')
    } finally {
      setActionLoading(null)
    }
  }

  const demoteUserRole = async (user: User, targetRole: 'ADMIN' | 'MEMBER') => {
    try {
      setActionLoading(user.id)
      
      // Prevent Superadmin from demoting themselves
      if (currentUser?.id === user.id && user.role === 'SUPERADMIN') {
        toast.error('Tidak dapat demote diri sendiri sebagai Superadmin')
        return
      }
      
      const response = await fetch(`/api/admin/users/${user.clerkId}/toggle-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: targetRole })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`User demoted to ${targetRole} successfully`)
        fetchUsers()
      } else {
        toast.error(data.error || 'Failed to demote user')
      }
    } catch (error) {
      console.error('Error demoting user role:', error)
      toast.error('Failed to demote user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleClerkSync = useCallback(async () => {
    if (syncing) return // Prevent multiple simultaneous syncs
    
    try {
      setSyncing(true)
      
      const response = await fetch('/api/admin/sync-clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      
      if (data.success) {
        const { results } = data
        const messages = []
        
        if (results.created > 0) messages.push(`${results.created} user baru`)
        if (results.updated > 0) messages.push(`${results.updated} user diperbarui`)
        if (results.reactivated > 0) messages.push(`${results.reactivated} user diaktifkan kembali`)
        if (results.deactivated > 0) messages.push(`${results.deactivated} user dinonaktifkan`)
        
        const summary = messages.length > 0 ? messages.join(', ') : 'Tidak ada perubahan'
        
        toast.success('Sync Clerk berhasil', {
          description: `Sinkronisasi selesai: ${summary}`
        })
        
        // Refresh user list
        fetchUsers()
      } else {
        toast.error('Sync Clerk gagal', {
          description: data.error || 'Terjadi kesalahan pada server'
        })
      }
    } catch (error) {
      console.error('Error syncing with Clerk:', error)
      toast.error('Sync Clerk gagal', {
        description: 'Terjadi kesalahan jaringan'
      })
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    // Auto-sync when Admin Panel opens
    const autoSync = setTimeout(() => {
      handleClerkSync()
    }, 1000) // Delay 1 second after initial load

    return () => clearTimeout(autoSync)
  }, [handleClerkSync])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (user: User) => {
    if (!user.isApproved) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs whitespace-nowrap">
        <span className="sm:hidden">⏳</span> <span>Menunggu Persetujuan</span>
      </Badge>
    }
    if (!user.isActive) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs whitespace-nowrap">
        <span className="sm:hidden">❌</span> <span>Tidak Aktif</span>
      </Badge>
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs whitespace-nowrap">
      <span className="sm:hidden">✅</span> <span>Aktif</span>
    </Badge>
  }

  const getRoleBadge = (role: string) => {
    if (role === 'SUPERADMIN') {
      return (
        <Badge variant="default" className="text-xs whitespace-nowrap bg-purple-600 hover:bg-purple-700">
          <span className="sm:hidden">⭐</span> <span>Superadmin</span>
        </Badge>
      )
    } else if (role === 'ADMIN') {
      return (
        <Badge variant="default" className="text-xs whitespace-nowrap bg-blue-600 hover:bg-blue-700">
          <span className="sm:hidden">👑</span> <span>Admin</span>
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          <span className="sm:hidden">👤</span> <span>Member</span>
        </Badge>
      )
    }
  }

  if (loading) {
    return <AdminUsersTableSkeleton />
  }

  const pendingUsers = users.filter(user => !user.isApproved)
  // const approvedUsers = users.filter(user => user.isApproved) // Not currently used

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <span>Sinkronisasi Clerk</span>
            </CardTitle>
            <Button
              onClick={handleClerkSync}
              disabled={syncing}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 cursor-pointer text-xs sm:text-sm px-3 py-2"
            >
              {syncing ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span>Sync Manual</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Sinkronisasi otomatis dijalankan saat panel dibuka. Gunakan tombol sync manual jika diperlukan untuk memastikan konsistensi data antara Clerk dan database PRIMA.
          </p>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              <span className="hidden sm:inline">Pending Approvals ({pendingUsers.length})</span>
              <span className="sm:hidden">Menunggu Persetujuan ({pendingUsers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Unnamed User'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 sm:mt-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="hidden sm:inline">Registered: </span><span className="sm:hidden">Daftar: </span>{formatDate(user.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 sm:flex-shrink-0">
                    <div className="flex justify-center sm:justify-start">
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleApproval(user.id, 'approve')}
                        disabled={actionLoading === user.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 cursor-pointer flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">Approve</span>
                            <span className="sm:hidden">Setuju</span>
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleApproval(user.id, 'reject')}
                        disabled={actionLoading === user.id}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50 cursor-pointer flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">Reject</span>
                            <span className="sm:hidden">Tolak</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="hidden sm:inline">All Users ({users.length})</span>
            <span className="sm:hidden">Semua Pengguna ({users.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Unnamed User'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1 mt-0.5 sm:mt-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="hidden sm:inline">Joined: </span><span className="sm:hidden">Bergabung: </span>{formatDate(user.createdAt)}
                      {user.approvedAt && (
                        <span className="hidden sm:inline">
                          {` • Approved: ${formatDate(user.approvedAt)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 sm:flex-shrink-0">
                  <div className="flex flex-col justify-center sm:justify-start space-y-1 items-center sm:items-start">
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user)}
                  </div>
                  <div className="flex flex-col space-y-1.5 sm:flex-row sm:space-y-0 sm:space-x-2">
                    {/* Role Toggle Button */}
                    <Button
                      onClick={() => toggleUserRole(user, user.role)}
                      disabled={actionLoading === user.id || (currentUser?.id === user.id && user.role === 'SUPERADMIN')}
                      size="sm"
                      variant={user.role === 'MEMBER' ? 'outline' : 'default'}
                      title={currentUser?.id === user.id && user.role === 'SUPERADMIN' ? 'Tidak dapat demote diri sendiri' : 'Click untuk ganti role'}
                      className={`cursor-pointer text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap ${
                        user.role === 'SUPERADMIN' 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : user.role === 'ADMIN'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {actionLoading === user.id ? (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          {user.role === 'SUPERADMIN' ? (
                            <>
                              <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span className="hidden sm:inline">↓ Admin</span>
                              <span className="sm:hidden">↓ Admin</span>
                            </>
                          ) : user.role === 'ADMIN' ? (
                            <>
                              <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span className="hidden sm:inline">↑ Superadmin</span>
                              <span className="sm:hidden">↑ Super</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span className="hidden sm:inline">↑ Admin</span>
                              <span className="sm:hidden">↑ Admin</span>
                            </>
                          )}
                        </>
                      )}
                    </Button>

                    {/* Demote Button - Only for ADMIN to demote to MEMBER */}
                    {user.role === 'ADMIN' && (
                      <Button
                        onClick={() => demoteUserRole(user, 'MEMBER')}
                        disabled={actionLoading === user.id || (currentUser?.id === user.id)}
                        size="sm"
                        variant="outline"
                        title="Demote to Member"
                        className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="hidden sm:inline">↓ Member</span>
                            <span className="sm:hidden">↓ Member</span>
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Status Toggle Button - Only for regular members */}
                    {user.role === 'MEMBER' && (
                      <Button
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                        disabled={actionLoading === user.id}
                        size="sm"
                        variant="outline"
                        className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="hidden sm:inline">{user.isActive ? 'Deactivate' : 'Activate'}</span>
                            <span className="sm:hidden">{user.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}