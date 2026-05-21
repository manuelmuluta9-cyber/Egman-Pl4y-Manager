import React from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { AuditoriaLog } from '../types';
import { t } from '../lib/translations';

interface Props {
  logs: AuditoriaLog[];
  temaEscuro?: boolean;
  idioma?: string;
  apagarLog?: (id: string) => Promise<void>;
  limparTudo?: () => void;
  confirmarAction?: (titulo: string, mensagem: string, onConfirm: () => void) => void;
}

export function Auditoria({ logs, temaEscuro, idioma = 'pt-AO', apagarLog, limparTudo, confirmarAction }: Props) {
  const handleLimparTudo = () => {
    if (limparTudo) limparTudo();
  };

  const handleApagarRow = (id: string) => {
    if (apagarLog) {
      const exec = () => apagarLog(id);
      if (confirmarAction) {
        confirmarAction(t('delete', idioma), t('confirm_delete_log', idioma) || 'Apagar este log?', exec);
      } else {
        if (confirm(t('confirm_delete_log', idioma) || 'Apagar este log?')) exec();
      }
    }
  };

  return (
    <div className={`p-4 pb-24 animate-in fade-in duration-300 ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black flex gap-2 items-center">
          <ShieldAlert className="text-orange-500"/> {t('audit_log', idioma)}
        </h2>
        
        {logs.length > 0 && limparTudo && (
          <button 
            onClick={handleLimparTudo}
            className={`p-2 rounded-xl border ${temaEscuro ? 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500'} transition-all flex items-center gap-2`}
            title={t('clean_audit', idioma)}
          >
            <Trash2 size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{t('clean_audit', idioma)}</span>
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className={`text-center p-8 ${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'} rounded-2xl border`}>
          <ShieldAlert size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">{t('no_logs', idioma)}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.slice(0, 100).map(log => (
            <div 
              key={log.id} 
              className={`${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-2.5 rounded-xl flex flex-col gap-0.5 shadow-sm relative group transition-all`}
            >
              <div className="flex justify-between items-center pr-6">
                <span className="text-[8px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">{log.acao}</span>
                <span className="text-[8px] text-gray-500 font-bold uppercase">{log.data} - {log.hora}</span>
              </div>
              
              <p className={`text-xs ${temaEscuro ? 'text-gray-300' : 'text-gray-600'} font-medium mt-0.5 leading-tight`}>{log.detalhe}</p>
              
              <div className="flex justify-between items-end mt-1">
                <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black leading-none">
                  {t('author', idioma)}: <span className={temaEscuro ? 'text-white' : 'text-gray-900'}>{log.autor}</span>
                </span>
                
                {apagarLog && (
                  <button 
                    onClick={() => handleApagarRow(log.id)}
                    className="p-2.5 px-3 text-red-500/70 hover:text-red-500 transition-all border border-red-500/10 hover:border-red-500/30 rounded-xl bg-red-500/5 hover:bg-red-500/10 flex items-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <Trash2 size={14} />
                    <span className="text-[9px] font-black uppercase tracking-tight">{t('delete', idioma)}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
