'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!email || !password) return alert("Fill in your details! 🐾")
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      alert(error.message)
    } else if (data.session) {
      window.location.href = '/notes'
    } else {
      alert('Welcome! Try logging in now. ✨')
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    if (!email || !password) return alert("Emails and passwords please! 🍯")
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
    } else {
      window.location.href = '/notes'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FFC300] bg-[linear-gradient(180deg,_#FFD60A_0%,_#FFC300_100%)] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-[#3E2723]">
      
      {/* Background Decor */}
      <div className="absolute top-10 left-10 text-8xl opacity-10 -rotate-12 select-none">🍯</div>
      <div className="absolute bottom-10 right-10 text-9xl opacity-10 rotate-12 select-none">🧸</div>

      <div className="bg-white p-8 md:p-10 rounded-[32px] border-4 border-[#3E2723] shadow-[12px_12px_0px_0px_rgba(62,39,35,1)] w-full max-w-md relative z-10 transition-transform hover:-translate-y-1">
        <div className="text-center mb-8">
          <div className="inline-block bg-[#FFC300] border-4 border-[#3E2723] rounded-2xl p-4 mb-4 shadow-[4px_4px_0px_0px_rgba(62,39,35,1)]">
            <span className="text-6xl block">🐻</span>
          </div>
          <h1 className="text-4xl font-black text-[#3E2723] tracking-tighter uppercase italic">Haim Sheli notes</h1>
          <p className="text-[#3E2723] font-bold mt-2 opacity-80 uppercase text-xs tracking-widest">Forest Authentication</p>
        </div>
        
        <div className="space-y-5">
          {/* Direct Input Fields */}
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="Email Address" 
              className="w-full p-4 border-4 border-[#3E2723] rounded-2xl focus:outline-none focus:bg-[#FFF8E1] text-[#3E2723] bg-white transition-all shadow-[4px_4px_0px_0px_rgba(62,39,35,1)] placeholder-[#3E2723]/40 font-bold"
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="Secret Paw-word" 
              className="w-full p-4 border-4 border-[#3E2723] rounded-2xl focus:outline-none focus:bg-[#FFF8E1] text-[#3E2723] bg-white transition-all shadow-[4px_4px_0px_0px_rgba(62,39,35,1)] placeholder-[#3E2723]/40 font-bold"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* TWO MAIN BUTTONS */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={handleLogin} 
              disabled={loading}
              className="bg-[#3E2723] text-[#FFC300] p-4 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(255,195,0,0.4)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:scale-95 disabled:opacity-50 uppercase text-sm tracking-tighter"
            >
              Login 🍯
            </button>
            <button 
              onClick={handleSignUp} 
              disabled={loading}
              className="bg-white border-4 border-[#3E2723] text-[#3E2723] p-4 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(62,39,35,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:scale-95 disabled:opacity-50 uppercase text-sm tracking-tighter"
            >
              Sign Up 🐾
            </button>
          </div>
        </div>
      </div>

      <p className="mt-8 text-[#3E2723] text-[10px] font-black uppercase tracking-[0.3em] bg-white/30 px-4 py-1 rounded-full border-2 border-[#3E2723]/20">
        Strictly for Bears Only 🐝
      </p>
    </div>
  )
}