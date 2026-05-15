export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
  permission: string;
  hiddenForRoles?: string[];
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
      { label: "Murid", href: "/students", icon: "Users", permission: "view_students", hiddenForRoles: ["orang_tua"] },
      { label: "Absensi", href: "/attendance", icon: "CalendarCheck", permission: "view_attendance", hiddenForRoles: ["orang_tua"] },
      { label: "Perizinan", href: "/absence-requests", icon: "Calendar", permission: "manage_absence_requests", hiddenForRoles: ["orang_tua"] },
      { label: "Jurnal", href: "/journals", icon: "BookOpen", permission: "view_journals", hiddenForRoles: ["orang_tua"] },
      { label: "Montessori", href: "/milestones", icon: "Star", permission: "view_milestones", hiddenForRoles: ["orang_tua"] },
      { label: "Hafalan", href: "/hafalan", icon: "Moon", permission: "view_hafalan", hiddenForRoles: ["orang_tua"] },
      { label: "Portofolio", href: "/portfolios", icon: "Image", permission: "view_portfolios", hiddenForRoles: ["orang_tua"] },
      { label: "Raport", href: "/reports", icon: "FileText", permission: "view_reports", hiddenForRoles: ["orang_tua"] },
    ],
  },
  {
    label: "Komunikasi",
    items: [
      { label: "Pengumuman", href: "/announcements", icon: "Bell", permission: "view_announcements", hiddenForRoles: ["guru", "orang_tua"] },
      { label: "Agenda", href: "/agendas", icon: "Calendar", permission: "view_agendas", hiddenForRoles: ["guru", "orang_tua"] },
      { label: "Galeri", href: "/galleries", icon: "GalleryHorizontal", permission: "view_galleries", hiddenForRoles: ["guru", "orang_tua"] },
      { label: "Parenting", href: "/articles", icon: "Heart", permission: "view_articles", hiddenForRoles: ["guru", "orang_tua"] },
    ],
  },
  {
    label: "Pendaftaran",
    items: [
      { label: "PPDB", href: "/registrations", icon: "ClipboardList", permission: "view_registrations", hiddenForRoles: ["guru", "orang_tua"] },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { label: "Pusat Keuangan", href: "/finance", icon: "Landmark", permission: "view_fees", hiddenForRoles: ["guru", "orang_tua"] },
      { label: "SPP", href: "/fees", icon: "Wallet", permission: "view_fees", hiddenForRoles: ["guru", "orang_tua"] },
      { label: "Uang Pendaftaran", href: "/enrollment-updates", icon: "BadgeCheck", permission: "view_registrations", hiddenForRoles: ["guru", "orang_tua"] },
      { label: "Gaji Guru", href: "/teacher-payrolls", icon: "Receipt", permission: "view_fees", hiddenForRoles: ["guru", "orang_tua"] },
      { label: "Pengaturan Keuangan", href: "/settings/finance", icon: "Receipt", permission: "manage_fees", hiddenForRoles: ["guru", "orang_tua"] },
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
