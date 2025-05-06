// 'use server' // Remove this - not applicable in Electron renderer

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/client' // Use client component client

export async function logout() {
  const supabase = createClient() // Use client instance
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Revalidate all pages that might show different content based on auth state
  revalidatePath('/', 'layout')
  
  // Redirect to the login page after logout
  redirect('/login')
}
