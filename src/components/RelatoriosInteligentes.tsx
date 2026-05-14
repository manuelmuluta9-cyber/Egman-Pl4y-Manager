import React, { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Calendar as CalendarIcon, Crown, CreditCard, Landmark, Coins, ChevronLeft, ChevronRight, TrendingUp, Download, FileSpreadsheet, Share2, Trash2, FolderDown, X, Edit3, PlusCircle } from 'lucide-react';
import { Transacao, RelatorioExportado, Config } from '../types';
import { formatarDinheiro } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { t } from '../lib/translations';

interface Props {
  transacoes: Transacao[];
  appId: string;
  contaNegocio: string;
  config: Config;
  atualizarConfig: (novasConfigs: Partial<Config>) => Promise<void>;
  mostrarAlerta: (titulo: string, msg: string) => void;
  temaEscuro?: boolean;
  idioma?: string;
}

export function RelatoriosInteligentes({ transacoes, appId, contaNegocio, config, atualizarConfig, mostrarAlerta, temaEscuro, idioma = 'pt-AO' }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);
  const [exportandoCSV, setExportandoCSV] = useState(false);
  const [offsetSemanas, setOffsetSemanas] = useState(0);
  const [relatoriosSalvos, setRelatoriosSalvos] = useState<RelatorioExportado[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'dash' | 'arquivos'>('dash');
  const [mostrarDicaNavegador, setMostrarDicaNavegador] = useState(true);
  const [editandoMetodos, setEditandoMetodos] = useState(false);
  const [novoMetodo, setNovoMetodo] = useState('');

  // Carregar relatórios salvos do Firestore (apenas metadados)
  React.useEffect(() => {
    const q = query(collection(db, 'apps', appId, 'relatorios_exportados'), orderBy('dataCriacao', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as RelatorioExportado));
      setRelatoriosSalvos(data);
    });
    return () => unsub();
  }, [appId]);

  const salvarRelatorioNoSistema = async (blob: Blob, nome: string, tipo: 'pdf' | 'excel') => {
    try {
      // Transformar em base64 para "armazenamento interno" se for pequeno o suficiente
      // Firestore tem limite de 1MB. Se for maior, avisamos.
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        if (base64data.length > 800000) { // ~800KB safe limit for Firestore string
           mostrarAlerta(t('warning', idioma), t('file_too_large', idioma));
           return;
        }

        await addDoc(collection(db, 'apps', appId, 'relatorios_exportados'), {
          nome,
          tipo,
          dataCriacao: Date.now(),
          blobBase64: base64data,
          tamanho: blob.size
        });
      };
    } catch (e) {
      console.error("Erro ao salvar relatório:", e);
    }
  };

  const partilharFicheiro = async (blob: Blob, fileName: string) => {
    try {
      const file = new File([blob], fileName, { type: blob.type });
      
      // Se for PDF ou Excel e estivermos num browser moderno/mobile
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `${t('report_generated', idioma)} - EGMAN PLAY`
          });
          return;
        } catch (shareErr) {
          console.log("Share API falhou, tentando fallback...", shareErr);
        }
      }

      // Fallback robusto para downloads em App/APK/Browser
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        const link = document.createElement('a');
        link.href = b64;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);
        
        // No APK, às vezes é necessário abrir numa nova janela se o download for bloqueado
        // Silent fallback for APK if needed, or prompt in user language
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Erro ao partilhar:", err);
      mostrarAlerta(t('error', idioma), t('error_generating_report', idioma));
    }
  };

  const apagarRelatorio = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'apps', appId, 'relatorios_exportados', id));
    } catch (e) {
      console.error(e);
    }
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Cabeçalho
      doc.setFillColor(25, 25, 25);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`${t('corporate_report', idioma)} - EGMAN PLAY`, 15, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${t('account', idioma)}: ${contaNegocio.replace(/_/g, '.')}`, 15, 33);
      doc.text(`${t('generation_date', idioma)}: ${new Date().toLocaleString(idioma)}`, pageWidth - 15, 33, { align: 'right' });

      // KPIs MENSAL (PRIORIDADE)
      doc.setTextColor(249, 115, 22);
      doc.setFontSize(16);
      doc.text(`${t('monthly_performance', idioma)} (${new Date().toLocaleString(idioma, { month: 'long' }).toUpperCase()})`, 15, 55);
      
      const tendenciaMsg = analise.lucroMes > analise.lucroMesAnterior ? t('positive_growth', idioma) : 
                         analise.lucroMes < analise.lucroMesAnterior ? t('negative_growth', idioma) : t('stable', idioma);

      autoTable(doc, {
        startY: 60,
        head: [[t('metrics', idioma), t('value', idioma)]],
        body: [
          [`${t('revenue', idioma)} (Mês)`, formatarDinheiro(analise.faturadoMes, config.moeda)],
          [`${t('expenses', idioma)} (Mês)`, formatarDinheiro(analise.despesasMes, config.moeda)],
          [t('profit', idioma), formatarDinheiro(analise.lucroMes, config.moeda)],
          [t('estimated_daily_average', idioma), formatarDinheiro(analise.faturadoMes / 30, config.moeda)],
          [t('trend', idioma), tendenciaMsg]
        ],
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22] },
        styles: { fontSize: 11 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.row.index === 0) data.cell.styles.textColor = [16, 185, 129]; // Verde para faturamento
            if (data.row.index === 1) data.cell.styles.textColor = [239, 68, 68];  // Vermelho para despesas
            if (data.row.index === 2) data.cell.styles.textColor = data.cell.text[0].includes('-') ? [239, 68, 68] : [16, 185, 129];
            if (data.row.index === 4) data.cell.styles.textColor = tendenciaMsg.includes('CRESCIMENTO') ? [16, 185, 129] : [239, 68, 68];
          }
        }
      });

      // NOVO: DESEMPENHO ANUAL
      doc.setTextColor(249, 115, 22);
      doc.setFontSize(14);
      doc.text(`${t('annual_performance', idioma).toUpperCase()} (${new Date().getFullYear()})`, 15, (doc as any).lastAutoTable.finalY + 15);

      const mesesNomes = [
        t('jan_short', idioma), t('feb_short', idioma), t('mar_short', idioma), 
        t('apr_short', idioma), t('may_short', idioma), t('jun_short', idioma), 
        t('jul_short', idioma), t('aug_short', idioma), t('sep_short', idioma), 
        t('oct_short', idioma), t('nov_short', idioma), t('dec_short', idioma)
      ];
      const corpoAnual = analise.dadosAnuais.map(m => [
        mesesNomes[m.mes],
        formatarDinheiro(m.entrada, config.moeda),
        formatarDinheiro(m.despesa, config.moeda),
        formatarDinheiro(m.lucro, config.moeda)
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [[t('month', idioma), t('revenues', idioma), t('expenses_plural', idioma), t('profit', idioma)]],
        body: corpoAnual,
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] },
        styles: { fontSize: 9 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index === 1) data.cell.styles.textColor = [16, 185, 129]; // Verde Receita
            if (data.column.index === 2) data.cell.styles.textColor = [239, 68, 68];  // Vermelho Despesa
            if (data.column.index === 3) {
              const valor = data.cell.text[0];
              data.cell.styles.textColor = valor.includes('-') ? [239, 68, 68] : [59, 130, 246]; // Azul Lucro
            }
          }
        }
      });

      // ESTATÍSTICAS ANUAIS CONSOLIDADAS
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(t('current_annual_financial_summary', idioma).toUpperCase(), 15, (doc as any).lastAutoTable.finalY + 12);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [[t('total_annual_revenue', idioma), t('total_annual_expense', idioma), t('net_annual_profit', idioma)]],
        body: [[
           formatarDinheiro(analise.totaisAnuais.entrada, config.moeda),
           formatarDinheiro(analise.totaisAnuais.despesa, config.moeda),
           formatarDinheiro(analise.totaisAnuais.lucro, config.moeda)
        ]],
        theme: 'plain',
        styles: { fontSize: 10, fontStyle: 'bold', halign: 'center' },
        headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] }
      });

      // NOVO: DETALHAMENTO DE DESPESAS POR CATEGORIA
      doc.addPage();
      doc.setTextColor(249, 115, 22);
      doc.setFontSize(16);
      doc.text(t('cost_analysis_by_category', idioma).toUpperCase(), 15, 20);

      const dadosCategorias = (Object.entries(analise.despesasPorCategoria) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => [
          cat, 
          formatarDinheiro(val, config.moeda), 
          `${((val / (analise.despesasTotais || 1)) * 100).toFixed(1)}%`
        ]);

      autoTable(doc, {
        startY: 25,
        head: [[t('expense_category', idioma), t('total_value', idioma), t('percent_of_total_cost', idioma)]],
        body: dadosCategorias,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 10 }
      });

      // KPIs GERAIS
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(t('general_stats_historic', idioma).toUpperCase(), 15, (doc as any).lastAutoTable.finalY + 15);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 18,
        head: [[t('metric', idioma), t('value', idioma)]],
        body: [
          [t('total_accumulated_profit', idioma), formatarDinheiro(analise.lucro, config.moeda)],
          [t('total_entries', idioma), formatarDinheiro(analise.entradasTotais, config.moeda)],
          [t('total_expenses', idioma), formatarDinheiro(analise.despesasTotais, config.moeda)],
          [t('most_used_method', idioma), analise.metodoVencedor || t('none', idioma)],
          [t('total_ops', idioma), transacoes.length.toString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] }
      });

      // Gráfico
      if (chartRef.current) {
        try {
          const imgData = await toPng(chartRef.current, {
            backgroundColor: '#0a0f16',
            pixelRatio: 2,
          });
          doc.addPage();
          doc.setFontSize(14);
          doc.setTextColor(249, 115, 22);
          doc.text(t('weekly_wave_analysis', idioma).toUpperCase(), 15, 20);
          doc.addImage(imgData, 'PNG', 15, 30, pageWidth - 30, 80);
          
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(`* ${t('chart_tip', idioma)}`, 15, 115);
        } catch (chartErr) {
          console.error("Erro ao capturar gráfico:", chartErr);
        }
      }

      // Estatísticas por Método
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(t('method_flow', idioma).toUpperCase(), 15, (doc as any).lastAutoTable.finalY ? (doc as any).lastAutoTable.finalY + 15 : 130);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY ? (doc as any).lastAutoTable.finalY + 20 : 135,
        head: [[t('method', idioma), t('total_revenue', idioma), t('ops_qty', idioma)]],
        body: Object.entries(analise.statsMetodos).map(([m, s]: [string, any]) => [
          m, formatarDinheiro(s.total, config.moeda), s.count.toString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] }
      });

      // Detalhamento de Transações (Todas)
      doc.addPage();
      doc.setFontSize(14);
      doc.text(t('complete_tx_history', idioma).toUpperCase(), 15, 20);
      
      const transacoesFormatadas = transacoes
        .sort((a, b) => b.data.localeCompare(a.data))
        .map(t_item => [
          new Date(t_item.data).toLocaleDateString(idioma),
          t_item.tipo.toUpperCase(),
          t_item.descricao,
          t_item.metodo || '-',
          formatarDinheiro(t_item.valor, config.moeda)
        ]);

      autoTable(doc, {
        startY: 25,
        head: [[t('date', idioma), t('type', idioma), t('description', idioma), t('method', idioma), t('value', idioma)]],
        body: transacoesFormatadas,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [249, 115, 22] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const tipoRow = data.cell.text[0];
            if (tipoRow === 'ENTRADA') data.cell.styles.textColor = [16, 185, 129];
            if (tipoRow === 'SAÍDA' || tipoRow === 'DESPESA') data.cell.styles.textColor = [239, 68, 68];
          }
          if (data.section === 'body' && data.column.index === 4) {
            const tipoLabel = data.row.cells[1].text[0];
            if (tipoLabel === 'ENTRADA') data.cell.styles.textColor = [16, 185, 129];
            if (tipoLabel === 'SAÍDA' || tipoLabel === 'DESPESA') data.cell.styles.textColor = [239, 68, 68];
          }
        }
      });

      // Rodapé em todas as páginas
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(t('footer_text', idioma).toUpperCase(), pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      const fileName = `Relatorio_EgmanPlay_${new Date().toISOString().split('T')[0]}.pdf`;
      const blob = doc.output('blob');
      
      await salvarRelatorioNoSistema(blob, fileName, 'pdf');
      await partilharFicheiro(blob, fileName);
      
      mostrarAlerta(t('report_generated', idioma), t('report_generated_desc', idioma));
    } catch (err) {
      console.error(err);
      mostrarAlerta(t('error', idioma), t('error_generating_report', idioma));
    } finally {
      setExportando(false);
    }
  };

  const exportarCSV = async () => {
    setExportandoCSV(true);
    try {
      const headers = ['Data', 'Tipo', 'Categoria', 'Descricao', 'Metodo', `Valor (${config.moeda || 'AKZ'})`];
      const rows = transacoes
        .sort((a, b) => b.data.localeCompare(a.data))
        .map(t => [
          new Date(t.data).toLocaleDateString('pt-AO'),
          t.tipo.toUpperCase(),
          t.categoria,
          `"${t.descricao.replace(/"/g, '""')}"`,
          t.metodo || '-',
          t.valor
        ]);

      // Excel prefere ; em regiões de língua portuguesa e o BOM (Byte Order Mark) ajuda na codificação UTF-8
      const bom = '\uFEFF';
      const csvContent = bom + [
        headers.join(';'),
        ...rows.map(e => e.join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `Dados_EgmanPlay_${new Date().toISOString().split('T')[0]}.csv`;
      
      await salvarRelatorioNoSistema(blob, fileName, 'excel');
      await partilharFicheiro(blob, fileName);
      
      mostrarAlerta(t('reports', idioma), t('excel_export_success', idioma));
    } catch (err) {
      console.error(err);
      mostrarAlerta(t('error', idioma), t('excel_export_error', idioma));
    } finally {
      setExportandoCSV(false);
    }
  };

  const getWeekRange = (offset: number) => {
    const hoje = new Date();
    const diaAtual = hoje.getDay(); // 0 (Dom) a 6 (Sáb)
    const diff = hoje.getDate() - diaAtual + (offset * 7);
    const inicio = new Date(hoje.setDate(diff));
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    return { inicio, fim };
  };

  const { inicioSemana, fimSemana, inicioSemanaAnterior, fimSemanaAnterior } = useMemo(() => {
    const { inicio, fim } = getWeekRange(offsetSemanas);
    const prev = getWeekRange(offsetSemanas - 1);
    return { 
      inicioSemana: inicio, 
      fimSemana: fim,
      inicioSemanaAnterior: prev.inicio,
      fimSemanaAnterior: prev.fim
    };
  }, [offsetSemanas]);

  const analise = useMemo(() => {
    let entradasTotais = 0, despesasTotais = 0, entradasCount = 0;
    const dias: Record<number, string> = { 0:'Dom', 1:'Seg', 2:'Ter', 3:'Qua', 4:'Qui', 5:'Sex', 6:'Sáb' };
    
    // Lucro por dia da semana SELECIONADA
    const lucroPorDiaSemana: Record<string, number> = { Dom:0, Seg:0, Ter:0, Qua:0, Qui:0, Sex:0, Sáb:0 };
    let faturadoSemana = 0;
    let faturadoSemanaAnterior = 0;
    
    // Novos contadores mensais
    let faturadoMes = 0;
    let despesasMes = 0;
    let faturadoMesAnterior = 0;
    let despesasMesAnterior = 0;

    // Novo: Dados Anuais
    const dadosAnuais = Array.from({ length: 12 }, (_, i) => ({ mes: i, entrada: 0, despesa: 0, lucro: 0 }));

    // Métodos de Pagamento
    const metodosConfig = config.metodosPagamento || ['Dinheiro', 'Multicaixa', 'Transferência'];
    const statsMetodos: Record<string, { total: number, count: number }> = {};
    metodosConfig.forEach(m => {
      statsMetodos[m] = { total: 0, count: 0 };
    });

    // Para encontrar a melhor semana
    const lucroPorSemana: Record<string, number> = {};

    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    // Contadores de categoria
    const despesasPorCategoria: Record<string, number> = {};
    const receitasPorCategoria: Record<string, number> = {};

    transacoes.forEach(t => {
      const parts = t.data.split('-');
      if (parts.length !== 3) return;
      
      const tAno = parseInt(parts[0]);
      const tMes = parseInt(parts[1]) - 1; // 0-indexed
      const tDiaNum = parseInt(parts[2]);

      const dataDoc = new Date(tAno, tMes, tDiaNum, 12, 0, 0); // Safe local date at noon
      const diaDaSemana = dataDoc.getDay();
      const isEntrada = t.tipo === 'entrada';

      // Agrupamento por categoria
      if (isEntrada) {
        receitasPorCategoria[t.categoria] = (receitasPorCategoria[t.categoria] || 0) + t.valor;
      } else {
        despesasPorCategoria[t.categoria] = (despesasPorCategoria[t.categoria] || 0) + t.valor;
      }

      // Estatísticas Mensais
      if (tMes === mesAtual && tAno === anoAtual) {
        if (isEntrada) faturadoMes += t.valor;
        else despesasMes += t.valor;
      }

      if (tMes === mesAnterior && tAno === anoAnterior) {
        if (isEntrada) faturadoMesAnterior += t.valor;
        else despesasMesAnterior += t.valor;
      }

      // NOVO: Cálculo Anual
      if (tAno === anoAtual) {
        if (isEntrada) dadosAnuais[tMes].entrada += t.valor;
        else dadosAnuais[tMes].despesa += t.valor;
      }
      
      // Cálculo de melhor semana (usamos o início da semana como chave)
      const d = new Date(tAno, tMes, tDiaNum, 12, 0, 0);
      const diff = d.getDate() - d.getDay();
      const startOfWeekDate = new Date(d.getFullYear(), d.getMonth(), diff, 12, 0, 0);
      const startOfWeek = startOfWeekDate.toISOString().split('T')[0];
      
      if (isEntrada) {
        lucroPorSemana[startOfWeek] = (lucroPorSemana[startOfWeek] || 0) + t.valor;
      }

      // Estatísticas gerais
      if (isEntrada) { 
         entradasTotais += t.valor; 
         entradasCount++;
         const m = t.metodo || (metodosConfig.includes('Dinheiro') ? 'Dinheiro' : metodosConfig[0] || 'Outro');
         if (!statsMetodos[m]) statsMetodos[m] = { total: 0, count: 0 };
         statsMetodos[m].total += t.valor; 
         statsMetodos[m].count += 1;
      } else { 
         despesasTotais += t.valor; 
      }

      // Filtro para a semana selecionada (Gráfico)
      if (dataDoc >= inicioSemana && dataDoc <= fimSemana) {
        if (isEntrada) {
          lucroPorDiaSemana[dias[diaDaSemana]] += t.valor;
          faturadoSemana += t.valor;
        } else {
          lucroPorDiaSemana[dias[diaDaSemana]] -= t.valor;
        }
      }

      // Filtro para a semana ANTERIOR (Comparativo de Tendência)
      if (dataDoc >= inicioSemanaAnterior && dataDoc <= fimSemanaAnterior) {
        if (isEntrada) {
          faturadoSemanaAnterior += t.valor;
        }
      }
    });

    const lucro = entradasTotais - despesasTotais;
    
    // Melhor dia da SEMANA SELECIONADA
    let melhorDia = 'Nenhum', maxL = -Infinity;
    for (let dia in lucroPorDiaSemana) { 
      if (lucroPorDiaSemana[dia] > maxL) { 
        maxL = lucroPorDiaSemana[dia]; 
        melhorDia = dia; 
      } 
    }

    // Melhor semana de SEMPRE
    let melhorSemanaValor = 0;
    let melhorSemanaData = 'N/A';
    Object.entries(lucroPorSemana).forEach(([data, valor]) => {
      if (valor > melhorSemanaValor) {
        melhorSemanaValor = valor;
        melhorSemanaData = data;
      }
    });

    // Cálculo da Tendência
    let tendenciaLabel = 'Estável';
    if (faturadoSemanaAnterior > 0) {
      const diff = ((faturadoSemana - faturadoSemanaAnterior) / faturadoSemanaAnterior) * 100;
      if (diff > 5) tendenciaLabel = `Crescimento (${Math.abs(diff).toFixed(0)}%)`;
      else if (diff < -5) tendenciaLabel = `Queda (${Math.abs(diff).toFixed(0)}%)`;
    } else if (faturadoSemana > 0) {
      tendenciaLabel = 'Novo Fluxo';
    }

    const metodosOrdenados = Object.entries(statsMetodos).sort((a, b) => b[1].count - a[1].count);
    const metodoVencedor = metodosOrdenados.length > 0 && metodosOrdenados[0][1].count > 0 ? metodosOrdenados[0][0] : null;
    
    // Finalização dados anuais
    const totaisAnuais = dadosAnuais.reduce((acc, curr) => {
      curr.lucro = curr.entrada - curr.despesa;
      return {
        entrada: acc.entrada + curr.entrada,
        despesa: acc.despesa + curr.despesa,
        lucro: acc.lucro + curr.lucro
      };
    }, { entrada: 0, despesa: 0, lucro: 0 });

    return { 
      lucro, entradasTotais, despesasTotais, 
      lucroPorDiaSemana, melhorDia, maxL, 
      statsMetodos, metodoVencedor, 
      faturadoSemana,
      faturadoMes,
      despesasMes,
      lucroMes: faturadoMes - despesasMes,
      faturadoMesAnterior,
      despesasMesAnterior,
      lucroMesAnterior: faturadoMesAnterior - despesasMesAnterior,
      dadosAnuais,
      totaisAnuais,
      receitasPorCategoria,
      despesasPorCategoria,
      melhorSemanaData,
      melhorSemanaValor,
      tendenciaLabel
    };
  }, [transacoes, inicioSemana, fimSemana, inicioSemanaAnterior, fimSemanaAnterior]);

  const getMetodoIcon = (m: string) => {
    if (m === 'Multicaixa') return <CreditCard size={18} />;
    if (m === 'Transferência') return <Landmark size={18} />;
    return <Coins size={18} />;
  };
  
  const diasChaves = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const maxGrafico = Math.max(...(Object.values(analise.lucroPorDiaSemana) as number[]), 100) * 1.3;
  const minGrafico = Math.min(...(Object.values(analise.lucroPorDiaSemana) as number[]), 0) * 1.3;
  const range = maxGrafico - minGrafico || 1;

  const metodosConfig = useMemo(() => config.metodosPagamento || ['Dinheiro', 'Multicaixa', 'Transferência'], [config.metodosPagamento]);

  const addMetodo = async () => {
    if (!novoMetodo.trim()) return;
    if (metodosConfig.includes(novoMetodo.trim())) {
      mostrarAlerta(t('error', idioma), "Este método já existe.");
      return;
    }
    const novos = [...metodosConfig, novoMetodo.trim()];
    await atualizarConfig({ metodosPagamento: novos });
    setNovoMetodo('');
  };

  const deleteMetodo = async (m: string) => {
    const novos = metodosConfig.filter(metodo => metodo !== m);
    await atualizarConfig({ metodosPagamento: novos });
  };

  const pontosSVG = diasChaves.map((dia, index) => {
    const val = analise.lucroPorDiaSemana[dia];
    const x = (index / 6) * 100;
    const y = 85 - ((val - minGrafico) / range) * 70; // Espaço para labels acima
    return { x, y, val, dia, index };
  });

  const smoothLine = pontosSVG.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 3;
    const cp2x = p.x - (p.x - prev.x) / 3;
    return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaPath = `${smoothLine} L 100 100 L 0 100 Z`;

  return (
    <div className={`p-4 flex flex-col gap-4 animate-in fade-in duration-300 pb-10 ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex justify-between items-center mb-1">
        <h2 className={`text-xl font-black tracking-widest ${temaEscuro ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}><Activity className="text-orange-500" /> {t('reports', idioma)}</h2>
        
        <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-800">
           <button 
             onClick={() => setAbaAtiva('dash')}
             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${abaAtiva === 'dash' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
           >
             {t('panel', idioma)}
           </button>
           <button 
             onClick={() => setAbaAtiva('arquivos')}
             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${abaAtiva === 'arquivos' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
           >
             {t('files', idioma)} {relatoriosSalvos.length > 0 && <span className="bg-white/20 px-1.5 rounded-md">{relatoriosSalvos.length}</span>}
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {abaAtiva === 'dash' ? (
          <motion.div 
            key="dash"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex flex-col gap-2 bg-orange-500/5 p-3 rounded-2xl border border-orange-500/10">
                 <p className="text-[8px] text-orange-500 font-black uppercase tracking-widest leading-tight text-center">
                   {t('web_version_warning', idioma)}
                 </p>
                 <button 
                   onClick={() => {
                      const url = "https://ais-pre-l2o2lcgxfj57ykpvcxez3q-419044323565.europe-west1.run.app";
                      navigator.clipboard.writeText(url);
                      mostrarAlerta(t('link_copied', idioma), t('link_copied_desc', idioma));
                   }}
                   className="bg-orange-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 active:scale-95 flex items-center justify-center gap-2 w-full"
                 >
                   <Share2 size={10} />
                   {t('copy_web_link', idioma)}
                 </button>
              </div>

              <AnimatePresence>
                {mostrarDicaNavegador && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex justify-between items-center mb-1 overflow-hidden"
                  >
                     <p className="text-[7px] text-indigo-400 font-black uppercase tracking-widest">
                       {t('browser_tip', idioma)}
                     </p>
                     <button onClick={() => setMostrarDicaNavegador(false)} className="text-indigo-400 hover:text-white p-1">
                        <X size={10} />
                     </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={exportarCSV} 
                  disabled={exportandoCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 text-white h-8 rounded-xl flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  {exportandoCSV ? (
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileSpreadsheet size={12} />
                  )}
                  Excel
                </button>

                <button 
                  onClick={exportarPDF} 
                  disabled={exportando}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white h-8 rounded-xl flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all shadow-md shadow-red-600/20 active:scale-95"
                >
                  {exportando ? (
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  PDF
                </button>
              </div>
            </div>
            
            <div className={`${temaEscuro ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl' : 'bg-orange-50 border-orange-200 shadow-sm'} border p-5 rounded-2xl relative overflow-hidden`}>
               <div className="absolute -right-4 -top-4 opacity-10"><Landmark size={100}/></div>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{t('total_accumulated_profit', idioma)}</p>
               <h3 className={`text-4xl font-black ${analise.lucro >= 0 ? (temaEscuro ? 'text-orange-400' : 'text-orange-600') : 'text-red-500'}`}>{formatarDinheiro(analise.lucro, config.moeda)}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className={`${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-4 rounded-2xl`}>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase mb-1">{t('total_entries', idioma)}</p>
                  <p className={`text-xl font-black ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>{formatarDinheiro(analise.entradasTotais, config.moeda)}</p>
               </div>
               <div className={`${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-4 rounded-2xl`}>
                  <p className="text-[10px] text-red-500 font-bold uppercase mb-1">{t('total_expenses', idioma)}</p>
                  <p className={`text-xl font-black ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>{formatarDinheiro(analise.despesasTotais, config.moeda)}</p>
               </div>
            </div>

            {/* PAINEL DE MÉTODOS DE PAGAMENTO */}
            <div className="mt-1">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                  {t('method_flow', idioma)}
                </h3>
                <button 
                  onClick={() => setEditandoMetodos(!editandoMetodos)}
                  className={`p-1.5 rounded-lg transition-all ${editandoMetodos ? 'bg-orange-600 text-white shadow-lg' : 'text-orange-500 hover:bg-orange-500/10'}`}
                >
                  <Edit3 size={12} />
                </button>
              </div>

              <AnimatePresence>
                {editandoMetodos && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="flex gap-2 mb-2 p-3 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                      <input 
                        type="text"
                        value={novoMetodo}
                        onChange={(e) => setNovoMetodo(e.target.value)}
                        placeholder="Novo método... (ex: MBWay)"
                        className={`flex-1 bg-transparent border-none outline-none text-xs font-bold uppercase tracking-widest ${temaEscuro ? 'text-white' : 'text-gray-900'}`}
                      />
                      <button 
                        onClick={addMetodo}
                        className="bg-orange-600 text-white p-2 rounded-xl active:scale-95 transition-all shadow-md shadow-orange-600/20"
                      >
                        <PlusCircle size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 gap-2.5">
                {metodosConfig.map(m => {
                  const isVencedor = m === analise.metodoVencedor;
                  const stats = analise.statsMetodos[m] || { total: 0, count: 0 };
                  
                  return (
                    <div key={m} className={`relative flex justify-between items-center ${temaEscuro ? 'bg-gray-900' : 'bg-white shadow-sm'} p-4 rounded-2xl border transition-all duration-500 ${isVencedor ? (temaEscuro ? 'border-orange-500/50 bg-gradient-to-r from-gray-900 to-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.05)]' : 'border-orange-200 bg-orange-50 shadow-md') : (temaEscuro ? 'border-gray-800' : 'border-gray-100')}`}>
                      {isVencedor && (
                        <div className="absolute -top-2 right-2 bg-orange-500 text-white p-1 rounded-lg shadow-lg rotate-3 flex items-center gap-1 px-2 border-2 border-gray-950 z-10">
                          <Crown size={10} fill="currentColor" />
                          <span className="text-[8px] font-black uppercase">{t('most_used', idioma)}</span>
                        </div>
                      )}

                      {editandoMetodos && (
                        <button 
                          onClick={() => deleteMetodo(m)}
                          className="absolute -left-2 -top-2 bg-red-600 text-white p-1 rounded-lg shadow-lg z-20 hover:scale-110 active:scale-90 transition-all border border-gray-950"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isVencedor ? 'bg-orange-500/20 text-orange-400' : (temaEscuro ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-300')}`}>
                          {getMetodoIcon(m)}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{m === 'Multicaixa' ? 'MTX EXPRESS' : m}</p>
                          <p className={`text-base font-black ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>{formatarDinheiro(stats.total, config.moeda)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] text-gray-600 font-bold uppercase">{t('operations', idioma)}</p>
                        <p className={`text-sm font-black ${isVencedor ? 'text-orange-500' : 'text-gray-400'}`}>{stats.count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-5 rounded-2xl`}>
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><CalendarIcon size={14}/> {t('weekly_performance', idioma)}</h3>
                  <div className="flex items-center gap-2">
                     <button onClick={() => { setOffsetSemanas(prev => prev - 1); setDiaSelecionado(null); }} className={`p-1.5 ${temaEscuro ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} text-gray-400 rounded-lg transition-colors`}><ChevronLeft size={16}/></button>
                     <span className={`text-[10px] font-black ${temaEscuro ? 'text-white bg-gray-800' : 'text-gray-900 bg-gray-100'} px-3 py-1 rounded-full uppercase tracking-tighter`}>
                        {offsetSemanas === 0 ? t('this_week', idioma) : offsetSemanas === -1 ? t('last_week', idioma) : `${Math.abs(offsetSemanas)} ${t('weeks', idioma)}`}
                     </span>
                     <button onClick={() => { setOffsetSemanas(prev => prev + 1); setDiaSelecionado(null); }} className={`p-1.5 ${temaEscuro ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} text-gray-400 rounded-lg transition-colors`}><ChevronRight size={16}/></button>
                  </div>
               </div>

               <div className="mb-6 flex flex-col items-center">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('billed_in_week', idioma)}</p>
                  <h4 className={`text-2xl font-black ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>{formatarDinheiro(analise.faturadoSemana)}</h4>
                  <div className="flex items-center gap-1 text-[9px] text-orange-500 font-black mt-1">
                     <TrendingUp size={10} />
                     <span>{inicioSemana.toLocaleDateString('pt-AO', {day:'2-digit', month:'short'})} - {fimSemana.toLocaleDateString('pt-AO', {day:'2-digit', month:'short', year:'numeric'})}</span>
                  </div>
               </div>

               <div ref={chartRef} className={`h-44 w-full relative mb-4 ${temaEscuro ? 'bg-gray-950/40 border-gray-800/50' : 'bg-gray-50 border-gray-100 shadow-inner'} rounded-xl p-4 border`}>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                     <defs>
                       <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                         <feGaussianBlur stdDeviation="2.5" result="blur" />
                         <feComposite in="SourceGraphic" in2="blur" operator="over" />
                       </filter>
                       <linearGradient id="waveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                       </linearGradient>
                     </defs>

                     <path d={areaPath} fill="url(#waveGrad)" className="transition-all duration-700" />
                     <path d={smoothLine} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" filter="url(#neonGlow)" className="transition-all duration-700" />
                     
                     {pontosSVG.map((p, i) => (
                       <g key={i} className="cursor-pointer" onClick={() => setDiaSelecionado(diaSelecionado === i ? null : i)}>
                          {/* Active target area */}
                          <rect x={p.x - 6} y="0" width="12" height="100" fill="transparent" />
                          
                          {/* Day Point */}
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={diaSelecionado === i ? "4.5" : "2"} 
                            fill={diaSelecionado === i ? "#f97316" : (temaEscuro ? "#111827" : "#cbd5e1")} 
                            stroke="#f97316" 
                            strokeWidth="1.5" 
                            className="transition-all duration-300"
                          />
                          
                          {/* Value Label - Only shown on CLICK */}
                          {diaSelecionado === i && (
                            <g className="animate-in fade-in zoom-in-95 duration-200">
                              {/* Shadow line */}
                              <line x1={p.x} y1={p.y} x2={p.x} y2="100" stroke="#f97316" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.3" />
                              
                              {/* Tooltip Background */}
                              <rect x={p.x - 16} y={p.y - 18} width="32" height="12" rx="3" fill={temaEscuro ? "#1f2937" : "#ffffff"} stroke="#fb923c" strokeWidth="0.5" />
                              <text x={p.x} y={p.y - 12} fontSize="5" fontWeight="900" fill={temaEscuro ? "white" : "#1f2937"} textAnchor="middle" dominantBaseline="middle">
                                {formatarDinheiro(p.val, config.moeda)}
                              </text>
                            </g>
                          )}
                       </g>
                     ))}
                  </svg>
                  <div className="flex justify-between w-full text-[10px] text-gray-600 font-bold mt-4 px-1">
                     {diasChaves.map((dia, idx) => (
                       <span key={dia} className={`${diaSelecionado === idx ? 'text-orange-500 scale-125' : ''} transition-all duration-300`}>{dia}</span>
                     ))}
                  </div>
               </div>
               <div className={`grid grid-cols-3 gap-3 mt-6 pt-4 border-t ${temaEscuro ? 'border-gray-800' : 'border-gray-100'}`}>
                   <div><p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{t('best_day', idioma)}</p><p className="text-sm font-black text-emerald-500">{analise.melhorDia}</p></div>
                   <div>
                     <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{t('best_week', idioma)}</p>
                     <p className="text-[11px] font-black text-orange-500">
                       {formatarDinheiro(analise.melhorSemanaValor)}
                       {analise.melhorSemanaData !== 'N/A' && (
                         <span className="block text-[7px] text-gray-600 font-medium tracking-tight">
                           {t('start', idioma)}: {new Date(analise.melhorSemanaData + 'T12:00:00').toLocaleDateString(idioma, { day: '2-digit', month: '2-digit' })}
                         </span>
                       )}
                     </p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{t('trend', idioma)}</p>
                     <p className={`text-[10px] font-black uppercase tracking-tighter ${analise.tendenciaLabel.includes('Crescimento') ? 'text-emerald-500' : analise.tendenciaLabel.includes('Queda') ? 'text-red-500' : 'text-orange-400'}`}>
                       {analise.tendenciaLabel}
                     </p>
                   </div>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="arquivos"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-3 min-h-[400px]"
          >
             <div className={`${temaEscuro ? 'bg-orange-950/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'} p-4 rounded-2xl border flex items-start gap-3`}>
                <FolderDown className="text-orange-500 shrink-0" size={20} />
                <p className="text-[10px] text-gray-500 font-medium uppercase leading-relaxed">
                   {t('reports_desc', idioma)}
                </p>
             </div>

             <div className="grid gap-2">
                {relatoriosSalvos.map(rel => (
                  <div key={rel.id} className={`${temaEscuro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-3 rounded-2xl flex items-center justify-between group`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${rel.tipo === 'pdf' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                         {rel.tipo === 'pdf' ? <Download size={18} /> : <FileSpreadsheet size={18} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-black truncate max-w-[150px] uppercase tracking-tighter ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>{rel.nome}</h4>
                        <p className="text-[9px] text-gray-500 font-bold">
                          {new Date(rel.dataCriacao).toLocaleString('pt-AO')} • {(rel.tamanho / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <button 
                         title={t('download_to_device', idioma)}
                         onClick={async () => {
                           // Download direto como base64
                           const link = document.createElement('a');
                           link.href = rel.blobBase64;
                           link.download = rel.nome;
                           link.click();
                         }}
                         className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white p-2 rounded-xl transition-all"
                       >
                         <Download size={16} />
                       </button>
                       <button 
                         title={t('share', idioma)}
                         onClick={async () => {
                           // Re-partilhar o ficheiro guardado
                           const res = await fetch(rel.blobBase64);
                           const blob = await res.blob();
                           partilharFicheiro(blob, rel.nome);
                         }}
                         className="bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white p-2 rounded-xl transition-all"
                       >
                         <Share2 size={16} />
                       </button>
                       <button 
                         title={t('delete', idioma)}
                         onClick={() => apagarRelatorio(rel.id)}
                         className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white p-2 rounded-xl transition-all"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                ))}

                {relatoriosSalvos.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 opacity-20">
                      <FolderDown size={60} />
                      <p className="text-xs font-black uppercase tracking-widest mt-4">{t('no_files_saved', idioma)}</p>
                   </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
