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
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Approval</Badge>
    }
    if (!user.isActive) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
  }

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === 'ADMIN' ? 'default' : 'outline'}>
        {role === 'ADMIN' ? '👑 Admin' : '👤 Member'}
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
                <div key={user.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Registered: {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getRoleBadge(user.role)}
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleApproval(user.id, 'approve')}
                        disabled={actionLoading === user.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 cursor-pointer"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleApproval(user.id, 'reject')}
                        disabled={actionLoading === user.id}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
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
              <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Unnamed User'}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      Joined: {formatDate(user.createdAt)}
                      {user.approvedAt && ` • Approved: ${formatDate(user.approvedAt)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getRoleBadge(user.role)}
                  {getStatusBadge(user)}
                  {user.role !== 'ADMIN' && (
                    <Button
                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                      disabled={actionLoading === user.id}
                      size="sm"
                      variant="outline"
                      className="cursor-pointer"
                    >
                      {actionLoading === user.id ? (
                        <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        user.isActive ? 'Deactivate' : 'Activate'
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