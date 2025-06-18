import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    // Test with service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Test basic connection
    const { data: games, error: gamesError } = await supabaseAdmin
      .from('games')
      .select('*')
      .limit(1)

    if (gamesError) {
      return NextResponse.json({ 
        error: 'Games query failed', 
        details: gamesError 
      }, { status: 500 })
    }

    // Test profiles table
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1)

    if (profilesError) {
      return NextResponse.json({ 
        error: 'Profiles query failed', 
        details: profilesError 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection working',
      data: {
        gamesCount: games?.length || 0,
        profilesCount: profiles?.length || 0,
        supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name = 'Test User', role = 'user' } = await request.json()

    // Test signup with anon key
    const supabaseAnon = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('Attempting signup with:', { email, name, role })

    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role
        }
      }
    })

    if (error) {
      console.error('Signup error:', error)
      return NextResponse.json({
        error: 'Signup failed',
        details: error
      }, { status: 400 })
    }

    console.log('Signup successful:', data.user?.id)

    // Check if profile was created
    if (data.user) {
      const { data: profile, error: profileError } = await supabaseAnon
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      console.log('Profile check:', { profile, profileError })
    }

    return NextResponse.json({
      success: true,
      message: 'Signup successful',
      user: data.user,
      session: data.session
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
