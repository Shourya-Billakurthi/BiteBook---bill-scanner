import React, { useState } from 'react';
import { signInWithGoogle, registerWithEmail, loginWithEmail, resetPassword, updateUserProfile } from '../firebase';
import { Utensils, Mail, Lock, Loader2, User } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          setError('First and last name are required.');
          setLoading(false);
          return;
        }
        const userCred = await registerWithEmail(email, password);
        await updateUserProfile(userCred.user, `${firstName.trim()} ${lastName.trim()}`);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection or disable ad blockers/privacy extensions that might be blocking the login request.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await resetPassword(email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection or disable ad blockers/privacy extensions.');
      } else {
        setError(err.message || 'Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1A1C23] p-4 lg:p-6">
      <div className="max-w-md w-full bg-[#22252E] rounded-3xl shadow-xl p-6 sm:p-8 border border-[#2D313D]">
        <div className="mx-auto w-14 h-14 bg-[#7C6A96]/20 text-[#9E8BB9] rounded-full flex items-center justify-center mb-4 sm:mb-6">
          <Utensils size={28} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">BiteBook</h1>
        <p className="text-slate-400 mb-6 font-bold text-center text-sm sm:text-base">
          {isLogin ? 'Scan your restaurant bill & Log your memories!' : 'Create a new account.'}
        </p>
        
        <button
          onClick={signInWithGoogle}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-[#2D313D] border border-[#363A47] text-white px-6 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-[#363A47] transition-colors shadow-sm mb-4 sm:mb-6"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="relative flex items-center py-2 mb-4 sm:mb-6">
          <div className="flex-grow border-t border-[#2D313D]"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 font-bold text-sm">OR</span>
          <div className="flex-grow border-t border-[#2D313D]"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          {!isLogin && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-400 mb-1">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#1A1C23] border border-[#2D313D] rounded-xl focus:border-[#7C6A96] focus:ring-1 focus:ring-[#7C6A96] focus:outline-none text-white font-bold placeholder-slate-600"
                    placeholder="John"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-400 mb-1">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#1A1C23] border border-[#2D313D] rounded-xl focus:border-[#7C6A96] focus:ring-1 focus:ring-[#7C6A96] focus:outline-none text-white font-bold placeholder-slate-600"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#1A1C23] border border-[#2D313D] rounded-xl focus:border-[#7C6A96] focus:ring-1 focus:ring-[#7C6A96] focus:outline-none text-white font-bold placeholder-slate-600"
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#1A1C23] border border-[#2D313D] rounded-xl focus:border-[#7C6A96] focus:ring-1 focus:ring-[#7C6A96] focus:outline-none text-white font-bold placeholder-slate-600"
                placeholder="••••••••"
              />
            </div>
            {isLogin && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs sm:text-sm text-[#9E8BB9] hover:text-[#7C6A96] font-bold"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          {error && <div className="text-red-400 text-sm font-bold text-center bg-red-500/10 p-2 sm:p-3 rounded-xl">{error}</div>}
          {message && <div className="text-green-400 text-sm font-bold text-center bg-green-500/10 p-2 sm:p-3 rounded-xl">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C6A96] text-white font-bold py-2.5 sm:py-3 rounded-xl hover:bg-[#8A78A4] transition-colors flex items-center justify-center gap-2 mt-1 sm:mt-2"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-slate-400 font-bold text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }}
            className="text-[#9E8BB9] hover:text-[#7C6A96] underline"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
