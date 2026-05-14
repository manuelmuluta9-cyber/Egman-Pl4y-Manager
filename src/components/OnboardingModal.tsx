import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Coins, Check, ArrowRight } from 'lucide-react';
import { Config } from '../types';
import { t, languages } from '../lib/translations';

interface Props {
  onComplete: (moeda: string, idioma: string) => void;
  temaEscuro: boolean;
  idiomaInicial?: string;
}

export function OnboardingModal({ onComplete, temaEscuro, idiomaInicial = 'pt-AO' }: Props) {
  const [moeda, setMoeda] = useState('Kz');
  const [idioma, setIdioma] = useState(idiomaInicial);
  const [step, setStep] = useState(1);

  const moedasComuns = [
    { code: 'Kz', label: 'Kwanza (Angola)' },
    { code: '$', label: 'Dólar (USD)' },
    { code: '€', label: 'Euro (EUR)' },
    { code: 'R$', label: 'Real (Brasil)' },
    { code: 'Mt', label: 'Metical (Moçambique)' },
    { code: 'FCFA', label: 'Franco CFA' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl shadow-orange-500/10`}
      >
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
              <Globe className="text-white" size={32} />
            </div>
          </div>

          <h2 className={`text-2xl font-black text-center mb-2 ${temaEscuro ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>
            {t('onboarding_title', idioma)}
          </h2>
          <p className="text-gray-500 text-center text-sm font-medium mb-8 leading-relaxed">
            {t('onboarding_desc', idioma)}
          </p>

          <div className="space-y-6">
            {/* Escolha de Moeda */}
            <div>
              <label className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-3 block ml-1 flex items-center gap-2">
                <Coins size={14} /> {t('choose_currency', idioma)}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {moedasComuns.map(m => (
                  <button
                    key={m.code}
                    onClick={() => setMoeda(m.code)}
                    className={`p-3 rounded-2xl border text-center transition-all ${moeda === m.code ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' : (temaEscuro ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600')}`}
                  >
                    <span className="block text-sm font-black">{m.code}</span>
                    <span className="text-[8px] font-bold uppercase block mt-1 opacity-60">{m.label.split(' ')[0]}</span>
                  </button>
                ))}
                {/* Opção Personalizada */}
                <input 
                  type="text"
                  placeholder="..."
                  value={['Kz', '$', '€', 'R$', 'Mt', 'FCFA'].includes(moeda) ? '' : moeda}
                  onChange={(e) => setMoeda(e.target.value)}
                  className={`p-3 rounded-2xl border text-center text-sm font-black focus:ring-2 focus:ring-orange-500 outline-none transition-all ${!['Kz', '$', '€', 'R$', 'Mt', 'FCFA'].includes(moeda) && moeda !== '' ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' : (temaEscuro ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600')}`}
                />
              </div>
            </div>

            {/* Escolha de Idioma */}
            <div>
              <label className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-3 block ml-1 flex items-center gap-2">
                <Globe size={14} /> {t('choose_language', idioma)}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(languages).map(([code, data]) => (
                  <button
                    key={code}
                    onClick={() => setIdioma(code)}
                    className={`p-4 rounded-[1.5rem] border flex items-center gap-3 transition-all ${idioma === code ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' : (temaEscuro ? 'bg-gray-800 border-gray-700 text-gray-400 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600 font-medium')}`}
                  >
                    <span className="text-2xl">{data.flag}</span>
                    <div className="text-left">
                      <span className="text-xs font-black block">{data.label}</span>
                      <span className="text-[8px] opacity-60 uppercase font-bold">{code.split('-')[0]}</span>
                    </div>
                    {idioma === code && <Check size={16} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => onComplete(moeda, idioma)}
            className="w-full mt-10 bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 group"
          >
            {t('save_and_continue', idioma)}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
