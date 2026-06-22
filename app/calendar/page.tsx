'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CalendarRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.push('/dashboard/calendar');
    else router.push('/login');
  }, [router]);

  return null;
}
