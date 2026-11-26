import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Field } from '../components/ui';

export default function Login() {
  const { login, signup, applySession, authError } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/');
      } else {
        const r = await signup(email, password, fullName);
        if (r.requiresConfirmation) {
          setNotice(r.message);
          setMode('login');
        } else if (r.token) {
          await applySession(r);
          navigate('/');
        } else {
          await login(email, password);
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.message + (err.details?.length ? ` — ${err.details.join(' · ')}` : ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel lateral */}
      <div className="hidden lg:flex w-1/2 bg-[#09090b] flex-col justify-between p-12 text-white">
        <img src="/brand-logo.png" alt="PIXELÉE Manager" className="h-12 w-[156px] object-contain object-left" />
        <div>
          <h1 className="text-3xl font-bold leading-tight">Toda la operación<br />en un solo lugar.</h1>
          <p className="text-slate-400 mt-4 max-w-md text-sm leading-relaxed">
            Clientes, proyectos, contabilidad, desarrollo, marketing, operaciones y gerencia,
            conectados directamente a tu base de datos de Supabase.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {['Clientes', 'Contabilidad', 'Desarrollo', 'Marketing', 'Operaciones', 'Gerencia'].map((x) => (
              <span key={x} className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-300">{x}</span>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">FASE 1 · Sistema local · COP · Supabase PostgreSQL + Auth</p>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="lg:hidden mb-7">
              <div className="inline-flex rounded-lg bg-[#09090b] px-3 py-2">
                <img src="/brand-logo.png" alt="PIXELÉE Manager" className="h-8 w-[104px] object-contain" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'login'
                ? 'Accede con tu usuario de Supabase Auth.'
                : 'El primer usuario registrado será el administrador.'}
            </p>

            <form onSubmit={submit} className="mt-6">
              {mode === 'signup' && (
                <Field label="Nombre completo" required>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input className="pl-9" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" />
                  </div>
                </Field>
              )}
              <Field label="Correo electrónico" required>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-9" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@empresa.com" />
                </div>
              </Field>
              <Field label="Contraseña" required>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-9" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </Field>

              {(error || authError) && (
                <div className="flex gap-2 items-start bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-3">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{error || authError}</span>
                </div>
              )}
              {notice && (
                <div className="flex gap-2 items-start bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-3 py-2 mb-3">
                  <Info size={15} className="mt-0.5 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2">
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'} <ArrowRight size={16} />
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 text-center">
              <button className="text-sm text-slate-500 hover:text-slate-900"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setNotice(''); }}>
                {mode === 'login' ? '¿Primera vez? Crear cuenta de administrador' : 'Ya tengo cuenta · Iniciar sesión'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 items-start text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-3">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <p>
              <strong>¿Primera vez?</strong> Usa «Crear cuenta» con el correo y la contraseña que quieras:
              el primer usuario recibe el rol de Administrador. En FASE 1 (sin SMTP configurado)
              el sistema confirma el correo automáticamente para poder entrar de inmediato.
              También puedes crear el usuario en Supabase Dashboard → Authentication → Add user.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
