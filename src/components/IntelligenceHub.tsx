import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, TrendingUp, TrendingDown, Zap, BarChart3, Users, Monitor, ShieldCheck, Activity } from 'lucide-react';
import { getSystemIntelligence } from '../services/aiService';
import { formatarDinheiro } from '../lib/utils';
import { motion } from 'motion/react';
import { EgmanLogo } from './EgmanLogo';
import { t } from '../lib/translations';

interface Props {
  transacoes: any[];
  maquinas: any[];
  funcionarios: any[];
  sessoes: any[];
  config: any;
  onAIAction: (call: any) => Promise<void>;
  idioma?: string;
}

export function IntelligenceHub({ transacoes, maquinas, funcionarios, sessoes, config, onAIAction, idioma = 'pt-AO' }: Props) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const appState = { transacoes, maquinas, funcionarios, sessoes, config };

  useEffect(() => {
    fetchInsights();
  }, [transacoes]);

  const fetchInsights = async () => {
    if (!navigator.onLine) {
      setInsights([t('offline_mode', idioma), t('offline_insights', idioma)]);
      setLoadingInsights(false);
      return;
    }
    setLoadingInsights(true);
    const res = await getSystemIntelligence(appState);
    if (!res || res.length === 0) {
      setInsights([t('analyzing_data', idioma), t('smart_processing', idioma)]);
    } else {
      setInsights(res);
    }
    setLoadingInsights(false);
  };

  // Predictive Logic
  const calculateTrends = () => {
    const agora = new Date();
    const transacoesMes = transacoes.filter(t => {
      const parts = t.data.split('-');
      return parseInt(parts[1]) - 1 === agora.getMonth();
    });
    const faturasMes = transacoesMes.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0);
    
    // Simple projection
    const diaMes = agora.getDate();
    const mediaDiaria = faturasMes / diaMes;
    const estimativaMensal = mediaDiaria * 30;

    const mesPassadoNum = agora.getMonth() - 1 === -1 ? 11 : agora.getMonth() - 1;
    const transacoesMesPassado = transacoes.filter(t => {
      const parts = t.data.split('-');
      return parseInt(parts[1]) - 1 === mesPassadoNum;
    });
    const faturasMesPassado = transacoesMesPassado.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0);
    
    const crescimento = faturasMesPassado > 0 ? ((faturasMes - faturasMesPassado) / faturasMesPassado) * 100 : 0;

    return { estimativaMensal, crescimento, faturasMes };
  };

  // Cálculos de Performance
  const getMachineStats = () => {
    const stats: Record<string, number> = {};
    sessoes.forEach(s => {
      if (s.finalizada) {
        stats[s.maquinaId] = (stats[s.maquinaId] || 0) + s.valorTotal;
      }
    });
    return Object.entries(stats).map(([id, val]) => {
      const maquina = maquinas.find(m => m.id === id);
      return { nome: maquina?.nome || t('unknown_machine', idioma), total: val };
    }).sort((a, b) => b.total - a.total);
  };

  const getStaffStats = () => {
    const stats: Record<string, number> = {};
    sessoes.forEach(s => {
      if (s.finalizada) {
        stats[s.funcionarioId] = (stats[s.funcionarioId] || 0) + s.valorTotal;
      }
    });
    transacoes.filter(t => t.tipo === 'entrada' && t.tipoVenda === 'produto').forEach(t => {
      if (t.funcionarioId) {
        stats[t.funcionarioId] = (stats[t.funcionarioId] || 0) + t.valor;
      }
    });
    return Object.entries(stats).map(([id, val]) => {
        const func = funcionarios.find(f => f.id === id);
        return { nome: func?.nome || t('unknown_staff', idioma), total: val };
    }).sort((a, b) => b.total - a.total);
  };

  const machineStats = getMachineStats();
  const staffStats = getStaffStats();
  const maquinaLider = machineStats[0];
  const funcionarioLider = staffStats[0];

  // Cálculo de Produtos Mais Vendidos
  const getTopProducts = () => {
    const stats: Record<string, number> = {};
    transacoes.filter(t => t.tipo === 'entrada' && t.tipoVenda === 'produto' && t.produtoId).forEach(t => {
      stats[t.produtoId] = (stats[t.produtoId] || 0) + 1;
    });
    return Object.entries(stats).map(([id, qty]) => {
      const prod = appState.config.produtos?.find((p: any) => p.id === id);
      return { nome: prod?.nome || t('product', idioma), qty };
    }).sort((a, b) => b.qty - a.qty);
  };

  const topProducts = getTopProducts();
  const maxQty = topProducts[0]?.qty || 1;
  const trends = calculateTrends();

  const getExpensesByCategory = () => {
    const cats: Record<string, number> = {};
    const despesas = transacoes.filter(t => t.tipo === 'despesa');
    despesas.forEach(t => {
      cats[t.categoria] = (cats[t.categoria] || 0) + t.valor;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  };

  const expensesByCategory = getExpensesByCategory();
  const totalDespesas = expensesByCategory.reduce((acc, c) => acc + c[1], 0);

  return (
    <div className="p-3 flex flex-col gap-4 animate-in fade-in pb-24">
      {/* Resumo Proativo de Inteligência */}
      <section className="bg-gradient-to-br from-indigo-900/40 to-blue-900/20 border border-indigo-500/30 p-4 rounded-2xl relative overflow-hidden">
        <Sparkles className="absolute -right-4 -top-4 text-indigo-500/10" size={80} />
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-indigo-500 p-1.5 rounded-lg shadow-lg shadow-indigo-500/40">
            <BrainCircuit size={16} className="text-white" />
          </div>
          <h2 className="text-white font-black uppercase tracking-widest text-[10px]">{t('insights_title', idioma)}</h2>
          {loadingInsights && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-auto" />}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {insights.map((msg, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900/60 backdrop-blur-sm border border-indigo-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2"
            >
              <Zap size={10} className="text-yellow-400" />
              <span className="text-[10px] text-indigo-100 font-medium">{msg}</span>
            </motion.div>
          ))}
          {insights.length === 0 && !loadingInsights && (
            <div className="flex items-center gap-3 opacity-50 p-2">
               <Activity size={16} className="text-indigo-400 animate-pulse" />
               <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">{t('analyzing_data', idioma)}</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-2">
        {/* Machine Performance */}
        <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-2xl group relative">
           <div className="flex items-center gap-2 mb-3">
              <Monitor size={14} className="text-indigo-500" />
              <h3 className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">{t('machine_performance', idioma)}</h3>
           </div>
           <div className="space-y-2">
              {machineStats.slice(0, 3).map((m, i) => (
                <div key={i} className="space-y-1">
                   <div className="flex justify-between text-[10px] font-bold text-gray-300">
                      <span>{m.nome}</span>
                      <span>{formatarDinheiro(m.total, config.moeda)}</span>
                   </div>
                   <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500" 
                        style={{ width: `${(m.total / (maquinaLider?.total || 1)) * 100}%` }}
                      />
                   </div>
                </div>
              ))}
              {machineStats.length === 0 && <p className="text-[9px] text-gray-600 text-center py-2 uppercase font-black">{t('no_machine_data', idioma)}</p>}
           </div>
        </div>

        {/* Staff Performance */}
        <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-2xl group relative">
           <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-emerald-500" />
              <h3 className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">{t('staff_performance', idioma)}</h3>
           </div>
           <div className="space-y-2">
              {staffStats.slice(0, 3).map((s, i) => (
                <div key={i} className="space-y-1">
                   <div className="flex justify-between text-[10px] font-bold text-gray-300">
                      <span>{s.nome}</span>
                      <span>{formatarDinheiro(s.total, config.moeda)}</span>
                   </div>
                   <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${(s.total / (funcionarioLider?.total || 1)) * 100}%` }}
                      />
                   </div>
                </div>
              ))}
              {staffStats.length === 0 && <p className="text-[9px] text-gray-600 text-center py-2 uppercase font-black">{t('no_staff_data', idioma)}</p>}
           </div>
        </div>
      </section>

      {/* Predictions Section */}
      <section className="grid grid-cols-2 gap-2">
        <div className="bg-gray-900/40 border border-gray-800 p-3 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BarChart3 size={14} className="text-orange-500" />
            <h3 className="text-gray-400 font-bold uppercase text-[8px] tracking-widest">{t('monthly_forecast', idioma)}</h3>
          </div>
          <div className="flex flex-col">
             <span className="text-lg font-black text-white leading-tight">{formatarDinheiro(trends.estimativaMensal, config.moeda)}</span>
             <div className={`flex items-center text-[8px] font-black mt-0.5 ${trends.crescimento >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {trends.crescimento >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(trends.crescimento).toFixed(1)}%
             </div>
          </div>
        </div>

        <div className="bg-gray-900/40 border border-gray-800 p-3 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldCheck size={14} className="text-blue-500" />
            <h3 className="text-gray-400 font-bold uppercase text-[8px] tracking-widest leading-none">{t('stability', idioma) || 'Estabilidade'}</h3>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-gray-200 font-bold truncate">
               {trends.crescimento > 10 ? t('excellent_health', idioma) :
                trends.crescimento > 0 ? t('healthy_flow', idioma) :
                t('attention_flow', idioma)}
            </p>
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all duration-1000 ${trends.crescimento >= 0 ? 'bg-indigo-500' : 'bg-red-500'}`} 
                 style={{ width: `${Math.max(10, Math.min(100, 50 + trends.crescimento))}%` }} 
               />
            </div>
          </div>
        </div>
      </section>

      {/* Analítica de Custos por Categoria */}
      <section className="bg-gray-900/40 border border-gray-800 p-4 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <BarChart3 size={14} className="text-red-500" />
             <h3 className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">{t('cost_structure', idioma)}</h3>
           </div>
           <div className="text-right">
              <span className="text-[10px] font-black text-white">{formatarDinheiro(totalDespesas, config.moeda)}</span>
           </div>
        </div>

        <div className="space-y-3">
          {expensesByCategory.map(([cat, val]) => (
            <div key={cat} className="space-y-1">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-gray-300 font-bold uppercase tracking-tight">{cat}</span>
                <span className="text-gray-400 font-black">
                  {formatarDinheiro(val, config.moeda)} 
                </span>
              </div>
              <div className="h-1 w-full bg-gray-800/50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(val / (totalDespesas || 1)) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-red-500/60 rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NOVO: Produtos Mais Vendidos */}
      <section className="bg-gray-900/40 border border-gray-800 p-5 rounded-3xl">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-yellow-500" />
          <h3 className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{t('best_sellers', idioma)}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {topProducts.slice(0, 5).map((p, i) => (
            <div key={i} className="bg-gray-800/50 px-3 py-2 rounded-2xl border border-gray-700/50 flex items-center gap-2">
               <span className="text-[10px] font-black text-white">{p.nome}</span>
               <div className="bg-yellow-500/10 px-1.5 py-0.5 rounded-lg">
                  <span className="text-[9px] font-black text-yellow-500">{p.qty}x</span>
               </div>
            </div>
          ))}
          {topProducts.length === 0 && <p className="text-[10px] text-gray-600 py-2 uppercase font-black">{t('no_stock_sales', idioma)}</p>}
        </div>
      </section>
    </div>
  );
}
