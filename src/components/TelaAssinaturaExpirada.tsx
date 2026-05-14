import React, { useState } from 'react';
import { Lock, Timer, X, Copy, UploadCloud, Send } from 'lucide-react';
import { formatarDinheiro, DADOS_PAGAMENTO } from '../lib/utils';
import { t } from '../lib/translations';

interface Props {
  razao: 'expirada' | 'suspensa' | 'ok';
  expiracao: number;
  pendente: boolean;
  moeda: string;
  idioma: string;
  mensagemAdmin?: string;
  fazerLogout: () => void;
  processarComprovativo: (file: File) => Promise<string>;
  onUpload: (base64: string, meses: number, mensagem?: string) => Promise<void>;
}

export function TelaAssinaturaExpirada({ razao, expiracao, pendente, moeda, idioma, mensagemAdmin, fazerLogout, processarComprovativo, onUpload }: Props) {
  const [loading, setLoading] = useState(false);
  const [mesesSelecionados, setMesesSelecionados] = useState(1);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [mensagemAdm, setMensagemAdm] = useState("");
  const dataExpiracao = expiracao ? new Date(expiracao).toLocaleDateString(idioma === 'en' ? 'en-US' : 'pt-AO') : 'Desconhecida';

  const precoMensal = DADOS_PAGAMENTO.obterPrecoMensal(moeda);
  const isPDF = previewImagem?.startsWith('data:application/pdf');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true);
    try {
      const base64 = await processarComprovativo(file);
      setPreviewImagem(base64);
    } catch (err) {
      alert(t('upload_error', idioma));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const confirmarEnvio = async () => {
    if (!previewImagem) return;
    setLoading(true);
    try {
      await onUpload(previewImagem, mesesSelecionados, mensagemAdm);
      setPreviewImagem(null);
      setMensagemAdm("");
    } catch (err) {
      alert(t('send_error', idioma));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex justify-center items-center font-sans text-gray-100 p-4">
      <div className="w-full max-w-md bg-gray-900 flex flex-col items-center p-8 rounded-3xl shadow-2xl relative overflow-hidden border border-red-500/20">
        
        {previewImagem && (
          <div className="absolute inset-0 z-50 bg-gray-950 flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
             <div className="border-b border-gray-800 p-4 flex items-center justify-between shrink-0">
                <h3 className="text-white font-black uppercase tracking-widest text-[10px]">{t('payment_review', idioma)}</h3>
                <button onClick={() => setPreviewImagem(null)} disabled={loading} className="text-gray-400 hover:text-white p-2 bg-gray-800 rounded-full"><X size={20}/></button>
             </div>
             <div className="flex-1 min-h-0 p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="bg-black/40 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center min-h-[200px]">
                   {isPDF ? (
                     <iframe src={previewImagem!} className="w-full h-[400px] border-none rounded-lg" title="PDF Preview"></iframe>
                   ) : (
                     <img src={previewImagem!} alt="Preview" className="max-w-full max-h-[300px] object-contain" />
                   )}
                </div>

                <div className="flex flex-col gap-2">
                   <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest text-left w-full">{t('additional_info', idioma)}</label>
                   <textarea 
                      value={mensagemAdm} 
                      onChange={e => setMensagemAdm(e.target.value)}
                      placeholder={t('write_message_to_admin', idioma)}
                      className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl text-xs text-white outline-none focus:border-orange-500/50 transition-colors h-24 resize-none"
                   />
                </div>

                <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 text-left">
                   <p className="text-[9px] text-orange-400 font-bold uppercase mb-1">{t('reports', idioma)}</p>
                   <p className="text-xs text-white font-black">{mesesSelecionados} {mesesSelecionados === 1 ? t('month_single', idioma) : t('months_plural', idioma)} • <span className="text-orange-500">{formatarDinheiro(precoMensal * mesesSelecionados, moeda)}</span></p>
                </div>

                {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
             </div>
             <div className="bg-gray-950 border-t border-gray-800 p-4 flex gap-3 shrink-0 pb-6">
                <button onClick={() => setPreviewImagem(null)} disabled={loading} className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase bg-gray-900 text-gray-400 border border-gray-800">{t('cancel', idioma)}</button>
                <button onClick={confirmarEnvio} disabled={loading} className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase bg-orange-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">{loading ? t('analyzing_data', idioma).toUpperCase() : t('confirm_access', idioma).toUpperCase()}</button>
             </div>
          </div>
        )}

        {pendente ? (
           <div className="flex flex-col items-center text-center">
             <div className="bg-orange-500/20 p-5 rounded-full mb-6 mt-4 relative"><Timer size={48} className="text-orange-500" /></div>
             <h1 className="text-xl font-black tracking-widest text-white mb-2 uppercase">{t('pending_renewal', idioma)}</h1>
             <p className="text-gray-400 text-xs mb-8 px-4">{t('validating_payment', idioma)}</p>
             <button onClick={fazerLogout} className="w-full py-4 rounded-2xl font-bold text-xs bg-gray-800 text-gray-400">{t('exit_account', idioma)}</button>
           </div>
        ) : (
           <div className="flex flex-col items-center text-center w-full">
             <div className="bg-red-500/20 p-4 rounded-full mb-4 mt-2"><Lock size={32} className="text-red-500" /></div>
             <h1 className="text-2xl font-black tracking-widest text-white mb-2 uppercase">{t('access', idioma)} <span className="text-red-500 text-md">{t('locked_access', idioma).split(' ')[1]}</span></h1>
             
             {mensagemAdmin && (
               <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl mb-4 w-full">
                 <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-1 text-center">{t('support_notices', idioma)}</p>
                 <p className="text-xs text-white italic text-center">"{mensagemAdmin}"</p>
               </div>
             )}

             {razao === 'suspensa' ? <p className="text-gray-400 text-xs mb-6 px-4">{t('account_blocked_by_admin', idioma)}</p> : <p className="text-gray-400 text-xs mb-6 px-4">{t('session_ended', idioma)} {t('at', idioma)} <strong className="text-white">{dataExpiracao}</strong>.</p>}

             <div className="w-full bg-gray-800 border border-gray-700 p-5 rounded-2xl mb-4 text-left">
                <div className="flex justify-between items-center mb-3">
                   <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('time', idioma)}</span>
                   <div className="flex items-center gap-2 bg-gray-950 p-1 rounded-lg border border-gray-700">
                      <button onClick={() => setMesesSelecionados(p => Math.max(1, p-1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 text-white rounded font-bold">-</button>
                      <span className="text-xs font-black text-white w-12 text-center">{mesesSelecionados} {mesesSelecionados === 1 ? t('month_single', idioma) : t('months_plural', idioma)}</span>
                      <button onClick={() => setMesesSelecionados(p => p+1)} className="w-6 h-6 flex items-center justify-center bg-gray-800 text-white rounded font-bold">+</button>
                   </div>
                </div>
                <div className="flex justify-between items-center mb-4 bg-orange-500/10 p-2 rounded-lg border border-orange-500/20"><span className="text-[10px] text-orange-400 font-bold uppercase">Total:</span><span className="text-lg text-white font-black">{formatarDinheiro(precoMensal * mesesSelecionados, moeda)}</span></div>

                <p className="text-xs text-gray-400 mb-3">1. {t('choose_another', idioma)} {t('payment', idioma)}:</p>
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center justify-between bg-gray-950 p-3 rounded-xl border border-gray-800">
                    <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Multicaixa Express</p><p className="font-mono text-lg font-black text-emerald-400">{DADOS_PAGAMENTO.telefoneMCX}</p></div>
                    <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.telefoneMCX); alert(t('copied', idioma)); }} className="p-2 bg-gray-800 text-gray-300 rounded-lg flex gap-1 items-center text-[10px] uppercase font-bold"><Copy size={14}/> {t('copy', idioma)}</button>
                  </div>
                  {DADOS_PAGAMENTO.redotPayUid && (
                    <div className="flex items-center justify-between bg-gray-950 p-3 rounded-xl border border-red-500/20">
                      <div><p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">RedotPay (Dólar/USD)</p><p className="font-mono text-sm font-black text-white">UID: {DADOS_PAGAMENTO.redotPayUid}</p></div>
                      <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.redotPayUid); alert(t('copied', idioma)); }} className="p-2 bg-gray-800 text-gray-300 rounded-lg flex gap-1 items-center text-[10px] uppercase font-bold"><Copy size={14}/> {t('copy', idioma)}</button>
                    </div>
                  )}
                </div>
             </div>

             <div className="w-full text-left mb-6">
                <p className="text-xs text-orange-400 font-bold mb-2 uppercase tracking-tight">2. {t('upload_receipt_desc', idioma)}</p>
                <label className={`w-full bg-orange-600 text-white font-black text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 active:scale-95 transition-all ${loading ? 'opacity-50' : ''}`}>
                   {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><UploadCloud size={18}/> {t('upload_receipt', idioma).toUpperCase()}</>}
                   <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={loading} />
               </label>
                <p className="mt-2 text-[9px] text-gray-500 text-center uppercase font-bold tracking-widest">JPG, PNG {t('or', idioma)} PDF {t('recommended', idioma)}</p>
             </div>
             <button onClick={fazerLogout} className="w-full py-4 rounded-2xl font-bold text-xs bg-gray-800 text-gray-400">{t('logout', idioma)}</button>
           </div>
        )}
      </div>
    </div>
  );
}
