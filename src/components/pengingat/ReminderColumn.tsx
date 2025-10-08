import { Calendar, Download, CheckSquare, Trash2, Clock } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  type: "article" | "video";
  thumbnailUrl?: string;
  url: string;
  excerpt?: string;
  videoUrl?: string;
  durationMinutes?: string;
  order?: number;
}

interface Reminder {
  id: string;
  scheduledTime: string;
  reminderDate: string;
  customMessage?: string;
  status: string;
  confirmationStatus?: string;
  sentAt?: string;
  confirmedAt?: string;
  attachedContent?: ContentItem[];
  manuallyConfirmed?: boolean;
}

interface ReminderColumnProps {
  type: "scheduled" | "pending" | "completed";
  reminders: Reminder[];
  count: number;
  deleteMode?: boolean;
  selectedReminders?: string[];
  onToggleDeleteMode?: () => void;
  onToggleReminderSelection?: (id: string) => void;
  onDeleteSelected?: () => void;
  onEditReminder?: (reminder: Reminder) => void;
  onPendingAction?: (id: string, action: "ya" | "tidak") => void;
}

const formatTime = (timeString?: string) => {
  if (!timeString || timeString === "null" || timeString === "undefined") {
    return "--:--";
  }
  return timeString;
};

const formatDate = (dateString?: string) => {
  if (!dateString || dateString === "null" || dateString === "undefined") {
    return "Tanggal tidak tersedia";
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Tanggal tidak valid";
  }

  const days = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  return `${days[date.getDay()]}, ${date.getDate()} ${
    months[date.getMonth()]
  } ${date.getFullYear()}`;
};

const renderReminderCard = (
  reminder: Reminder,
  showCheckbox = false,
  showActions = false,
  allowEdit = false,
  selectedReminders: string[] = [],
  onToggleReminderSelection?: (id: string) => void,
  onEditReminder?: (reminder: Reminder) => void,
  onPendingAction?: (id: string, action: "ya" | "tidak") => void
) => {
  const isPending = showActions;
  const cardBg = isPending
    ? "bg-white border border-gray-200"
    : "bg-blue-600";
  const textColor = isPending ? "text-gray-900" : "text-white";
  const timeColor = isPending ? "text-gray-600" : "text-white/90";
  const hasAutomatedConfirmation =
    reminder.confirmationStatus && reminder.confirmationStatus !== "PENDING";
  const isManuallyConfirmed = Boolean(reminder.manuallyConfirmed);
  const isLocked = isPending && (hasAutomatedConfirmation || isManuallyConfirmed);

  return (
    <div key={reminder.id} className="flex items-start space-x-3">
      {showCheckbox && (
        <div className="flex items-center pt-4">
          <input
            type="checkbox"
            checked={selectedReminders.includes(reminder.id)}
            onChange={() => onToggleReminderSelection?.(reminder.id)}
            className="w-4 h-4 text-blue-600 rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div
        className={`flex-1 ${cardBg} ${textColor} rounded-lg p-4 relative ${
          allowEdit && !showCheckbox && !showActions
            ? "cursor-pointer hover:bg-blue-700 transition-colors"
            : ""
        }`}
        onClick={() => {
          if (allowEdit && !showCheckbox && !showActions) {
            onEditReminder?.(reminder);
          }
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
             <h3 className={`font-semibold text-lg ${textColor}`}>
               {reminder.customMessage || "Pesan pengingat"}
             </h3>
            <p
              className={`text-sm ${
                isPending ? "text-gray-600" : "opacity-90"
              }`}
            >
              {formatDate(reminder.reminderDate)}
            </p>
          </div>
          <div className={`flex items-center ${timeColor}`}>
            <Clock className="w-4 h-4 mr-1" />
            <span className="font-semibold">
              {formatTime(reminder.scheduledTime)}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isLocked) {
                  onPendingAction?.(reminder.id, "ya");
                }
              }}
              className={`flex-1 text-white py-2 px-3 rounded text-sm font-medium transition-colors ${
                isLocked
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 cursor-pointer"
              }`}
              disabled={isLocked}
            >
              Ya
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isLocked) {
                  onPendingAction?.(reminder.id, "tidak");
                }
              }}
              className={`flex-1 text-white py-2 px-3 rounded text-sm font-medium transition-colors ${
                isLocked
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 cursor-pointer"
              }`}
              disabled={isLocked}
            >
              Tidak
            </button>
          </div>
        )}
        {showActions && isLocked && (
          <p className="mt-2 text-xs text-yellow-600">
            Pengingat sudah dikonfirmasi. Tidak perlu tindakan manual.
          </p>
        )}
      </div>
    </div>
  );
};

