export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
  permission: string;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationConfig: NavigationGroup[] = [
  {
    label: "Utama",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", permission: "view_dashboard" },
    ],
  },
  {
    label: "Akademik",
    items: [
      { label: "Murid", href: "/students", icon: "Users", permission: "view_students" },
      { label: "Absensi", href: "/attendance", icon: "CalendarCheck", permission: "view_attendance" },
      { label: "Jurnal", href: "/journals", icon: "BookOpen", permission: "view_journals" },
      { label: "Montessori", href: "/milestones", icon: "Star", permission: "view_milestones" },
      { label: "Hafalan", href: "/hafalan", icon: "Moon", permission: "view_hafalan" },
      { label: "Portofolio", href: "/portfolios", icon: "Image", permission: "view_portfolios" },
      { label: "Raport", href: "/reports", icon: "FileText", permission: "view_reports" },
    ],
  },
  {
    label: "Komunikasi",
    items: [
      { label: "Pengumuman", href: "/announcements", icon: "Bell", permission: "view_announcements" },
      { label: "Agenda", href: "/agendas", icon: "Calendar", permission: "view_agendas" },
      { label: "Galeri", href: "/galleries", icon: "GalleryHorizontal", permission: "view_galleries" },
      { label: "Parenting", href: "/articles", icon: "Heart", permission: "view_articles" },
    ],
  },
  {
    label: "Pendaftaran",
    items: [
      { label: "PPDB", href: "/registrations", icon: "ClipboardList", permission: "view_registrations" },
    ],
  },
  {
    label: "Program",
    items: [
      { label: "Bimbel", href: "/tutoring", icon: "GraduationCap", permission: "view_tutoring" },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { label: "Pusat Keuangan", href: "/finance", icon: "Landmark", permission: "view_fees" },
      { label: "SPP", href: "/fees", icon: "Wallet", permission: "view_fees" },
      { label: "Uang Pendaftaran", href: "/enrollment-updates", icon: "BadgeCheck", permission: "view_registrations" },
      { label: "Gaji Guru", href: "/teacher-payrolls", icon: "Receipt", permission: "view_fees" },
      { label: "Pengaturan Keuangan", href: "/settings/finance", icon: "Receipt", permission: "manage_fees" },
    ],
  },
  {
    label: "AI",
    items: [
      { label: "History Chat", href: "/ai-chat", icon: "Bot", permission: "view_ai_chat_history" },
    ],
  },
];

export const bottomNavigationConfig: NavigationItem[] = [
  { label: "Pengaturan", href: "/settings", icon: "Settings", permission: "manage_users" },
];
