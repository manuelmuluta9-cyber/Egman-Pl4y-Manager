import React, { useState } from 'react';
import { LogOut, Crown, AlertCircle, UploadCloud, ChevronRight, X, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Assinatura, Config } from '../types';
import { formatarDinheiro, DADOS_PAGAMENTO } from '../lib/utils';
import { t } from '../lib/translations';

interface Props {
  assinatura: Assinatura | null;
  razao?: 'expirada' | 'suspensa' | 'ok';
  onSair: () => void;
  onUpload: (base64: string, meses: number, mensagem?: string) => Promise<void>;
  processarComprovativo: (file: File) => Promise<string>;
  mostrarAlerta: (titulo: string, mensagem: string) => void;
  config: Config;
  idioma: string;
}

export function TelaAssinaturaExpirada({ assinatura, razao, onSair, onUpload, processarComprovativo, mostrarAlerta, config, idioma }: Props) {
  const [uploading, setUploading] = useState(false);
  const [mesesSelecionados, setMesesSelecionados] = useState(1);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [mensagemAdm, setMensagemAdm] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState<'mcx' | 'usd' | 'usdt' | 'iban' | 'paypal'>('mcx');
  const [alertaAngolaFechado, setAlertaAngolaFechado] = useState(false);

  const expiracao = assinatura?.expiracao || Date.now();
  const currentRazao = razao || assinatura?.razao || 'expirada';
  const dataFormatada = new Date(expiracao).toLocaleDateString(idioma === 'en' ? 'en-US' : idioma === 'fr' ? 'fr-FR' : idioma === 'es' ? 'es-ES' : 'pt-AO');

  const handleRenovacao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const base64 = await processarComprovativo(file);
      setPreviewImagem(base64);
    } catch (err) {
      mostrarAlerta(t('error', idioma), t('error_processing_file', idioma));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const confirmarEnvio = async () => {
    if (!previewImagem) return;
    setUploading(true);
    try {
      await onUpload(previewImagem, mesesSelecionados, mensagemAdm);
      setPreviewImagem(null);
      setMensagemAdm("");
    } catch (err) {
      mostrarAlerta(t('error', idioma), t('error_uploading_file', idioma));
    } finally {
      setUploading(false);
    }
  };

  const isPDF = previewImagem?.startsWith('data:application/pdf');

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-gray-100">
      <div className="w-full max-w-md bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-800 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Crown size={120} /></div>

        <div className="p-8 pb-4 relative z-10">
          <div className="bg-red-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
            <AlertCircle className="text-red-500" size={32} />
          </div>

          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2 leading-tight">
            {currentRazao === 'suspensa' ? t('account_suspended', idioma) : t('expired_access', idioma)}
          </h2>
          <p className="text-xs text-gray-400 mb-8 leading-relaxed uppercase font-bold tracking-widest opacity-80 decoration-red-500/50">
            {t('validity', idioma)}: <span className="text-red-500 font-black">{dataFormatada}</span>
          </p>

          <div className="bg-orange-500/5 border border-orange-500/10 p-5 rounded-3xl mb-8">
            <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Crown size={14} /> {t('renew_license', idioma)}
            </h3>

            {previewImagem ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
                <div className="bg-black/40 rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center min-h-[180px] relative group">
                  {isPDF ? (
                    <iframe src={previewImagem!} className="w-full h-[250px] border-none" title="PDF Preview"></iframe>
                  ) : (
                    <img src={previewImagem!} alt="Preview" className="max-w-full max-h-[250px] object-contain shadow-2xl transition-transform group-hover:scale-105" />
                  )}
                  <button onClick={() => setPreviewImagem(null)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg active:scale-90 transition-all"><X size={16} /></button>
                </div>

                <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] text-orange-400 font-black uppercase tracking-widest">{t('reports', idioma)}</span>
                    <span className="text-xs font-black text-white">{mesesSelecionados} {mesesSelecionados === 1 ? t('month_single', idioma) : t('months_plural', idioma)}</span>
                  </div>
                  <p className="text-lg font-black text-white">{formatarDinheiro(DADOS_PAGAMENTO.obterPrecoMensal(config.moeda) * mesesSelecionados, config.moeda)}</p>
                </div>

                <button
                  onClick={confirmarEnvio}
                  disabled={uploading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('send_renew', idioma)}
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-gray-950/40 p-4 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{t('duration', idioma)}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setMesesSelecionados(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-700 text-white rounded-lg font-black active:scale-90 transition-active">-</button>
                      <span className="text-xs font-black text-white w-10 text-center">{mesesSelecionados}</span>
                      <button onClick={() => setMesesSelecionados(p => p + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-700 text-white rounded-lg font-black active:scale-90 transition-active">+</button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-[10px] text-orange-400 font-bold uppercase">{t('total_to_pay', idioma)}:</span>
                    <span className="text-sm font-black text-white">{formatarDinheiro(DADOS_PAGAMENTO.obterPrecoMensal(config.moeda) * mesesSelecionados, config.moeda)}</span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                  <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest leading-tight">
                    {t('immediate_activation', idioma)}
                  </p>
                </div>

                <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 no-scrollbar">
                  <button 
                    onClick={() => { setMetodoPagamento('mcx'); setAlertaAngolaFechado(false); }}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${metodoPagamento === 'mcx' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                  >
                    {t('multicaixa_express', idioma)}
                  </button>
                  <button 
                    onClick={() => { setMetodoPagamento('iban'); setAlertaAngolaFechado(false); }}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${metodoPagamento === 'iban' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                  >
                    {t('bank_transfer', idioma)}
                  </button>
                  <button 
                    onClick={() => setMetodoPagamento('usdt')}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${metodoPagamento === 'usdt' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                  >
                    USDT / USD
                  </button>
                  <button 
                    onClick={() => setMetodoPagamento('paypal')}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${metodoPagamento === 'paypal' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                  >
                    PayPal
                  </button>
                </div>

                {(metodoPagamento === 'mcx' || metodoPagamento === 'iban') && !alertaAngolaFechado && (
                  <div className="mb-4 bg-red-600 p-3 rounded-xl flex items-center justify-between gap-2 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={18} className="text-white shrink-0" />
                        <p className="text-[10px] text-white font-black uppercase tracking-widest leading-tight">
                          {t('only_angola', idioma)}
                        </p>
                    </div>
                    <button 
                      onClick={() => setAlertaAngolaFechado(true)}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {metodoPagamento === 'mcx' ? (
                    <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 shadow-inner group relative overflow-hidden transition-all">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/40 via-transparent to-transparent"></div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('multicaixa_express', idioma)} (AO)</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xl font-black text-white">{DADOS_PAGAMENTO.telefoneMCX}</p>
                        <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.telefoneMCX); alert(t('copied', idioma)); }} className="p-2.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 rounded-xl hover:bg-emerald-500/20 transition-all uppercase tracking-tight border border-emerald-500/20">{t('copy', idioma)}</button>
                      </div>
                    </div>
                  ) : metodoPagamento === 'iban' ? (
                    <div className="bg-gray-950 p-4 rounded-2xl border border-blue-500/20 shadow-inner group relative overflow-hidden space-y-3">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/40 via-transparent to-transparent"></div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('bank_transfer', idioma)}</p>
                      
                      <div>
                        <p className="text-[8px] text-gray-600 font-black uppercase mb-0.5">{t('titular', idioma)}</p>
                        <p className="text-xs font-black text-white uppercase">{DADOS_PAGAMENTO.titular}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-xl border border-gray-800">
                          <div className="flex flex-col">
                            <span className="text-[7px] text-blue-400 font-black uppercase">BFA</span>
                            <span className="font-mono text-[10px] font-black text-white">{DADOS_PAGAMENTO.bfa!}</span>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.bfa!); alert(t('copied', idioma)); }} className="p-2 text-[8px] font-black text-blue-400 bg-blue-500/10 rounded-lg uppercase">{t('copy', idioma)}</button>
                        </div>
                        <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-xl border border-gray-800">
                          <div className="flex flex-col">
                            <span className="text-[7px] text-blue-400 font-black uppercase">ATLÂNTICO</span>
                            <span className="font-mono text-[10px] font-black text-white">{DADOS_PAGAMENTO.atlantico!}</span>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.atlantico!); alert(t('copied', idioma)); }} className="p-2 text-[8px] font-black text-blue-400 bg-blue-500/10 rounded-lg uppercase">{t('copy', idioma)}</button>
                        </div>
                      </div>
                    </div>
                  ) : metodoPagamento === 'paypal' ? (
                    <div className="bg-gray-950 p-4 rounded-2xl border border-blue-500/20 shadow-inner group relative overflow-hidden transition-all">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/40 via-transparent to-transparent"></div>
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">PayPal</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[8px] text-gray-600 font-black uppercase mb-0.5">Email / ID</p>
                          <p className="font-mono text-[10px] font-black text-white break-all">{DADOS_PAGAMENTO.paypalEmail}</p>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.paypalEmail!); alert(t('copied', idioma)); }} className="p-2.5 text-[10px] font-black text-blue-400 bg-blue-500/10 rounded-xl hover:bg-blue-500/20 transition-all uppercase tracking-tight border border-blue-500/20 shrink-0 ml-2">{t('copy', idioma)}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-950 p-4 rounded-2xl border border-orange-500/20 shadow-inner group relative overflow-hidden transition-all">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/40 via-transparent to-transparent"></div>
                      <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-1">RedotPay (USDT / USD)</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[8px] text-gray-600 font-black uppercase mb-0.5">UID Account</p>
                          <p className="font-mono text-lg font-black text-white">{DADOS_PAGAMENTO.redotPayUid}</p>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.redotPayUid!); alert(t('copied', idioma)); }} className="p-2.5 text-[10px] font-black text-orange-400 bg-orange-500/10 rounded-xl hover:bg-orange-500/20 transition-all uppercase tracking-tight border border-orange-500/20">{t('copy', idioma)}</button>
                      </div>
                    </div>
                  )}

                  <label className="w-full bg-orange-600 text-white font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 active:scale-95 transition-all">
                    {uploading ? <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" /> : <><UploadCloud size={18} /> {t('upload_receipt', idioma)}</>}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleRenovacao} disabled={uploading} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 pt-0 bg-gray-900 border-t border-gray-800 flex gap-4">
          <button
            onClick={onSair}
            className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black text-[10px] uppercase rounded-2xl border border-gray-700 transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> {t('logout', idioma)}
          </button>
        </div>
      </div>
    </div>
  );
}
