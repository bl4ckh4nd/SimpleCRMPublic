import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'

import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  // Explicitly handle the case where parameters are missing
  if (!token_hash || !type) {
    console.log('Missing token_hash or type, redirecting to /error');
    // Redirect immediately if parameters are missing
    redirect('/error');
  }

  // If we reach here, token_hash and type are guaranteed to exist.
  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    type, // Safe to use type directly now
    token_hash, // Safe to use token_hash directly now
  })

  if (!error) {
    // OTP verification successful
    console.log('OTP verified successfully, redirecting to:', next);
    redirect(next); // Redirect on success
  } else {
    // OTP verification failed
    console.error('OTP verification error:', error.message, 'Redirecting to /error');
    redirect('/error'); // Redirect explicitly on error
  }

  // The lines below are effectively unreachable because all paths above call redirect(),
  // which throws an error internally in Next.js to stop execution and perform the redirect.
  // Therefore, the final redirect('/error') from your original code is not needed here.
}