import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { parseDecimalSeguro, formatarDecimal, somarValores } from '../utils/decimalUtils';
import type { DespesaFixaCompleta } from './despesasFixasService';
import type { DespesaDiversaCompleta } from './despesasDiversasService';
import { formatDateToBrazilian } from '../utils/dateUtils';

// Interface unificada para relatórios
interface DespesaRelatorio {
  id: number;
  nome: string;
  valor: number;
  filial_nome: string;
  categoria_nome?: string;
  tipo_despesa: 'fixa' | 'diversa';
  status: string;
  data_despesa?: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  periodicidade?: string;
  dia_vencimento?: number;
  observacao?: string;
}

export class RelatoriosPDFService {
  private doc: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private currentY: number;
  private margin: number;
  private lineHeight: number;

  constructor() {
    this.doc = new jsPDF('landscape');
    this.pageHeight = this.doc.internal.pageSize.height;
    this.pageWidth = this.doc.internal.pageSize.width;
    this.currentY = 20;
    this.margin = 20;
    this.lineHeight = 6;
  }

  // Método para adicionar cabeçalho
  private addHeader(titulo: string, subtitulo?: string) {
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(titulo, this.pageWidth / 2, 20, { align: 'center' });
    
    if (subtitulo) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitulo, this.pageWidth / 2, 28, { align: 'center' });
    }
    
    // Linha separadora
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, 35, this.pageWidth - this.margin, 35);
    
    this.currentY = 45;
  }

  // Método para adicionar rodapé
  private addFooter() {
    const now = new Date();
    const dataHora = `${formatDateToBrazilian(now.toISOString().slice(0, 10))} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Gerado em: ${dataHora}`, this.margin, this.pageHeight - 10);
    this.doc.text(`Página ${this.doc.getCurrentPageInfo().pageNumber}`, this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
  }

  // Método para verificar se precisa de nova página
  private checkNewPage(requiredSpace: number = 20) {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.addFooter();
      this.doc.addPage();
      this.currentY = 20;
      return true;
    }
    return false;
  }

  // Método para adicionar texto com quebra de linha
  private addText(text: string, x: number, fontSize: number = 10, fontStyle: 'normal' | 'bold' = 'normal', maxWidth?: number) {
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', fontStyle);
    
    if (maxWidth) {
      const lines = this.doc.splitTextToSize(text, maxWidth);
      for (let i = 0; i < lines.length; i++) {
        this.checkNewPage();
        this.doc.text(lines[i], x, this.currentY);
        this.currentY += this.lineHeight;
      }
    } else {
      this.checkNewPage();
      this.doc.text(text, x, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  // Método para criar tabela manual
  private createTable(headers: string[], rows: string[][], columnWidths: number[]) {
    const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    const startX = (this.pageWidth - tableWidth) / 2;
    
    this.checkNewPage(30);
    
    // Cabeçalho da tabela
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(startX, this.currentY, tableWidth, 8, 'F');
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    
    let currentX = startX;
    for (let i = 0; i < headers.length; i++) {
      this.doc.text(headers[i], currentX + 2, this.currentY + 5);
      currentX += columnWidths[i];
    }
    
    this.currentY += 8;
    
    // Linhas da tabela
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    
    for (const row of rows) {
      this.checkNewPage(10);
      
      currentX = startX;
      const rowHeight = 6;
      
      // Fundo alternado
      if (rows.indexOf(row) % 2 === 0) {
        this.doc.setFillColor(250, 250, 250);
        this.doc.rect(startX, this.currentY, tableWidth, rowHeight, 'F');
      }
      
      for (let i = 0; i < row.length; i++) {
        const cellText = this.doc.splitTextToSize(row[i], columnWidths[i] - 4);
        this.doc.text(cellText[0] || '', currentX + 2, this.currentY + 4);
        currentX += columnWidths[i];
      }
      
      // Bordas
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.1);
      this.doc.rect(startX, this.currentY, tableWidth, rowHeight);
      
      this.currentY += rowHeight;
    }
    
    this.currentY += 5;
  }

  // Relatório de Extrato de Despesas
  public gerarExtratoDespesas(
    despesas: DespesaRelatorio[],
    filtros: {
      dataInicial: string;
      dataFinal: string;
      tipoDespesa?: string;
      filial?: string;
      categoria?: string;
      status?: string;
    }
  ) {
    // Cabeçalho
    const periodo = `${formatDateToBrazilian(filtros.dataInicial)} a ${formatDateToBrazilian(filtros.dataFinal)}`;
    this.addHeader('EXTRATO DE DESPESAS', `Período: ${periodo}`);
    
    // Filtros aplicados
    this.addText('FILTROS APLICADOS:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    if (filtros.tipoDespesa) {
      this.addText(`• Tipo: ${filtros.tipoDespesa === 'fixa' ? 'Despesas Fixas' : 'Despesas Diversas'}`, this.margin + 5, 9);
    }
    if (filtros.filial) {
      this.addText(`• Filial: ${filtros.filial}`, this.margin + 5, 9);
    }
    if (filtros.categoria) {
      this.addText(`• Categoria: ${filtros.categoria}`, this.margin + 5, 9);
    }
    if (filtros.status) {
      this.addText(`• Status: ${filtros.status}`, this.margin + 5, 9);
    }
    
    this.currentY += 5;
    
    // Resumo
    const totalGeral = despesas.reduce((acc, d) => acc + d.valor, 0);
    const totalFixas = despesas.filter(d => d.tipo_despesa === 'fixa').reduce((acc, d) => acc + d.valor, 0);
    const totalDiversas = despesas.filter(d => d.tipo_despesa === 'diversa').reduce((acc, d) => acc + d.valor, 0);
    
    this.addText('RESUMO FINANCEIRO:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    this.doc.setFontSize(9);
    this.doc.text(`Total Despesas Fixas: R$ ${totalFixas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.doc.text(`Total Despesas Diversas: R$ ${totalDiversas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.pageWidth / 2, this.currentY);
    this.currentY += this.lineHeight;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL GERAL: R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.currentY += 10;
    
    // Despesas Fixas
    const despesasFixas = despesas.filter(d => d.tipo_despesa === 'fixa');
    if (despesasFixas.length > 0) {
      this.addText('DESPESAS FIXAS:', this.margin, 12, 'bold');
      this.currentY += 2;
      
      const headersFixas = ['Nome', 'Filial', 'Categoria', 'Valor', 'Periodicidade', 'Status'];
      const rowsFixas = despesasFixas.map(d => [
        d.nome,
        d.filial_nome,
        d.categoria_nome || 'Sem categoria',
        `R$ ${d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        d.periodicidade || '',
        d.status
      ]);
      
      this.createTable(headersFixas, rowsFixas, [40, 30, 35, 25, 25, 20]);
    }
    
    // Despesas Diversas
    const despesasDiversas = despesas.filter(d => d.tipo_despesa === 'diversa');
    if (despesasDiversas.length > 0) {
      this.addText('DESPESAS DIVERSAS:', this.margin, 12, 'bold');
      this.currentY += 2;
      
      const headersDiversas = ['Nome', 'Filial', 'Categoria', 'Valor', 'Data', 'Status'];
      const rowsDiversas = despesasDiversas.map(d => [
        d.nome,
        d.filial_nome,
        d.categoria_nome || 'Sem categoria',
        `R$ ${d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        d.data_despesa ? formatDateToBrazilian(d.data_despesa) : '',
        d.status
      ]);
      
      this.createTable(headersDiversas, rowsDiversas, [40, 30, 35, 25, 25, 20]);
    }
    
    // Rodapé final
    this.addFooter();
    
    return this.doc;
  }

  // Relatório de Despesas Fixas
  public gerarRelatorioDespesasFixas(despesas: DespesaFixaCompleta[]) {
    this.addHeader('RELATÓRIO DE DESPESAS FIXAS');
    
    // Resumo
    const totalAtivas = despesas.filter(d => d.status === 'ativo').reduce((acc, d) => acc + d.valor, 0);
    const totalInativas = despesas.filter(d => d.status === 'inativo').reduce((acc, d) => acc + d.valor, 0);
    const totalGeral = totalAtivas + totalInativas;
    
    this.addText('RESUMO:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    this.doc.setFontSize(9);
    this.doc.text(`Despesas Ativas: ${despesas.filter(d => d.status === 'ativo').length} (R$ ${totalAtivas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Despesas Inativas: ${despesas.filter(d => d.status === 'inativo').length} (R$ ${totalInativas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL: ${despesas.length} despesas (R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += 10;
    
    // Tabela de despesas
    const headers = ['Nome', 'Filial', 'Categoria', 'Valor', 'Periodicidade', 'Vencimento', 'Status'];
    const rows = despesas.map(d => [
      d.nome,
      d.filial_nome,
      d.categoria_nome || 'Sem categoria',
      `R$ ${d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      d.periodicidade,
      `Dia ${d.dia_vencimento}`,
      d.status
    ]);
    
    this.createTable(headers, rows, [35, 25, 30, 22, 22, 20, 18]);
    
    this.addFooter();
    return this.doc;
  }

  // Relatório de Despesas Diversas
  public gerarRelatorioDespesasDiversas(despesas: DespesaDiversaCompleta[], periodo?: { inicio: string; fim: string }) {
    const titulo = periodo ? 
      `RELATÓRIO DE DESPESAS DIVERSAS - ${formatDateToBrazilian(periodo.inicio)} a ${formatDateToBrazilian(periodo.fim)}` :
      'RELATÓRIO DE DESPESAS DIVERSAS';
    
    this.addHeader(titulo);
    
    // Resumo
    const totalPago = despesas.filter(d => d.status === 'pago').reduce((acc, d) => acc + d.valor, 0);
    const totalPendente = despesas.filter(d => d.status === 'pendente').reduce((acc, d) => acc + d.valor, 0);
    const totalGeral = totalPago + totalPendente;
    
    this.addText('RESUMO:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    this.doc.setFontSize(9);
    this.doc.text(`Despesas Pagas: ${despesas.filter(d => d.status === 'pago').length} (R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Despesas Pendentes: ${despesas.filter(d => d.status === 'pendente').length} (R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL: ${despesas.length} despesas (R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += 10;
    
    // Tabela de despesas
    const headers = ['Nome', 'Filial', 'Categoria', 'Valor', 'Data', 'Pagamento', 'Status'];
    const rows = despesas.map(d => [
      d.nome,
      d.filial_nome,
      d.categoria_nome || 'Sem categoria',
      `R$ ${d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      formatDateToBrazilian(d.data_despesa),
      d.data_pagamento ? formatDateToBrazilian(d.data_pagamento) : '-',
      d.status
    ]);
    
    this.createTable(headers, rows, [30, 25, 25, 22, 20, 20, 18]);
    
    this.addFooter();
    return this.doc;
  }

  // Método para salvar o PDF
  public salvar(nomeArquivo: string) {
    this.doc.save(nomeArquivo);
  }

  // Relatório de Títulos
  public gerarRelatorioTitulos(
    titulos: any[],
    filtros: {
      tipo?: string;
      fornecedor?: string;
      filial?: string;
      dataInicial?: string;
      dataFinal?: string;
      filtroTipo?: { vencimento: boolean; pagamento: boolean; todos: boolean };
    }
  ) {
    this.addHeader('RELATÓRIO DE TÍTULOS');
    
    // Filtros aplicados
    this.addText('FILTROS APLICADOS:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    if (filtros.tipo) {
      this.addText(`• Tipo: ${filtros.tipo}`, this.margin + 5, 9);
    }
    if (filtros.fornecedor) {
      this.addText(`• Fornecedor: ${filtros.fornecedor}`, this.margin + 5, 9);
    }
    if (filtros.filial) {
      this.addText(`• Filial: ${filtros.filial}`, this.margin + 5, 9);
    }
    if (filtros.filtroTipo?.vencimento) {
      this.addText(`• Filtro: Por Data de Vencimento`, this.margin + 5, 9);
    }
    if (filtros.filtroTipo?.pagamento) {
      this.addText(`• Filtro: Por Data de Pagamento`, this.margin + 5, 9);
    }
    if (filtros.filtroTipo?.todos) {
      this.addText(`• Filtro: Todas as Datas`, this.margin + 5, 9);
    }
    if (filtros.dataInicial) {
      this.addText(`• Data Inicial: ${formatDateToBrazilian(filtros.dataInicial)}`, this.margin + 5, 9);
    }
    if (filtros.dataFinal) {
      this.addText(`• Data Final: ${formatDateToBrazilian(filtros.dataFinal)}`, this.margin + 5, 9);
    }
    
    this.currentY += 5;
    
    // Resumo
    const totalTitulos = titulos.length;
    const titulosPagos = titulos.filter(t => t.status === 'pago');
    const titulosPendentes = titulos.filter(t => t.status === 'pendente');
    
    const valorTotal = titulos.reduce((acc, t) => somarValores(acc, t.valor.toString()), 0);
    const multaTotal = titulos.reduce((acc, t) => somarValores(acc, t.multa ? t.multa.toString() : '0'), 0);
    const jurosTotal = titulos.reduce((acc, t) => somarValores(acc, t.juros ? t.juros.toString() : '0'), 0);
    const valorFinalTotal = valorTotal + multaTotal + jurosTotal;
    
    const valorPago = titulosPagos.reduce((acc, t) => {
      const valor = parseDecimalSeguro(t.valor.toString());
      const multa = t.multa ? parseDecimalSeguro(t.multa.toString()) : 0;
      const juros = t.juros ? parseDecimalSeguro(t.juros.toString()) : 0;
      return somarValores(acc, valor + multa + juros);
    }, 0);
    const valorPendente = titulosPendentes.reduce((acc, t) => somarValores(acc, t.valor.toString()), 0);
    
    this.addText('RESUMO FINANCEIRO:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    this.doc.setFontSize(9);
    this.doc.text(`Total de Títulos: ${totalTitulos}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Títulos Pagos: ${titulosPagos.length} (${formatarDinheiro(valorPago)})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Títulos Pendentes: ${titulosPendentes.length} (${formatarDinheiro(valorPendente)})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`VALOR TOTAL: ${formatarDinheiro(valorFinalTotal)}`, this.margin + 5, this.currentY);
    this.currentY += 10;
    
    // Tabela de títulos
    const headers = ['Número', 'Tipo', 'Fornecedor', 'Filial', 'Vencimento', 'Valor', 'Multa', 'Juros', 'Total', 'Status'];
    const rows = titulos.map(t => [
      t.numero || '-',
      t.tipo,
      t.fornecedor,
      t.filial,
      t.vencimento ? formatDateToBrazilian(t.vencimento) : '-',
      formatarDinheiro(t.valor),
      formatarDinheiro(t.multa),
      formatarDinheiro(t.juros),
      formatarDinheiro(somarValores(t.valor?.toString() || '0', t.multa ? t.multa.toString() : '0', t.juros ? t.juros.toString() : '0')),
      t.status === 'pago' ? 'Pago' : t.status === 'pendente' ? 'Pendente' : t.status
    ]);
    
    // Ajustar os tamanhos das colunas para valores grandes, número do título e status
    this.createTable(headers, rows, [22, 20, 25, 20, 22, 28, 22, 22, 28, 22]);
    
    // Linha de totais
    this.checkNewPage(15);
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TOTAIS:', this.margin + 2, this.currentY + 5);
    this.doc.text(`R$ ${formatarDinheiro(valorTotal)}`, this.margin + 125, this.currentY + 5);
    this.doc.text(`R$ ${formatarDinheiro(multaTotal)}`, this.margin + 150, this.currentY + 5);
    this.doc.text(`R$ ${formatarDinheiro(jurosTotal)}`, this.margin + 172, this.currentY + 5);
    this.doc.text(`R$ ${formatarDinheiro(valorFinalTotal)}`, this.margin + 197, this.currentY + 5);
    
    this.currentY += 15;
    
    this.addFooter();
    return this.doc;
  }

  // Relatório de OS
  public gerarRelatorioOS(
    osList: any[],
    filtros: {
      filial?: string;
      dataInicial?: string;
      dataFinal?: string;
    }
  ) {
    this.addHeader('RELATÓRIO DE ORDENS DE SERVIÇO');
    
    // Filtros aplicados
    this.addText('FILTROS APLICADOS:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    if (filtros.filial) {
      this.addText(`• Filial: ${filtros.filial}`, this.margin + 5, 9);
    } else {
      this.addText(`• Filial: Todas`, this.margin + 5, 9);
    }
    if (filtros.dataInicial && filtros.dataFinal) {
      this.addText(`• Período: ${formatDateToBrazilian(filtros.dataInicial)} a ${formatDateToBrazilian(filtros.dataFinal)}`, this.margin + 5, 9);
    } else if (filtros.dataInicial) {
      this.addText(`• Data Inicial: ${formatDateToBrazilian(filtros.dataInicial)}`, this.margin + 5, 9);
    } else if (filtros.dataFinal) {
      this.addText(`• Data Final: ${formatDateToBrazilian(filtros.dataFinal)}`, this.margin + 5, 9);
    }
    
    this.currentY += 5;
    
    // Cálculos dos totais
    const totalVendas = osList.reduce((acc, os) => acc + (os.valorVenda || 0), 0);
    const totalLentes = osList.reduce((acc, os) => acc + (os.custoLentes || 0), 0);
    const totalArmacoes = osList.reduce((acc, os) => acc + (os.custoArmacoes || 0), 0);
    const totalMkt = osList.reduce((acc, os) => acc + (os.custoMkt || 0), 0);
    const totalOutros = osList.reduce((acc, os) => acc + (os.outrosCustos || 0), 0);
    const margemBruta = totalVendas - (totalLentes + totalArmacoes + totalMkt + totalOutros);
    const totalOS = osList.length;
    const margemMedia = totalOS ? margemBruta / totalOS : 0;
    
    // Resumo executivo
    this.addText('RESUMO EXECUTIVO:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    this.doc.setFontSize(9);
    this.doc.text(`Total de OS: ${totalOS}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Valor Total das Vendas: R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Custo Total das Lentes: R$ ${totalLentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Custo Total das Armações: R$ ${totalArmacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Custo Total do MKT: R$ ${totalMkt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Outros Custos: R$ ${totalOutros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`MARGEM BRUTA: R$ ${margemBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`MARGEM MÉDIA POR OS: R$ ${margemMedia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 5, this.currentY);
    this.currentY += 10;
    
    // Tabela de OS
    const headers = ['Data', 'Filial', 'Médico', 'TCO', 'Venda', 'Lentes', 'Armações', 'MKT', 'Outros', 'Margem'];
    const rows = osList.map(os => {
      const margem = os.valorVenda - (os.custoLentes + os.custoArmacoes + os.custoMkt + os.outrosCustos);
      return [
        formatDateToBrazilian(os.data),
        os.filial,
        os.nomeMedico || '-',
        os.numeroTco || '-',
        `R$ ${os.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${os.custoLentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${os.custoArmacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${os.custoMkt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${os.outrosCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${margem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ];
    });
    
    this.createTable(headers, rows, [20, 30, 35, 20, 25, 22, 25, 20, 20, 25]);
    
    // Linha de totais
    this.checkNewPage(15);
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TOTAIS:', this.margin + 2, this.currentY + 5);
    this.doc.text(`R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 125, this.currentY + 5);
    this.doc.text(`R$ ${totalLentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 150, this.currentY + 5);
    this.doc.text(`R$ ${totalArmacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 172, this.currentY + 5);
    this.doc.text(`R$ ${totalMkt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 197, this.currentY + 5);
    this.doc.text(`R$ ${totalOutros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 217, this.currentY + 5);
    this.doc.text(`R$ ${margemBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 237, this.currentY + 5);
    
    this.currentY += 15;
    
    this.addFooter();
    return this.doc;
  }

  // Método para visualizar o PDF
  public visualizar() {
    window.open(this.doc.output('bloburl'), '_blank');
  }
}

// Função utilitária para arredondar e formatar valores monetários
function formatarDinheiro(valor: any) {
  const num = parseDecimalSeguro(valor);
  return 'R$ ' + formatarDecimal(num).replace('.', ',');
}

export const relatoriosPDFService = new RelatoriosPDFService();