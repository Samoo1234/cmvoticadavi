import React, { useState, useEffect } from 'react';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { supabase } from '../services/supabase';
import { parseDecimalSeguro, formatarDecimal, validarValorMonetario, arredondarDuasCasas } from '../utils/decimalUtils';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  MenuItem, 
  Stack, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Pagination,
  Select,
  FormControl,
  InputLabel,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Tabs,
  Tab
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import TableViewIcon from '@mui/icons-material/TableView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { filiaisService } from '../services/filiaisService';
import { fornecedoresService } from '../services/fornecedoresService';
import { tiposFornecedoresService } from '../services/tiposFornecedoresService';
import { titulosService } from '../services/titulosService';
import { RelatoriosPDFService } from '../services/relatoriosPDFService';

interface Titulo {
  id: number;
  tipo: string;
  fornecedor: string;
  filial: string;
  vencimento: string;
  pagamento: string;
  valor: string;
  status: string;
  numero?: string;
  data_emissao?: string;
  observacao?: string;
}

interface TituloCompleto extends Titulo {
  fornecedor_id?: number;
  filial_id?: number;
  tipo_id?: number;
  data_pagamento?: string;
  multa?: number;
  juros?: number;
}

interface RelatorioTabuladoConfig {
  filiaisSelecionadas: number[];
  dataInicial: string;
  dataFinal: string;
}

interface DadosTabulados {
  tipo: string;
  pendente: { quantidade: number; valor: number };
  pago: { quantidade: number; valor: number };
  total: { quantidade: number; valor: number };
  percentual: number;
}


