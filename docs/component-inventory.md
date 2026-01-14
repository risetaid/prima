# Component Inventory

## Overview

PRIMA uses React components organized by feature domain. All components are located in `src/components/`.

## Component Structure

```
src/components/
├── admin/              # Admin-related components
├── auth/               # Authentication components
├── cms/                # Content management components
├── content/            # Content display components
├── dashboard/          # Dashboard components
├── patient/            # Patient management components
├── pengingat/          # Reminder management components
├── performance/        # Performance monitoring
├── providers/          # React context providers
├── reminder/           # Reminder form components
├── ui/                 # Base UI components
└── volunteer/          # Volunteer dashboard components
```

## Admin Components

| Component | Type | Description |
|-----------|------|-------------|
| TemplateActions | Action | Template management actions |
| TemplateForm | Form | Template creation/editing form |
| TemplateList | List | Template listing display |
| TemplatePreviewModal | Modal | Template preview dialog |
| UserActions | Action | User management actions |
| UserCard | Card | User card display |
| UserList | List | User list display |
| template-management | Feature | Full template management feature |
| user-management | Feature | Full user management feature |
| lazy-components | Lazy | Lazy-loaded admin components |

## Auth Components

| Component | Type | Description |
|-----------|------|-------------|
| auth-loading | Loading | Authentication loading state |
| role-guard | Guard | Role-based access control |

## CMS Components

| Component | Type | Description |
|-----------|------|-------------|
| CMSContentItem | Display | Content item display |
| CMSStatsCards | Display | Statistics cards |
| article-actions | Action | Article management actions |
| article-form-fields | Form | Article form fields |
| publish-settings | Settings | Publication settings |
| QuillEditor | Editor | Rich text editor |
| thumbnail-upload | Upload | Thumbnail upload |

## Content Components

| Component | Type | Description |
|-----------|------|-------------|
| ContentHeader | Layout | Content section header |
| ShareButton | Action | Share content button |

## Dashboard Components

| Component | Type | Description |
|-----------|------|-------------|
| add-patient-dialog | Dialog | Add patient dialog |
| desktop-header | Layout | Desktop header |
| instant-send-dialog | Dialog | Instant send dialog |
| instant-send-section | Section | Instant reminder section |
| mobile-navigation-buttons | Nav | Mobile navigation |
| mobile-status-badge | Badge | Status badge for mobile |
| patient-list-section | Section | Patient list section |
| patient-list-table | Table | Patient data table |

## Patient Components

| Component | Type | Description |
|-----------|------|-------------|
| navigation-card | Card | Patient navigation card |
| patient-compliance-stats | Display | Compliance statistics |
| patient-header-card | Card | Patient header info |
| patient-profile-section | Section | Patient profile |
| patient-profile-tab-combined | Tab | Combined profile tabs |
| PatientList | List | Patient list |
| patient-quick-actions | Action | Quick action buttons |
| patient-reminders-tab | Tab | Patient reminders |
| patient-response-history-tab | Tab | Response history |
| patient-verification-tab | Tab | Verification status |
| verification-actions-panel | Panel | Verification actions |
| verification-badge | Badge | Verification status badge |
| verification-history | History | Verification history |
| verification-info-panel | Panel | Verification info |
| verification-status-icon | Icon | Status icon |
| whatsapp-verification-section | Section | WhatsApp verification |

## Reminder Components (Pengingat)

| Component | Type | Description |
|-----------|------|-------------|
| EditQuickReminderModal | Modal | Edit quick reminder |
| PatientReminderHeader | Header | Reminder section header |
| add-reminder-modal | Modal | Add reminder dialog |
| patient-reminder-dashboard | Dashboard | Reminder dashboard |
| reminder-list-table | Table | Reminder list |
| ReminderColumn | Column | Reminder table column |

## Reminder Form Components

| Component | Type | Description |
|-----------|------|-------------|
| ContentSelector | Selector | Message content selector |
| CustomRecurrenceModal | Modal | Custom recurrence settings |
| DateTimeSelector | Selector | Date/time picker |
| EditScheduledReminderModal | Modal | Edit scheduled reminder |
| FloatingActionButtons | Action | FAB menu |
| MessageInput | Input | Message text input |
| PatientInfo | Display | Patient info display |
| ReminderItem | Item | Reminder list item |

## UI Components (Base)

| Component | Type | Description |
|-----------|------|-------------|
| alert-modal | Modal | Alert confirmation dialog |
| alert | Alert | Alert notification |
| avatar | Avatar | User avatar display |
| back-button | Button | Back navigation |
| badge | Badge | Status/size badge |
| breadcrumb | Nav | Breadcrumb navigation |
| button | Button | Action button |
| card | Card | Card container |
| confirmation-modal | Modal | Confirmation dialog |
| date-picker-calendar | Picker | Date selection |
| desktop-header | Layout | Desktop header |
| dialog | Modal | Modal dialog |
| enhanced-error-boundary | Boundary | Error boundary with recovery |
| error-boundary | Boundary | Basic error boundary |
| form | Form | Form wrapper |
| header | Layout | Page header |
| indonesian-date-input | Input | Indonesian date format |
| input | Form | Text input |
| label | Form | Form label |
| loading-spinner | Loading | Loading indicator |
| mobile-admin-actions | Nav | Mobile admin nav |
| mobile-header | Layout | Mobile header |
| navigation | Nav | Main navigation |
| optimized-image | Image | Optimized image component |
| select | Form | Dropdown select |
| separator | Layout | Visual separator |
| tabs | Nav | Tab navigation |
| textarea | Form | Text area input |
| time-format-initializer | Utility | Time format setup |
| time-picker-24h | Picker | 24-hour time picker |
| toast | Notification | Toast notification |
| virtual-list | List | Virtual scrolling list |

## Performance Components

| Component | Type | Description |
|-----------|------|-------------|
| web-vitals | Display | Web vitals display |

## Provider Components

| Component | Type | Description |
|-----------|------|-------------|
| app-providers | Provider | Root application providers |

## Volunteer Components

| Component | Type | Description |
|-----------|------|-------------|
| volunteer-dashboard | Dashboard | Volunteer dashboard |

## Design System

### Styling Approach

- **Framework**: Tailwind CSS v4
- **Class Utilities**: clsx, tailwind-merge for conditional classes
- **Variants**: class-variance-authority (CVA) for component variants

### Component Patterns

1. **CVA Variants**: Components use CVA for different visual states
2. **Radix Primitives**: UI components built on Radix UI for accessibility
3. **Lucide Icons**: Consistent iconography
4. **Sonner Toasts**: Notification system

### Common Component Props

```typescript
interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

// Variant props using CVA
interface VariantProps {
  variant?: "default" | "secondary" | "destructive" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}
```

## Component Development Guidelines

1. Use TypeScript for all components
2. Use CVA for variant management
3. Build on Radix primitives for accessibility
4. Use Lucide icons consistently
5. Follow the existing component structure
6. Export from feature-specific index files
