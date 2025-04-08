// app/not-found.tsx
import { redirect } from 'next/navigation';

export default function NotFoundPage() {
  // Immediately redirect to the homepage
  redirect('/');
  return null;
}
