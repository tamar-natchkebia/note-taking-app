import { redirect } from 'next/navigation'

export default function RootPage() {
  // This automatically forces the browser to go to /login
  redirect('/login')
}