'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })
    if (result?.ok) {
      router.push('/')
    } else {
      alert('Invalid credentials')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 bg-white dark:bg-gray-900 p-8 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">Login to Tradia</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded border"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded border"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white p-3 rounded hover:bg-indigo-700"
        >
          Sign In 
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => signIn('/signin')}
          className="text-indigo-600 hover:underline"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
