'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/admin/sales/invoices');
    }, [router]);
    return null;
}