const renderSelesaiCard = (reminder: Reminder, index: number) => (
  <div
    key={`${reminder.id}-${reminder.status}-${index}`}
    className="bg-white border rounded-lg p-4"
  >
    <div className="flex justify-between items-start mb-2">
      <div>
         <h3 className="font-semibold text-gray-900">
           {reminder.customMessage || "Pesan pengingat"}
         </h3>
        <p className="text-sm text-gray-600">
          {formatDate(reminder.reminderDate)}
        </p>
        {reminder.confirmedAt && (
          <p className="text-xs text-gray-500 mt-1">
            Dikonfirmasi: {formatDate(reminder.confirmedAt)}
          </p>
        )}
      </div>
      <div className="flex items-center text-gray-600">
        <Clock className="w-4 h-4 mr-1" />
        <span className="font-semibold">
          {formatTime(reminder.scheduledTime)}
        </span>
      </div>
    </div>

    <div className="mt-3">
      {!reminder.confirmationStatus || reminder.confirmationStatus === null || reminder.confirmationStatus === undefined ? (
        <div className="bg-gray-500 text-white py-2 px-4 rounded text-center font-medium">
          Status tidak diketahui
        </div>
      ) : reminder.confirmationStatus === "CONFIRMED" ? (
        <div className="bg-green-500 text-white py-2 px-4 rounded text-center font-medium">
          Dikonfirmasi
        </div>
      ) : reminder.confirmationStatus === "MISSED" ? (
        <div className="bg-red-500 text-white py-2 px-4 rounded text-center font-medium">
          Belum Dikonfirmasi
        </div>
      ) : reminder.confirmationStatus === "PENDING" ? (
        <div className="bg-yellow-500 text-white py-2 px-4 rounded text-center font-medium">
          Menunggu Konfirmasi
        </div>
      ) : (
        <div className="bg-gray-500 text-white py-2 px-4 rounded text-center font-medium">
          Status tidak diketahui
        </div>
      )}
    </div>
  </div>
);

export function ReminderColumn({
  type,
  reminders,
  count,
  deleteMode = false,
  selectedReminders = [],
  onToggleDeleteMode,
  onToggleReminderSelection,
  onDeleteSelected,
  onEditReminder,
  onPendingAction,
}: ReminderColumnProps) {
  const getColumnConfig = () => {
    switch (type) {
      case "scheduled":
        return {
          icon: Calendar,
          title: "Terjadwal",
          showDeleteButton: true,
          showCheckbox: deleteMode,
          allowEdit: true,
          showActions: false,
        };
      case "pending":
        return {
          icon: Download,
          title: "Perlu Diperbarui",
          showDeleteButton: false,
          showCheckbox: false,
          allowEdit: false,
          showActions: true,
        };
      case "completed":
        return {
          icon: CheckSquare,
          title: "Selesai",
          showDeleteButton: false,
          showCheckbox: false,
          allowEdit: false,
          showActions: false,
        };
    }
  };

  const config = getColumnConfig();
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        {config.showDeleteButton && (
          <button
            onClick={onToggleDeleteMode}
            className={`p-1 hover:bg-white/20 rounded cursor-pointer transition-colors ${
              deleteMode ? "bg-white/20" : ""
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {!config.showDeleteButton && <div />}
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5" />
          <h2 className="font-semibold">{config.title}</h2>
          <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
            {isNaN(count) ? 0 : count}
          </span>
        </div>
        <div className="flex items-center space-x-2"></div>
      </div>

      <div className="p-4 space-y-3">
        {reminders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {type === "scheduled" && "Tidak ada pengingat terjadwal"}
            {type === "pending" && "Tidak ada pengingat yang perlu diperbarui"}
            {type === "completed" && "Tidak ada pengingat selesai"}
          </p>
        ) : (
          reminders.map((reminder, index) =>
            type === "completed"
              ? renderSelesaiCard(reminder, index)
              : renderReminderCard(
                  reminder,
                  config.showCheckbox,
                  config.showActions,
                  config.allowEdit,
                  selectedReminders,
                  onToggleReminderSelection,
                  onEditReminder,
                  onPendingAction
                )
          )
        )}
      </div>

      {deleteMode && selectedReminders.length > 0 && (
        <div className="p-4 bg-gray-50 border-t">
          <button
            onClick={onDeleteSelected}
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors font-medium cursor-pointer"
          >
            Hapus {selectedReminders?.length || 0} Pengingat
          </button>
        </div>
      )}
    </div>
  );
}
