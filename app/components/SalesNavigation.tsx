'use client';

import { usePathname } from 'next/navigation';
import SalesMenuItem from './SalesMenuItem';

export default function SalesNavigation() {
    const pathname = usePathname();

    const menuItems = [
        {
            name: 'Invoices',
            href: '/admin/sales/invoices',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
    ];

    return (
        <nav className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-bold text-gray-900">Sales</h2>
            </div>
            <div className="flex flex-col">
                {menuItems.map((item) => (
                    <SalesMenuItem
                        key={item.name}
                        name={item.name}
                        href={item.href}
                        icon={item.icon}
                        isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                    />
                ))}
            </div>
        </nav>
    );
}
