export interface MockUser {
  id?: string;
  uid?: string;
  email: string;
  name?: string;
  role: string;
  department?: string;
}

export const usersList: MockUser[] = [
  // Digital AdBoard Roles
  {
    id: "usr-001",
    email: "admanager@adboard.com",
    name: "Alex Kimani (Ad Operations Manager)",
    role: "adManager",
    department: "Ad Operations",
  },
  {
    id: "usr-002",
    email: "finance@adboard.com",
    name: "Grace Muthoni (Finance Controller)",
    role: "finance",
    department: "Finance & Accounts",
  },
  {
    id: "usr-003",
    email: "ops@adboard.com",
    name: "David Ochieng (Digital Operations Lead)",
    role: "digitalOps",
    department: "Digital Operations",
  },
  {
    id: "usr-004",
    email: "admin@adboard.com",
    name: "System Administrator",
    role: "adManager",
    department: "Executive Management",
  },

  // Newsroom / Byline Roles
  {
    id: "usr-005",
    email: "admin@kbc.com",
    name: "System Admin (KBC)",
    role: "super_admin",
    department: "Digital Directorate",
  },
  {
    id: "usr-005b",
    email: "admin@kbc.co.ke",
    name: "System Admin (KBC)",
    role: "super_admin",
    department: "Digital Directorate",
  },
  {
    id: "usr-005c",
    email: "mungai.charles@kbc.co.ke",
    name: "Mungai Charles (Chief Digital)",
    role: "super_admin",
    department: "Digital Directorate",
  },
  {
    id: "usr-006",
    email: "managing.editor@kbc.co.ke",
    name: "Samuel Ochieng (Managing Editor)",
    role: "managing_editor",
    department: "Editorial Board",
  },
  {
    id: "usr-007",
    email: "desk.editor@kbc.co.ke",
    name: "Faith Njeri (Desk Editor)",
    role: "editor",
    department: "Central News Desk",
  },
  {
    id: "usr-008",
    email: "jane.wambui@kbc.co.ke",
    name: "Jane Wambui (Nakuru Bureau)",
    role: "correspondent",
    department: "Regional Bureau",
  },
  {
    id: "usr-009",
    email: "omondi.otieno@kbc.co.ke",
    name: "Omondi Otieno (Kisumu Bureau)",
    role: "correspondent",
    department: "Regional Bureau",
  },
  {
    id: "usr-010",
    email: "amina.hassan@kbc.co.ke",
    name: "Amina Hassan (Mombasa Bureau)",
    role: "correspondent",
    department: "Regional Bureau",
  },
];
