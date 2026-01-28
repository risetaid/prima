# PRIMA Component Inventory

Complete catalog of all 94 React components in the PRIMA healthcare platform. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Table of Contents

- [Component Categories](#component-categories)
- [Admin Components](#admin-components)
- [Auth Components](#auth-components)
- [CMS Components](#cms-components)
- [Content Components](#content-components)
- [Dashboard Components](#dashboard-components)
- [Patient Components](#patient-components)
- [Pengingat (Reminder) Components](#pengingat-reminder-components)
- [Performance Components](#performance-components)
- [Provider Components](#provider-components)
- [Reminder Components](#reminder-components)
- [UI Components](#ui-components)
- [Volunteer Components](#volunteer-components)
- [Design System](#design-system)

---

## Component Categories

Components are organized by functional domain:

| Category    | Count | Purpose                              |
| ----------- | ----- | ------------------------------------ |
| Admin       | 10    | User and template management         |
| Auth        | 2     | Authentication and authorization     |
| CMS         | 7     | Content management system            |
| Content     | 2     | Public content display               |
| Dashboard   | 7     | Main dashboard views                 |
| Patient     | 16    | Patient management and profiles      |
| Pengingat   | 6     | Quick reminder creation (Indonesian) |
| Performance | 1     | Web vitals monitoring                |
| Provider    | 1     | App-level providers                  |
| Reminder    | 7     | Scheduled reminder management        |
| UI          | 28    | Reusable UI primitives               |
| Volunteer   | 1     | Volunteer-specific dashboard         |

---

## Admin Components

### template-management.tsx

Main template management interface for WhatsApp message templates.

**Props:** None (uses internal state)

**Features:**

- List all WhatsApp templates
- Create/edit/delete templates
- Template preview
- Variable placeholder management
- Category filtering

**Usage:**

```tsx
import TemplateManagement from "@/components/admin/template-management";

<TemplateManagement />;
```

---

### TemplateList.tsx

Display list of templates with pagination.

**Props:**

```typescript
{
  templates: Template[]
  onEdit: (template: Template) => void
  onDelete: (id: string) => void
  onPreview: (template: Template) => void
}
```

---

### TemplateForm.tsx

Form for creating/editing templates.

**Props:**

```typescript
{
  template?: Template  // undefined for create, defined for edit
  onSubmit: (data: TemplateFormData) => Promise<void>
  onCancel: () => void
}
```

**Features:**

- Variable detection `{variableName}`
- Real-time preview
- Validation (Zod schema)
- Category selection

---

### TemplateActions.tsx

Action buttons for template operations.

**Props:**

```typescript
{
  templateId: string
  onEdit: () => void
  onDelete: () => void
  onPreview: () => void
}
```

---

### TemplatePreviewModal.tsx

Preview template with variable substitution.

**Props:**

```typescript
{
  template: Template
  isOpen: boolean
  onClose: () => void
}
```

---

### user-management.tsx

Main user management interface for admins.

**Features:**

- List all users with roles
- Approve/reject pending users
- Update user roles and permissions
- Search and filter users
- Pagination

---

### UserList.tsx

Display list of users in table format.

**Props:**

```typescript
{
  users: User[]
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
  onEdit: (user: User) => void
}
```

---

### UserCard.tsx

User profile card with actions.

**Props:**

```typescript
{
  user: User
  onApprove?: () => void
  onEdit?: () => void
}
```

---

### UserActions.tsx

Action buttons for user operations.

**Props:**

```typescript
{
  userId: string
  isApproved: boolean
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
}
```

---

### lazy-components.tsx

Lazy loading wrapper for admin components.

**Features:**

- Code-splitting for admin routes
- Loading states
- Error boundaries

---

## Auth Components

### auth-loading.tsx

Loading indicator during authentication.

**Props:** None

**Features:**

- Centered spinner
- Branded loading message
- Suspense-compatible

**Usage:**

```tsx
<Suspense fallback={<AuthLoading />}>
  <ProtectedContent />
</Suspense>
```

---

### role-guard.tsx

Authorization guard for role-based access.

**Props:**

```typescript
{
  allowedRoles: ('ADMIN' | 'RELAWAN' | 'DEVELOPER')[]
  children: React.ReactNode
  fallback?: React.ReactNode
}
```

**Usage:**

```tsx
<RoleGuard allowedRoles={["ADMIN", "DEVELOPER"]}>
  <AdminPanel />
</RoleGuard>
```

---

## CMS Components

### article-actions.tsx

Action buttons for article operations.

**Props:**

```typescript
{
  articleId: string
  onEdit: () => void
  onDelete: () => void
  onPublish: () => void
}
```

---

### article-form-fields.tsx

Reusable form fields for article creation/editing.

**Props:**

```typescript
{
  control: Control<ArticleFormData>;
  errors: FieldErrors<ArticleFormData>;
}
```

**Fields:**

- Title (text input)
- Slug (auto-generated or manual)
- Excerpt (textarea)
- Content (Quill editor)
- Category (select)
- Tags (multi-input)
- Featured image (upload)
- SEO fields

---

### CMSContentItem.tsx

Individual content item card (article or video).

**Props:**

```typescript
{
  item: Article | Video
  type: 'article' | 'video'
  onEdit?: () => void
  onDelete?: () => void
}
```

**Features:**

- Thumbnail display
- Status badge (Draft/Published)
- Quick actions
- Excerpt preview

---

### CMSStatsCards.tsx

CMS statistics dashboard cards.

**Props:**

```typescript
{
  stats: {
    totalArticles: number;
    totalVideos: number;
    publishedContent: number;
    draftContent: number;
  }
}
```

---

### publish-settings.tsx

Publication settings panel.

**Props:**

```typescript
{
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt?: Date
  onStatusChange: (status: string) => void
  onPublishedAtChange: (date: Date) => void
}
```

---

### QuillEditor.tsx

Rich text editor wrapper for Quill.

**Props:**

```typescript
{
  value: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
}
```

**Features:**

- Full WYSIWYG editing
- Image upload support
- Format toolbar
- Markdown export

---

### thumbnail-upload.tsx

Image upload component for thumbnails.

**Props:**

```typescript
{
  value?: string
  onChange: (url: string) => void
  onRemove: () => void
}
```

**Features:**

- Drag-and-drop upload
- Image preview
- Validation (size, type)
- MinIO integration

---

## Content Components

### ContentHeader.tsx

Header for public content pages.

**Props:**

```typescript
{
  title: string
  category: string
  publishedAt: Date
  imageUrl?: string
}
```

---

### ShareButton.tsx

Social media share button.

**Props:**

```typescript
{
  url: string
  title: string
  description?: string
}
```

**Features:**

- WhatsApp share
- Copy link
- Facebook share (optional)

---

## Dashboard Components

### desktop-header.tsx

Desktop navigation header.

**Props:** None (uses auth context)

**Features:**

- User profile dropdown
- Role-based navigation
- Notification badge
- Search bar

---

### add-patient-dialog.tsx

Modal dialog for adding new patients.

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  onSuccess: (patient: Patient) => void
}
```

**Features:**

- Full patient form
- Phone normalization
- Photo upload
- Volunteer assignment

---

### instant-send-dialog.tsx

Dialog for instant reminder sending.

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  patientId?: string
}
```

---

### instant-send-section.tsx

Dashboard section for quick reminder actions.

**Props:**

```typescript
{
  onSendAll: () => void
  pendingCount: number
}
```

---

### mobile-navigation-buttons.tsx

Mobile bottom navigation.

**Props:** None

**Features:**

- Icon-based navigation
- Active state indicators
- Responsive layout

---

### mobile-status-badge.tsx

Mobile status badge display.

**Props:**

```typescript
{
  status: string;
  count: number;
}
```

---

### patient-list-section.tsx

Dashboard patient list container.

**Props:**

```typescript
{
  patients: Patient[]
  loading: boolean
}
```

---

### patient-list-table.tsx

Table view of patients with sorting.

**Props:**

```typescript
{
  patients: Patient[]
  onPatientClick: (id: string) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
```

**Features:**

- Click-to-sort columns
- Compliance indicators
- Status badges
- Quick actions

---

## Patient Components

### PatientList.tsx

Paginated patient list with filters.

**Props:**

```typescript
{
  filters?: PatientFilters
  onPatientSelect: (patient: Patient) => void
}
```

---

### patient-header-card.tsx

Patient profile header card.

**Props:**

```typescript
{
  patient: Patient
  onEdit: () => void
}
```

**Features:**

- Patient photo
- Key demographics
- Contact info
- Edit button

---

### patient-profile-section.tsx

Complete patient profile view.

**Props:**

```typescript
{
  patientId: string;
}
```

**Features:**

- Tabbed interface
- Profile, Reminders, History, Verification tabs
- Real-time updates

---

### patient-profile-tab-combined.tsx

Combined profile and medical info tab.

**Props:**

```typescript
{
  patient: Patient
  medicalRecords: MedicalRecord[]
}
```

---

### patient-reminders-tab.tsx

Reminders tab for patient profile.

**Props:**

```typescript
{
  patientId: string;
}
```

**Features:**

- Calendar view
- List view toggle
- Filter by status
- Create reminder button

---

### patient-response-history-tab.tsx

Patient response and interaction history.

**Props:**

```typescript
{
  patientId: string;
}
```

---

### patient-verification-tab.tsx

Verification status and actions tab.

**Props:**

```typescript
{
  patient: Patient
  onVerify: () => void
  onResend: () => void
}
```

---

### patient-compliance-stats.tsx

Compliance metrics display.

**Props:**

```typescript
{
  stats: {
    total: number;
    confirmed: number;
    missed: number;
    rate: number;
  }
}
```

**Features:**

- Progress ring
- Percentage display
- Color-coded indicators

---

### patient-quick-actions.tsx

Quick action buttons for patient.

**Props:**

```typescript
{
  patientId: string
  onSendReminder: () => void
  onDeactivate: () => void
}
```

---

### navigation-card.tsx

Navigation card for patient sections.

**Props:**

```typescript
{
  title: string
  icon: React.ReactNode
  href: string
  count?: number
}
```

---

### verification-actions-panel.tsx

Panel with verification action buttons.

**Props:**

```typescript
{
  patientId: string
  status: VerificationStatus
  onSend: () => void
  onManual: () => void
}
```

---

### verification-badge.tsx

Visual verification status badge.

**Props:**

```typescript
{
  status: VerificationStatus
  size?: 'sm' | 'md' | 'lg'
}
```

---

### verification-history.tsx

Verification attempt history list.

**Props:**

```typescript
{
  history: VerificationAttempt[]
}
```

---

### verification-info-panel.tsx

Informational panel about verification.

**Props:**

```typescript
{
  patient: Patient;
}
```

---

### verification-status-icon.tsx

Icon representing verification status.

**Props:**

```typescript
{
  status: VerificationStatus;
}
```

---

### whatsapp-verification-section.tsx

Complete WhatsApp verification section.

**Props:**

```typescript
{
  patientId: string;
}
```

---

## Pengingat (Reminder) Components

Indonesian-language quick reminder components.

### patient-reminder-dashboard.tsx

Main dashboard for patient reminders.

**Props:**

```typescript
{
  patientId: string;
}
```

---

### PatientReminderHeader.tsx

Header for reminder dashboard.

**Props:**

```typescript
{
  patientName: string;
  reminderCount: number;
}
```

---

### add-reminder-modal.tsx

Modal for quick reminder creation.

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  patientId: string
}
```

---

### EditQuickReminderModal.tsx

Modal for editing quick reminders.

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  reminder: Reminder
}
```

---

### reminder-list-table.tsx

Table display of reminders.

**Props:**

```typescript
{
  reminders: Reminder[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}
```

---

### ReminderColumn.tsx

Individual reminder column display.

**Props:**

```typescript
{
  reminders: Reminder[]
  status: ReminderStatus
  title: string
}
```

---

## Performance Components

### web-vitals.tsx

Web Vitals monitoring and reporting.

**Props:** None

**Features:**

- Tracks CLS, FID, FCP, LCP, TTFB
- Sends to analytics
- Console logging (dev mode)

**Usage:**

```tsx
import WebVitals from "@/components/performance/web-vitals";

<WebVitals />;
```

---

## Provider Components

### app-providers.tsx

Root-level provider wrapper.

**Props:**

```typescript
{
  children: React.ReactNode;
}
```

**Provides:**

- Clerk authentication
- React Query client
- Toast notifications (Sonner)
- Error boundaries

**Usage:**

```tsx
import AppProviders from "@/components/providers/app-providers";

<AppProviders>
  <App />
</AppProviders>;
```

---

## Reminder Components

### ContentSelector.tsx

Select articles/videos to attach to reminders.

**Props:**

```typescript
{
  selected: ContentItem[]
  onChange: (items: ContentItem[]) => void
}
```

**Features:**

- Search content
- Multi-select
- Preview content
- Filter by category

---

### CustomRecurrenceModal.tsx

Advanced recurrence pattern builder.

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  onSave: (pattern: RecurrencePattern) => void
}
```

**Features:**

- Daily, weekly, monthly patterns
- Custom intervals
- End date or occurrence count
- Days of week selection

---

### DateTimeSelector.tsx

Date and time picker for reminders.

**Props:**

```typescript
{
  selectedDates: Date[]
  time: string
  onChange: (dates: Date[], time: string) => void
}
```

**Features:**

- Multi-date selection
- 24-hour time picker
- Calendar view
- Indonesian locale

---

### EditScheduledReminderModal.tsx

Modal for editing scheduled reminders.

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  reminder: Reminder
}
```

---

### FloatingActionButtons.tsx

Floating action buttons for quick actions.

**Props:**

```typescript
{
  onAddReminder: () => void
  onSendAll: () => void
  pendingCount: number
}
```

---

### MessageInput.tsx

Message input with template support.

**Props:**

```typescript
{
  value: string
  onChange: (value: string) => void
  templates?: Template[]
}
```

**Features:**

- Template dropdown
- Variable hints
- Character counter
- Emoji picker

---

### PatientInfo.tsx

Patient information display in reminder context.

**Props:**

```typescript
{
  patient: Patient;
}
```

---

### ReminderItem.tsx

Individual reminder list item.

**Props:**

```typescript
{
  reminder: Reminder
  onEdit: () => void
  onDelete: () => void
  onConfirm: () => void
}
```

---

## UI Components

Base UI components built with Radix UI and Tailwind CSS.

### alert.tsx

Alert/notification component.

**Props:**

```typescript
{
  variant: 'default' | 'success' | 'warning' | 'error'
  title?: string
  description: string
  icon?: React.ReactNode
}
```

---

### alert-modal.tsx

Modal dialog for alerts/confirmations.

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
}
```

---

### avatar.tsx

User avatar component (Radix UI).

**Props:**

```typescript
{
  src?: string
  alt?: string
  fallback: string
  size?: 'sm' | 'md' | 'lg'
}
```

---

### back-button.tsx

Back navigation button.

**Props:**

```typescript
{
  href?: string
  onClick?: () => void
  label?: string
}
```

---

### badge.tsx

Status badge component.

**Props:**

```typescript
{
  variant: "default" | "success" | "warning" | "error" | "info";
  children: React.ReactNode;
}
```

---

### breadcrumb.tsx

Breadcrumb navigation (Radix UI).

**Props:**

```typescript
{
  items: BreadcrumbItem[]
}

type BreadcrumbItem = {
  label: string
  href?: string
  current?: boolean
}
```

---

### button.tsx

Primary button component.

**Props:**

```typescript
{
  variant: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'link'
  size: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}
```

---

### card.tsx

Container card component.

**Props:**

```typescript
{
  children: React.ReactNode
  className?: string
  padding?: boolean
}
```

---

### confirmation-modal.tsx

Reusable confirmation dialog.

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}
```

---

### date-picker-calendar.tsx

Calendar date picker.

**Props:**

```typescript
{
  value: Date
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}
```

---

### desktop-header.tsx

Desktop header navigation.

---

### mobile-header.tsx

Mobile header navigation.

---

### dialog.tsx

Modal dialog component (Radix UI).

**Props:**

```typescript
{
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
}
```

---

### enhanced-error-boundary.tsx

Error boundary with recovery.

**Props:**

```typescript
{
  children: React.ReactNode
  fallback?: React.ReactNode
}
```

---

### error-boundary.tsx

Basic error boundary.

---

### form.tsx

Form components (react-hook-form).

Exports:

- `Form` - Form wrapper
- `FormField` - Field wrapper
- `FormItem` - Item container
- `FormLabel` - Label component
- `FormControl` - Control wrapper
- `FormDescription` - Help text
- `FormMessage` - Error message

---

### header.tsx

Generic header component.

---

### indonesian-date-input.tsx

Date input with Indonesian locale.

**Props:**

```typescript
{
  value: string
  onChange: (value: string) => void
  label?: string
}
```

---

### input.tsx

Text input component.

**Props:**

```typescript
{
  type?: string
  placeholder?: string
  disabled?: boolean
  error?: string
}
```

---

### label.tsx

Form label component (Radix UI).

---

### loading-spinner.tsx

Loading spinner indicator.

**Props:**

```typescript
{
  size?: 'sm' | 'md' | 'lg'
  text?: string
}
```

---

### mobile-admin-actions.tsx

Mobile admin action menu.

---

### navigation.tsx

Navigation menu component.

---

### optimized-image.tsx

Optimized Next.js Image wrapper.

**Props:**

```typescript
{
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  loading?: 'lazy' | 'eager'
}
```

**Features:**

- Automatic optimization
- WebP conversion
- Responsive sizing
- Lazy loading

---

### select.tsx

Select dropdown (Radix UI).

**Props:**

```typescript
{
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
}
```

---

### separator.tsx

Visual separator line (Radix UI).

---

### tabs.tsx

Tab navigation (Radix UI).

**Props:**

```typescript
{
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tab: string) => void
}
```

---

### textarea.tsx

Multi-line text input.

**Props:**

```typescript
{
  placeholder?: string
  rows?: number
  disabled?: boolean
}
```

---

### time-format-initializer.tsx

Initialize Indonesian time format.

---

### time-picker-24h.tsx

24-hour time picker.

**Props:**

```typescript
{
  value: string  // HH:MM
  onChange: (value: string) => void
}
```

---

### toast.tsx

Toast notification (Sonner).

Usage:

```typescript
import { toast } from "sonner";

toast.success("Operation completed");
toast.error("Something went wrong");
toast.info("Information message");
```

---

### virtual-list.tsx

Virtualized list for performance.

**Props:**

```typescript
{
  items: any[]
  itemHeight: number
  renderItem: (item: any) => React.ReactNode
  height: number
}
```

**Features:**

- Renders only visible items
- Smooth scrolling
- Performance optimized for 1000+ items

---

## Volunteer Components

### volunteer-dashboard.tsx

Main dashboard for volunteer users.

**Props:** None (uses auth context)

**Features:**

- Assigned patients list
- Pending reminders
- Quick actions
- Statistics overview

---

## Design System

### Colors

Based on Tailwind CSS with custom theme:

**Primary Colors:**

- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)
- Info: Blue (#0EA5E9)

**Status Colors:**

- VERIFIED: Green
- PENDING: Yellow
- DECLINED: Red
- EXPIRED: Gray

**Reminder Status:**

- SENT: Blue
- DELIVERED: Green
- FAILED: Red
- PENDING: Gray

### Typography

**Font Family:**

- Sans: Inter, system-ui, sans-serif
- Mono: JetBrains Mono, monospace

**Font Sizes:**

- xs: 0.75rem
- sm: 0.875rem
- base: 1rem
- lg: 1.125rem
- xl: 1.25rem
- 2xl: 1.5rem

### Spacing

Uses Tailwind's 4px base unit:

- 1: 0.25rem (4px)
- 2: 0.5rem (8px)
- 4: 1rem (16px)
- 8: 2rem (32px)

### Component Conventions

1. **File Naming:**
   - kebab-case for files: `patient-list.tsx`
   - PascalCase for components: `PatientList`

2. **Props Interface:**

   ```typescript
   interface ComponentNameProps {
     // Required props first
     required: string;
     // Optional props with ?
     optional?: string;
     // Callbacks with on prefix
     onClick?: () => void;
   }
   ```

3. **State Management:**
   - Local state: `useState` for component-only state
   - Server state: React Query (`useQuery`, `useMutation`)
   - Form state: react-hook-form with Zod validation

4. **Styling:**
   - Tailwind utility classes
   - `cn()` helper for conditional classes
   - No inline styles

---

## Component Best Practices

### Performance

- Use `React.memo()` for expensive components
- Lazy load with `React.lazy()` and `Suspense`
- Virtual lists for long lists (>100 items)
- Debounce search inputs

### Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus management in modals

### Error Handling

- Error boundaries for component errors
- Loading states during data fetching
- Empty states for no data
- User-friendly error messages

### Testing

- Unit tests with Vitest
- Integration tests for user flows
- Accessibility testing with jest-axe

---

**Component Count:** 94  
**Framework:** Next.js 15 / React 19  
**TypeScript:** Strict mode enabled  
**Styling:** Tailwind CSS v4  
**UI Library:** Radix UI  
**Icons:** Lucide React  
**Last Updated:** January 29, 2026
