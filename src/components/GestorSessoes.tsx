import React, { useState, useEffect } from 'react';
import { MonitorPlay, Settings2, ChevronLeft, AlertCircle, Pause, Play, Square, Timer, Clock, X, Plus, Lock, Cpu, Gamepad2, Minus, Trash2, Copy } from 'lucide-react';
import { Maquina, Sessao, Config, Role } from '../types';
import { formatTimeDisplay, formatarDinheiro } from '../lib/utils';
import { deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '../lib/translations';

interface Props {
  config: Config;
  sessoes: Sessao[];
  maquinas: Maquina[];
  role: Role;
  podeOperar: boolean;
  iniciarSessaoConfirmada: (maquina: Maquina, modo: 'livre' | 'prepago' | 'pospago' | 'jogos', mins: number, valor: number, totalJogos?: number, nomeJogo?: string) => void;
  excluirCategoriaJogo?: (nome: string) => void;
  alternarPausaSessao: (sessao: Sessao) => void;
  terminarSessao: (sessao: Sessao) => void;
  consumirJogo?: (sessao: Sessao) => void;
  adicionarJogos?: (sessao: Sessao, qtd: number, valor: number) => void;
  registarAuditoria: (acao: string, detalhe: string) => Promise<void>;
  mostrarConfirmacao: (titulo: string, mensagem: string, onConfirm: () => void) => void;
  adicionarMaquinaGlobal: (nome: string) => Promise<void>;
  db: any;
  appId: string;
  contaNegocio: string;
  temaEscuro: boolean;
  idioma?: string;
}

function ModalSetupSessao({ maquina, precoHora, onClose, onStart, temaEscuro, config, idioma, onExcluirCategoria }: { maquina: Maquina, precoHora: number, onClose: () => void, onStart: (modo: 'livre' | 'prepago' | 'pospago' | 'jogos', mins: number, valor: number, totalJogos?: number, nomeJogo?: string) => void, temaEscuro: boolean, config: Config, idioma: string, onExcluirCategoria?: (nome: string) => void }) {
  const [modo, setModo] = useState<'livre' | 'prepago' | 'pospago' | 'jogos'>('livre');
  const [minutos, setMinutos] = useState(30);
  const [valorFixo, setValorFixo] = useState(Math.ceil((30 / 60) * precoHora));
  const [precoLivre, setPrecoLivre] = useState(precoHora);
  const [qtdJogos, setQtdJogos] = useState(1);
  const [precoPorJogo, setPrecoPorJogo] = useState(config.precoJogo || 50);
  const [valorJogos, setValorJogos] = useState(precoPorJogo);
  const [nomeJogo, setNomeJogo] = useState('');

  useEffect(() => { 
    if (modo === 'prepago' || modo === 'pospago') {
      setValorFixo(Math.ceil((minutos / 60) * precoHora)); 
    }
  }, [minutos, precoHora, modo]);

  useEffect(() => {
    if (modo === 'jogos') {
      setValorJogos(qtdJogos * precoPorJogo);
    }
  }, [qtdJogos, precoPorJogo, modo]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-sm rounded-[2.5rem] overflow-hidden border shadow-2xl ${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
      >
        <div className="p-4 pb-0 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-orange-500/10 rounded-lg">
                <Cpu size={16} className="text-orange-500" />
             </div>
             <span className="font-black text-[10px] uppercase tracking-widest text-gray-400">{maquina.nome}</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800/50 rounded-full transition-colors text-gray-500"><X size={16}/></button>
        </div>
        <div className="p-4">
          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-4 text-center">{t('setup_session', idioma)}</p>
          <div className="flex bg-gray-950/50 border border-gray-800/50 rounded-xl p-1 mb-6 overflow-x-auto scrollbar-hide no-scrollbar">
            <button onClick={() => setModo('livre')} className={`flex-1 min-w-[65px] py-2 text-[8px] font-black uppercase rounded-lg transition-all duration-300 ${modo === 'livre' ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}>{t('free', idioma)}</button>
            <button onClick={() => setModo('prepago')} className={`flex-1 min-w-[65px] py-2 text-[8px] font-black uppercase rounded-lg transition-all duration-300 ${modo === 'prepago' ? 'bg-blue-500 text-blue-950 shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}>{t('prepaid', idioma)}</button>
            <button onClick={() => setModo('pospago')} className={`flex-1 min-w-[65px] py-2 text-[8px] font-black uppercase rounded-lg transition-all duration-300 ${modo === 'pospago' ? 'bg-purple-500 text-purple-950 shadow-lg shadow-purple-500/20' : 'text-gray-500 hover:text-gray-300'}`}>{t('postpaid', idioma)}</button>
            <button onClick={() => setModo('jogos')} className={`flex-1 min-w-[65px] py-2 text-[8px] font-black uppercase rounded-lg transition-all duration-300 ${modo === 'jogos' ? 'bg-orange-500 text-orange-950 shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-gray-300'}`}>{t('games', idioma)}</button>
          </div>

          <div className="min-h-[160px]">
          <AnimatePresence mode="wait">
            {modo === 'jogos' ? (
              <motion.div 
                key="jogos"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                 <div className="bg-gray-950/40 border border-gray-800/60 p-4 rounded-[2rem] shadow-inner space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-3 ml-1">{t('saved_games', idioma) || 'Jogos Guardados'}</label>
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {config.categoriasJogos?.map(cat => (
                          <div key={cat} className="relative">
                            <button
                              onClick={() => setNomeJogo(cat)}
                              className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-[9px] font-black uppercase transition-all shadow-sm ${nomeJogo === cat ? 'bg-orange-500 border-orange-500 text-orange-950' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                            >
                              {cat}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onExcluirCategoria?.(cat); }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-950 active:scale-95 transition-transform hover:bg-red-500 z-10"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest block ml-1">{t('game_name', idioma)}</label>
                        <div className="relative group">
                          <input 
                            type="text" 
                            value={nomeJogo} 
                            onChange={e => setNomeJogo(e.target.value)} 
                            placeholder="..." 
                            className="w-full bg-gray-900/50 border border-gray-800 p-2.5 rounded-xl text-white text-xs font-bold outline-none focus:border-orange-500 transition-all placeholder:text-gray-700 pr-10"
                          />
                          {nomeJogo && (
                            <button 
                              onClick={() => setNomeJogo('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-gray-800/80 text-gray-400 hover:text-white rounded-full transition-colors active:scale-90"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                     <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-900/40 p-2 rounded-2xl border border-gray-800/40">
                           <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest block mb-1 text-center">{t('games', idioma)}</label>
                           <div className="flex items-center justify-center gap-4">
                              <button onClick={() => setQtdJogos(Math.max(1, qtdJogos - 1))} className="p-1.5 w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors active:scale-90"><Minus size={14}/></button>
                              <span className="text-white font-black text-lg tracking-tighter">{qtdJogos}</span>
                              <button onClick={() => setQtdJogos(qtdJogos + 1)} className="p-1.5 w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors active:scale-90"><Plus size={14}/></button>
                           </div>
                        </div>
                        <div className="bg-gray-900/40 p-2 rounded-2xl border border-gray-800/40">
                           <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest block mb-1 text-center">{t('price_per_game', idioma) || 'Preço/Jogo'}</label>
                           <div className="flex items-center justify-center">
                              <input 
                                type="number" 
                                value={precoPorJogo} 
                                onChange={e => setPrecoPorJogo(Number(e.target.value))}
                                className="w-full bg-transparent text-center text-white font-black text-lg outline-none"
                              />
                           </div>
                        </div>
                     </div>
                 </div>

                 <div className="bg-orange-500/5 border border-orange-500/10 p-2.5 rounded-2xl flex flex-col items-center mt-3">
                    <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest mb-0.5">{t('service_value', idioma)}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[9px] text-orange-500 font-bold">{config.moeda}</span>
                      <span className="text-2xl font-black text-white">{valorJogos}</span>
                    </div>
                 </div>
              </motion.div>
            ) : (modo === 'prepago' || modo === 'pospago') ? (
              <motion.div 
                key="time"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-3 bg-gray-950/40 border border-gray-800/60 rounded-2xl shadow-inner space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{t('time', idioma)} (MIN)</label>
                      <span className="text-lg font-black text-white">{minutos} <span className="text-[9px] text-gray-500">min</span></span>
                    </div>
                    <input type="range" min="5" max="300" step="5" value={minutos} onChange={e => setMinutos(Number(e.target.value))} className="w-full accent-orange-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    <div className="grid grid-cols-4 gap-1.5">
                       {[15, 30, 60, 120].map(m => (
                         <button key={m} onClick={() => setMinutos(m)} className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${minutos === m ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-gray-900 border border-gray-800 text-gray-500 hover:border-gray-700'}`}>{m}m</button>
                       ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center pt-1">
                    <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-0.5">{t('total_value', idioma)}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[9px] text-blue-400 font-bold">{config.moeda}</span>
                      <span className="text-2xl font-black text-white">{valorFixo}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
                <div 
                   key="livre"
                   className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl flex flex-col items-center text-center space-y-3"
                >
                  <div className="p-3 bg-emerald-500/10 rounded-full">
                     <Timer size={30} className="text-emerald-500 animate-pulse" />
                  </div>
                  <div>
                     <h3 className="text-white font-black uppercase tracking-widest text-xs mb-1">{t('free_mode', idioma)}</h3>
                     <p className="text-[9px] text-gray-500 font-bold leading-relaxed">{t('free_mode_desc', idioma)}</p>
                  </div>
                  <div className="flex flex-col items-center">
                      <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">{t('price_per_hour', idioma)}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[9px] text-emerald-500 font-bold">{config.moeda}</span>
                        <span className="text-2xl font-black text-white">{precoLivre}</span>
                      </div>
                   </div>
                </div>
            )}
          </AnimatePresence>
          </div>

          <button 
            onClick={() => onStart(modo, minutos, modo === 'livre' ? precoLivre : (modo === 'jogos' ? valorJogos : valorFixo), qtdJogos, nomeJogo)} 
            className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl mt-4 flex items-center justify-center gap-2 ${
              modo === 'livre' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 
              modo === 'prepago' ? 'bg-blue-600 text-white shadow-blue-600/20' :
              modo === 'pospago' ? 'bg-purple-600 text-white shadow-purple-600/20' :
              'bg-orange-600 text-white shadow-orange-600/20'
            }`}
          >
            <Play size={16} />
            {modo === 'jogos' ? `${t('launch', idioma)} ${qtdJogos} ${t('games', idioma)}` : t('start_session', idioma)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalAdicionarJogos({ sessao, precoPorJogo: precoInicial, onClose, onAdd, temaEscuro, moneda, idioma }: { sessao: Sessao, precoPorJogo: number, onClose: () => void, onAdd: (qtd: number, valor: number) => void, temaEscuro: boolean, moneda: string, idioma: string }) {
  const [qtd, setQtd] = useState(1);
  const [precoPorJogo, setPrecoPorJogo] = useState(precoInicial);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`w-full max-w-xs rounded-3xl overflow-hidden border ${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="p-4 flex justify-between items-center border-b border-gray-800">
           <h3 className="text-white font-black uppercase text-[10px] tracking-widest">{t('add_games', idioma)}</h3>
           <button onClick={onClose} className="text-gray-500 p-1.5"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-5">
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-950/50 p-2 rounded-2xl border border-gray-800">
                 <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest block mb-1 text-center">{t('games', idioma)}</label>
                 <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setQtd(Math.max(1, qtd - 1))} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg text-white active:scale-95 transition-all"><Minus size={12}/></button>
                    <span className="text-xl font-black text-white tracking-tighter">{qtd}</span>
                    <button onClick={() => setQtd(qtd + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg text-white active:scale-95 transition-all"><Plus size={12}/></button>
                 </div>
              </div>
              <div className="bg-gray-950/50 p-2 rounded-2xl border border-gray-800">
                 <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest block mb-1 text-center">{t('price', idioma)}</label>
                 <div className="flex items-center justify-center">
                    <input 
                      type="number" 
                      value={precoPorJogo} 
                      onChange={e => setPrecoPorJogo(Number(e.target.value))}
                      className="w-full bg-transparent text-center text-white font-black text-lg outline-none"
                    />
                 </div>
              </div>
           </div>
           <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800 flex justify-between items-center">
              <span className="text-[9px] text-gray-500 font-bold uppercase">{t('value_to_pay', idioma)}</span>
              <span className="text-lg font-black text-orange-500">{formatarDinheiro(qtd * precoPorJogo, moneda)}</span>
           </div>
           <button onClick={() => onAdd(qtd, qtd * precoPorJogo)} className="w-full py-3.5 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-600/20 active:scale-95 transition-all">{t('confirm_add', idioma)}</button>
        </div>
      </div>
    </div>
  );
}

export function GestorSessoes({ config, sessoes, maquinas, role, podeOperar, iniciarSessaoConfirmada, excluirCategoriaJogo, alternarPausaSessao, terminarSessao, consumirJogo, adicionarJogos, registarAuditoria, mostrarConfirmacao, adicionarMaquinaGlobal, db, appId, contaNegocio, temaEscuro, idioma = 'pt-AO' }: Props) {
  const [maquinaSetup, setMaquinaSetup] = useState<Maquina | null>(null);
  const [sessaoRecarga, setSessaoRecarga] = useState<Sessao | null>(null);
  const [novaMaquinaNome, setNovaMaquinaNome] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calcularMs = (sessao: Sessao) => {
    if (sessao.modo === 'jogos') return 0;
    const final = sessao.emPausa ? sessao.momentoPausa! : now;
    const decorrido = final - sessao.inicio;

    if (sessao.modo === 'prepago' && sessao.tempoPrePagoMin) {
      const totalMs = sessao.tempoPrePagoMin * 60 * 1000;
      return Math.max(0, totalMs - decorrido);
    }
    return decorrido;
  };

  const sessoesMap = sessoes.reduce((acc, s) => {
    acc[s.maquinaId] = s;
    return acc;
  }, {} as Record<string, Sessao>);

  const getModeColors = (modo?: 'livre' | 'prepago' | 'pospago' | 'jogos') => {
    if (!modo) return {
      card: 'bg-gray-950 border-gray-800 border-dashed opacity-80',
      icon: 'bg-gray-800 text-gray-500',
      accent: 'text-gray-500',
      label: 'text-gray-500',
      glow: 'transparent'
    };

    switch (modo) {
      case 'livre':
        return {
          card: 'bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-500/5',
          icon: 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20',
          accent: 'text-emerald-500',
          label: 'text-emerald-400',
          glow: 'bg-emerald-500',
          shadow: 'shadow-emerald-500/20'
        };
      case 'prepago':
        return {
          card: 'bg-blue-950/20 border-blue-500/30 shadow-lg shadow-blue-500/5',
          icon: 'bg-blue-500 text-blue-950 shadow-lg shadow-blue-500/20',
          accent: 'text-blue-500',
          label: 'text-blue-400',
          glow: 'bg-blue-500',
          shadow: 'shadow-blue-500/20'
        };
      case 'pospago':
        return {
          card: 'bg-purple-950/20 border-purple-500/30 shadow-lg shadow-purple-500/5',
          icon: 'bg-purple-500 text-purple-950 shadow-lg shadow-purple-500/20',
          accent: 'text-purple-500',
          label: 'text-purple-400',
          glow: 'bg-purple-500',
          shadow: 'shadow-purple-500/20'
        };
      case 'jogos':
        return {
          card: 'bg-orange-950/20 border-orange-500/30 shadow-lg shadow-orange-500/5',
          icon: 'bg-orange-500 text-orange-950 shadow-lg shadow-orange-500/20',
          accent: 'text-orange-500',
          label: 'text-orange-400',
          glow: 'bg-orange-500',
          shadow: 'shadow-orange-500/20'
        };
      default:
        return {
          card: 'bg-gray-800 border-gray-700',
          icon: 'bg-indigo-500 text-indigo-950 shadow-lg shadow-indigo-500/20',
          accent: 'text-indigo-500',
          label: 'text-gray-400',
          glow: 'bg-indigo-500',
          shadow: 'shadow-indigo-500/20'
        };
    }
  };

  return (
    <div className="p-4 flex flex-col gap-6">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">{t('sessions', idioma)}</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{sessoes.length} {t('active_now', idioma)}</p>
         </div>
         {role === 'admin' && (
           <div className="flex gap-2">
              <input type="text" placeholder={t('new_maquina', idioma)} value={novaMaquinaNome} onChange={e => setNovaMaquinaNome(e.target.value)} className="bg-gray-950 border border-gray-800 text-xs p-2 rounded-xl text-white outline-none w-24" />
              <button onClick={() => { adicionarMaquinaGlobal(novaMaquinaNome); setNovaMaquinaNome(''); }} className="p-2 bg-orange-500 text-gray-950 rounded-xl"><Plus size={18}/></button>
           </div>
         )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {maquinas.map(maquina => {
          const sessao = sessoesMap[maquina.id];
          const colors = getModeColors(sessao?.modo);

          return (
            <motion.div 
              layout
              key={maquina.id} 
              className={`p-3 rounded-2xl border transition-all duration-500 relative overflow-hidden group ${colors.card}`}
            >
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center gap-2">
                   <div className={`p-2 rounded-xl transition-all duration-500 ${colors.icon}`}>
                      {sessao?.modo === 'jogos' ? <Gamepad2 size={16}/> : <MonitorPlay size={16}/>}
                   </div>
                   <div>
                      <h4 className="text-white font-black text-[10px] uppercase tracking-tight leading-none mb-0.5">{maquina.nome}</h4>
                      <p className={`text-[7px] font-black uppercase tracking-widest transition-colors duration-500 ${colors.label}`}>
                        {sessao ? (sessao.modo === 'jogos' ? (sessao.nomeJogo || t('games', idioma)) : t(sessao.modo, idioma)) : t('available', idioma)}
                      </p>
                   </div>
                </div>
                {role === 'admin' && !sessao && (
                  <button onClick={() => mostrarConfirmacao(t('delete', idioma), t('confirm_delete_machine', idioma), () => deleteDoc(doc(db, `artifacts/${appId}/public/data/maquinas_${contaNegocio}`, maquina.id)))} className="text-gray-700 hover:text-red-500 transition-colors active:scale-90"><Trash2 size={12}/></button>
                )}
              </div>

              {sessao ? (
                <div className="space-y-3 relative z-10">
                  {sessao.modo === 'jogos' ? (
                    <div className={`bg-gray-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-2 rounded-2xl border transition-colors duration-500 ${colors.card} relative overflow-hidden group`}>
                       <span className="text-[6px] font-black text-gray-500 uppercase tracking-widest mb-1 z-10">{t('games_left', idioma)}</span>
                       <div className="flex items-center gap-3 z-10">
                          <span className="text-2xl font-black text-white tabular-nums leading-none">{sessao.jogosRestantes}</span>
                          <div className="flex flex-col gap-1">
                             <button onClick={() => consumirJogo?.(sessao)} className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase active:scale-95 transition-all shadow-lg ${colors.shadow} ${colors.icon}`}>{t('consume', idioma)}</button>
                             <button onClick={() => setSessaoRecarga(sessao)} className="px-2 py-1 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg text-[8px] font-black uppercase active:scale-95 transition-all">{t('add', idioma)}</button>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className={`bg-gray-950/60 backdrop-blur-sm flex items-center justify-between p-2 px-3 rounded-2xl border transition-colors duration-500 ${colors.card}`}>
                       <div className="flex items-center gap-2">
                          <Clock size={14} className={colors.accent} />
                          <span className="text-lg font-mono font-black text-white tabular-nums tracking-tighter leading-none">{formatTimeDisplay(calcularMs(sessao))}</span>
                       </div>
                       <button onClick={() => alternarPausaSessao(sessao)} className={`p-1.5 rounded-lg transition-all shadow-lg active:scale-95 ${sessao.emPausa ? 'bg-emerald-500 text-emerald-950 shadow-emerald-500/20' : 'bg-orange-500 text-orange-950 shadow-orange-500/20'}`}>
                          {sessao.emPausa ? <Play size={12} fill="currentColor"/> : <Pause size={12} fill="currentColor"/>}
                       </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                     <button onClick={() => mostrarConfirmacao(t('end_session', idioma), t('confirm_end_session', idioma), () => terminarSessao(sessao))} className="flex-1 py-2 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-[8px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95">{t('end', idioma)}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => podeOperar && setMaquinaSetup(maquina)} className={`w-full py-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 group transition-all relative z-10 ${podeOperar ? 'border-gray-800 hover:border-gray-600 hover:bg-gray-900/50' : 'border-gray-900 cursor-not-allowed opacity-50'}`}>
                   <div className="p-1.5 bg-gray-900 rounded-xl border border-gray-800 group-hover:border-orange-500/50 transition-colors">
                      <Plus size={16} className="text-gray-700 group-hover:text-orange-500 transition-colors" />
                   </div>
                   <span className="text-[7px] font-black text-gray-700 uppercase tracking-widest group-hover:text-orange-500 transition-colors">{t('new_session', idioma)}</span>
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {maquinaSetup && (
          <ModalSetupSessao 
            maquina={maquinaSetup} 
            precoHora={config.precoHora} 
            config={config}
            onClose={() => setMaquinaSetup(null)} 
            onStart={(modo, mins, valor, tot, nome) => { iniciarSessaoConfirmada(maquinaSetup, modo, mins, valor, tot, nome); setMaquinaSetup(null); }} 
            temaEscuro={temaEscuro}
            onExcluirCategoria={excluirCategoriaJogo}
            idioma={idioma}
          />
        )}
        {sessaoRecarga && (
          <ModalAdicionarJogos 
             sessao={sessaoRecarga} 
             precoPorJogo={config.precoJogo || 50} 
             moneda={config.moeda!}
             temaEscuro={temaEscuro}
             idioma={idioma}
             onClose={() => setSessaoRecarga(null)}
             onAdd={(qtd, v) => { adicionarJogos?.(sessaoRecarga, qtd, v); setSessaoRecarga(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
