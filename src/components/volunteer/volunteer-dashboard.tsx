'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageSquare,
  User,
  Phone,
  Calendar
} from 'lucide-react';

interface VolunteerNotification {
  id: string;
  patientId: string;
  message: string;
  priority: string;
  status: string;
  escalationReason: string;
  confidence?: number;
  intent?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patientContext?: any;
  respondedAt?: string;
  response?: string;
  createdAt: string;
  updatedAt: string;
  patient?: {
    name: string;
    phoneNumber: string;
    assignedVolunteerId?: string;
  };
  assignedVolunteer?: {
    name: string;
  };
}

interface DashboardStats {
  total: number;
  pending: number;
  emergency: number;
  high: number;
  avgResponseTime: number;
}

export function VolunteerDashboard() {
  const [notifications, setNotifications] = useState<VolunteerNotification[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<VolunteerNotification | null>(null);
  const [response, setResponse] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/volunteer/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/volunteer/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleAssign = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/volunteer/notifications/${notificationId}/assign`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to assign notification:', error);
    }
  };

  const handleRespond = async () => {
    if (!selectedNotification || !response.trim()) return;

    setResponding(true);
    try {
      const apiResponse = await fetch(`/api/volunteer/notifications/${selectedNotification.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
      });

      if (apiResponse.ok) {
        setSelectedNotification(null);
        setResponse('');
        await loadNotifications();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to respond to notification:', error);
    } finally {
      setResponding(false);
    }
  };

  const handleResolve = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/volunteer/notifications/${notificationId}/resolve`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadNotifications();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to resolve notification:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-500';
      case 'assigned':
        return 'bg-purple-500';
      case 'responded':
        return 'bg-green-500';
      case 'resolved':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'emergency_detection':
        return 'Deteksi Darurat';
      case 'low_confidence':
        return 'Respons Tidak Yakin';
      case 'complex_inquiry':
        return 'Pertanyaan Kompleks';
      default:
        return reason;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Volunteer</h1>
        <Button onClick={() => { loadNotifications(); loadStats(); }}>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notifikasi</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Darurat</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.emergency}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prioritas Tinggi</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Response</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponseTime} menit</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Menunggu ({notifications.filter(n => n.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="assigned">Ditugaskan ({notifications.filter(n => n.status === 'assigned').length})</TabsTrigger>
          <TabsTrigger value="responded">Direspons ({notifications.filter(n => n.status === 'responded').length})</TabsTrigger>
          <TabsTrigger value="all">Semua ({notifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <NotificationList
            notifications={notifications.filter(n => n.status === 'pending')}
            onSelect={setSelectedNotification}
            onAssign={handleAssign}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
            getReasonText={getReasonText}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          <NotificationList
            notifications={notifications.filter(n => n.status === 'assigned')}
            onSelect={setSelectedNotification}
            onResolve={handleResolve}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
            getReasonText={getReasonText}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="responded" className="space-y-4">
          <NotificationList
            notifications={notifications.filter(n => n.status === 'responded')}
            onSelect={setSelectedNotification}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
            getReasonText={getReasonText}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <NotificationList
            notifications={notifications}
            onSelect={setSelectedNotification}
            onAssign={handleAssign}
            onResolve={handleResolve}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
            getReasonText={getReasonText}
            formatDate={formatDate}
          />
        </TabsContent>
      </Tabs>

      {/* Response Modal */}
      {selectedNotification && (
        <Card className="fixed inset-4 z-50 bg-white border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Respons Notifikasi</span>
              <Button
                variant="ghost"
                onClick={() => setSelectedNotification(null)}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Pasien</label>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{selectedNotification.patient?.name || 'Unknown'}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">No. HP</label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{selectedNotification.patient?.phoneNumber || 'Unknown'}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Pesan Pasien</label>
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>{selectedNotification.message}</AlertDescription>
              </Alert>
            </div>

            <div>
              <label className="text-sm font-medium">Alasan Eskalasi</label>
              <Badge variant="outline">{getReasonText(selectedNotification.escalationReason)}</Badge>
              {selectedNotification.confidence && (
                <span className="ml-2 text-sm text-gray-600">
                  Keyakinan: {selectedNotification.confidence}%
                </span>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Respons Anda</label>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Ketik respons Anda di sini..."
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedNotification(null)}
              >
                Batal
              </Button>
              <Button
                onClick={handleRespond}
                disabled={responding || !response.trim()}
              >
                {responding ? 'Mengirim...' : 'Kirim Respons'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface NotificationListProps {
  notifications: VolunteerNotification[];
  onSelect: (notification: VolunteerNotification) => void;
  onAssign?: (id: string) => void;
  onResolve?: (id: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
  getReasonText: (reason: string) => string;
  formatDate: (date: string) => string;
}

function NotificationList({
  notifications,
  onSelect,
  onAssign,
  onResolve,
  getPriorityColor,
  getStatusColor,
  getReasonText,
  formatDate,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-gray-500">Tidak ada notifikasi</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card key={notification.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge className={`${getPriorityColor(notification.priority)} text-white`}>
                    {notification.priority.toUpperCase()}
                  </Badge>
                  <Badge className={`${getStatusColor(notification.status)} text-white`}>
                    {notification.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {getReasonText(notification.escalationReason)}
                  </Badge>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{notification.patient?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>{notification.patient?.phoneNumber || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(notification.createdAt)}</span>
                  </div>
                </div>

                <p className="text-gray-800">{notification.message}</p>

                {notification.response && (
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-sm font-medium text-green-800">Respons Anda:</p>
                    <p className="text-green-700">{notification.response}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => onSelect(notification)}
                >
                  {notification.status === 'responded' ? 'Lihat' : 'Respons'}
                </Button>

                {onAssign && notification.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAssign(notification.id)}
                  >
                    Ambil
                  </Button>
                )}

                {onResolve && notification.status === 'assigned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve(notification.id)}
                  >
                    Selesai
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}