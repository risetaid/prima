'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, User, Mail, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: 'ADMIN' | 'MEMBER'
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
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      } else {
        toast.error('Failed to fetch users')
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
    return (
      <Badge variant={role === 'ADMIN' ? 'default' : 'outline'} className="text-xs whitespace-nowrap">
        <span className="sm:hidden">{role === 'ADMIN' ? '👑' : '👤'}</span> <span>{role === 'ADMIN' ? 'Administrator' : 'Member'}</span>
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const pendingUsers = users.filter(user => !user.isApproved)
  const approvedUsers = users.filter(user => user.isApproved)

  return (
    <div className="space-y-8">
      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending Approvals ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">
                        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="hidden sm:inline">Registered: </span>{formatDate(user.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <div className="flex justify-center sm:justify-start">
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleApproval(user.id, 'approve')}
                        disabled={actionLoading === user.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 cursor-pointer flex-1 sm:flex-none"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
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
                        className="border-red-300 text-red-700 hover:bg-red-50 cursor-pointer flex-1 sm:flex-none"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
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
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Unnamed User'}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="hidden sm:inline">Joined: </span>{formatDate(user.createdAt)}
                      {user.approvedAt && (
                        <span className="hidden sm:inline">
                          {` • Approved: ${formatDate(user.approvedAt)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <div className="flex flex-col justify-center sm:justify-start space-y-1 items-center sm:items-start">
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user)}
                  </div>
                  {user.role !== 'ADMIN' && (
                    <Button
                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                      disabled={actionLoading === user.id}
                      size="sm"
                      variant="outline"
                      className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3 py-1 whitespace-nowrap"
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}