import jsPDF from 'jspdf';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { parseDecimalSeguro, formatarDecimal, somarValores } from '../utils/decimalUtils';

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
    this.doc = new jsPDF('portrait');
    this.pageHeight = this.doc.internal.pageSize.height;
    this.pageWidth = this.doc.internal.pageSize.width;
    this.currentY = 15;
    this.margin = 15;
    this.lineHeight = 4;
  }

  // Reinicia o documento e estados para cada geração, evitando vazamento de estado entre relatórios
  private resetDoc() {
    this.doc = new jsPDF('portrait');
    this.pageHeight = this.doc.internal.pageSize.height;
    this.pageWidth = this.doc.internal.pageSize.width;
    this.currentY = 15;
    this.margin = 15;
    this.lineHeight = 4;
    // Fonte padrão
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(0, 0, 0);
    this.doc.setDrawColor(0, 0, 0);
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
    this.doc.text(`Página ${(this.doc as any).internal.getCurrentPageInfo().pageNumber}`, this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
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

  // Método para criar tabela manual com controle exato de largura
  private createTable(headers: string[], rows: string[][], columnWidths: number[]) {
    const availableWidth = this.pageWidth - (2 * this.margin);
    
    // Usar a largura ideal para coincidir com a faixa azul
    const finalTableWidth = this.getIdealTableWidth();
    const totalRequestedWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    const adjustedWidths = columnWidths.map(width => (width / totalRequestedWidth) * finalTableWidth);
    
    // Centralizar a tabela
    const startX = this.margin + (availableWidth - finalTableWidth) / 2;
    
    this.checkNewPage(30);
    
    // Cabeçalho da tabela com bordas adequadas
    const headerHeight = 8;
    this.doc.setFillColor(0, 0, 0); // Cabeçalho preto
    this.doc.rect(startX, this.currentY, finalTableWidth, headerHeight, 'F');
    
    // Bordas do cabeçalho
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.3);
    this.doc.rect(startX, this.currentY, finalTableWidth, headerHeight);
    
    // Texto do cabeçalho
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255); // Texto branco
    
    let currentX = startX;
    for (let i = 0; i < headers.length; i++) {
      // Bordas verticais entre colunas do cabeçalho
      if (i > 0) {
        this.doc.line(currentX, this.currentY, currentX, this.currentY + headerHeight);
      }
      
      // Centralizar texto na célula
      const cellWidth = adjustedWidths[i];
      const textWidth = this.doc.getTextWidth(headers[i]);
      const textX = currentX + (cellWidth - textWidth) / 2;
      
      this.doc.text(headers[i], textX, this.currentY + 5.5);
      currentX += cellWidth;
    }
    
    this.currentY += headerHeight;
    
    // Linhas da tabela
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(0, 0, 0); // Voltar para texto preto
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      this.checkNewPage(10);
      
      currentX = startX;
      const rowHeight = 6;
      
      // Fundo alternado apenas nas linhas de dados
      if (rowIndex % 2 === 0) {
        this.doc.setFillColor(248, 249, 250);
        this.doc.rect(startX, this.currentY, finalTableWidth, rowHeight, 'F');
      }
      
      // Bordas da linha
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.1);
      this.doc.rect(startX, this.currentY, finalTableWidth, rowHeight);
      
      for (let i = 0; i < row.length; i++) {
        // Bordas verticais entre colunas
        if (i > 0) {
          this.doc.line(currentX, this.currentY, currentX, this.currentY + rowHeight);
        }
        
        const cellWidth = adjustedWidths[i];
        const fullText = (row[i] || '').toString();
        
        // Definir alinhamento: números à direita
        let textX = currentX + 2;
        let alignRight = false;
        if (this.isNumericValue(fullText)) {
          alignRight = true;
        }
        
        // Auto-shrink: reduzir fonte para caber em uma linha
        const originalFontSize = 8; // fonte atual definida para corpo da tabela
        let fontSize = originalFontSize;
        let textWidth = this.doc.getTextWidth(fullText);
        const maxWidth = cellWidth - 4; // padding 2px em cada lado
        if (textWidth > maxWidth) {
          const scale = maxWidth / textWidth;
          fontSize = Math.max(7, Math.floor(originalFontSize * scale));
          this.doc.setFontSize(fontSize);
          textWidth = this.doc.getTextWidth(fullText);
        }
        
        if (alignRight) {
          textX = currentX + cellWidth - textWidth - 2;
        }
        
        this.doc.text(fullText, textX, this.currentY + 4);
        
        // Restaurar font size
        if (fontSize !== originalFontSize) {
          this.doc.setFontSize(originalFontSize);
        }
        
        currentX += cellWidth;
      }
      
      this.currentY += rowHeight;
    }
    
    // Borda final da tabela
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.3);
    this.doc.rect(startX, this.currentY - (rows.length * 6) - headerHeight, finalTableWidth, (rows.length * 6) + headerHeight);
    
    this.currentY += 5;
  }

  // Método auxiliar para verificar se um valor é numérico
  private isNumericValue(value: string): boolean {
    if (!value) return false;
    return /^R\$|^\d|^-\d/.test(value.trim());
  }

  // Método para calcular a largura ideal da tabela baseada na faixa azul
  private getIdealTableWidth(): number {
    const availableWidth = this.pageWidth - (2 * this.margin);
    // Largura otimizada para coincidir com a faixa azul do autoTable
    return availableWidth * 0.82; // Ajuste fino para coincidir perfeitamente
  }

  // Badge azul com o nome da filial, alinhado e com mesma largura da tabela
  private drawFilialBadge(nomeFilial: string) {
    const availableWidth = this.pageWidth - (2 * this.margin);
    const tableWidth = this.getIdealTableWidth();
    const startX = this.margin + (availableWidth - tableWidth) / 2;
    const badgeHeight = 7;

    // Garante espaço para o badge
    this.checkNewPage(badgeHeight + 6);

    // Fundo preto do badge
    this.doc.setFillColor(0, 0, 0);
    this.doc.rect(startX, this.currentY, tableWidth, badgeHeight, 'F');

    // Borda do badge
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.3);
    this.doc.rect(startX, this.currentY, tableWidth, badgeHeight);

    // Texto branco centralizado
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    const label = `Filial: ${nomeFilial.toUpperCase()}`;
    const textWidth = this.doc.getTextWidth(label);
    const textX = startX + (tableWidth - textWidth) / 2;
    this.doc.text(label, textX, this.currentY + 4.8);

    // Reset de cor de texto
    this.doc.setTextColor(0, 0, 0);

    this.currentY += badgeHeight + 3; // pequeno espaçamento após o badge
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

  // Relatório de Despesas Fixas (ativo)
  public gerarRelatorioDespesasFixas(despesas: any[]) {
    this.addHeader('RELATÓRIO DE DESPESAS FIXAS');
    
    // Resumo
    const totalAtivas = despesas.filter((d: any) => d.status === 'ativo').reduce((acc: number, d: any) => acc + (d.valor || 0), 0);
    const totalInativas = despesas.filter((d: any) => d.status === 'inativo').reduce((acc: number, d: any) => acc + (d.valor || 0), 0);
    const totalGeral = totalAtivas + totalInativas;
    
    this.addText('RESUMO:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    this.doc.setFontSize(9);
    this.doc.text(`Despesas Ativas: ${despesas.filter((d: any) => d.status === 'ativo').length} (R$ ${totalAtivas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Despesas Inativas: ${despesas.filter((d: any) => d.status === 'inativo').length} (R$ ${totalInativas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL: ${despesas.length} despesas (R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += 10;
    
    // Tabela de despesas
    const headers = ['Nome', 'Filial', 'Categoria', 'Valor', 'Periodicidade', 'Vencimento', 'Status'];
    const rows = despesas.map((d: any) => [
      d.nome,
      d.filial_nome,
      d.categoria_nome || 'Sem categoria',
      `R$ ${Number(d.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      d.periodicidade,
      `Dia ${d.dia_vencimento}`,
      d.status
    ]);
    
    this.createTable(headers, rows, [35, 25, 30, 22, 22, 20, 18]);
    
    this.addFooter();
    return this.doc;
  }

  // Relatório de Títulos (ativo)
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
    
    const valorTotal = titulos.reduce((acc, t) => somarValores(acc, t.valor?.toString() || '0'), 0);
    const multaTotal = titulos.reduce((acc, t) => somarValores(acc, t.multa ? t.multa.toString() : '0'), 0);
    const jurosTotal = titulos.reduce((acc, t) => somarValores(acc, t.juros ? t.juros.toString() : '0'), 0);
    const valorFinalTotal = valorTotal + multaTotal + jurosTotal;
    
    const valorPago = titulosPagos.reduce((acc, t) => {
      const valor = parseDecimalSeguro((t.valor ?? 0).toString());
      const multa = t.multa ? parseDecimalSeguro(t.multa.toString()) : 0;
      const juros = t.juros ? parseDecimalSeguro(t.juros.toString()) : 0;
      return somarValores(acc, valor + multa + juros);
    }, 0);
    const valorPendente = titulosPendentes.reduce((acc, t) => somarValores(acc, (t.valor ?? 0).toString()), 0);
    
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
    
    // Ajustar tamanhos das colunas
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

  // Relatório de Despesas Fixas (comentado temporariamente)
  /*
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

  */

  // Relatório de Despesas Diversas (ativo)
  public gerarRelatorioDespesasDiversas(despesas: any[], periodo?: { inicio: string; fim: string }) {
    const titulo = periodo ? 
      `RELATÓRIO DE DESPESAS DIVERSAS - ${formatDateToBrazilian(periodo.inicio)} a ${formatDateToBrazilian(periodo.fim)}` :
      'RELATÓRIO DE DESPESAS DIVERSAS';
    
    this.addHeader(titulo);
    
    // Resumo
    const totalPago = despesas.filter(d => d.status === 'pago').reduce((acc: number, d: any) => acc + d.valor, 0);
    const totalPendente = despesas.filter((d: any) => d.status === 'pendente').reduce((acc: number, d: any) => acc + d.valor, 0);
    const totalGeral = totalPago + totalPendente;
    
    this.addText('RESUMO:', this.margin, 10, 'bold');
    this.currentY += 2;
    
    this.doc.setFontSize(9);
    this.doc.text(`Despesas Pagas: ${despesas.filter((d: any) => d.status === 'pago').length} (R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    this.doc.text(`Despesas Pendentes: ${despesas.filter((d: any) => d.status === 'pendente').length} (R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL: ${despesas.length} despesas (R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, this.margin + 5, this.currentY);
    this.currentY += 10;
    
    // Tabela de despesas
    const headers = ['Nome', 'Filial', 'Categoria', 'Valor', 'Data', 'Pagamento', 'Status'];
    const rows = despesas.map((d: any) => [
      d.nome,
      d.filial_nome,
      d.categoria_nome || 'Sem categoria',
      `R$ ${d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      d.data_despesa ? formatDateToBrazilian(d.data_despesa) : '',
      d.data_pagamento ? formatDateToBrazilian(d.data_pagamento) : '-',
      d.status
    ]);
    
    this.createTable(headers, rows, [30, 25, 25, 22, 20, 20, 18]);
    
    this.addFooter();
    return this.doc;
  }

  // Relatório de OS (ativo)
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
    const totalVendas = osList.reduce((acc: number, os: any) => acc + (os.valorVenda || 0), 0);
    const totalLentes = osList.reduce((acc: number, os: any) => acc + (os.custoLentes || 0), 0);
    const totalArmacoes = osList.reduce((acc: number, os: any) => acc + (os.custoArmacoes || 0), 0);
    const totalMkt = osList.reduce((acc: number, os: any) => acc + (os.custoMkt || 0), 0);
    const totalOutros = osList.reduce((acc: number, os: any) => acc + (os.outrosCustos || 0), 0);
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
    const headersOS = ['Data', 'Filial', 'Médico', 'TCO', 'Venda', 'Lentes', 'Armações', 'MKT', 'Outros', 'Margem'];
    const rowsOS = osList.map((os: any) => {
      const margem = (os.valorVenda || 0) - ((os.custoLentes || 0) + (os.custoArmacoes || 0) + (os.custoMkt || 0) + (os.outrosCustos || 0));
      return [
        os.data ? formatDateToBrazilian(os.data) : '-',
        os.filial,
        os.nomeMedico || '-',
        os.numeroTco || '-',
        `R$ ${Number(os.valorVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${Number(os.custoLentes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${Number(os.custoArmacoes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${Number(os.custoMkt || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${Number(os.outrosCustos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${margem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ];
    });
    
    this.createTable(headersOS, rowsOS, [20, 30, 35, 20, 25, 22, 25, 20, 20, 25]);
    
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

  // TABELA SIMPLES SEM AUTOTABLE - DESENHO BÁSICO
  private criarTabelaBreakdownSimples(dadosFilial: any) {
    // Configuração de tabela manual com controle e centralização
    const tipos = ['Insumos', 'Lentes', 'Armações', 'Diversos', 'Equipamentos'];
    // Ajuste solicitado: Mês/Ano = 21px; +1px em Insumos, Armações, Diversos e Equipamentos
    // Soma total permanece 208
    const colWidths = [21, 31, 31, 31, 31, 31, 32]; // Mes/Ano + 5 tipos + TOTAL
    const rowHeight = 14; // altura por mês (duas linhas de texto dentro)
    const headerHeight = 12;
    const subHeaderHeight = 10;

    const tableWidth = colWidths.reduce((a,b)=>a+b,0);
    const startX = (this.pageWidth - tableWidth) / 2;

    // Cabeçalho principal (preto)
    this.doc.setFillColor(0, 0, 0);
    this.doc.rect(startX, this.currentY, tableWidth, headerHeight, 'F');
    this.doc.setTextColor(255,255,255);
    this.doc.setFont('helvetica','bold');
    this.doc.setFontSize(10);

    // Títulos das colunas
    let cx = startX;
    this.doc.text('Mês/Ano', cx + 2, this.currentY + 8);
    cx += colWidths[0];
    tipos.forEach((t, idx) => {
      const w = colWidths[idx + 1];
      this.doc.text(t, cx + (w / 2), this.currentY + 8, { align: 'center' });
      cx += w;
    });
    this.doc.text('TOTAL', startX + colWidths.slice(0,6).reduce((a,b)=>a+b,0) + (colWidths[6]/2), this.currentY + 8, { align: 'center' });

    this.currentY += headerHeight;

    // Subcabeçalho (rótulos Pend/Pago)
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(startX, this.currentY, tableWidth, subHeaderHeight, 'F');
    this.doc.setTextColor(0,0,0);
    this.doc.setFont('helvetica','normal');
    this.doc.setFontSize(8);
    cx = startX + colWidths[0];
    for (let i = 0; i < 6; i++) { // 5 tipos + TOTAL
      const colCenter = cx + (colWidths[i+1]/2);
      this.doc.text('Pendentes | Pagos', colCenter, this.currentY + 7, { align: 'center' });
      cx += colWidths[i+1];
    }
    // borda linha subheader
    this.doc.setDrawColor(200);
    this.doc.rect(startX, this.currentY - headerHeight, tableWidth, headerHeight + subHeaderHeight);

    this.currentY += subHeaderHeight;

    // Linhas por mês
    this.doc.setFontSize(8);
    dadosFilial.meses.forEach((mes: any, index: number) => {
      // Alternância de fundo
      if (index % 2 === 0) {
        this.doc.setFillColor(248, 249, 250);
        this.doc.rect(startX, this.currentY, tableWidth, rowHeight, 'F');
      }

      // Coluna Mes/Ano
      this.doc.setTextColor(0,0,0);
      this.doc.setFont('helvetica','bold');
      this.doc.text(mes.mes, startX + 2, this.currentY + 9);

      // Para cada tipo, imprimir duas linhas dentro da mesma célula
      this.doc.setFont('helvetica','normal');
      cx = startX + colWidths[0];
      const writeTipoCell = (info: any, width: number) => {
        const pendQtd = info?.pendentes?.quantidade || 0;
        const pendVal = (info?.pendentes?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const pagQtd = info?.pagos?.quantidade || 0;
        const pagVal = (info?.pagos?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const baseFont = 8;
        const minFont = 5.5;

        // Linha 1
        const l1 = `Pnd: ${pendQtd} | R$ ${pendVal}`;
        let fs = baseFont; this.doc.setFontSize(fs);
        while (this.doc.getTextWidth(l1) > width - 2 && fs > minFont) { fs -= 0.5; this.doc.setFontSize(fs); }
        this.doc.text(l1, cx + 1, this.currentY + 6);

        // Linha 2
        const l2 = `Pag: ${pagQtd} | R$ ${pagVal}`;
        fs = baseFont; this.doc.setFontSize(fs);
        while (this.doc.getTextWidth(l2) > width - 2 && fs > minFont) { fs -= 0.5; this.doc.setFontSize(fs); }
        this.doc.text(l2, cx + 1, this.currentY + 11);

        // Restaurar
        this.doc.setFontSize(baseFont);
      };

      // Tipos
      tipos.forEach((t, i) => {
        const info = mes.tipos ? mes.tipos[t] : undefined;
        writeTipoCell(info, colWidths[i+1]);
        cx += colWidths[i+1];
      });

      // TOTAL da linha (somando todos os tipos)
      const totalPendQtd = tipos.reduce((acc, t) => acc + (mes.tipos?.[t]?.pendentes?.quantidade || 0), 0);
      const totalPendVal = tipos.reduce((acc, t) => acc + (mes.tipos?.[t]?.pendentes?.valor || 0), 0);
      const totalPagQtd  = tipos.reduce((acc, t) => acc + (mes.tipos?.[t]?.pagos?.quantidade || 0), 0);
      const totalPagVal  = tipos.reduce((acc, t) => acc + (mes.tipos?.[t]?.pagos?.valor || 0), 0);
      const totalInfo = {
        pendentes: { quantidade: totalPendQtd, valor: totalPendVal },
        pagos: { quantidade: totalPagQtd, valor: totalPagVal }
      };
      writeTipoCell(totalInfo, colWidths[6]);

      // Desenhar bordas da linha
      this.doc.setDrawColor(220);
      let bx = startX;
      for (let w of colWidths) {
        this.doc.rect(bx, this.currentY, w, rowHeight);
        bx += w;
      }

      this.currentY += rowHeight;
    });

    // Linha TOTAL agregada (somando todos os meses)
    // Agregar por tipo
    const agregados: any = {};
    tipos.forEach(t => {
      agregados[t] = { pendentes: { quantidade: 0, valor: 0 }, pagos: { quantidade: 0, valor: 0 } };
    });
    let totalAll = { pendentes: { quantidade: 0, valor: 0 }, pagos: { quantidade: 0, valor: 0 } };
    dadosFilial.meses.forEach((mes: any) => {
      tipos.forEach(t => {
        const info = mes.tipos?.[t];
        if (info) {
          agregados[t].pendentes.quantidade += info.pendentes?.quantidade || 0;
          agregados[t].pendentes.valor += info.pendentes?.valor || 0;
          agregados[t].pagos.quantidade += info.pagos?.quantidade || 0;
          agregados[t].pagos.valor += info.pagos?.valor || 0;
        }
      });
    });
    tipos.forEach(t => {
      totalAll.pendentes.quantidade += agregados[t].pendentes.quantidade;
      totalAll.pendentes.valor += agregados[t].pendentes.valor;
      totalAll.pagos.quantidade += agregados[t].pagos.quantidade;
      totalAll.pagos.valor += agregados[t].pagos.valor;
    });

    // Fundo total (preto)
    this.doc.setFillColor(0, 0, 0);
    this.doc.rect(startX, this.currentY, tableWidth, rowHeight, 'F');
    this.doc.setTextColor(255,255,255);
    this.doc.setFont('helvetica','bold');
    this.doc.text('TOTAL', startX + 2, this.currentY + 9);

    // células totais sem quebra (auto-shrink por linha)
    this.doc.setFont('helvetica','normal');
    this.doc.setTextColor(255,255,255);
    const baseFont = 8;
    const minFont = 5.5;
    cx = startX + colWidths[0];
    tipos.forEach((t, i) => {
      const info = agregados[t];
      const pendVal = info.pendentes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const pagVal = info.pagos.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const w = colWidths[i+1];
      const line1 = `Pnd: ${info.pendentes.quantidade} | R$ ${pendVal}`;
      const line2 = `Pag: ${info.pagos.quantidade} | R$ ${pagVal}`;

      // linha 1
      let fs = baseFont;
      this.doc.setFontSize(fs);
      while (this.doc.getTextWidth(line1) > w - 2 && fs > minFont) {
        fs -= 0.5; this.doc.setFontSize(fs);
      }
      this.doc.text(line1, cx + 1, this.currentY + 6);

      // linha 2
      fs = baseFont; this.doc.setFontSize(fs);
      while (this.doc.getTextWidth(line2) > w - 2 && fs > minFont) {
        fs -= 0.5; this.doc.setFontSize(fs);
      }
      this.doc.text(line2, cx + 1, this.currentY + 11);

      // restaurar
      this.doc.setFontSize(baseFont);
      cx += w;
    });
    const wTot = colWidths[6];
    const posTotX = startX + colWidths.slice(0,6).reduce((a,b)=>a+b,0);
    const pendValTot = totalAll.pendentes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pagValTot = totalAll.pagos.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const lineTot1 = `Pnd: ${totalAll.pendentes.quantidade} | R$ ${pendValTot}`;
    const lineTot2 = `Pag: ${totalAll.pagos.quantidade} | R$ ${pagValTot}`;
    let fsTot = baseFont; this.doc.setFontSize(fsTot);
    while (this.doc.getTextWidth(lineTot1) > wTot - 2 && fsTot > minFont) { fsTot -= 0.5; this.doc.setFontSize(fsTot); }
    this.doc.text(lineTot1, posTotX + 1, this.currentY + 6);
    fsTot = baseFont; this.doc.setFontSize(fsTot);
    while (this.doc.getTextWidth(lineTot2) > wTot - 2 && fsTot > minFont) { fsTot -= 0.5; this.doc.setFontSize(fsTot); }
    this.doc.text(lineTot2, posTotX + 1, this.currentY + 11);
    this.doc.setFontSize(baseFont);

    // Borda total
    this.doc.setDrawColor(25,118,210);
    let tbx = startX;
    for (let w of colWidths) {
      this.doc.rect(tbx, this.currentY, w, rowHeight);
      tbx += w;
    }

    this.currentY += rowHeight + 10;
  }

  // Relatório de Breakdown Mensal por Filial
  public gerarBreakdownMensal(
    breakdownData: any[],
    filtros: {
      dataInicial: string;
      dataFinal: string;
      filial?: string;
    },
    modo: 'consolidado' | 'filial' = 'consolidado'
  ) {
    // Garantir um documento novo para cada geração
    this.resetDoc();
    const titulo = modo === 'filial' && filtros.filial
      ? `BREAKDOWN MENSAL - ${filtros.filial.toUpperCase()}`
      : 'BREAKDOWN MENSAL POR FILIAL';
    
    const subtitulo = `Período: ${formatDateToBrazilian(filtros.dataInicial)} até ${formatDateToBrazilian(filtros.dataFinal)}`;
    
    this.addHeader(titulo, subtitulo);
    
    // Processar cada filial
    breakdownData.forEach((dadosFilial, filialIndex) => {
      // Número de linhas da tabela (meses + TOTAL)
      const linhasTabela = (dadosFilial?.meses?.length || 0) + 1;
      const headerTabela = 8; // headerHeight na tabela
      const rowHeight = 6; // altura por linha na tabela
      const tituloAltura = 6; // após desenhar título
      const resumoAltura = 8; // após desenhar resumo
      const margemExtra = 12; // folga de segurança
      const espacoNecessario = tituloAltura + resumoAltura + headerTabela + (linhasTabela * rowHeight) + margemExtra;
      
      // Se não houver espaço suficiente para o bloco inteiro, quebra antes
      this.checkNewPage(espacoNecessario);
      
      // Separador sutil entre filiais (se não for a primeira e houver espaço suficiente)
      if (filialIndex > 0) {
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setLineWidth(0.3);
        this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
        this.currentY += 4;
      }
      
      // Título da filial destacado
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(`${(dadosFilial.filial || '').toString().toUpperCase()}`, this.margin, this.currentY);
      this.currentY += tituloAltura;
      
      // Resumo da filial
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(
        `Total: ${dadosFilial.total.quantidade} títulos - ${formatarDinheiro(dadosFilial.total.valor)}`, 
        this.margin, 
        this.currentY
      );
      this.currentY += resumoAltura;
      
      // Garantir novamente que a tabela não vai estourar (segunda checagem mais estrita)
      this.checkNewPage(headerTabela + (linhasTabela * rowHeight) + 6 + 10);
      
      // Badge da filial imediatamente acima da tabela
      this.drawFilialBadge((dadosFilial.filial || '').toString());
      
      // Criar tabela usando versão simplificada (controle manual)
      this.criarTabelaBreakdownSimples(dadosFilial);
      
      // Espaçamento entre blocos de filiais
      if (filialIndex < breakdownData.length - 1) {
        if (this.currentY > this.pageHeight - 100) {
          this.doc.addPage();
          this.currentY = 15;
        } else {
          this.currentY += 10;
        }
      }
    });
    
    // Adicionar rodapé
    this.addFooter();
    
    return this.doc;
  }
}

// Função utilitária para arredondar e formatar valores monetários
function formatarDinheiro(valor: any) {
  const num = parseDecimalSeguro(valor);
  return 'R$ ' + formatarDecimal(num).replace('.', ',');
}

export const relatoriosPDFService = new RelatoriosPDFService();