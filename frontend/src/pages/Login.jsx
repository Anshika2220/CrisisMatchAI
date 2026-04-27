import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  signInWithGoogle, 
  signInEmail, 
  signUpEmail, 
  setupRecaptcha, 
  signInPhone 
} from '../services/firebase';
import { Activity, Mail, Lock, Eye, EyeOff, AlertTriangle, ArrowRight, Phone, Hash, Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (method === 'phone') {
      try {
        setupRecaptcha('recaptcha-container');
      } catch (err) {
        console.error("Recaptcha error:", err);
      }
    }
  }, [method]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError(`${err.code}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials or sign up for a new account.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInPhone(phoneNumber, appVerifier);
      setConfirmationResult(result);
    } catch (err) {
      setError(`${err.code}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      navigate('/');
    } catch (err) {
      setError(`${err.code}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#1DB954]/30 via-black to-black p-12 relative overflow-hidden">
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-[#1DB954]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-60px] w-[350px] h-[350px] rounded-full bg-[#1DB954]/8 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg shadow-[#1DB954]/40">
            <Activity className="w-6 h-6 text-black" strokeWidth={3} />
          </div>
          <span className="font-black text-2xl tracking-tight text-white">CrisisMatch</span>
        </div>

        <div className="z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-[#1DB954] text-sm font-bold tracking-widest uppercase">AI-Powered Relief</p>
            <h1 className="text-5xl font-black text-white leading-tight">
              Match the right<br />
              help to the right<br />
              <span className="text-[#1DB954]">crisis.</span>
            </h1>
          </div>
          <p className="text-[#b3b3b3] text-lg leading-relaxed max-w-md">
            Join thousands of volunteers and coordinators making a difference in real time. Every second counts.
          </p>
        </div>

        <p className="text-[#535353] text-xs z-10">CrisisMatch AI © 2026 · All rights reserved</p>
      </div>

      {/* Right panel – auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-black">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center">
              <Activity className="w-5 h-5 text-black" strokeWidth={3} />
            </div>
            <span className="font-black text-xl text-white">CrisisMatch</span>
          </div>

          <div>
            <h2 className="text-3xl font-black text-white">
              {mode === 'login' ? 'Welcome back' : 'Join us today'}
            </h2>
            <p className="text-[#b3b3b3] mt-1">
              {mode === 'login' ? 'Sign in to your account' : 'Create your free account'}
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-bold py-3 px-4 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-[#282828]" />
            <span className="text-[#535353] text-sm">or</span>
            <div className="flex-1 h-px bg-[#282828]" />
          </div>

          {/* Method Tabs */}
          <div className="flex bg-[#121212] p-1 rounded-full border border-[#282828]">
            <button
              onClick={() => { setMethod('email'); setError(''); setConfirmationResult(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold transition-all ${method === 'email' ? 'bg-[#282828] text-white shadow-lg' : 'text-[#b3b3b3] hover:text-white'}`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => { setMethod('phone'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold transition-all ${method === 'phone' ? 'bg-[#282828] text-white shadow-lg' : 'text-[#b3b3b3] hover:text-white'}`}
            >
              <Phone className="w-4 h-4" />
              Phone
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {method === 'email' ? (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#b3b3b3] mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535353]" />
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#121212] border border-[#282828] rounded-lg text-white placeholder-[#535353] focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#b3b3b3] mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535353]" />
                  <input
                    type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 bg-[#121212] border border-[#282828] rounded-lg text-white placeholder-[#535353] focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#535353] hover:text-[#b3b3b3]">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-black py-3 px-4 rounded-full transition-all duration-200 hover:scale-[1.02] disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>{mode === 'login' ? 'Sign in' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {!confirmationResult ? (
                <form onSubmit={handlePhoneSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#b3b3b3] mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535353]" />
                      <input
                        type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="w-full pl-10 pr-4 py-3 bg-[#121212] border border-[#282828] rounded-lg text-white placeholder-[#535353] focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div id="recaptcha-container"></div>
                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-black py-3 px-4 rounded-full transition-all duration-200 hover:scale-[1.02] disabled:opacity-60">
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Send Verification Code <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#b3b3b3] mb-2">Verification Code</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535353]" />
                      <input
                        type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full pl-10 pr-4 py-3 bg-[#121212] border border-[#282828] rounded-lg text-white placeholder-[#535353] focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-black py-3 px-4 rounded-full transition-all duration-200 hover:scale-[1.02] disabled:opacity-60">
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Verify Code <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <button type="button" onClick={() => setConfirmationResult(null)} className="w-full text-xs text-[#535353] hover:text-[#b3b3b3]">Change phone number</button>
                </form>
              )}
            </div>
          )}

          <p className="text-center text-[#b3b3b3] text-sm">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="text-white font-bold hover:text-[#1DB954] transition-colors underline-offset-2 hover:underline">
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          <p className="text-center">
            <Link to="/explore" className="text-[#535353] text-sm hover:text-[#b3b3b3] transition-colors">Continue without account →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