const EmissaoTitulos: React.FC = () => {
  const [titulos, setTitulos] = useState<TituloCompleto[]>([]);
  const [titulosFiltrados, setTitulosFiltrados] = useState<TituloCompleto[]>([]);
  const [filtros, setFiltros] = useState({ tipo: '', fornecedor: '', filial: '', dataInicial: '', dataFinal: '' });
  const [filtroTipo, setFiltroTipo] = useState({ vencimento: false, pagamento: false, todos: true });
  const [mostrarPagos, setMostrarPagos] = useState(false);
  const [tipos, setTipos] = useState<{ id: number, nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: number, nome: string }[]>([]);
  const [filiais, setFiliais] = useState<{ id: number, nome: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });
  
  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);
  
  // Estados para o modal de pagamento
  const [modalPagamento, setModalPagamento] = useState(false);
  const [tituloSelecionado, setTituloSelecionado] = useState<number | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [multa, setMulta] = useState<string>('0');
  const [juros, setJuros] = useState<string>('0');
  
  // Estados para o modal de edição
  const [modalEdicao, setModalEdicao] = useState(false);
  const [tituloEdicao, setTituloEdicao] = useState<TituloCompleto | null>(null);
  
  // Estados para o relatório tabulado
  const [modalRelatorioTabulado, setModalRelatorioTabulado] = useState(false);
  const [configRelatorioTabulado, setConfigRelatorioTabulado] = useState<RelatorioTabuladoConfig>({
    filiaisSelecionadas: [],
    dataInicial: '',
    dataFinal: ''
  });
  const [dadosTabulados, setDadosTabulados] = useState<DadosTabulados[]>([]);
  const [mostrarDadosNoModal, setMostrarDadosNoModal] = useState(false);
  const [dadosPorFilial, setDadosPorFilial] = useState<{[filialId: number]: DadosTabulados[]}>({});
  const [filialAtiva, setFilialAtiva] = useState<number>(0);
  
  

  // Função para carregar dados (definida fora do useEffect para ser reutilizável)
  const carregarDados = async () => {
    setIsLoading(true);
    try {
      console.log('=== DEBUG EMISSAO TITULOS ===');
      console.log('Iniciando carregamento de dados...');
      
      // Carregar dados dos dropdowns e títulos
      const [dadosTipos, dadosFornecedores, dadosFiliais, dadosTitulos] = await Promise.all([
        tiposFornecedoresService.getAll(),
        fornecedoresService.getAll(),
        filiaisService.getAll(),
        titulosService.getAll()
      ]);
      
      console.log('Dados carregados:', {
        tipos: dadosTipos?.length || 0,
        fornecedores: dadosFornecedores?.length || 0,
        filiais: dadosFiliais?.length || 0,
        titulos: dadosTitulos?.length || 0
      });
      console.log('Títulos brutos do banco:', dadosTitulos);

      // Mapear tipos para o formato {id, nome}
      const tiposFormatados = dadosTipos.map(t => ({
        id: t.id,
        nome: t.nome
      }));
      setTipos(tiposFormatados);

      // Mapear fornecedores para o formato {id, nome}
      const fornecedoresFormatados = dadosFornecedores.map(f => ({
        id: f.id,
        nome: f.nome
      }));
      setFornecedores(fornecedoresFormatados);

      // Mapear filiais para o formato {id, nome}
      const filiaisFormatadas = dadosFiliais.map(f => ({
        id: f.id,
        nome: f.nome
      }));
      setFiliais(filiaisFormatadas);

      // Processar os títulos
      const titulosFormatados = dadosTitulos.map(titulo => {
        const fornecedor = fornecedoresFormatados.find(f => f.id === titulo.fornecedor_id);
        const filial = filiaisFormatadas.find(f => f.id === titulo.filial_id);

        return {
          id: titulo.id,
          numero: titulo.numero,
          tipo: titulo.tipo || 'Não especificado',
          fornecedor: fornecedor?.nome || 'Não especificado',
          fornecedor_id: titulo.fornecedor_id,
          filial: filial?.nome || 'Não especificada',
          filial_id: titulo.filial_id,
          vencimento: titulo.data_vencimento,
          data_emissao: titulo.data_emissao,
          pagamento: titulo.data_pagamento || '',
          data_pagamento: titulo.data_pagamento,
          valor: formatarDecimal(parseDecimalSeguro(titulo.valor || 0)),
          status: titulo.status,
          observacao: titulo.observacao,
          multa: titulo.multa,
          juros: titulo.juros
        };
      });
      
      console.log('Títulos formatados:', titulosFormatados);
      console.log('Quantidade de títulos formatados:', titulosFormatados.length);
      
      setTitulos(titulosFormatados);
      // Aplicar filtros iniciais (por padrão, só mostra pendentes) e ordenar
      const titulosPendentes = titulosFormatados
        .filter(titulo => titulo.status !== 'pago')
        .sort((a, b) => {
          const dataA = new Date(a.vencimento);
          const dataB = new Date(b.vencimento);
          return dataA.getTime() - dataB.getTime();
        });
      setTitulosFiltrados(titulosPendentes);
      
      console.log('Estado atualizado com', titulosFormatados.length, 'títulos');
      console.log('=== FIM DEBUG EMISSAO TITULOS ===');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setAlert({
        open: true,
        message: 'Erro ao carregar dados. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();

    // Configurar canal Realtime para a tabela titulos com autenticação
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    
    // Aplicar autenticação ao Realtime
    supabase.realtime.setAuth(supabaseKey);
    
    const channel = supabase.channel('public:titulos')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'titulos' }, 
          (payload) => {
            console.log('Atualização em tempo real na tabela titulos:', payload);
            // Recarregar dados quando houver uma mudança na tabela titulos
            carregarDados();
      })
      .subscribe((status) => {
        console.log('Status da subscrição Realtime:', status);
      });
    
    // Limpeza da subscrição quando o componente for desmontado
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novosFiltros = { ...filtros, [e.target.name]: e.target.value };
    setFiltros(novosFiltros);
    aplicarFiltros(novosFiltros, filtroTipo, mostrarPagos);
  };

  const handleFiltroTipoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    // Se algum tipo for marcado, desmarca os outros
    const novoFiltroTipo = {
      vencimento: name === 'vencimento' ? checked : false,
      pagamento: name === 'pagamento' ? checked : false,
      todos: name === 'todos' ? checked : false
    };
    
    // Se todos forem desmarcados, ativa o 'todos'
    if (!novoFiltroTipo.vencimento && !novoFiltroTipo.pagamento && !novoFiltroTipo.todos) {
      novoFiltroTipo.todos = true;
    }
    
    setFiltroTipo(novoFiltroTipo);
    aplicarFiltros(filtros, novoFiltroTipo, mostrarPagos);
  };

  const handleMostrarPagosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoMostrarPagos = e.target.checked;
    setMostrarPagos(novoMostrarPagos);
    aplicarFiltros(filtros, filtroTipo, novoMostrarPagos);
  };

  const aplicarFiltros = (filtrosAtuais = filtros, tiposFiltro = filtroTipo, incluirPagos = mostrarPagos) => {
    let resultado = [...titulos];
    
    // PRIMEIRO: Filtrar por status de pagamento (por padrão, só mostra pendentes)
    if (!incluirPagos) {
      resultado = resultado.filter(titulo => titulo.status !== 'pago');
    }
    
    // Filtrar por tipo
    if (filtrosAtuais.tipo) {
      resultado = resultado.filter(titulo => titulo.tipo === filtrosAtuais.tipo);
    }
    
    // Filtrar por fornecedor
    if (filtrosAtuais.fornecedor) {
      resultado = resultado.filter(titulo => titulo.fornecedor === filtrosAtuais.fornecedor);
    }
    
    // Filtrar por filial
    if (filtrosAtuais.filial) {
      resultado = resultado.filter(titulo => titulo.filial === filtrosAtuais.filial);
    }
    
    // Filtrar por período (data inicial e final) baseado no tipo de filtro selecionado
    if (filtrosAtuais.dataInicial || filtrosAtuais.dataFinal) {
      // Apenas aplica o filtro se não estiver no modo "todos"
      if (!tiposFiltro.todos) {
        const dataInicial = filtrosAtuais.dataInicial ? new Date(filtrosAtuais.dataInicial) : null;
        const dataFinal = filtrosAtuais.dataFinal ? new Date(filtrosAtuais.dataFinal) : null;
        
        resultado = resultado.filter(titulo => {
          // Determina qual campo de data usar baseado no tipo de filtro
          const dataCampo = tiposFiltro.vencimento 
            ? new Date(titulo.vencimento) 
            : tiposFiltro.pagamento && titulo.pagamento 
              ? new Date(titulo.pagamento) 
              : null;
          
          // Se não tiver a data necessária ou for nula, não passa no filtro
          if (!dataCampo) {
            return tiposFiltro.pagamento ? false : true; // Se for filtro de pagamento, só mostra os pagos
          }
          
          // Aplica o filtro baseado nas datas fornecidas
          const passaFiltroInicial = !dataInicial || dataCampo >= dataInicial;
          const passaFiltroFinal = !dataFinal || dataCampo <= dataFinal;
          
          return passaFiltroInicial && passaFiltroFinal;
        });
      }
    }
    
    // Se o filtro for por pagamento, só mostra títulos pagos
    if (tiposFiltro.pagamento && !tiposFiltro.todos) {
      resultado = resultado.filter(titulo => titulo.pagamento !== null && titulo.pagamento !== '');
    }
    
    // ORDENAR por data de vencimento (do mais antigo para o mais recente)
    resultado.sort((a, b) => {
      const dataA = new Date(a.vencimento);
      const dataB = new Date(b.vencimento);
      return dataA.getTime() - dataB.getTime();
    });
    
    setTitulosFiltrados(resultado);
    setPaginaAtual(1); // Resetar para primeira página quando aplicar filtros
  };

  // Funções de paginação
  const totalPaginas = Math.ceil(titulosFiltrados.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const titulosPaginados = titulosFiltrados.slice(indiceInicial, indiceFinal);

  const handleMudarPagina = (novaPagina: number) => {
    setPaginaAtual(novaPagina);
  };

  const handleMudarItensPorPagina = (novosItens: number) => {
    setItensPorPagina(novosItens);
    setPaginaAtual(1);
  };

  // Função para calcular dados tabulados por filial específica
  const calcularDadosTabuladosPorFilial = (filialId: number): DadosTabulados[] => {
    // Filtrar títulos por filial específica e período
    const titulosFiltradosFilial = titulos.filter(titulo => {
      // Filtro por filial específica
      const filialValida = titulo.filial_id === filialId;
      
      // Filtro por período
      let periodoValido = true;
      if (configRelatorioTabulado.dataInicial && configRelatorioTabulado.dataFinal) {
        const dataInicio = new Date(configRelatorioTabulado.dataInicial + 'T00:00:00');
        const dataFim = new Date(configRelatorioTabulado.dataFinal + 'T23:59:59');
        const dataVencimento = new Date(titulo.vencimento);
        periodoValido = dataVencimento >= dataInicio && dataVencimento <= dataFim;
      }
      
      return filialValida && periodoValido;
    });

    // Agrupar por tipo
    const agrupamentoPorTipo: { [tipo: string]: TituloCompleto[] } = {};
    titulosFiltradosFilial.forEach(titulo => {
      const tipo = titulo.tipo || 'Não especificado';
      if (!agrupamentoPorTipo[tipo]) {
        agrupamentoPorTipo[tipo] = [];
      }
      agrupamentoPorTipo[tipo].push(titulo);
    });

    // Calcular totais gerais da filial para percentuais
    const totalGeralValorFilial = titulosFiltradosFilial.reduce((total, titulo) => 
      total + parseDecimalSeguro(titulo.valor || '0'), 0);

    // Processar cada tipo da filial
    const dadosTabulados: DadosTabulados[] = Object.keys(agrupamentoPorTipo).map(tipo => {
      const titulosDoTipo = agrupamentoPorTipo[tipo];
      
      const titulosPagos = titulosDoTipo.filter(t => t.status === 'pago');
      const titulosPendentes = titulosDoTipo.filter(t => t.status !== 'pago');
      
      const valorPago = titulosPagos.reduce((total, titulo) => 
        total + parseDecimalSeguro(titulo.valor || '0'), 0);
      const valorPendente = titulosPendentes.reduce((total, titulo) => 
        total + parseDecimalSeguro(titulo.valor || '0'), 0);
      const valorTotal = valorPago + valorPendente;
      
      return {
        tipo,
        pendente: {
          quantidade: titulosPendentes.length,
          valor: valorPendente
        },
        pago: {
          quantidade: titulosPagos.length,
          valor: valorPago
        },
        total: {
          quantidade: titulosDoTipo.length,
          valor: valorTotal
        },
        percentual: totalGeralValorFilial > 0 ? (valorTotal / totalGeralValorFilial) * 100 : 0
      };
    });

    // Ordenar por valor total (maior para menor)
    return dadosTabulados.sort((a, b) => b.total.valor - a.total.valor);
  };

  // Função para calcular dados tabulados por tipo
  const calcularDadosTabulados = (config: RelatorioTabuladoConfig): DadosTabulados[] => {
    // Filtrar títulos por filiais selecionadas e período
    const titulosFiltradosRelatorio = titulos.filter(titulo => {
      // Filtro por filiais
      const filialValida = config.filiaisSelecionadas.length === 0 || 
                          config.filiaisSelecionadas.includes(titulo.filial_id || 0);
      
      // Filtro por período
      let periodoValido = true;
      if (config.dataInicial && config.dataFinal) {
        const dataInicio = new Date(config.dataInicial + 'T00:00:00');
        const dataFim = new Date(config.dataFinal + 'T23:59:59');
        const dataVencimento = new Date(titulo.vencimento);
        periodoValido = dataVencimento >= dataInicio && dataVencimento <= dataFim;
      }
      
      return filialValida && periodoValido;
    });

    // Agrupar por tipo
    const agrupamentoPorTipo: { [tipo: string]: TituloCompleto[] } = {};
    titulosFiltradosRelatorio.forEach(titulo => {
      const tipo = titulo.tipo || 'Não especificado';
      if (!agrupamentoPorTipo[tipo]) {
        agrupamentoPorTipo[tipo] = [];
      }
      agrupamentoPorTipo[tipo].push(titulo);
    });

    // Calcular totais gerais para percentuais
    const totalGeralValor = titulosFiltradosRelatorio.reduce((total, titulo) => 
      total + parseDecimalSeguro(titulo.valor || '0'), 0);

    // Processar cada tipo
    const dadosTabulados: DadosTabulados[] = Object.keys(agrupamentoPorTipo).map(tipo => {
      const titulosDoTipo = agrupamentoPorTipo[tipo];
      
      const titulosPagos = titulosDoTipo.filter(t => t.status === 'pago');
      const titulosPendentes = titulosDoTipo.filter(t => t.status !== 'pago');
      
      const valorPago = titulosPagos.reduce((total, titulo) => 
        total + parseDecimalSeguro(titulo.valor || '0'), 0);
      const valorPendente = titulosPendentes.reduce((total, titulo) => 
        total + parseDecimalSeguro(titulo.valor || '0'), 0);
      const valorTotal = valorPago + valorPendente;
      
      return {
        tipo,
        pendente: {
          quantidade: titulosPendentes.length,
          valor: valorPendente
        },
        pago: {
          quantidade: titulosPagos.length,
          valor: valorPago
        },
        total: {
          quantidade: titulosDoTipo.length,
          valor: valorTotal
        },
        percentual: totalGeralValor > 0 ? (valorTotal / totalGeralValor) * 100 : 0
      };
    });

    // Ordenar por valor total (maior para menor)
    return dadosTabulados.sort((a, b) => b.total.valor - a.total.valor);
  };

  // Função para gerar relatório tabulado
  const handleGerarRelatorioTabulado = () => {
    if (configRelatorioTabulado.filiaisSelecionadas.length === 0) {
      setAlert({
        open: true,
        message: 'Selecione pelo menos uma filial para gerar o relatório.',
        severity: 'warning'
      });
      return;
    }

    if (!configRelatorioTabulado.dataInicial || !configRelatorioTabulado.dataFinal) {
      setAlert({
        open: true,
        message: 'Selecione o período (data inicial e final) para gerar o relatório.',
        severity: 'warning'
      });
      return;
    }

    // Verificar se todas as filiais estão selecionadas
    const todasFiliaisSelecionadas = configRelatorioTabulado.filiaisSelecionadas.length === filiais.length;
    
    if (todasFiliaisSelecionadas) {
      // Calcular dados para cada filial separadamente
      const dadosFiliais: {[filialId: number]: DadosTabulados[]} = {};
      const filiaisSelecionadas = filiais.filter(f => configRelatorioTabulado.filiaisSelecionadas.includes(f.id));
      
      filiaisSelecionadas.forEach(filial => {
        dadosFiliais[filial.id] = calcularDadosTabuladosPorFilial(filial.id);
      });
      
      setDadosPorFilial(dadosFiliais);
      setFilialAtiva(filiaisSelecionadas[0]?.id || 0);
      setDadosTabulados([]); // Limpar dados consolidados
    } else {
      // Calcular dados consolidados (comportamento anterior)
      const dados = calcularDadosTabulados(configRelatorioTabulado);
      setDadosTabulados(dados);
      setDadosPorFilial({}); // Limpar dados por filial
    }
    
    setMostrarDadosNoModal(true);
    
    setAlert({
      open: true,
      message: 'Relatório tabulado gerado com sucesso!',
      severity: 'success'
    });
  };

  // Função para gerar PDF do relatório tabulado
  const handleGerarPDFTabulado = (tipoEspecifico?: string) => {
    try {
      import('jspdf').then(({ default: jsPDF }) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        
        // Verificar se todas as filiais estão selecionadas e não é tipo específico
        const todasFiliaisSelecionadas = configRelatorioTabulado.filiaisSelecionadas.length === filiais.length;
        const filiaisSelecionadas = filiais.filter(f => configRelatorioTabulado.filiaisSelecionadas.includes(f.id));
        
        if (todasFiliaisSelecionadas && !tipoEspecifico) {
          // Gerar relatório separado para cada filial em meia folha A4
          filiaisSelecionadas.forEach((filial, filialIndex) => {
            // Calcular dados específicos da filial
            const dadosFilial = calcularDadosTabuladosPorFilial(filial.id);
            
            // Posição Y inicial (meia folha A4)
            let yPosition = filialIndex === 0 ? 20 : (filialIndex % 2 === 0 ? 20 : pageHeight / 2 + 10);
            
            // Adicionar nova página a cada 2 filiais
            if (filialIndex > 0 && filialIndex % 2 === 0) {
              doc.addPage();
              yPosition = 20;
            }
            
            // Título da filial
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Relatório Tabulado - ${filial.nome}`, pageWidth / 2, yPosition, { align: 'center' });
            
            yPosition += 10;
            
            // Período
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const periodo = `Período: ${configRelatorioTabulado.dataInicial?.split('-').reverse().join('/')} a ${configRelatorioTabulado.dataFinal?.split('-').reverse().join('/')}`;
            doc.text(periodo, pageWidth / 2, yPosition, { align: 'center' });
            
            yPosition += 12;
            
            // Cabeçalho da tabela (compacto)
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('Tipo', margin, yPosition);
            doc.text('P.Qtd', margin + 35, yPosition);
            doc.text('P.Valor', margin + 50, yPosition);
            doc.text('Pg.Qtd', margin + 75, yPosition);
            doc.text('Pg.Valor', margin + 90, yPosition);
            doc.text('T.Qtd', margin + 115, yPosition);
            doc.text('T.Valor', margin + 130, yPosition);
            doc.text('%', margin + 155, yPosition);
            
            yPosition += 3;
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 5;
            
            // Dados da filial
            doc.setFont('helvetica', 'normal');
            dadosFilial.forEach(dado => {
              if (yPosition > (filialIndex % 2 === 0 ? pageHeight / 2 - 20 : pageHeight - 20)) {
                return; // Não exceder o espaço da meia folha
              }
              
              doc.text(dado.tipo.substring(0, 12), margin, yPosition);
              doc.text(dado.pendente.quantidade.toString(), margin + 35, yPosition);
              doc.text(`${formatarDecimal(dado.pendente.valor)}`, margin + 50, yPosition);
              doc.text(dado.pago.quantidade.toString(), margin + 75, yPosition);
              doc.text(`${formatarDecimal(dado.pago.valor)}`, margin + 90, yPosition);
              doc.text(dado.total.quantidade.toString(), margin + 115, yPosition);
              doc.text(`${formatarDecimal(dado.total.valor)}`, margin + 130, yPosition);
              doc.text(`${dado.percentual.toFixed(1)}%`, margin + 155, yPosition);
              
              yPosition += 6;
            });
            
            // Total da filial
            if (dadosFilial.length > 0) {
              yPosition += 2;
              doc.line(margin, yPosition, pageWidth - margin, yPosition);
              yPosition += 5;
              
              const totalFilial = dadosFilial.reduce((acc, dado) => ({
                pendente: { 
                  quantidade: acc.pendente.quantidade + dado.pendente.quantidade,
                  valor: acc.pendente.valor + dado.pendente.valor 
                },
                pago: { 
                  quantidade: acc.pago.quantidade + dado.pago.quantidade,
                  valor: acc.pago.valor + dado.pago.valor 
                },
                total: { 
                  quantidade: acc.total.quantidade + dado.total.quantidade,
                  valor: acc.total.valor + dado.total.valor 
                }
              }), {
                pendente: { quantidade: 0, valor: 0 },
                pago: { quantidade: 0, valor: 0 },
                total: { quantidade: 0, valor: 0 }
              });
              
              doc.setFont('helvetica', 'bold');
              doc.text('TOTAL', margin, yPosition);
              doc.text(totalFilial.pendente.quantidade.toString(), margin + 35, yPosition);
              doc.text(`${formatarDecimal(totalFilial.pendente.valor)}`, margin + 50, yPosition);
              doc.text(totalFilial.pago.quantidade.toString(), margin + 75, yPosition);
              doc.text(`${formatarDecimal(totalFilial.pago.valor)}`, margin + 90, yPosition);
              doc.text(totalFilial.total.quantidade.toString(), margin + 115, yPosition);
              doc.text(`${formatarDecimal(totalFilial.total.valor)}`, margin + 130, yPosition);
              doc.text('100%', margin + 155, yPosition);
            }
            
            // Linha separadora entre filiais (se não for a última)
            if (filialIndex < filiaisSelecionadas.length - 1 && filialIndex % 2 === 0) {
              const separatorY = pageHeight / 2;
              doc.setDrawColor(200, 200, 200);
              doc.line(margin, separatorY, pageWidth - margin, separatorY);
              doc.setDrawColor(0, 0, 0);
            }
          });
          
          // Salvar
          const nomeArquivo = `relatorio-tabulado-por-filial-${configRelatorioTabulado.dataInicial}.pdf`;
          doc.save(nomeArquivo);
          
          setAlert({
            open: true,
            message: `PDF com relatório de ${filiaisSelecionadas.length} filiais gerado com sucesso!`,
            severity: 'success'
          });
          
        } else {
          // Relatório normal (tipo específico ou filiais específicas)
          let yPosition = 30;
          
          // Título
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          const titulo = tipoEspecifico ? 
            `Relatório Tabulado - ${tipoEspecifico}` : 
            'Relatório Tabulado por Tipo de Título';
          doc.text(titulo, pageWidth / 2, yPosition, { align: 'center' });
          
          yPosition += 15;

          // Período e filiais
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const periodo = `Período: ${configRelatorioTabulado.dataInicial?.split('-').reverse().join('/')} a ${configRelatorioTabulado.dataFinal?.split('-').reverse().join('/')}`;
          doc.text(periodo, pageWidth / 2, yPosition, { align: 'center' });
          
          yPosition += 8;
          
          const filiaisNomes = filiais
            .filter(f => configRelatorioTabulado.filiaisSelecionadas.includes(f.id))
            .map(f => f.nome)
            .join(', ');
          doc.text(`Filiais: ${filiaisNomes}`, pageWidth / 2, yPosition, { align: 'center' });
          
          yPosition += 20;

          // Cabeçalho da tabela
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Tipo', margin, yPosition);
          doc.text('Pend.Qtd', margin + 40, yPosition);
          doc.text('Pend.Valor', margin + 60, yPosition);
          doc.text('Pago Qtd', margin + 85, yPosition);
          doc.text('Pago Valor', margin + 105, yPosition);
          doc.text('Total Qtd', margin + 130, yPosition);
          doc.text('Total Valor', margin + 150, yPosition);
          doc.text('%', margin + 175, yPosition);
          
          yPosition += 5;
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 8;

          // Dados
          const dadosParaPDF = tipoEspecifico ? 
            dadosTabulados.filter(d => d.tipo === tipoEspecifico) : 
            dadosTabulados;

          doc.setFont('helvetica', 'normal');
          dadosParaPDF.forEach(dado => {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 30;
            }

            doc.text(dado.tipo.substring(0, 15), margin, yPosition);
            doc.text(dado.pendente.quantidade.toString(), margin + 40, yPosition);
            doc.text(`R$ ${formatarDecimal(dado.pendente.valor)}`, margin + 60, yPosition);
            doc.text(dado.pago.quantidade.toString(), margin + 85, yPosition);
            doc.text(`R$ ${formatarDecimal(dado.pago.valor)}`, margin + 105, yPosition);
            doc.text(dado.total.quantidade.toString(), margin + 130, yPosition);
            doc.text(`R$ ${formatarDecimal(dado.total.valor)}`, margin + 150, yPosition);
            doc.text(`${dado.percentual.toFixed(1)}%`, margin + 175, yPosition);
            
            yPosition += 8;
          });

          // Total geral (se não for tipo específico)
          if (!tipoEspecifico && dadosTabulados.length > 0) {
            yPosition += 5;
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 8;
            
            const totalGeral = dadosTabulados.reduce((acc, dado) => ({
              pendente: { 
                quantidade: acc.pendente.quantidade + dado.pendente.quantidade,
                valor: acc.pendente.valor + dado.pendente.valor 
              },
              pago: { 
                quantidade: acc.pago.quantidade + dado.pago.quantidade,
                valor: acc.pago.valor + dado.pago.valor 
              },
              total: { 
                quantidade: acc.total.quantidade + dado.total.quantidade,
                valor: acc.total.valor + dado.total.valor 
              }
            }), {
              pendente: { quantidade: 0, valor: 0 },
              pago: { quantidade: 0, valor: 0 },
              total: { quantidade: 0, valor: 0 }
            });

            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL GERAL', margin, yPosition);
            doc.text(totalGeral.pendente.quantidade.toString(), margin + 40, yPosition);
            doc.text(`R$ ${formatarDecimal(totalGeral.pendente.valor)}`, margin + 60, yPosition);
            doc.text(totalGeral.pago.quantidade.toString(), margin + 85, yPosition);
            doc.text(`R$ ${formatarDecimal(totalGeral.pago.valor)}`, margin + 105, yPosition);
            doc.text(totalGeral.total.quantidade.toString(), margin + 130, yPosition);
            doc.text(`R$ ${formatarDecimal(totalGeral.total.valor)}`, margin + 150, yPosition);
            doc.text('100%', margin + 175, yPosition);
          }

          // Salvar
          const nomeArquivo = tipoEspecifico ? 
            `relatorio-tabulado-${tipoEspecifico.replace(/\s+/g, '-')}-${configRelatorioTabulado.dataInicial}.pdf` :
            `relatorio-tabulado-geral-${configRelatorioTabulado.dataInicial}.pdf`;
          doc.save(nomeArquivo);

          setAlert({
            open: true,
            message: `PDF ${tipoEspecifico ? 'do tipo ' + tipoEspecifico : 'geral'} gerado com sucesso!`,
            severity: 'success'
          });
        }
      });
    } catch (error) {
      console.error('Erro ao gerar PDF tabulado:', error);
      setAlert({
        open: true,
        message: 'Erro ao gerar PDF. Tente novamente.',
        severity: 'error'
      });
    }
  };


  // Funções para ações
  const handlePagar = (id: number) => {
    // Em vez de processar o pagamento imediatamente, abrimos o modal
    setTituloSelecionado(id);
    setDataPagamento(new Date().toISOString().slice(0, 10));
    setMulta('0');
    setJuros('0');
    setModalPagamento(true);
  };
  
  // Função para abrir o modal de edição
  const handleEditar = (titulo: TituloCompleto) => {
    setTituloEdicao(titulo);
    setMulta(titulo.multa?.toString() || '0');
    setJuros(titulo.juros?.toString() || '0');
    setModalEdicao(true);
  };

  // Função removida - agora usando arredondarDuasCasas do decimalUtils

  // Validação mais rigorosa para multa e juros
  const handleMultaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(',', '.');
    if (/^\d*(\.\d{0,2})?$/.test(valor) && (validarValorMonetario(valor) || valor === '' || valor === '0')) {
      setMulta(valor);
    }
  };
  const handleJurosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(',', '.');
    if (/^\d*(\.\d{0,2})?$/.test(valor) && (validarValorMonetario(valor) || valor === '' || valor === '0')) {
      setJuros(valor);
    }
  };

  // Função para finalizar o pagamento normal (sem multa/juros)
  const handleFinalizarPagamento = async () => {
    if (tituloSelecionado === null) return;
    
    try {
      setIsLoading(true);
      console.log('Processando pagamento para título ID:', tituloSelecionado);
      
      // Buscar o título selecionado
      const tituloAtual = titulos.find(t => t.id === tituloSelecionado);
      if (!tituloAtual) {
        console.error('Título não encontrado');
        setAlert({
          open: true,
          message: 'Título não encontrado. Tente novamente.',
          severity: 'error'
        });
        return;
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao = {
        status: 'pago' as const,
        data_pagamento: dataPagamento
      };
      
      console.log('Dados de atualização:', dadosAtualizacao);
      
      // Atualizar no Supabase
      const resultado = await titulosService.update(tituloSelecionado, dadosAtualizacao);
      console.log('Resultado da atualização:', resultado);
      
      if (resultado) {
        // Atualizar o estado local com a nova data de pagamento
        const novosTitulos = titulos.map(t => {
          if (t.id === tituloSelecionado) {
            return {
              ...t,
              status: 'pago',
              pagamento: dataPagamento,
              data_pagamento: dataPagamento
            };
          }
          return t;
        });
        
        setTitulos(novosTitulos);
        
        // Atualizar os títulos filtrados também
        const novosTitulosFiltrados = titulosFiltrados.map(t => {
          if (t.id === tituloSelecionado) {
            return {
              ...t,
              status: 'pago',
              pagamento: dataPagamento,
              data_pagamento: dataPagamento
            };
          }
          return t;
        });
        
        setTitulosFiltrados(novosTitulosFiltrados);
        
        // Mostrar alerta de sucesso
        setAlert({
          open: true,
          message: 'Título pago com sucesso!',
          severity: 'success'
        });
        
        // Fechar o modal
        setModalPagamento(false);
      } else {
        throw new Error('Erro ao atualizar título no Supabase');
      }
    } catch (error) {
      console.error('Erro ao pagar título:', error);
      setAlert({
        open: true,
        message: 'Erro ao pagar título. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para confirmar pagamento com multa e juros
  const handleConfirmarPagamentoComMultaJuros = async () => {
    if (tituloSelecionado === null) return;
    
    try {
      setIsLoading(true);
      console.log('Processando pagamento com multa/juros para título ID:', tituloSelecionado);
      
      const multaValor = parseDecimalSeguro(arredondarDuasCasas(multa));
      const jurosValor = parseDecimalSeguro(arredondarDuasCasas(juros));
      
      // Buscar o título selecionado
      const tituloAtual = titulos.find(t => t.id === tituloSelecionado);
      if (!tituloAtual) {
        console.error('Título não encontrado');
        setAlert({
          open: true,
          message: 'Título não encontrado. Tente novamente.',
          severity: 'error'
        });
        return;
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao = {
        status: 'pago' as const,
        data_pagamento: dataPagamento,
        multa: multaValor,
        juros: jurosValor
      };
      
      console.log('Dados de atualização com multa/juros:', dadosAtualizacao);
      
      // Atualizar no Supabase
      const resultado = await titulosService.update(tituloSelecionado, dadosAtualizacao);
      console.log('Resultado da atualização:', resultado);
      
      if (resultado) {
        // Atualizar o estado local com a nova data de pagamento
        const novosTitulos = titulos.map(t => {
          if (t.id === tituloSelecionado) {
            return {
              ...t,
              status: 'pago',
              pagamento: dataPagamento,
              data_pagamento: dataPagamento,
              multa: multaValor,
              juros: jurosValor
            };
          }
          return t;
        });
        
        setTitulos(novosTitulos);
        
        // Atualizar os títulos filtrados também
        const novosTitulosFiltrados = titulosFiltrados.map(t => {
          if (t.id === tituloSelecionado) {
            return {
              ...t,
              status: 'pago',
              pagamento: dataPagamento,
              data_pagamento: dataPagamento,
              multa: multaValor,
              juros: jurosValor
            };
          }
          return t;
        });
        
        setTitulosFiltrados(novosTitulosFiltrados);
        
        // Mostrar alerta de sucesso
        setAlert({
          open: true,
          message: `Título pago com sucesso! Multa: R$ ${multaValor.toFixed(2)} | Juros: R$ ${jurosValor.toFixed(2)}`,
          severity: 'success'
        });
        
        // Fechar o modal
        setModalPagamento(false);
      } else {
        throw new Error('Erro ao atualizar título no Supabase');
      }
    } catch (error) {
      console.error('Erro ao pagar título com multa e juros:', error);
      setAlert({
        open: true,
        message: 'Erro ao pagar título. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para salvar edição de título
  const handleSalvarEdicao = async () => {
    if (!tituloEdicao) return;
    
    try {
      setIsLoading(true);
      console.log('Processando edição para título ID:', tituloEdicao.id);
      
      const multaValor = parseDecimalSeguro(arredondarDuasCasas(multa));
      const jurosValor = parseDecimalSeguro(arredondarDuasCasas(juros));
      
      // Preparar dados para atualização
      const valorAtualizado = parseDecimalSeguro(arredondarDuasCasas(tituloEdicao.valor || '0'));
      
      const dadosAtualizacao = {
        multa: multaValor,
        juros: jurosValor,
        valor: valorAtualizado
      };
      
      console.log('Dados de atualização:', dadosAtualizacao);
      
      // Atualizar no Supabase
      const resultado = await titulosService.update(tituloEdicao.id, dadosAtualizacao);
      console.log('Resultado da atualização:', resultado);
      
      if (resultado) {
        // Atualizar o estado local com os novos valores de multa, juros e valor (se modificado)
        const novosTitulos = titulos.map(t => {
          if (t.id === tituloEdicao.id) {
            return {
              ...t,
              multa: multaValor,
              juros: jurosValor,
              valor: formatarDecimal(valorAtualizado) // Formatando o valor com precisão decimal
            };
          }
          return t;
        });
        
        setTitulos(novosTitulos);
        
        // Atualizar os títulos filtrados também
        const novosTitulosFiltrados = titulosFiltrados.map(t => {
          if (t.id === tituloEdicao.id) {
            return {
              ...t,
              multa: multaValor,
              juros: jurosValor,
              valor: formatarDecimal(valorAtualizado)
            };
          }
          return t;
        });
        
        setTitulosFiltrados(novosTitulosFiltrados);
        
        // Mostrar alerta de sucesso
        setAlert({
          open: true,
          message: 'Edição salva com sucesso!',
          severity: 'success'
        });
        
        // Fechar o modal
        setModalEdicao(false);
      } else {
        throw new Error('Erro ao atualizar título no Supabase');
      }
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      setAlert({
        open: true,
        message: 'Erro ao salvar edição. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este título?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const sucesso = await titulosService.delete(id);
      
      if (sucesso) {
        setTitulos(titulos.filter(t => t.id !== id));
        setTitulosFiltrados(titulosFiltrados.filter(t => t.id !== id));
        
        setAlert({
          open: true,
          message: 'Título excluído com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao excluir título:', error);
      setAlert({
        open: true,
        message: 'Erro ao excluir título. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGerarPDF = () => {
    try {
      const relatorioService = new RelatoriosPDFService();
      
      const filtrosRelatorio = {
        tipo: filtros.tipo,
        fornecedor: filtros.fornecedor,
        filial: filtros.filial,
        dataInicial: filtros.dataInicial,
        dataFinal: filtros.dataFinal,
        filtroTipo: filtroTipo
      };
      
      
      // Por enquanto, usar a função original do PDF - pode ser expandida futuramente
      const doc = relatorioService.gerarRelatorioTitulos(titulosFiltrados, filtrosRelatorio);
      
      const nomeArquivo = `relatorio-titulos-${new Date().toISOString().slice(0, 10)}.pdf`;
      relatorioService.salvar(nomeArquivo);
      
      setAlert({
        open: true,
        message: 'Relatório PDF gerado com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setAlert({
        open: true,
        message: 'Erro ao gerar relatório PDF. Tente novamente.',
        severity: 'error'
      });
    }
  };


  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {isLoading && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <CircularProgress color="primary" size={60} />
        </Box>
      )}
      
      {/* Snackbar para feedback */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>

      {/* Modal de pagamento */}
      <Dialog open={modalPagamento} onClose={() => setModalPagamento(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Pagamento</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Informe a data de pagamento e, caso necessário, valores de multa e juros.
          </DialogContentText>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Data de Pagamento"
              type="date"
              fullWidth
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
            
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Para pagamentos em atraso, informe os valores de multa e juros:
            </Typography>
            
            <TextField
              label="Multa"
              type="number"
              fullWidth
              value={multa}
              onChange={handleMultaChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                inputProps: { step: '0.01', min: '0' }
              }}
            />
            
            <TextField
              label="Juros"
              type="number"
              fullWidth
              value={juros}
              onChange={handleJurosChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                inputProps: { step: '0.01', min: '0' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleFinalizarPagamento}
            disabled={!dataPagamento}
          >
            Finalizar Pagamento
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleConfirmarPagamentoComMultaJuros}
            disabled={parseDecimalSeguro(multa) <= 0 && parseDecimalSeguro(juros) <= 0}
          >
            Confirmar com Multa/Juros
          </Button>
          <Button onClick={() => setModalPagamento(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de edição */}
      <Dialog open={modalEdicao} onClose={() => setModalEdicao(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Pagamento</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Edite os valores de multa e juros do título.
          </DialogContentText>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Título"
              value={tituloEdicao?.numero || 'Sem número'}
              InputProps={{ readOnly: true }}
              fullWidth
              disabled
            />
            
            <TextField
              label="Fornecedor"
              value={tituloEdicao?.fornecedor || ''}
              InputProps={{ readOnly: true }}
              fullWidth
              disabled
            />
            
            <TextField
              label="Valor Original"
              value={tituloEdicao?.valor || ''}
              onChange={(e) => {
                // Permite apenas números e ponto decimal
                const valor = e.target.value.replace(',', '.');
                if (/^\d*(\.\d{0,2})?$/.test(valor)) {
                  setTituloEdicao(prev => prev ? {...prev, valor: valor} : null);
                }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              fullWidth
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
            />
            
            <Typography variant="subtitle1" sx={{ mt: 1 }}>
              Valores de multa e juros:
            </Typography>
            
            <TextField
              label="Multa"
              type="number"
              fullWidth
              value={multa}
              onChange={handleMultaChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                inputProps: { step: '0.01', min: '0' }
              }}
            />
            
            <TextField
              label="Juros"
              type="number"
              fullWidth
              value={juros}
              onChange={handleJurosChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                inputProps: { step: '0.01', min: '0' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSalvarEdicao}
          >
            Salvar Alterações
          </Button>
          <Button onClick={() => setModalEdicao(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Configuração do Relatório Tabulado */}
      <Dialog 
        open={modalRelatorioTabulado} 
        onClose={() => {
          setModalRelatorioTabulado(false);
          setMostrarDadosNoModal(false);
          setDadosTabulados([]);
          setDadosPorFilial({});
          setFilialAtiva(0);
        }} 
        maxWidth={mostrarDadosNoModal ? "lg" : "md"} 
        fullWidth
      >
        <DialogTitle>
          {mostrarDadosNoModal ? "📊 Relatório Tabulado por Tipo de Título" : "Configurar Relatório Tabulado"}
        </DialogTitle>
        <DialogContent>
          {!mostrarDadosNoModal ? (
            // Tela de configuração
            <>
              <DialogContentText sx={{ mb: 3 }}>
                Configure as filiais e o período para gerar o relatório tabulado por tipo de título.
              </DialogContentText>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Seleção de Filiais */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Selecione as Filiais:
                  </Typography>
                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={configRelatorioTabulado.filiaisSelecionadas.length === filiais.length}
                          indeterminate={configRelatorioTabulado.filiaisSelecionadas.length > 0 && configRelatorioTabulado.filiaisSelecionadas.length < filiais.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfigRelatorioTabulado(prev => ({
                                ...prev,
                                filiaisSelecionadas: filiais.map(f => f.id)
                              }));
                            } else {
                              setConfigRelatorioTabulado(prev => ({
                                ...prev,
                                filiaisSelecionadas: []
                              }));
                            }
                          }}
                        />
                      }
                      label="Todas as Filiais"
                      sx={{ fontWeight: 'bold', mb: 1, width: '100%' }}
                    />
                  </FormGroup>
                  <Divider sx={{ my: 1 }} />
                  <FormGroup>
                    {filiais.map(filial => (
                      <FormControlLabel
                        key={filial.id}
                        control={
                          <Checkbox
                            checked={configRelatorioTabulado.filiaisSelecionadas.includes(filial.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfigRelatorioTabulado(prev => ({
                                  ...prev,
                                  filiaisSelecionadas: [...prev.filiaisSelecionadas, filial.id]
                                }));
                              } else {
                                setConfigRelatorioTabulado(prev => ({
                                  ...prev,
                                  filiaisSelecionadas: prev.filiaisSelecionadas.filter(id => id !== filial.id)
                                }));
                              }
                            }}
                          />
                        }
                        label={filial.nome}
                      />
                    ))}
                  </FormGroup>
                </Box>

                {/* Seleção de Período */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Período:
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Data Inicial"
                      type="date"
                      fullWidth
                      value={configRelatorioTabulado.dataInicial}
                      onChange={(e) => setConfigRelatorioTabulado(prev => ({
                        ...prev,
                        dataInicial: e.target.value
                      }))}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                    <TextField
                      label="Data Final"
                      type="date"
                      fullWidth
                      value={configRelatorioTabulado.dataFinal}
                      onChange={(e) => setConfigRelatorioTabulado(prev => ({
                        ...prev,
                        dataFinal: e.target.value
                      }))}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Stack>
                </Box>
              </Box>
            </>
          ) : (
            // Tela com dados do relatório
            <Box sx={{ mt: 2 }}>
              {/* Informações do Relatório */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Período:</strong> {configRelatorioTabulado.dataInicial?.split('-').reverse().join('/')} a {configRelatorioTabulado.dataFinal?.split('-').reverse().join('/')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <strong>Filiais:</strong> {filiais
                    .filter(f => configRelatorioTabulado.filiaisSelecionadas.includes(f.id))
                    .map(f => f.nome)
                    .join(', ')}
                </Typography>
              </Box>

              {/* Verificar se é visualização por filial ou consolidada */}
              {Object.keys(dadosPorFilial).length > 0 ? (
                // Visualização por filial (quando todas as filiais estão selecionadas)
                <Box>
                  {/* Abas das Filiais */}
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs 
                      value={filialAtiva} 
                      onChange={(event, newValue) => setFilialAtiva(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      {filiais
                        .filter(f => configRelatorioTabulado.filiaisSelecionadas.includes(f.id))
                        .map(filial => (
                          <Tab 
                            key={filial.id} 
                            label={filial.nome} 
                            value={filial.id}
                            sx={{ fontWeight: 'bold' }}
                          />
                        ))}
                    </Tabs>
                  </Box>

                  {/* Conteúdo da Filial Ativa */}
                  {dadosPorFilial[filialAtiva] && (
                    <Box>
                      {/* Nome da Filial Ativa */}
                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                        📍 {filiais.find(f => f.id === filialAtiva)?.nome}
                      </Typography>

                      {/* Tabela da Filial */}
                      <TableContainer component={Paper} sx={{ maxHeight: 350 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Título</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#F44336' }}>Pendente</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#2196F3' }}>Pago</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#FF9800' }}>Total</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold' }}>% Total</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dadosPorFilial[filialAtiva].map((dado, index) => (
                              <TableRow key={dado.tipo} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                  {dado.tipo}
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ color: '#F44336' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {dado.pendente.quantidade} títulos
                                    </Typography>
                                    <Typography variant="body2">
                                      R$ {formatarDecimal(dado.pendente.valor)}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ color: '#2196F3' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {dado.pago.quantidade} títulos
                                    </Typography>
                                    <Typography variant="body2">
                                      R$ {formatarDecimal(dado.pago.valor)}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ color: '#FF9800' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {dado.total.quantidade} títulos
                                    </Typography>
                                    <Typography variant="body2">
                                      R$ {formatarDecimal(dado.total.valor)}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {dado.percentual.toFixed(1)}%
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={() => handleGerarPDFTabulado(dado.tipo)}
                                  >
                                    PDF Tipo
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            
                            {/* Linha de Total da Filial */}
                            {dadosPorFilial[filialAtiva].length > 0 && (
                              <TableRow sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                  TOTAL DA FILIAL
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ color: '#F44336' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {dadosPorFilial[filialAtiva].reduce((acc, dado) => acc + dado.pendente.quantidade, 0)} títulos
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      R$ {formatarDecimal(dadosPorFilial[filialAtiva].reduce((acc, dado) => acc + dado.pendente.valor, 0))}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ color: '#2196F3' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {dadosPorFilial[filialAtiva].reduce((acc, dado) => acc + dado.pago.quantidade, 0)} títulos
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      R$ {formatarDecimal(dadosPorFilial[filialAtiva].reduce((acc, dado) => acc + dado.pago.valor, 0))}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ color: '#FF9800' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {dadosPorFilial[filialAtiva].reduce((acc, dado) => acc + dado.total.quantidade, 0)} títulos
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      R$ {formatarDecimal(dadosPorFilial[filialAtiva].reduce((acc, dado) => acc + dado.total.valor, 0))}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                    100%
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                    Use os botões abaixo
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
              ) : (
                // Visualização consolidada (quando filiais específicas estão selecionadas)
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Título</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: '#F44336' }}>Pendente</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: '#2196F3' }}>Pago</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: '#FF9800' }}>Total</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>% Total</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dadosTabulados.map((dado, index) => (
                        <TableRow key={dado.tipo} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            {dado.tipo}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ color: '#F44336' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {dado.pendente.quantidade} títulos
                              </Typography>
                              <Typography variant="body2">
                                R$ {formatarDecimal(dado.pendente.valor)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ color: '#2196F3' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {dado.pago.quantidade} títulos
                              </Typography>
                              <Typography variant="body2">
                                R$ {formatarDecimal(dado.pago.valor)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ color: '#FF9800' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {dado.total.quantidade} títulos
                              </Typography>
                              <Typography variant="body2">
                                R$ {formatarDecimal(dado.total.valor)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {dado.percentual.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<PictureAsPdfIcon />}
                              onClick={() => handleGerarPDFTabulado(dado.tipo)}
                            >
                              PDF Tipo
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Linha de Total Geral */}
                      {dadosTabulados.length > 0 && (
                        <TableRow sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                            TOTAL GERAL
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ color: '#F44336' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {dadosTabulados.reduce((acc, dado) => acc + dado.pendente.quantidade, 0)} títulos
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                R$ {formatarDecimal(dadosTabulados.reduce((acc, dado) => acc + dado.pendente.valor, 0))}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ color: '#2196F3' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {dadosTabulados.reduce((acc, dado) => acc + dado.pago.quantidade, 0)} títulos
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                R$ {formatarDecimal(dadosTabulados.reduce((acc, dado) => acc + dado.pago.valor, 0))}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ color: '#FF9800' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {dadosTabulados.reduce((acc, dado) => acc + dado.total.quantidade, 0)} títulos
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                R$ {formatarDecimal(dadosTabulados.reduce((acc, dado) => acc + dado.total.valor, 0))}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                              100%
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<PictureAsPdfIcon />}
                              onClick={() => handleGerarPDFTabulado()}
                              color="primary"
                            >
                              PDF Geral
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!mostrarDadosNoModal ? (
            // Botões da tela de configuração
            <>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleGerarRelatorioTabulado}
                disabled={configRelatorioTabulado.filiaisSelecionadas.length === 0 || !configRelatorioTabulado.dataInicial || !configRelatorioTabulado.dataFinal}
              >
                Gerar Relatório
              </Button>
              <Button onClick={() => setModalRelatorioTabulado(false)}>Cancelar</Button>
            </>
          ) : (
            // Botões da tela de dados
            <>
              <Button 
                variant="outlined"
                onClick={() => {
                  setMostrarDadosNoModal(false);
                  setDadosTabulados([]);
                  setDadosPorFilial({});
                  setFilialAtiva(0);
                }}
                startIcon={<ExpandLessIcon />}
              >
                Voltar à Configuração
              </Button>
              {Object.keys(dadosPorFilial).length > 0 ? (
                // Botões para visualização por filial (todas as filiais selecionadas)
                <>
                  <Button 
                    variant="outlined"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => handleGerarPDFTabulado()}
                    color="primary"
                  >
                    PDF Todas as Filiais (Meia A4)
                  </Button>
                  <Button 
                    variant="contained"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => {
                      const filialAtual = filiais.find(f => f.id === filialAtiva);
                      if (filialAtual) {
                        // Gerar PDF apenas da filial ativa usando a função de filial específica
                        import('jspdf').then(({ default: jsPDF }) => {
                          const doc = new jsPDF();
                          const pageWidth = doc.internal.pageSize.width;
                          const margin = 20;
                          let yPosition = 30;

                          // Título da filial
                          doc.setFontSize(16);
                          doc.setFont('helvetica', 'bold');
                          doc.text(`Relatório Tabulado - ${filialAtual.nome}`, pageWidth / 2, yPosition, { align: 'center' });
                          
                          yPosition += 15;

                          // Período
                          doc.setFontSize(10);
                          doc.setFont('helvetica', 'normal');
                          const periodo = `Período: ${configRelatorioTabulado.dataInicial?.split('-').reverse().join('/')} a ${configRelatorioTabulado.dataFinal?.split('-').reverse().join('/')}`;
                          doc.text(periodo, pageWidth / 2, yPosition, { align: 'center' });
                          
                          yPosition += 20;

                          // Cabeçalho da tabela
                          doc.setFontSize(8);
                          doc.setFont('helvetica', 'bold');
                          doc.text('Tipo', margin, yPosition);
                          doc.text('Pend.Qtd', margin + 40, yPosition);
                          doc.text('Pend.Valor', margin + 60, yPosition);
                          doc.text('Pago Qtd', margin + 85, yPosition);
                          doc.text('Pago Valor', margin + 105, yPosition);
                          doc.text('Total Qtd', margin + 130, yPosition);
                          doc.text('Total Valor', margin + 150, yPosition);
                          doc.text('%', margin + 175, yPosition);
                          
                          yPosition += 5;
                          doc.line(margin, yPosition, pageWidth - margin, yPosition);
                          yPosition += 8;

                          // Dados da filial ativa
                          doc.setFont('helvetica', 'normal');
                          dadosPorFilial[filialAtiva].forEach(dado => {
                            if (yPosition > 250) {
                              doc.addPage();
                              yPosition = 30;
                            }

                            doc.text(dado.tipo.substring(0, 15), margin, yPosition);
                            doc.text(dado.pendente.quantidade.toString(), margin + 40, yPosition);
                            doc.text(`R$ ${formatarDecimal(dado.pendente.valor)}`, margin + 60, yPosition);
                            doc.text(dado.pago.quantidade.toString(), margin + 85, yPosition);
                            doc.text(`R$ ${formatarDecimal(dado.pago.valor)}`, margin + 105, yPosition);
                            doc.text(dado.total.quantidade.toString(), margin + 130, yPosition);
                            doc.text(`R$ ${formatarDecimal(dado.total.valor)}`, margin + 150, yPosition);
                            doc.text(`${dado.percentual.toFixed(1)}%`, margin + 175, yPosition);
                            
                            yPosition += 8;
                          });

                          // Total da filial
                          if (dadosPorFilial[filialAtiva].length > 0) {
                            yPosition += 5;
                            doc.line(margin, yPosition, pageWidth - margin, yPosition);
                            yPosition += 8;
                            
                            const totalFilial = dadosPorFilial[filialAtiva].reduce((acc, dado) => ({
                              pendente: { 
                                quantidade: acc.pendente.quantidade + dado.pendente.quantidade,
                                valor: acc.pendente.valor + dado.pendente.valor 
                              },
                              pago: { 
                                quantidade: acc.pago.quantidade + dado.pago.quantidade,
                                valor: acc.pago.valor + dado.pago.valor 
                              },
                              total: { 
                                quantidade: acc.total.quantidade + dado.total.quantidade,
                                valor: acc.total.valor + dado.total.valor 
                              }
                            }), {
                              pendente: { quantidade: 0, valor: 0 },
                              pago: { quantidade: 0, valor: 0 },
                              total: { quantidade: 0, valor: 0 }
                            });

                            doc.setFont('helvetica', 'bold');
                            doc.text('TOTAL', margin, yPosition);
                            doc.text(totalFilial.pendente.quantidade.toString(), margin + 40, yPosition);
                            doc.text(`R$ ${formatarDecimal(totalFilial.pendente.valor)}`, margin + 60, yPosition);
                            doc.text(totalFilial.pago.quantidade.toString(), margin + 85, yPosition);
                            doc.text(`R$ ${formatarDecimal(totalFilial.pago.valor)}`, margin + 105, yPosition);
                            doc.text(totalFilial.total.quantidade.toString(), margin + 130, yPosition);
                            doc.text(`R$ ${formatarDecimal(totalFilial.total.valor)}`, margin + 150, yPosition);
                            doc.text('100%', margin + 175, yPosition);
                          }

                          // Salvar
                          const nomeArquivo = `relatorio-tabulado-${filialAtual.nome.replace(/\s+/g, '-')}-${configRelatorioTabulado.dataInicial}.pdf`;
                          doc.save(nomeArquivo);

                          setAlert({
                            open: true,
                            message: `PDF da filial ${filialAtual.nome} gerado com sucesso!`,
                            severity: 'success'
                          });
                        });
                      }
                    }}
                    color="secondary"
                  >
                    PDF desta Filial
                  </Button>
                </>
              ) : (
                // Botão para visualização consolidada
                <Button 
                  variant="contained"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => handleGerarPDFTabulado()}
                  color="primary"
                >
                  Gerar PDF Geral
                </Button>
              )}
              <Button onClick={() => {
                setModalRelatorioTabulado(false);
                setMostrarDadosNoModal(false);
                setDadosTabulados([]);
                setDadosPorFilial({});
                setFilialAtiva(0);
              }}>
                Fechar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Typography variant="h4" gutterBottom color="primary">
        Extrato de Títulos
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <TextField select label="Tipo" name="tipo" value={filtros.tipo} onChange={handleFiltroChange} fullWidth>
                <MenuItem value="">Todos</MenuItem>
                {tipos.length === 0 ? (
                  <MenuItem disabled>Carregando tipos...</MenuItem>
                ) : (
                  tipos.map(tipo => <MenuItem key={tipo.id} value={tipo.nome}>{tipo.nome}</MenuItem>)
                )}
              </TextField>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <TextField select label="Fornecedor" name="fornecedor" value={filtros.fornecedor} onChange={handleFiltroChange} fullWidth>
                <MenuItem value="">Todos</MenuItem>
                {fornecedores.length === 0 ? (
                  <MenuItem disabled>Carregando fornecedores...</MenuItem>
                ) : (
                  fornecedores.map(fornecedor => <MenuItem key={fornecedor.id} value={fornecedor.nome}>{fornecedor.nome}</MenuItem>)
                )}
              </TextField>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <TextField select label="Filial" name="filial" value={filtros.filial} onChange={handleFiltroChange} fullWidth>
                <MenuItem value="">Todas</MenuItem>
                {filiais.length === 0 ? (
                  <MenuItem disabled>Carregando filiais...</MenuItem>
                ) : (
                  filiais.map(filial => <MenuItem key={filial.id} value={filial.nome}>{filial.nome}</MenuItem>)
                )}
              </TextField>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormGroup row>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtroTipo.vencimento}
                      onChange={handleFiltroTipoChange}
                      name="vencimento"
                    />
                  }
                  label="Dt. Vencimento"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtroTipo.pagamento}
                      onChange={handleFiltroTipoChange}
                      name="pagamento"
                    />
                  }
                  label="Dt. Pagamento"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtroTipo.todos}
                      onChange={handleFiltroTipoChange}
                      name="todos"
                    />
                  }
                  label="Todas as Datas"
                />
              </FormGroup>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={mostrarPagos}
                      onChange={handleMostrarPagosChange}
                      color="warning"
                    />
                  }
                  label="Incluir Títulos Pagos"
                  sx={{ 
                    color: mostrarPagos ? 'warning.main' : 'text.secondary',
                    fontWeight: mostrarPagos ? 'bold' : 'normal'
                  }}
                />
              </FormGroup>
            </Box>
            <Box sx={{ flex: '1 1 400px', minWidth: '300px' }}>
              <Stack direction="row" spacing={1}>
                <TextField label="Data Inicial" name="dataInicial" type="date" value={filtros.dataInicial} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} fullWidth disabled={filtroTipo.todos} />
                <TextField label="Data Final" name="dataFinal" type="date" value={filtros.dataFinal} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} fullWidth disabled={filtroTipo.todos} />
              </Stack>
            </Box>
          </Box>
        </CardContent>
      </Card>
      

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Extrato de Títulos</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<TableViewIcon />} 
                onClick={() => setModalRelatorioTabulado(true)}
                color="secondary"
              >
                Relatório Tabulado
              </Button>
              <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleGerarPDF}>Gerar PDF</Button>
            </Box>
          </Box>
          {/* Informações de paginação */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Mostrando {titulosFiltrados.length === 0 ? 0 : indiceInicial + 1} a {Math.min(indiceFinal, titulosFiltrados.length)} de {titulosFiltrados.length} títulos
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Itens por página</InputLabel>
              <Select
                value={itensPorPagina}
                label="Itens por página"
                onChange={(e) => handleMudarItensPorPagina(Number(e.target.value))}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <List>
            {titulosFiltrados.length === 0 && (
              <Typography color="textSecondary">Nenhum título encontrado.</Typography>
            )}
            {titulosPaginados.map(titulo => (
              <ListItem key={titulo.id} divider>
                <ListItemText
                  primary={`${titulo.numero || ''} | ${titulo.tipo || 'Tipo não especificado'} | ${titulo.fornecedor} | ${titulo.filial}`}
                  secondary={`Vencimento: ${formatDateToBrazilian(titulo.vencimento)} | Valor: R$ ${formatarDecimal(parseDecimalSeguro(titulo.valor))} | Status: ${titulo.status || 'Em aberto'} | Pagamento: ${titulo.pagamento ? formatDateToBrazilian(titulo.pagamento) : '-'}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="pagar" onClick={() => handlePagar(titulo.id)} disabled={titulo.status === 'pago'}>
                    <PaymentIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="editar" onClick={() => handleEditar(titulo)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(titulo.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {/* Controles de paginação */}
          {totalPaginas > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPaginas}
                page={paginaAtual}
                onChange={(_, novaPagina) => handleMudarPagina(novaPagina)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};



export default EmissaoTitulos;
