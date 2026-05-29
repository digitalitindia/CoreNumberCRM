import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Shield } from 'lucide-react';

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Registration successful! Please check your email or sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Logged in successfully!');
        if (onLogin) onLogin();
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-[440px] bg-slate-50/40 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-8 md:p-10 relative z-10">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-sm shadow-purple-500/20">
            <Shield className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-wide">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 text-sm">
            {isSignUp ? 'Sign up to secure your CRM data' : 'Sign in to access your CRM'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200/50 rounded-xl text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder-slate-500 text-base"
              placeholder="Email address"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200/50 rounded-xl text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder-slate-500 text-base"
              placeholder="Password (min 6 chars)"
            />
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white py-3.5 rounded-xl font-bold text-[15px] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:hover:scale-100 flex justify-center items-center h-12"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                isSignUp ? 'Sign Up' : 'Sign In'
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
