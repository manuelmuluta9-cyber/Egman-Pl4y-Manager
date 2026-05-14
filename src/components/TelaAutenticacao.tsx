import React, { useState, useEffect } from 'react';
import { Mail, Key, UserCog, LogIn, ArrowRight, ChevronLeft, Clock, Crown, UploadCloud, Info, Globe } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import { EgmanLogo } from './EgmanLogo';
import { formatarDinheiro, DADOS_PAGAMENTO } from '../lib/utils';
import { t, languages } from '../lib/translations';

interface Props {
  onCustomAuth: (isLogin: boolean, email: string, pass: string, plan?: string, cert?: string | null, months?: number, message?: string) => Promise<void>;
  erroExterno: string;
  processarComprovativo: (file: File) => Promise<string>;
  onSuperAdminClick?: () => void;
  idiomaInicial?: string;
  onIdiomaChange?: (lang: string) => void;
}

export function TelaAutenticacao({ onCustomAuth, erroExterno, processarComprovativo, onSuperAdminClick, idiomaInicial = 'pt-AO', onIdiomaChange }: Props) {
  const [step, setStep] = useState<'auth' | 'preferences' | 'select_plan' | 'payment' | 'recovery'>('auth');
  const [moeda, setMoeda] = useState('Kz');
  const [idioma, setIdioma] = useState(idiomaInicial);
  const [pressTimer, setPressTimer] = useState<any>(null);

  useEffect(() => {
    setIdioma(idiomaInicial);
  }, [idiomaInicial]);

  const handleIdiomaSelect = (lang: string) => {
    setIdioma(lang);
    onIdiomaChange?.(lang);
    localStorage.setItem('pm_idioma', lang);
  };

  const handleLogoDown = () => {
    const timer = setTimeout(() => {
      onSuperAdminClick?.();
    }, 4000); // 4 seconds long press
    setPressTimer(timer);
  };

  const handleLogoUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };
  const [emailSalvo] = useState(() => localStorage.getItem('pm_saved_email') || '');
  const [trialUsado] = useState(() => localStorage.getItem('pm_trial_used') === 'true');

  const [isLogin, setIsLogin] = useState(emailSalvo !== '');
  const [email, setEmail] = useState(emailSalvo);
  const [password, setPassword] = useState('');
  const [pinRecuperacao, setPinRecuperacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [mesesSelecionados, setMesesSelecionados] = useState(1);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [mensagemAdm, setMensagemAdm] = useState("");

  const [recStage, setRecStage] = useState(1);
  const [recEmail, setRecEmail] = useState('');
  const [recPinInput, setRecPinInput] = useState('');
  const [recNovaPass, setRecNovaPass] = useState('');
  const [recConfirmPass, setRecConfirmPass] = useState('');
  const [adminPinValidado, setAdminPinValidado] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (isLogin) {
      setLoading(true);
      try { await onCustomAuth(true, email, password); }
      catch (err: any) { setErro(err.message); }
      finally { setLoading(false); }
    }
    else {
      if (password.length < 4) return setErro(t('password_too_short', idioma));
      if (pinRecuperacao.length !== 4) return setErro(t('pin_invalid', idioma));
      setLoading(true);
      try {
        const emailLimpo = email.toLowerCase().trim();
        const emailSafe = emailLimpo.replace(/[^a-z0-9]/g, '_');
        const docRef = doc(db, `artifacts/${appId}/public/data/contas`, emailSafe);
        const snap = await getDoc(docRef);

        if (snap.exists() || emailLimpo === 'admin@cloud.com' || emailLimpo === 'egman.admin@egman.com') {
          setErro(t('auth_error_exists', idioma));
          setIsLogin(true);
        } else {
          setStep('preferences');
        }
      } catch (err) { setErro(t('error_server', idioma)); }
      finally { setLoading(false); }
    }
  };

  const verificarEmailRecuperacao = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(''); setLoading(true);
    try {
      const emailLimpo = recEmail.toLowerCase().trim();
      const emailSafe = emailLimpo.replace(/[^a-z0-9]/g, '_');
      const docRef = doc(db, `artifacts/${appId}/public/data/contas`, emailSafe);
      const snap = await getDoc(docRef);
      if (!snap.exists()) { setErro(t('email_not_found', idioma)); setLoading(false); return; }

      const configRef = doc(db, `artifacts/${appId}/public/data/settings_${emailSafe}`, 'geral');
      const configSnap = await getDoc(configRef);
      if (configSnap.exists() && configSnap.data().adminPin) {
        setAdminPinValidado(configSnap.data().adminPin);
      } else {
        setAdminPinValidado('1234');
      }
      setRecStage(2);
    } catch (err) { setErro(t('error_occurred', idioma)); }
    finally { setLoading(false); }
  };

  const verificarPinRecuperacao = (e: React.FormEvent) => {
    e.preventDefault(); setErro('');
    if (recPinInput === adminPinValidado) { setRecStage(3); }
    else { setErro(t('invalid_pin', idioma)); setRecPinInput(''); }
  };

  const salvarNovaPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('');
    if (recNovaPass.length < 4) return setErro(t('password_too_short', idioma));
    if (recNovaPass !== recConfirmPass) return setErro(t('passwords_not_match', idioma));
    setLoading(true);
    try {
      const emailSafe = recEmail.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      await updateDoc(doc(db, `artifacts/${appId}/public/data/contas`, emailSafe), { password: recNovaPass });
      alert(t('recovery_success', idioma));
      setStep('auth'); setIsLogin(true); setEmail(recEmail); setPassword('');
    } catch (err) { setErro(t('error_occurred', idioma)); }
    finally { setLoading(false); }
  };

  const handleChoiceTrial = async () => {
    setLoading(true); try { await onCustomAuth(false, email, password, 'trial'); } catch (err: any) { setErro(err.message); setStep('auth'); } finally { setLoading(false); }
  };

  const handleUploadNewPayment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true);
    try {
      const base64 = await processarComprovativo(file);
      setPreviewImagem(base64);
    } catch (err) {
      setErro(t('error_processing_file', idioma));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const confirmarEnvioPayment = async () => {
    setLoading(true);
    try {
      await onCustomAuth(false, email, password, 'premium_pendente', previewImagem, mesesSelecionados, mensagemAdm);
      setPreviewImagem(null);
      setMensagemAdm("");
    } catch (err) {
      setErro(t('error_processing_file', idioma));
    } finally {
      setLoading(false);
    }
  };

  const isPDF = previewImagem?.startsWith('data:application/pdf');

  const getPricePerMonth = () => {
    switch (moeda) {
      case '$': return 5;
      case '€': return 5;
      case 'R$': return 30;
      case 'MT': return 400;
      case 'Kz': return 5000;
      default: return 5000;
    }
  };

  const getPricePerHour = () => {
    switch (moeda) {
      case '$': return 1;
      case '€': return 1;
      case 'R$': return 6;
      case 'MT': return 80;
      case 'Kz': return 1000;
      default: return 1000;
    }
  };

  const handleSavePreferences = async () => {
    const emailLimpo = email.toLowerCase().trim();
    const emailSafe = emailLimpo.replace(/[^a-z0-9]/g, '_');
    setLoading(true);
    try {
      await setDoc(doc(db, `artifacts/${appId}/public/data/settings_${emailSafe}`, 'geral'), {
        adminPin: pinRecuperacao,
        precoHora: getPricePerHour(),
        sistemaAberto: true,
        categoriasEntrada: ['Sessão Jogo', 'Bar / Snacks', 'Eventos/Torneios', 'Outros'],
        categoriasDespesa: ['Energia / Água', 'Internet', 'Funcionários', 'Manutenção', 'Compras Bar', 'Outros'],
        moeda: moeda,
        idioma: idioma
      });
      setStep('select_plan');
    } catch (err) {
      setErro(t('error_saving_prefs', idioma));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'preferences') {
    return (
      <div className="min-h-screen bg-gray-950 flex justify-center items-center font-sans text-gray-100 p-4">
        <div className="w-full max-w-md bg-gray-900 flex flex-col p-8 rounded-3xl shadow-2xl relative border border-gray-800">
           <button onClick={() => setStep('auth')} className="text-gray-400 mb-6 self-start flex items-center gap-1 hover:text-white"><ChevronLeft size={18}/> {t('back_to_login', idioma)}</button>
           <h2 className="text-xl font-black text-white mb-2 uppercase flex items-center gap-2"><UserCog className="text-emerald-500"/> {t('admin_setup', idioma)}</h2>
           <p className="text-xs text-gray-400 mb-8">{t('onboarding_desc', idioma)}</p>

           <div className="flex flex-col gap-6">
              <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl">
                 <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-2">{t('choose_currency', idioma)}</label>
                 <select 
                    value={moeda} 
                    onChange={e => setMoeda(e.target.value)}
                    className="w-full bg-transparent text-white font-black text-lg outline-none"
                 >
                    <option value="Kz" className="bg-gray-900">Kwanza (AOA)</option>
                    <option value="$" className="bg-gray-900">Dólar (USD)</option>
                    <option value="€" className="bg-gray-900">Euro (EUR)</option>
                    <option value="R$" className="bg-gray-900">Real (BRL)</option>
                    <option value="MT" className="bg-gray-900">Metical (MZN)</option>
                 </select>
              </div>

              <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl">
                 <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">{t('choose_language', idioma)}</label>
                 <div className="grid grid-cols-2 gap-2 mt-3">
                    {Object.entries(languages).map(([code, data]) => (
                      <button 
                        key={code} 
                        onClick={() => handleIdiomaSelect(code)}
                        className={`p-3 rounded-xl font-bold uppercase tracking-tight transition-all border flex items-center gap-2 ${idioma === code ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-800 border-transparent text-gray-500 hover:text-white'}`}
                      >
                        <span className="text-lg">{data.flag}</span>
                        <span className="text-[9px]">{data.label}</span>
                      </button>
                    ))}
                 </div>
              </div>

              <button 
                onClick={handleSavePreferences} 
                disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white mt-4 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {loading ? '...' : <>{t('save_and_continue', idioma)} <ArrowRight size={18}/></>}
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (step === 'recovery') {
    return (
      <div className="min-h-screen bg-gray-950 flex justify-center items-center font-sans text-gray-100 p-4">
        <div className="w-full max-w-md bg-gray-900 flex flex-col p-8 rounded-3xl shadow-2xl relative border border-gray-800">
           <button onClick={() => { setStep('auth'); setRecStage(1); setErro(''); }} className="text-gray-400 mb-6 self-start flex items-center gap-1 hover:text-white"><ChevronLeft size={18}/> {t('back_to_login', idioma)}</button>
           <h2 className="text-xl font-black text-white mb-2 uppercase flex items-center gap-2"><Key className="text-orange-500"/> {t('recovery_title', idioma)}</h2>
           <p className="text-xs text-gray-400 mb-8">{t('recovery_desc', idioma)}</p>

           {erro && <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4 font-bold text-center">{erro}</div>}

           {recStage === 1 && (
              <form onSubmit={verificarEmailRecuperacao} className="flex flex-col gap-4">
                 <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl focus-within:border-orange-500 transition-colors"><label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">{t('email_label', idioma)}</label><input type="email" value={recEmail} onChange={e => setRecEmail(e.target.value)} className="w-full bg-transparent text-white font-medium text-sm outline-none" required /></div>
                 <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-black text-sm bg-orange-600 hover:bg-orange-500 text-white mt-2 shadow-lg shadow-orange-500/20">{loading ? '...' : t('verify_email', idioma)}</button>
              </form>
           )}

           {recStage === 2 && (
              <form onSubmit={verificarPinRecuperacao} className="flex flex-col gap-4">
                 <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl focus-within:border-emerald-500 transition-colors"><label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">{t('insert_admin_pin', idioma)}</label><input type="text" maxLength={4} autoFocus value={recPinInput} onChange={e => setRecPinInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-transparent text-white font-mono text-2xl tracking-[0.5em] text-center outline-none" placeholder="****" required /></div>
                 <p className="text-[10px] text-gray-500 text-center">{t('pin_security_msg', idioma)}</p>
                 <button type="submit" className="w-full py-4 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white mt-2 shadow-lg shadow-emerald-500/20">{t('validate_pin', idioma)}</button>
              </form>
           )}

           {recStage === 3 && (
              <form onSubmit={salvarNovaPassword} className="flex flex-col gap-4">
                 <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl focus-within:border-orange-500 transition-colors"><label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">{t('new_password', idioma)}</label><input type="password" value={recNovaPass} onChange={e => setRecNovaPass(e.target.value)} className="w-full bg-transparent text-white font-medium text-sm outline-none" required /></div>
                 <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl focus-within:border-orange-500 transition-colors"><label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">{t('confirm_new_password', idioma)}</label><input type="password" value={recConfirmPass} onChange={e => setRecConfirmPass(e.target.value)} className="w-full bg-transparent text-white font-medium text-sm outline-none" required /></div>
                 <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-black text-sm bg-orange-600 hover:bg-orange-500 text-white mt-2 shadow-lg shadow-orange-500/10">{loading ? t('saving', idioma) : t('reset_password', idioma)}</button>
              </form>
           )}
        </div>
      </div>
    );
  }

  if (step === 'select_plan') {
    return (
      <div className="min-h-screen bg-gray-950 flex justify-center items-center font-sans text-gray-100 p-4">
        <div className="w-full max-w-md bg-gray-900 flex flex-col p-8 rounded-3xl shadow-2xl relative border border-gray-800">
           <button onClick={() => setStep('auth')} className="text-gray-400 mb-6 self-start flex items-center gap-1 hover:text-white"><ChevronLeft size={18}/> {t('back', idioma)}</button>
           <h2 className="text-xl font-black text-white mb-2">{t('choose_plan', idioma)}</h2><p className="text-xs text-gray-400 mb-8">{t('how_to_start', idioma)}</p>

           <div className="flex flex-col gap-4">
              {trialUsado ? (
                <div className="bg-gray-800/30 border border-gray-700/50 p-5 rounded-2xl flex flex-col items-start opacity-60 cursor-not-allowed">
                   <div className="flex justify-between w-full mb-2"><span className="font-bold text-gray-500 text-lg flex items-center gap-2"><Clock className="text-gray-600"/> {t('7_days_free', idioma)}</span><span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-1 font-bold rounded-lg uppercase">{t('sold_out', idioma)}</span></div>
                   <p className="text-xs text-gray-500 text-left">{t('trial_used_msg', idioma)}</p>
                </div>
              ) : (
                <button onClick={handleChoiceTrial} disabled={loading} className="bg-gray-800 border border-gray-700 hover:border-emerald-500 p-5 rounded-2xl flex flex-col items-start transition-all group">
                   <div className="flex justify-between w-full mb-2"><span className="font-bold text-white text-lg flex items-center gap-2"><Clock className="text-emerald-500"/> {t('7_days_free', idioma)}</span><span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 font-bold rounded-lg uppercase">{t('recommended', idioma)}</span></div>
                   <p className="text-xs text-gray-400 text-left">{t('pay_later', idioma)}</p>
                </button>
              )}
              <button onClick={() => setStep('payment')} disabled={loading} className="bg-gradient-to-tr from-orange-900/40 to-orange-800/40 border border-orange-500/30 hover:border-orange-500 p-5 rounded-2xl flex flex-col items-start transition-all">
                 <div className="flex justify-between w-full mb-2"><span className="font-bold text-white text-lg flex items-center gap-2"><Crown className="text-orange-400"/> {t('premium_access', idioma)}</span><span className="text-orange-400 font-black">{formatarDinheiro(getPricePerMonth(), moeda)}/{t('month', idioma)}</span></div>
                 <p className="text-xs text-orange-200/70 text-left">{t('guarantee_month', idioma)}</p>
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-gray-950 flex justify-center items-center font-sans text-gray-100 p-4">
        <div className="w-full max-w-md bg-gray-900 flex flex-col p-6 rounded-3xl shadow-2xl relative overflow-hidden border border-orange-500/30">
           {previewImagem && (
             <div className="absolute inset-0 z-50 bg-gray-950 flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
                <div className="border-b border-gray-800 p-4 flex items-center justify-between shrink-0">
                   <h3 className="text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2"><Crown size={18} className="text-orange-500"/> {t('payment_review', idioma)}</h3>
                   <button onClick={() => setPreviewImagem(null)} disabled={loading} className="text-gray-400 hover:text-white p-2 bg-gray-800 rounded-full"><ChevronLeft size={20}/></button>
                </div>
                <div className="flex-1 min-h-0 p-4 flex flex-col gap-4 overflow-y-auto bg-[#05080c]">
                   <div className="bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center min-h-[220px]">
                      {isPDF ? (
                        <iframe src={previewImagem!} className="w-full h-[400px] border-none rounded-lg" title="PDF Preview"></iframe>
                      ) : (
                        <img src={previewImagem!} alt="Preview" className="max-w-full max-h-[300px] object-contain shadow-2xl shadow-orange-500/5" />
                      )}
                   </div>

                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{t('additional_info', idioma)}</label>
                     <textarea 
                        value={mensagemAdm} 
                        onChange={e => setMensagemAdm(e.target.value)}
                        placeholder={t('write_message_to_admin', idioma)}
                        className="w-full bg-[#0a0f16] border border-gray-800 p-3 rounded-xl text-xs text-white outline-none focus:border-orange-500/50 transition-colors h-24 resize-none"
                     />
                  </div>

                  <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                     <p className="text-[9px] text-orange-400 font-bold uppercase mb-1">{t('purchase_summary', idioma)}</p>
                     <p className="text-xs text-white font-black">{mesesSelecionados} {mesesSelecionados === 1 ? t('month_single', idioma) : t('months_plural', idioma)} • <span className="text-orange-500">{formatarDinheiro(getPricePerMonth() * mesesSelecionados, moeda)}</span></p>
                  </div>

                   {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
                </div>
                <div className="bg-gray-950 border-t border-gray-800 p-4 flex gap-3 shrink-0 pb-6">
                   <button onClick={() => setPreviewImagem(null)} disabled={loading} className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase bg-gray-900 border border-gray-800 text-gray-400 tracking-widest">{t('cancel', idioma)}</button>
                   <button onClick={confirmarEnvioPayment} disabled={loading} className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase bg-orange-600 text-white shadow-lg shadow-orange-500/20 tracking-widest">{t('finish_purchase', idioma)}</button>
                </div>
             </div>
           )}

           <button onClick={() => setStep('select_plan')} className="text-gray-400 mb-4 self-start flex items-center gap-1 hover:text-white"><ChevronLeft size={18}/> {t('back', idioma)}</button>
           
           <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl mb-4 text-center"><Crown size={32} className="text-orange-500 mx-auto mb-2"/><h3 className="font-black text-white uppercase tracking-widest">{t('activate_premium', idioma)}</h3></div>

           <div className="bg-gray-800 border border-gray-700 p-5 rounded-2xl mb-6">
              <div className="flex justify-between items-center mb-3">
                 <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('subscription_time', idioma)}</span>
                 <div className="flex items-center gap-2 bg-gray-950 p-1 rounded-lg border border-gray-700">
                    <button onClick={() => setMesesSelecionados(p => Math.max(1, p-1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 text-white rounded font-bold">-</button>
                    <span className="text-xs font-black text-white w-12 text-center">{mesesSelecionados} {mesesSelecionados === 1 ? t('month', idioma) : t('months', idioma)}</span>
                    <button onClick={() => setMesesSelecionados(p => p+1)} className="w-6 h-6 flex items-center justify-center bg-gray-800 text-white rounded font-bold">+</button>
                 </div>
              </div>
              <div className="flex justify-between items-center mb-4 bg-orange-500/10 p-2 rounded-lg border border-orange-500/20"><span className="text-[10px] text-orange-400 font-bold uppercase">Total:</span><span className="text-lg text-white font-black">{formatarDinheiro(getPricePerMonth() * mesesSelecionados, moeda)}</span></div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-4">
                 <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest leading-tight">
                   {t('choose_payment_method', idioma)}
                 </p>
              </div>

              <div className="flex flex-col gap-3">
                 <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Multicaixa Express (AO)</p>
                   <div className="flex items-center justify-between">
                     <p className="font-mono text-lg font-black text-emerald-400">{DADOS_PAGAMENTO.telefoneMCX}</p>
                     <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.telefoneMCX); alert(t('copied', idioma)); }} className="p-2 text-xs font-bold text-gray-300 bg-gray-900 rounded-lg">{t('copy', idioma)}</button>
                   </div>
                 </div>

                 {DADOS_PAGAMENTO.redotPayUid && (
                   <div className="bg-gray-950 p-3 rounded-xl border border-orange-500/20">
                     <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-1">RedotPay (USDT/USD)</p>
                     <div className="flex items-center justify-between">
                       <p className="font-mono text-sm font-black text-white">UID: {DADOS_PAGAMENTO.redotPayUid}</p>
                       <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.redotPayUid!); alert(t('copied', idioma)); }} className="p-2 text-xs font-bold text-gray-300 bg-gray-900 rounded-lg">{t('copy', idioma)}</button>
                     </div>
                   </div>
                 )}
              </div>
           </div>

           <div>
              <p className="text-xs text-orange-400 font-bold mb-3">{t('upload_screenshot_msg', idioma)}</p>
              <label className="w-full bg-orange-600 text-white font-black text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 active:scale-95 transition-all">
                 <UploadCloud size={18}/> {t('upload_payment', idioma)}
                 <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUploadNewPayment} disabled={loading} />
              </label>
              <p className="mt-2 text-[10px] text-gray-500 text-center uppercase font-bold tracking-widest">{t('accepted_formats', idioma)}</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex justify-center items-center font-sans text-gray-100 p-4">
      <div className="w-full max-w-md bg-gray-900 flex flex-col items-center p-8 rounded-3xl shadow-2xl relative border border-gray-800">
        
        {/* Language Selector Above Auth Card */}
        <div className="w-full max-w-xs flex justify-center gap-3 mb-8 bg-gray-900/50 backdrop-blur-sm p-2 rounded-2xl border border-gray-800/50">
          {Object.entries(languages).map(([code, data]) => (
            <button 
              key={code}
              onClick={() => handleIdiomaSelect(code)}
              title={data.label}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all relative group ${idioma === code ? 'bg-orange-500/20 border-2 border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-gray-800 border border-transparent hover:bg-gray-700'}`}
            >
              <span>{data.flag}</span>
              {idioma === code && (
                <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-0.5 border border-gray-900">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                </div>
              )}
              <span className="absolute -top-8 bg-gray-800 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase pointer-events-none whitespace-nowrap">
                {data.label}
              </span>
            </button>
          ))}
        </div>

        <div 
          className="mb-6 flex flex-col items-center select-none active:scale-95 transition-transform cursor-pointer"
          onMouseDown={handleLogoDown}
          onMouseUp={handleLogoUp}
          onMouseLeave={handleLogoUp}
          onTouchStart={handleLogoDown}
          onTouchEnd={handleLogoUp}
        >
          <EgmanLogo size={120} className="mb-4 drop-shadow-2xl" />
          <h1 className="text-2xl font-black tracking-widest text-white">EGMAN <span className="text-orange-500">PLAY</span></h1>
        </div>
        
        <div className="flex bg-gray-800 rounded-xl p-1 mb-6 w-full text-center">
          <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${isLogin ? 'bg-emerald-500 text-emerald-950 shadow-md' : 'text-gray-500'}`}>{t('enter', idioma)}</button>
          <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${!isLogin ? 'bg-orange-500 text-orange-950 shadow-md' : 'text-gray-500'}`}>{t('create_account', idioma)}</button>
        </div>
        
        {(erro || erroExterno) && <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4 font-bold text-center">{erro || erroExterno}</div>}
        
        <form onSubmit={handleAuthSubmit} className="w-full flex flex-col gap-3">
          <div className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex items-center gap-3 focus-within:border-emerald-500 transition-colors">
            <Mail size={18} className="text-gray-500" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent text-white font-medium text-sm outline-none" placeholder={t('email_label', idioma)} required />
          </div>
          
          {!isLogin && (
            <div className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex items-center gap-3 focus-within:border-emerald-500 transition-colors">
              <UserCog size={18} className="text-gray-500" />
              <input type="text" maxLength={4} value={pinRecuperacao} onChange={e => setPinRecuperacao(e.target.value.replace(/\D/g, ''))} className="w-full bg-transparent text-white font-medium text-sm outline-none" placeholder={t('pin_label', idioma)} required />
            </div>
          )}

          <div className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex items-center gap-3 focus-within:border-emerald-500 transition-colors">
            <Key size={18} className="text-gray-500" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-transparent text-white font-medium text-sm outline-none" placeholder={t('password_label', idioma)} required />
          </div>
          
          {isLogin && <button type="button" onClick={() => { setStep('recovery'); setRecEmail(email); }} className="text-[10px] text-orange-400 font-bold self-end mt-1 uppercase tracking-widest">{t('forgot_password', idioma)}</button>}

          <button type="submit" disabled={loading} className={`w-full mt-2 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 ${isLogin ? 'bg-emerald-600 text-white' : 'bg-orange-600 text-white'} ${loading ? 'opacity-50' : ''}`}>
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (isLogin ? <><LogIn size={18}/> {t('login_btn', idioma)}</> : <>{t('continue', idioma)} <ArrowRight size={18}/></>)}
          </button>
        </form>
      </div>
    </div>
  );
}
