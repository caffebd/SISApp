'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '../components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Map pathnames to sidebar navigation items
  const getActivePage = () => {
    if (pathname === '/admin') return 'Home';
    if (pathname?.startsWith('/admin/appointments')) return 'Diary';
    if (pathname?.startsWith('/admin/diary')) return 'Diary';
    if (pathname?.startsWith('/admin/projects')) return 'Projects';
    if (pathname?.startsWith('/admin/sales')) return 'Sales';
    if (pathname?.startsWith('/admin/costs')) return 'Costs';
    if (pathname?.startsWith('/admin/reports')) return 'Reports & Finances';
    if (pathname?.startsWith('/admin/contacts')) return 'Contacts';
    if (pathname?.startsWith('/admin/notes')) return 'Notes';
    if (pathname?.startsWith('/admin/forms')) return 'Forms & Certificates';
    if (pathname?.startsWith('/admin/settings')) return 'Settings';
    return 'Home';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activePage={getActivePage()} />
      <div className="flex-1 ml-[87px]">
        {children}
      </div>
    </div>
  );
}