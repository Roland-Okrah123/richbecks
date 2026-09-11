import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RBLogo from '../components/RBLogo';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-charcoal p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #d4a537 0, #d4a537 1px, transparent 1px, transparent 40px)',
          }}
        />
        <div className="relative z-10">
          <RBLogo size={64} />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-5xl font-extrabold text-white leading-tight">
            RICHBECKS<br /><span className="text-gold">Enterprise</span>
          </h1>
          <p className="text-white/50 mt-4 max-w-sm">
            Managing Fabrics. Growing Business. Wholesale &amp; Retail fabric operations,
            unified in one premium platform.
          </p>
        </div>
        <div className="relative z-10 text-white/30 text-xs">
          Poly/Stu Roundabout to VRA Road · Opp. Social Welfare School Main Gate
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-[#f4f5f7] p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <RBLogo size={56} />
            <h1 className="font-display text-2xl font-bold text-charcoal mt-3">RICHBECKS Enterprise</h1>
          </div>

          <h2 className="text-2xl font-display font-bold text-charcoal mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to manage your fabric business.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-charcoal">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@richbecks.com"
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-charcoal">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-3 transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">Secure · Reliable · Efficient</p>
        </div>
      </div>
    </div>
  );
}
