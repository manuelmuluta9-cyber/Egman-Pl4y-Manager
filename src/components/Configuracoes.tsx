import React, { useState } from 'react';
import { Settings, Crown, UploadCloud, Settings2, Trash2, X, MessageSquare, Bell, AlertCircle } from 'lucide-react';
import { Config, Assinatura } from '../types';
import { formatarDinheiro, DADOS_PAGAMENTO } from '../lib/utils';
import { t } from '../lib/translations';

interface Props {
  config: Config;
  atualizarConfig: (novasConfigs: Partial<Config>) => Promise<void>;
  assinatura: Assinatura | null;
  onUpload: (base64: string, meses: number, mensagem?: string) => Promise<void>;
  processarComprovativo: (file: File) => Promise<string>;
  mostrarAlerta: (titulo: string, mensagem: string) => void;
  registarAuditoria: (acao: string, detalhe: string) => Promise<void>;
  apagarContaNegocio: () => void;
  onVerHistorico?: () => void;
  temaEscuro?: boolean;
}

export function Configuracoes({ config, atualizarConfig, assinatura, onUpload, processarComprovativo, mostrarAlerta, registarAuditoria, apagarContaNegocio, onVerHistorico, temaEscuro }: Props) {
  const [preco, setPreco] = useState(config.precoHora);
  const [pin, setPin] = useState(config.adminPin);
  const [moeda, setMoeda] = useState(config.moeda || 'Kz');
  const [idioma, setIdioma] = useState(config.idioma || 'pt-AO');
  const [aberto, setAberto] = useState(config.sistemaAberto);
  const [uploading, setUploading] = useState(false);
  const [mesesSelecionados, setMesesSelecionados] = useState(1);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [mensagemAdm, setMensagemAdm] = useState("");
  const [alertaAngolaFechado, setAlertaAngolaFechado] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<'mcx' | 'usd' | 'usdt' | 'iban' | 'paypal'>('mcx');
  const dataExpiracao = assinatura?.expiracao ? new Date(assinatura.expiracao).toLocaleDateString(idioma === 'en' ? 'en-US' : idioma === 'fr' ? 'fr-FR' : idioma === 'es' ? 'es-ES' : 'pt-AO') : '...';

  const guardar = () => { 
    atualizarConfig({ precoHora: Number(preco), adminPin: pin, sistemaAberto: aberto, moeda, idioma: idioma }); 
    mostrarAlerta(t('success', idioma), t('settings_updated', idioma)); 
    registarAuditoria("CONFIG_UPDATE", "Alterou configurações"); 
  };


  const handleRenovacao = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]; if(!file) return;
     setUploading(true);
     try {
        const base64 = await processarComprovativo(file);
        setPreviewImagem(base64);
     } catch(e) {
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
    } catch(e) {
       mostrarAlerta(t('error', idioma), t('error_uploading_file', idioma));
    } finally {
       setUploading(false);
    }
  };

  const isPDF = previewImagem?.startsWith('data:application/pdf');

  return (
    <div className={`p-4 pb-20 animate-in fade-in ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>
      <h2 className={`text-[11px] font-black tracking-[0.2em] ${temaEscuro ? 'text-white' : 'text-gray-900'} mb-4 flex gap-2 items-center uppercase`}><Settings className="text-orange-500" size={14}/> {t('settings', idioma)}</h2>
      
      <div className={`${temaEscuro ? 'bg-gradient-to-tr from-gray-900 to-gray-800 border-gray-700 shadow-xl' : 'bg-orange-50 border-orange-200 shadow-sm'} border p-4 rounded-2xl mb-4 relative overflow-hidden text-[10px]`}>
         <div className="absolute -right-4 -top-4 opacity-10"><Crown size={120}/></div>

         {previewImagem && (
            <div className="absolute inset-0 z-[100] bg-gray-950 flex flex-col animate-in slide-in-from-bottom duration-300">
               <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
                  <h3 className="text-white font-black uppercase tracking-widest text-[10px]">{t('payment_review', idioma)}</h3>
                  <button onClick={() => setPreviewImagem(null)} className="text-gray-400 p-2"><X size={20}/></button>
               </div>
               <div className="flex-1 min-h-0 p-4 flex flex-col gap-4 overflow-y-auto">
                  <div className="bg-black/40 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center min-h-[200px]">
                     {isPDF ? (
                       <iframe src={previewImagem!} className="w-full h-[300px] border-none rounded-lg" title="PDF Preview"></iframe>
                     ) : (
                       <img src={previewImagem!} alt="Comprovativo" className="max-w-full max-h-[300px] object-contain" />
                     )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                     <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{t('description', idioma)} (Opcional)</label>
                     <textarea 
                        value={mensagemAdm} 
                        onChange={e => setMensagemAdm(e.target.value)}
                        placeholder="..."
                        className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl text-xs text-white outline-none focus:border-orange-500/50 transition-colors h-24 resize-none"
                     />
                  </div>

                  <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                     <p className="text-[9px] text-orange-400 font-bold uppercase mb-1">{t('reports', idioma)}</p>
                     <p className="text-xs text-white font-black">{mesesSelecionados} {mesesSelecionados === 1 ? t('month_single', idioma) : t('months_plural', idioma)} • <span className="text-orange-500">{formatarDinheiro(DADOS_PAGAMENTO.obterPrecoMensal(moeda) * mesesSelecionados, moeda)}</span></p>
                  </div>
               </div>
               <div className="p-4 bg-gray-950 border-t border-gray-800 flex gap-3 pb-6 shrink-0">
                  <button onClick={() => setPreviewImagem(null)} className="flex-1 py-4 bg-gray-900 text-gray-400 font-black text-[10px] uppercase rounded-xl border border-gray-800">{t('cancel', idioma)}</button>
                  <button onClick={confirmarEnvio} disabled={uploading} className="flex-1 py-4 bg-orange-600 text-white font-black text-[10px] uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20">
                     {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('save', idioma).toUpperCase()}
                  </button>
               </div>
            </div>
         )}
         <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10"><Crown size={12} className="text-orange-400"/> {t('license', idioma)}</h3>
         <div className="grid grid-cols-2 gap-3 mb-3 relative z-10">
            <div><p className="text-[7px] text-gray-500 font-bold uppercase mb-0.5">{t('plan', idioma)}</p><p className={`text-[10px] font-black ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>{assinatura?.plano || 'Standard'}</p></div>
            <div><p className="text-[7px] text-gray-500 font-bold uppercase mb-0.5">{t('validity', idioma)}</p><p className={`text-[10px] font-black ${assinatura?.ativa ? 'text-emerald-400' : 'text-red-400'}`}>{dataExpiracao}</p></div>
         </div>
         {assinatura?.pendente ? (
            <div className="bg-orange-500/20 text-orange-400 p-2 rounded-xl border border-orange-500/30 text-[8px] font-bold uppercase tracking-widest text-center">{t('pending_renewal', idioma)}</div>
         ) : (
            <div className="relative z-10">
               <div className={`flex justify-between items-center mb-3 ${temaEscuro ? 'bg-gray-950/40 border-white/5' : 'bg-white/50 border-gray-200'} p-2 rounded-xl border`}>
                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">{t('duration', idioma)}</span>
                  <div className="flex items-center gap-2">
                     <button onClick={() => setMesesSelecionados(p => Math.max(1, p-1))} className={`w-6 h-6 flex items-center justify-center ${temaEscuro ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'} text-white rounded-md font-black border transition-active active:scale-90`}>-</button>
                     <span className={`text-[9px] font-black ${temaEscuro ? 'text-white' : 'text-gray-900'} w-6 text-center`}>{mesesSelecionados}</span>
                     <button onClick={() => setMesesSelecionados(p => p+1)} className={`w-6 h-6 flex items-center justify-center ${temaEscuro ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'} text-white rounded-md font-black border transition-active active:scale-90`}>+</button>
                  </div>
               </div>

               <div className="flex justify-between items-center mb-2 p-1.5 bg-orange-500/5 rounded-lg border border-orange-500/10">
                  <span className="text-[8px] text-orange-400 font-bold uppercase">{t('paying_total', idioma)}:</span>
                  <span className={`text-[10px] font-black ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>{formatarDinheiro(DADOS_PAGAMENTO.obterPrecoMensal(moeda) * mesesSelecionados, moeda)}</span>
               </div>


               <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-3">
                  <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest leading-tight">
                    {t('immediate_activation', idioma)}
                  </p>
               </div>

               <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 no-scrollbar">
                  <button 
                    onClick={() => { setMetodoPagamento('mcx'); setAlertaAngolaFechado(false); }}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${metodoPagamento === 'mcx' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                  >
                    {t('multicaixa_express', idioma)}
                  </button>
                  <button 
                    onClick={() => { setMetodoPagamento('iban'); setAlertaAngolaFechado(false); }}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${metodoPagamento === 'iban' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                  >
                    {t('bank_transfer', idioma)}
                  </button>
                  <button 
                    onClick={() => setMetodoPagamento('usdt')}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${metodoPagamento === 'usdt' ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                  >
                    RedotPay
                  </button>
                  <button 
                    onClick={() => setMetodoPagamento('paypal')}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${metodoPagamento === 'paypal' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
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

               <div className="flex flex-col gap-3 mb-6">
                  {metodoPagamento === 'mcx' ? (
                    <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 shadow-inner group relative overflow-hidden">
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
                          <button 
                            onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.bfa!); alert(t('copied', idioma)); }} 
                            className="p-2 text-[8px] font-black text-blue-400 bg-blue-500/10 rounded-lg uppercase"
                          >
                            {t('copy', idioma)}
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-xl border border-gray-800">
                          <div className="flex flex-col">
                            <span className="text-[7px] text-blue-400 font-black uppercase">ATLÂNTICO</span>
                            <span className="font-mono text-[10px] font-black text-white">{DADOS_PAGAMENTO.atlantico!}</span>
                          </div>
                          <button 
                            onClick={() => { navigator.clipboard.writeText(DADOS_PAGAMENTO.atlantico!); alert(t('copied', idioma)); }} 
                            className="p-2 text-[8px] font-black text-blue-400 bg-blue-500/10 rounded-lg uppercase"
                          >
                            {t('copy', idioma)}
                          </button>
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
                    <div className="bg-gray-950 p-4 rounded-2xl border border-orange-500/20 shadow-inner group relative overflow-hidden">
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
               </div>

               <p className="text-[10px] text-gray-400 mb-2 font-bold uppercase tracking-widest leading-none">2. {t('upload_receipt_desc', idioma)}</p>
               <label className={`w-full bg-orange-600 text-white font-black text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 active:scale-95 transition-all ${uploading ? 'opacity-50' : ''}`}>
                 {uploading ? <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" /> : <><UploadCloud size={18}/> {t('upload_receipt', idioma)}</>}
                 <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleRenovacao} disabled={uploading} />
               </label>
            </div>
         )}
      </div>

      <div className={`${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-4 rounded-2xl flex flex-col gap-3 shadow-sm mb-4`}>
         <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2"><MessageSquare size={14} className="text-indigo-500"/> {t('support_notices', idioma)}</h3>
         <button 
           onClick={onVerHistorico}
           className="w-full py-2.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
         >
           <Bell size={14} /> {t('audit_history', idioma)}
         </button>
      </div>

      <div className={`${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-4 rounded-2xl flex flex-col gap-3 shadow-sm`}>
         <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Settings2 size={14} className="text-gray-500"/> {t('params', idioma)}</h3>
         <label className="text-[8px] text-gray-400 font-bold uppercase tracking-widest flex flex-col gap-1.5">{t('price_per_hour', idioma)}<input type="number" value={preco} onChange={e=>setPreco(Number(e.target.value))} className={`${temaEscuro ? 'bg-gray-950 border-gray-800 text-white' : 'bg-gray-100 border-gray-200 text-gray-900 shadow-inner'} border p-2 rounded-lg outline-none font-black text-sm`} /></label>
         <label className="text-[8px] text-gray-400 font-bold uppercase tracking-widest flex flex-col gap-1.5">{t('currency', idioma)}
              <select 
                value={moeda} 
                onChange={e => setMoeda(e.target.value)}
                className={`${temaEscuro ? 'bg-gray-950 border-gray-800 text-white' : 'bg-gray-100 border-gray-200 text-gray-900 shadow-inner'} border p-2 rounded-lg outline-none font-black text-xs`}
              >
                <option value="Kz" className="bg-gray-900">{t('kwanza_ao', idioma)}</option>
                <option value="$" className="bg-gray-900">{t('dollar_usd', idioma)}</option>
                <option value="€" className="bg-gray-900">{t('euro_eur', idioma)}</option>
                <option value="R$" className="bg-gray-900">{t('real_brl', idioma)}</option>
                <option value="MT" className="bg-gray-900">{t('metical_mzn', idioma)}</option>
              </select>
            </label>
          <label className="text-[8px] text-gray-400 font-bold uppercase tracking-widest flex flex-col gap-1.5">{t('system_language', idioma)}
            <select 
              value={idioma} 
              onChange={e => setIdioma(e.target.value)} 
              className={`${temaEscuro ? 'bg-gray-950 border-gray-800 text-white' : 'bg-gray-100 border-gray-200 text-gray-900 shadow-inner'} border p-2 rounded-lg outline-none font-bold text-xs`}
            >
              <option value="pt-AO">Português (AO)</option>
              <option value="en">English (US)</option>
              <option value="fr">Français (FR)</option>
              <option value="es">Español (ES)</option>
            </select>
          </label>
         <label className="text-[8px] text-gray-400 font-bold uppercase tracking-widest flex flex-col gap-1.5">{t('admin_pin', idioma)}<input type="text" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g, ''))} className={`${temaEscuro ? 'bg-gray-950 border-gray-800 text-white' : 'bg-gray-100 border-gray-200 text-gray-900 shadow-inner'} border p-2 rounded-lg outline-none font-black tracking-[0.5em] text-center text-sm`} /></label>
         
         <div className={`${temaEscuro ? 'bg-gray-950 border-gray-800' : 'bg-gray-100 border-gray-200 shadow-inner'} border p-3 rounded-lg mt-1`}>
            <label className={`flex items-center justify-between text-xs ${temaEscuro ? 'text-white' : 'text-gray-900'} font-bold cursor-pointer`}>
               <span className="uppercase tracking-widest text-[10px]">{t('open_system', idioma)}</span>
               <input type="checkbox" checked={aberto} onChange={e=>setAberto(e.target.checked)} className="h-4 w-4 accent-emerald-500"/>
            </label>
         </div>

         <button onClick={guardar} className="bg-orange-600 text-white font-black tracking-widest text-[11px] py-3 rounded-xl mt-1 shadow-lg">{t('save_changes', idioma)}</button>
      </div>

      <div className={`${temaEscuro ? 'bg-red-900/10 border-red-500/30' : 'bg-red-50 border-red-200 shadow-sm'} border p-4 rounded-2xl mt-4`}>
         <h3 className="text-red-500 font-black text-xs mb-1 uppercase tracking-widest">{t('danger_zone', idioma)}</h3>
         <button onClick={apagarContaNegocio} className="w-full bg-red-600 text-white font-black text-[9px] py-3 rounded-xl flex items-center justify-center gap-2"><Trash2 size={14}/> {t('delete_account', idioma)}</button>
      </div>
    </div>
  );
}
