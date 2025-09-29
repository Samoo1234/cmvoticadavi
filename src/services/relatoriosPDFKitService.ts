import PDFDocument from 'pdfkit';
import { parseDecimalSeguro, formatarDecimal, somarValores } from '../utils/decimalUtils';
import { formatDateToBrazilian } from '../utils/dateUtils';

export class RelatoriosPDFKitService {
  private doc: PDFKit.PDFDocument;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.doc = new PDFDocument({ 
      size: 'A4',
      margin: 40,
      bufferPages: true
    });
    this.pageWidth = this.doc.page.width;
    this.pageHeight = this.doc.page.height;
    this.margin = 40;
    this.currentY = this.margin;
  }

  // Método para adicionar cabeçalho
  private addHeader(titulo: string, subtitulo?: string) {
    this.doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(titulo, this.margin, this.currentY, { align: 'center' });
    
    this.currentY += 25;
    
    if (subtitulo) {
      this.doc.fontSize(12)
             .font('Helvetica')
             .text(subtitulo, this.margin, this.currentY, { align: 'center' });
      this.currentY += 20;
    }
    
    // Linha separadora
    this.doc.moveTo(this.margin, this.currentY)
           .lineTo(this.pageWidth - this.margin, this.currentY)
           .stroke();
    
    this.currentY += 20;
  }

  // Método para criar tabela com controle total
  private createTable(
    headers: string[], 
    rows: string[][], 
    options: {
      columnWidths: number[];
      tableWidth?: number;
      headerColor?: string;
      alternateRowColor?: string;
      fontSize?: number;
      headerFontSize?: number;
    }
  ) {
    const {
      columnWidths,
      tableWidth = this.pageWidth - (2 * this.margin),
      headerColor = '#1976d2',
      alternateRowColor = '#f8f9fa',
      fontSize = 8,
      headerFontSize = 9
    } = options;

    // Calcular larguras proporcionais
    const totalRequestedWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    const adjustedWidths = columnWidths.map(width => (width / totalRequestedWidth) * tableWidth);
    
    // Centralizar tabela
    const startX = this.margin + ((this.pageWidth - 2 * this.margin) - tableWidth) / 2;
    
    this.checkNewPage(50);
    
    // Desenhar cabeçalho
    this.drawTableHeader(headers, adjustedWidths, startX, headerColor, headerFontSize);
    
    // Desenhar linhas de dados
    this.drawTableRows(rows, adjustedWidths, startX, alternateRowColor, fontSize);
    
    // Borda externa da tabela
    const tableHeight = (rows.length + 1) * 20; // +1 para o cabeçalho
    this.doc.rect(startX, this.currentY - tableHeight, tableWidth, tableHeight)
           .stroke();
  }

  // Desenhar cabeçalho da tabela
  private drawTableHeader(
    headers: string[], 
    columnWidths: number[], 
    startX: number, 
    headerColor: string,
    fontSize: number
  ) {
    const headerHeight = 20;
    
    // Fundo do cabeçalho
    this.doc.rect(startX, this.currentY, columnWidths.reduce((sum, width) => sum + width, 0), headerHeight)
           .fillAndStroke(headerColor, '#000000');
    
    // Texto do cabeçalho
    this.doc.fillColor('#ffffff')
           .fontSize(fontSize)
           .font('Helvetica-Bold');
    
    let currentX = startX;
    headers.forEach((header, index) => {
      const cellWidth = columnWidths[index];
      
      // Centralizar texto na célula
      const textWidth = this.doc.widthOfString(header);
      const textX = currentX + (cellWidth - textWidth) / 2;
      
      this.doc.text(header, textX, this.currentY + 6, {
        width: cellWidth,
        height: headerHeight,
        ellipsis: true
      });
      
      // Linha vertical entre colunas
      if (index < headers.length - 1) {
        this.doc.moveTo(currentX + cellWidth, this.currentY)
               .lineTo(currentX + cellWidth, this.currentY + headerHeight)
               .stroke();
      }
      
      currentX += cellWidth;
    });
    
    this.currentY += headerHeight;
  }

  // Desenhar linhas de dados
  private drawTableRows(
    rows: string[][], 
    columnWidths: number[], 
    startX: number, 
    alternateColor: string,
    fontSize: number
  ) {
    const rowHeight = 18;
    
    rows.forEach((row, rowIndex) => {
      this.checkNewPage(rowHeight + 10);
      
      const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
      
      // Fundo alternado
      if (rowIndex % 2 === 0) {
        this.doc.rect(startX, this.currentY, tableWidth, rowHeight)
               .fillAndStroke(alternateColor, '#dddddd');
      } else {
        this.doc.rect(startX, this.currentY, tableWidth, rowHeight)
               .stroke('#dddddd');
      }
      
      // Texto das células
      this.doc.fillColor('#000000')
             .fontSize(fontSize)
             .font('Helvetica');
      
      let currentX = startX;
      row.forEach((cell, cellIndex) => {
        const cellWidth = columnWidths[cellIndex];
        
        // Alinhar números à direita, texto à esquerda
        let textX = currentX + 5;
        let align = 'left';
        
        if (this.isNumericValue(cell)) {
          const textWidth = this.doc.widthOfString(cell);
          textX = currentX + cellWidth - textWidth - 5;
          align = 'right';
        }
        
        this.doc.text(cell, textX, this.currentY + 4, {
          width: cellWidth - 10,
          height: rowHeight,
          ellipsis: true,
          align: align as any
        });
        
        // Linha vertical entre colunas
        if (cellIndex < row.length - 1) {
          this.doc.moveTo(currentX + cellWidth, this.currentY)
                 .lineTo(currentX + cellWidth, this.currentY + rowHeight)
                 .stroke();
        }
        
        currentX += cellWidth;
      });
      
      this.currentY += rowHeight;
    });
  }

  // Verificar se precisa de nova página
  private checkNewPage(requiredSpace: number = 50) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
      return true;
    }
    return false;
  }

  // Verificar se valor é numérico
  private isNumericValue(value: string): boolean {
    if (!value) return false;
    return /^R\$|^\d|^-\d/.test(value.trim());
  }

  // Adicionar rodapé
  private addFooter() {
    const now = new Date();
    const dataHora = `${formatDateToBrazilian(now.toISOString().slice(0, 10))} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    
    this.doc.fontSize(8)
           .font('Helvetica')
           .text(`Gerado em: ${dataHora}`, this.margin, this.pageHeight - 30)
           .text(`Página ${this.doc.bufferedPageRange().count}`, this.pageWidth - this.margin - 50, this.pageHeight - 30);
  }

  // Gerar Breakdown Mensal com controle total
  public gerarBreakdownMensal(
    breakdownData: any[],
    filtros: {
      dataInicial: string;
      dataFinal: string;
      filial?: string;
    }
  ) {
    const titulo = filtros.filial ? 
      `BREAKDOWN MENSAL - ${filtros.filial.toUpperCase()}` :
      'BREAKDOWN MENSAL POR FILIAL';
    
    const subtitulo = `Período: ${formatDateToBrazilian(filtros.dataInicial)} até ${formatDateToBrazilian(filtros.dataFinal)}`;
    
    this.addHeader(titulo, subtitulo);
    
    breakdownData.forEach((dadosFilial, index) => {
      if (index > 0) {
        this.currentY += 20;
      }
      
      // Título da filial
      this.doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor('#1976d2')
             .text(`${dadosFilial.filial.toUpperCase()}`, this.margin, this.currentY);
      
      this.currentY += 20;
      
      // Preparar dados da tabela
      const headers = [
        'Mês/Ano', 
        'Ins P', 'Ins Pg', 
        'Len P', 'Len Pg',
        'Arm P', 'Arm Pg',
        'Div P', 'Div Pg',
        'Equ P', 'Equ Pg',
        'Tot P', 'Tot Pg'
      ];
      
      const rows: string[][] = [];
      
      // Dados dos meses
      dadosFilial.meses.forEach((mes: any) => {
        const row = [mes.mes];
        
        ['Insumos', 'Lentes', 'Armações', 'Diversos', 'Equipamentos'].forEach(tipo => {
          const dados = mes.tipos[tipo] || { pendentes: { quantidade: 0 }, pagos: { valor: 0 } };
          row.push(`${dados.pendentes.quantidade}`);
          row.push(`R$ ${dados.pagos.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        });
        
        row.push(`${mes.total.pendentes || 0}`);
        row.push(`R$ ${mes.total.valorPagos?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`);
        
        rows.push(row);
      });
      
      // Linha de total
      const totalRow = ['TOTAL'];
      ['Insumos', 'Lentes', 'Armações', 'Diversos', 'Equipamentos'].forEach(tipo => {
        const total = dadosFilial.meses.reduce((acc: any, mes: any) => ({
          pendentes: acc.pendentes + (mes.tipos[tipo]?.pendentes?.quantidade || 0),
          valorPagos: acc.valorPagos + (mes.tipos[tipo]?.pagos?.valor || 0)
        }), { pendentes: 0, valorPagos: 0 });
        
        totalRow.push(`${total.pendentes}`);
        totalRow.push(`R$ ${total.valorPagos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      });
      
      totalRow.push(`${dadosFilial.total.pendentes || 0}`);
      totalRow.push(`R$ ${dadosFilial.total.valorPagos?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`);
      
      rows.push(totalRow);
      
      // Criar tabela com largura controlada
      this.createTable(headers, rows, {
        columnWidths: [25, 12, 18, 12, 18, 12, 18, 12, 18, 12, 18, 15, 20], // Larguras personalizadas
        tableWidth: 500, // Largura exata da tabela
        headerColor: '#1976d2',
        alternateRowColor: '#f8f9fa',
        fontSize: 7,
        headerFontSize: 8
      });
      
      this.currentY += 10;
    });
    
    this.addFooter();
    return this.doc;
  }

  // Método para salvar
  public salvar(nomeArquivo: string) {
    this.doc.end();
    return this.doc;
  }

  // Método para obter buffer
  public getBuffer(): Promise<Buffer> {
    return new Promise((resolve) => {
      const buffers: Buffer[] = [];
      this.doc.on('data', buffers.push.bind(buffers));
      this.doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      this.doc.end();
    });
  }
}

export const relatoriosPDFKitService = new RelatoriosPDFKitService();
