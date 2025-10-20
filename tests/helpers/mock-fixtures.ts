/**
 * Mock Fixtures - Reusable test data
 */

export const MOCK_USERS = {
  admin: {
    id: "user-admin-001",
    clerkId: "clerk-admin-001",
    email: "admin@prima.test",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN" as const,
    isApproved: true,
    isActive: true,
  },
  volunteer: {
    id: "user-volunteer-001",
    clerkId: "clerk-volunteer-001",
    email: "volunteer@prima.test",
    firstName: "Volunteer",
    lastName: "User",
    role: "RELAWAN" as const,
    isApproved: true,
    isActive: true,
  },
  developer: {
    id: "user-developer-001",
    clerkId: "clerk-developer-001",
    email: "dev@prima.test",
    firstName: "Developer",
    lastName: "User",
    role: "DEVELOPER" as const,
    isApproved: true,
    isActive: true,
  },
};

export const MOCK_PATIENTS = {
  patient1: {
    id: "patient-001",
    name: "Budi Santoso",
    phoneNumber: "628123456789",
    age: 45,
    gender: "M" as const,
    condition: "Diabetes Type 2",
    assignedVolunteerId: MOCK_USERS.volunteer.id,
    isActive: true,
    verificationStatus: "VERIFIED" as const,
  },
  patient2: {
    id: "patient-002",
    name: "Siti Nurhaliza",
    phoneNumber: "628987654321",
    age: 52,
    gender: "F" as const,
    condition: "Hypertension",
    assignedVolunteerId: MOCK_USERS.volunteer.id,
    isActive: true,
    verificationStatus: "PENDING" as const,
  },
  patient3: {
    id: "patient-003",
    name: "Ahmad Hidayat",
    phoneNumber: "628111222333",
    age: 38,
    gender: "M" as const,
    condition: "Pre-diabetes",
    assignedVolunteerId: "user-volunteer-002",
    isActive: true,
    verificationStatus: "VERIFIED" as const,
  },
};

export const MOCK_ARTICLES = {
  article1: {
    id: "article-001",
    title: "Understanding Diabetes Management",
    slug: "understanding-diabetes-management",
    content: "<p>Detailed content about diabetes management...</p>",
    excerpt: "Learn how to manage diabetes effectively",
    category: "MEDICAL" as const,
    status: "PUBLISHED" as const,
    tags: ["diabetes", "health"],
  },
  article2: {
    id: "article-002",
    title: "Healthy Eating Tips",
    slug: "healthy-eating-tips",
    content: "<p>Nutritious eating guidelines...</p>",
    excerpt: "Essential nutrition tips for a healthy life",
    category: "NUTRITION" as const,
    status: "DRAFT" as const,
    tags: ["nutrition", "diet"],
  },
};

export const MOCK_VIDEOS = {
  video1: {
    id: "video-001",
    title: "Exercise for Seniors",
    youtubeUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    duration: 450,
    category: "EXERCISE" as const,
    status: "PUBLISHED" as const,
  },
  video2: {
    id: "video-002",
    title: "Meditation Guide",
    youtubeUrl: "https://youtube.com/watch?v=abc123def456",
    duration: 600,
    category: "MOTIVATIONAL" as const,
    status: "DRAFT" as const,
  },
};

export const MOCK_REMINDERS = {
  reminder1: {
    id: "reminder-001",
    patientId: MOCK_PATIENTS.patient1.id,
    title: "Take your medication",
    message: "Don't forget to take your daily diabetes medication",
    scheduledTime: new Date(Date.now() + 86400000), // Tomorrow
    status: "PENDING" as const,
  },
  reminder2: {
    id: "reminder-002",
    patientId: MOCK_PATIENTS.patient2.id,
    title: "Blood pressure check",
    message: "Time to check your blood pressure",
    scheduledTime: new Date(Date.now() + 172800000), // In 2 days
    status: "PENDING" as const,
  },
};

export const MOCK_FONNTE_PAYLOADS = {
  validMessage: {
    sender: "628123456789",
    message: "Sudah minum obat hari ini",
    device: "whatsapp",
    id: "msg-001-fonnte",
    timestamp: Math.floor(Date.now() / 1000),
  },
  validMessageWithoutId: {
    sender: "628123456789",
    message: "Ya, sudah dikonfirmasi",
    device: "whatsapp",
    timestamp: Math.floor(Date.now() / 1000),
  },
  invalidPhone: {
    sender: "invalid",
    message: "Test message",
    device: "whatsapp",
    id: "msg-002-fonnte",
  },
  invalidMessage: {
    sender: "628123456789",
    message: "", // Empty message
    device: "whatsapp",
    id: "msg-003-fonnte",
  },
  verificationConfirmation: {
    sender: "628123456789",
    message: "OTP: 123456",
    device: "whatsapp",
    id: "msg-004-fonnte",
    timestamp: Math.floor(Date.now() / 1000),
  },
};

export const MOCK_WEBHOOK_HEADERS = {
  valid: {
    "x-fonnte-token": process.env.FONNTE_WEBHOOK_TOKEN || "test-webhook-token",
    "content-type": "application/json",
  },
  invalid: {
    "x-fonnte-token": "invalid-token",
    "content-type": "application/json",
  },
  missing: {
    "content-type": "application/json",
  },
};
