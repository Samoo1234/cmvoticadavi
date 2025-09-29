import React, { useState, useEffect } from 'react';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { supabase } from '../services/supabase';
import { parseDecimalSeguro, formatarDecimal, validarValorMonetario, arredondarDuasCasas, somarValores } from '../utils/decimalUtils';
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
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { filiaisService } from '../services/filiaisService';
import { fornecedoresService } from '../services/fornecedoresService';
import { tiposFornecedoresService } from '../services/tiposFornecedoresService';
import { titulosService } from '../services/titulosService';
import { relatoriosPDFService } from '../services/relatoriosPDFService';

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
  
  // Estados para o modal de relatório tabulado
  const [modalRelatorioTabulado, setModalRelatorioTabulado] = useState(false);
  const [mostrarDadosNoModal, setMostrarDadosNoModal] = useState(false);
  const [dadosTabulados, setDadosTabulados] = useState<any[]>([]);
  const [dadosPorFilial, setDadosPorFilial] = useState<any>({});
  const [filialAtiva, setFilialAtiva] = useState(0);
  
  // Estado para seleção de filiais no breakdown mensal
  const [filiaisSelecionadasBreakdown, setFiliaisSelecionadasBreakdown] = useState<number[]>([]);

  // Helpers de data: tratar datas como "date-only" em local time para evitar drift UTC
  const parseDateOnly = (isoLike: string | null | undefined): Date | null => {
    if (!isoLike) return null;
    // Espera 'YYYY-MM-DD' ou similar
    const [y, m, d] = isoLike.split('T')[0].split('-').map(n => parseInt(n, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d); // local midnight
  };
  const startOfDay = (dt: Date | null): Date | null => {
    if (!dt) return null;
    const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
    return d;
  };
  const endOfDay = (dt: Date | null): Date | null => {
    if (!dt) return null;
    const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
    return d;
  };
  // Normaliza qualquer string de data para 'YYYY-MM-DD' (primeiros 10 chars)
  const normalizeDateStr = (s?: string | null): string | null => {
    if (!s) return null;
    return s.slice(0, 10);
  };
  // Compara por string (YYYY-MM-DD) para evitar fuso/UTC
  const dateInRangeStr = (d?: string | null, start?: string | null, end?: string | null) => {
    const ds = normalizeDateStr(d);
    const s = normalizeDateStr(start);
    const e = normalizeDateStr(end);
    if (!ds) return false;
    if (s && ds < s) return false;
    if (e && ds > e) return false;
    return true;
  };
  
  // Função para calcular breakdown mensal por filial
  const calcularBreakdownMensal = () => {
    if (!filtros.dataInicial || !filtros.dataFinal || filtroTipo.todos) {
      return [];
    }

    // Agrupar títulos filtrados por filial e mês
    const dadosAgrupados: { [filial: string]: { [mesAno: string]: TituloCompleto[] } } = {};

    const titulosParaBreakdown = titulosFiltrados.filter(titulo => 
      dateInRangeStr(titulo.vencimento, filtros.dataInicial, filtros.dataFinal)
    );

    titulosParaBreakdown.forEach(titulo => {
      const ds = normalizeDateStr(titulo.vencimento)!; // já filtrado
      const [yyyy, mm] = [ds.slice(0,4), ds.slice(5,7)];
      const mesAno = `${mm}/${yyyy}`;
      
      if (!dadosAgrupados[titulo.filial]) {
        dadosAgrupados[titulo.filial] = {};
      }
      
      if (!dadosAgrupados[titulo.filial][mesAno]) {
        dadosAgrupados[titulo.filial][mesAno] = [];
      }
      
      dadosAgrupados[titulo.filial][mesAno].push(titulo);
    });

    // Converter para formato do breakdown
    const breakdown = Object.keys(dadosAgrupados).map(filialNome => {
      const filialObj = filiais.find(f => f.nome === filialNome);
      const mesesData = dadosAgrupados[filialNome];
      
      const meses = Object.keys(mesesData).sort((a, b) => {
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        return new Date(parseInt(anoA), parseInt(mesA) - 1).getTime() - 
               new Date(parseInt(anoB), parseInt(mesB) - 1).getTime();
      }).map(mesAno => {
        const titulosMes = mesesData[mesAno];
        const tipos: { [tipo: string]: { pendentes: { quantidade: number; valor: number }; pagos: { quantidade: number; valor: number } } } = {};
        
        // Agrupar por tipo
        titulosMes.forEach(titulo => {
          const tipoNome = titulo.tipo || 'Sem Tipo';
          if (!tipos[tipoNome]) {
            tipos[tipoNome] = {
              pendentes: { quantidade: 0, valor: 0 },
              pagos: { quantidade: 0, valor: 0 }
            };
          }
          
          const valor = parseDecimalSeguro(titulo.valor || 0);
          if (titulo.status === 'pendente') {
            tipos[tipoNome].pendentes.quantidade += 1;
            tipos[tipoNome].pendentes.valor += valor;
          } else if (titulo.status === 'pago') {
            tipos[tipoNome].pagos.quantidade += 1;
            tipos[tipoNome].pagos.valor += valor;
          }
        });
        
        // Calcular totais do mês
        const totalMes = Object.values(tipos).reduce((acc, tipo) => ({
          quantidade: acc.quantidade + tipo.pendentes.quantidade + tipo.pagos.quantidade,
          valor: acc.valor + tipo.pendentes.valor + tipo.pagos.valor,
          pendentes: acc.pendentes + tipo.pendentes.quantidade,
          valorPendentes: acc.valorPendentes + tipo.pendentes.valor,
          valorPagos: acc.valorPagos + tipo.pagos.valor
        }), { quantidade: 0, valor: 0, pendentes: 0, valorPendentes: 0, valorPagos: 0 });
        
        return {
          mes: mesAno,
          tipos,
          total: totalMes
        };
      });
      
      // Calcular totais da filial
      const totalFilial = meses.reduce((acc, mes) => ({
        quantidade: acc.quantidade + mes.total.quantidade,
        valor: acc.valor + mes.total.valor,
        pendentes: acc.pendentes + mes.total.pendentes,
        valorPendentes: acc.valorPendentes + mes.total.valorPendentes,
        valorPagos: acc.valorPagos + mes.total.valorPagos
      }), { quantidade: 0, valor: 0, pendentes: 0, valorPendentes: 0, valorPagos: 0 });
      
      return {
        filial: filialNome,
        filialId: filialObj?.id || 0,
        meses,
        total: totalFilial
      };
    });

    return breakdown;
  };
  
  // Inicializar seleção de filiais quando breakdown for carregado
  useEffect(() => {
    const breakdownData = (filtros.dataInicial && filtros.dataFinal) && !filtroTipo.todos ? calcularBreakdownMensal() : [];
    if (breakdownData.length > 0 && !filtros.filial) {
      const todasFiliais = breakdownData.map((d: any) => d.filialId);
      setFiliaisSelecionadasBreakdown(todasFiliais);
    }
  }, [filtros.dataInicial, filtros.dataFinal, filtroTipo.todos, filtros.filial]);
  const [configRelatorioTabulado, setConfigRelatorioTabulado] = useState({
    filiais: [] as number[],
    filiaisSelecionadas: [] as number[],
    dataInicial: '',
    dataFinal: ''
  });
  
  // Estado para controlar checkboxes das filiais no breakdown mensal
  const [filiaisSelecionadasPDF, setFiliaisSelecionadasPDF] = useState<{[filialNome: string]: boolean}>({});
  
  

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

  // Aplicar filtros sempre que os títulos ou filtros mudarem
  useEffect(() => {
    if (titulos.length > 0) {
      aplicarFiltros(filtros, filtroTipo);
    }
  }, [titulos, filtros, filtroTipo]);

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novosFiltros = { ...filtros, [e.target.name]: e.target.value };
    setFiltros(novosFiltros);
    // O useEffect vai aplicar os filtros automaticamente
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
    // O useEffect vai aplicar os filtros automaticamente
  };


  const aplicarFiltros = (filtrosAtuais = filtros, tiposFiltro = filtroTipo) => {
    let resultado = [...titulos];
    
    // Títulos pagos agora são sempre incluídos
    
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
        const dataInicialStr = filtrosAtuais.dataInicial || null;
        const dataFinalStr = filtrosAtuais.dataFinal || null;
        
        resultado = resultado.filter(titulo => {
          // Determina qual campo de data usar baseado no tipo de filtro
          const dataCampoStr = tiposFiltro.vencimento 
            ? titulo.vencimento
            : (tiposFiltro.pagamento && titulo.pagamento ? titulo.pagamento : null);
          
          // Se não tiver a data necessária ou for nula, não passa no filtro
          if (!dataCampoStr) {
            return tiposFiltro.pagamento ? false : true; // Se for filtro de pagamento, só mostra os pagos
          }
          
          // Aplica o filtro baseado nas datas fornecidas
          const passa = dateInRangeStr(dataCampoStr, dataInicialStr, dataFinalStr);
          
          return passa;
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


  // Função para calcular resumo dinâmico baseado nos filtros atuais
  const calcularResumoDinamico = (): DadosTabulados[] => {
    // Usar os títulos já filtrados (incluindo filtro de data)
    const titulosParaResumo = titulosFiltrados;

    // Agrupar títulos por tipo
    const agrupamentoPorTipo: { [tipo: string]: TituloCompleto[] } = {};
    titulosParaResumo.forEach(titulo => {
      const tipo = titulo.tipo || 'Não especificado';
      if (!agrupamentoPorTipo[tipo]) {
        agrupamentoPorTipo[tipo] = [];
      }
      agrupamentoPorTipo[tipo].push(titulo);
    });

    // Calcular total geral para percentuais com validação monetária
    const totalGeralValor = titulosParaResumo.reduce((total, titulo) => {
      const valorValidado = validarValorMonetario(titulo.valor || '0') ? 
        parseDecimalSeguro(titulo.valor || '0') : 0;
      return parseDecimalSeguro(somarValores(total, valorValidado));
    }, 0);

    // Criar lista de todos os tipos (incluindo os sem dados)
    const todosOsTipos = tipos.map(t => t.nome);
    
    // Processar cada tipo
    const dadosResumo: DadosTabulados[] = todosOsTipos.map(tipo => {
      const titulosDoTipo = agrupamentoPorTipo[tipo] || [];
      
      const titulosPagos = titulosDoTipo.filter(t => t.status === 'pago');
      const titulosPendentes = titulosDoTipo.filter(t => t.status !== 'pago');
      
      // Calcular valores com validação monetária rigorosa
      const valorPago = titulosPagos.reduce((total, titulo) => {
        const valorValidado = validarValorMonetario(titulo.valor || '0') ? 
          parseDecimalSeguro(titulo.valor || '0') : 0;
        return parseDecimalSeguro(somarValores(total, valorValidado));
      }, 0);
      
      const valorPendente = titulosPendentes.reduce((total, titulo) => {
        const valorValidado = validarValorMonetario(titulo.valor || '0') ? 
          parseDecimalSeguro(titulo.valor || '0') : 0;
        return parseDecimalSeguro(somarValores(total, valorValidado));
      }, 0);
      
      const valorTotal = parseDecimalSeguro(somarValores(valorPago, valorPendente));
      
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
        percentual: totalGeralValor > 0 ? 
          parseDecimalSeguro((valorTotal / totalGeralValor) * 100) : 0
      };
    });

    // Ordenar por valor total (maior para menor), mas manter tipos com valor 0 no final
    return dadosResumo.sort((a, b) => {
      if (a.total.valor === 0 && b.total.valor === 0) return a.tipo.localeCompare(b.tipo);
      if (a.total.valor === 0) return 1;
      if (b.total.valor === 0) return -1;
      return b.total.valor - a.total.valor;
    });
  };

  // Função para calcular resumo geral usando apenas títulos filtrados
  const calcularResumoGeral = (): DadosTabulados[] => {
    // Agrupar títulos FILTRADOS por tipo
    const agrupamentoPorTipo: { [tipo: string]: TituloCompleto[] } = {};
    titulosFiltrados.forEach(titulo => {
      const tipo = titulo.tipo || 'Não especificado';
      if (!agrupamentoPorTipo[tipo]) {
        agrupamentoPorTipo[tipo] = [];
      }
      agrupamentoPorTipo[tipo].push(titulo);
    });

    // Calcular total geral para percentuais usando títulos FILTRADOS
    const totalGeralValor = titulosFiltrados.reduce((total, titulo) => {
      const valorValidado = validarValorMonetario(titulo.valor || '0') ? 
        parseDecimalSeguro(titulo.valor || '0') : 0;
      return parseDecimalSeguro(somarValores(total, valorValidado));
    }, 0);

    // Criar lista de todos os tipos (incluindo os sem dados)
    const todosOsTipos = tipos.map(t => t.nome);
    
    // Processar cada tipo
    const dadosResumo: DadosTabulados[] = todosOsTipos.map(tipo => {
      const titulosDoTipo = agrupamentoPorTipo[tipo] || [];
      
      const titulosPagos = titulosDoTipo.filter(t => t.status === 'pago');
      const titulosPendentes = titulosDoTipo.filter(t => t.status !== 'pago');
      
      // Calcular valores com validação monetária rigorosa
      const valorPago = titulosPagos.reduce((total, titulo) => {
        const valorValidado = validarValorMonetario(titulo.valor || '0') ? 
          parseDecimalSeguro(titulo.valor || '0') : 0;
        return parseDecimalSeguro(somarValores(total, valorValidado));
      }, 0);
      
      const valorPendente = titulosPendentes.reduce((total, titulo) => {
        const valorValidado = validarValorMonetario(titulo.valor || '0') ? 
          parseDecimalSeguro(titulo.valor || '0') : 0;
        return parseDecimalSeguro(somarValores(total, valorValidado));
      }, 0);
      
      const valorTotal = parseDecimalSeguro(somarValores(valorPago, valorPendente));
      
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
        percentual: totalGeralValor > 0 ? 
          parseDecimalSeguro((valorTotal / totalGeralValor) * 100) : 0
      };
    });

    // Ordenar por valor total (maior para menor), mas manter tipos com valor 0 no final
    return dadosResumo.sort((a, b) => {
      if (a.total.valor === 0 && b.total.valor === 0) return a.tipo.localeCompare(b.tipo);
      if (a.total.valor === 0) return 1;
      if (b.total.valor === 0) return -1;
      return b.total.valor - a.total.valor;
    });
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
      const relatorioService = relatoriosPDFService;
      
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
      doc.save(nomeArquivo);
      
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

  // Função para gerar relatório tabulado
  const handleGerarRelatorioTabulado = () => {
    try {
      // Validar seleção
      const selecionadas = configRelatorioTabulado.filiaisSelecionadas;
      const temPeriodo = !!configRelatorioTabulado.dataInicial && !!configRelatorioTabulado.dataFinal;
      if (!selecionadas || selecionadas.length === 0 || !temPeriodo) {
        setAlert({ open: true, message: 'Selecione filiais e período para gerar o relatório.', severity: 'warning' });
        return;
      }

      // Helper: parse date YYYY-MM-DD de forma segura (evita fuso)
      const parseDate = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      };

      const dataIni = parseDate(configRelatorioTabulado.dataInicial);
      const dataFim = parseDate(configRelatorioTabulado.dataFinal);

      // Filtrar títulos por filiais selecionadas e período (usando vencimento)
      const titulosSelecionados = titulos.filter(t => {
        const filialOk = t.filial_id ? selecionadas.includes(t.filial_id) : false;
        if (!filialOk) return false;
        const [y, m, d] = t.vencimento.split('-').map(Number);
        const dt = new Date(y, (m || 1) - 1, d || 1);
        return dt >= dataIni && dt <= dataFim;
      });

      // Lista de tipos conhecidos
      const tiposNomes = tipos.map(t => t.nome);

      // Função para montar array de DadosTabulados para um conjunto de títulos
      const montarDadosTabulados = (lista: TituloCompleto[]): DadosTabulados[] => {
        const agrupado: { [tipo: string]: TituloCompleto[] } = {};
        lista.forEach(t => {
          const tp = t.tipo || 'Não especificado';
          if (!agrupado[tp]) agrupado[tp] = [];
          agrupado[tp].push(t);
        });

        const totalGeralValor = lista.reduce((acc, t) => {
          const v = validarValorMonetario(t.valor || '0') ? parseDecimalSeguro(t.valor || '0') : 0;
          return parseDecimalSeguro(somarValores(acc, v));
        }, 0);

        return tiposNomes.map(tipoNome => {
          const doTipo = agrupado[tipoNome] || [];
          const pagos = doTipo.filter(t => t.status === 'pago');
          const pendentes = doTipo.filter(t => t.status !== 'pago');

          const valorPago = pagos.reduce((acc, t) => {
            const v = validarValorMonetario(t.valor || '0') ? parseDecimalSeguro(t.valor || '0') : 0;
            return parseDecimalSeguro(somarValores(acc, v));
          }, 0);
          const valorPendente = pendentes.reduce((acc, t) => {
            const v = validarValorMonetario(t.valor || '0') ? parseDecimalSeguro(t.valor || '0') : 0;
            return parseDecimalSeguro(somarValores(acc, v));
          }, 0);
          const valorTotal = parseDecimalSeguro(somarValores(valorPago, valorPendente));

          return {
            tipo: tipoNome,
            pendente: { quantidade: pendentes.length, valor: valorPendente },
            pago: { quantidade: pagos.length, valor: valorPago },
            total: { quantidade: doTipo.length, valor: valorTotal },
            percentual: totalGeralValor > 0 ? parseDecimalSeguro((valorTotal / totalGeralValor) * 100) : 0
          } as DadosTabulados;
        }).sort((a, b) => {
          if (a.total.valor === 0 && b.total.valor === 0) return a.tipo.localeCompare(b.tipo);
          if (a.total.valor === 0) return 1;
          if (b.total.valor === 0) return -1;
          return b.total.valor - a.total.valor;
        });
      };

      if (selecionadas.length > 1) {
        // Por filial
        const dadosMap: Record<number, DadosTabulados[]> = {};
        selecionadas.forEach(fid => {
          const lista = titulosSelecionados.filter(t => t.filial_id === fid);
          dadosMap[fid] = montarDadosTabulados(lista);
        });
        setDadosPorFilial(dadosMap);
        setDadosTabulados([]);
        setFilialAtiva(selecionadas[0]);
      } else {
        // Consolidado de uma filial
        const lista = titulosSelecionados.filter(t => t.filial_id === selecionadas[0]);
        const dados = montarDadosTabulados(lista);
        setDadosTabulados(dados);
        setDadosPorFilial({});
        setFilialAtiva(selecionadas[0] || 0);
      }

      setMostrarDadosNoModal(true);
    } catch (e) {
      console.error('Erro ao gerar relatório tabulado:', e);
      setAlert({ open: true, message: 'Erro ao gerar relatório tabulado.', severity: 'error' });
    }
  };

  // Função para gerar PDF tabulado
  const handleGerarPDFTabulado = (tipo?: string) => {
    console.log('Gerando PDF tabulado...', tipo ? `para tipo: ${tipo}` : 'geral');
    // Implementação futura para gerar PDF
    // Se tipo for fornecido, gerar PDF específico para esse tipo
    // Caso contrário, gerar PDF geral
  };

  // Função para alternar seleção de filial no breakdown
  const handleToggleFilialPDF = (filialNome: string) => {
    setFiliaisSelecionadasPDF(prev => ({
      ...prev,
      [filialNome]: !prev[filialNome]
    }));
  };

  // Função para gerar PDF individual de uma filial
  const handleGerarPDFFilial = (filialNome: string, dadosFilial: any) => {
    console.log(`Gerando PDF individual para filial: ${filialNome}`);
    // TODO: Implementar geração de PDF individual
    gerarPDFBreakdownFilial(filialNome, dadosFilial);
  };

  // Função para gerar PDF das filiais selecionadas
  const handleGerarPDFSelecionadas = (breakdownData: any[]) => {
    const filiaisSelecionadas = breakdownData.filter(dados => 
      filiaisSelecionadasPDF[dados.filial]
    );
    
    if (filiaisSelecionadas.length === 0) {
      setAlert({
        open: true,
        message: 'Selecione pelo menos uma filial para gerar o PDF',
        severity: 'warning'
      });
      return;
    }
    
    console.log(`Gerando PDF consolidado para ${filiaisSelecionadas.length} filiais`);
    gerarPDFBreakdownConsolidado(filiaisSelecionadas);
  };

  // Função para gerar PDF individual de uma filial usando o serviço correto
  const gerarPDFBreakdownFilial = (filialNome: string, dadosFilial: any) => {
    try {
      const relatorioService = relatoriosPDFService;
      
      // Usar o método correto do serviço que tem controle manual
      const doc = relatorioService.gerarBreakdownMensal([dadosFilial], {
        dataInicial: filtros.dataInicial || '',
        dataFinal: filtros.dataFinal || '',
        filial: filialNome
      }, 'filial');
      
      // Salvar o PDF
      doc.save(`breakdown-${filialNome.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
      
      setAlert({
        open: true,
        message: `PDF do breakdown de ${filialNome} gerado com sucesso!`,
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setAlert({
        open: true,
        message: 'Erro ao gerar PDF. Tente novamente.',
        severity: 'error'
      });
    }
  };

  // Função para gerar PDF consolidado das filiais selecionadas usando o serviço correto
  const gerarPDFBreakdownConsolidado = (filiaisSelecionadas: any[]) => {
    try {
      const relatorioService = relatoriosPDFService;
      
      // Usar o método correto do serviço que tem controle manual
      const doc = relatorioService.gerarBreakdownMensal(filiaisSelecionadas, {
        dataInicial: filtros.dataInicial || '',
        dataFinal: filtros.dataFinal || '',
      }, 'consolidado');
      
      // Salvar o PDF
      doc.save(`breakdown-consolidado-${filiaisSelecionadas.length}-filiais-${new Date().toISOString().slice(0, 10)}.pdf`);
      
      setAlert({
        open: true,
        message: `PDF consolidado de ${filiaisSelecionadas.length} filiais gerado com sucesso!`,
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setAlert({
        open: true,
        message: 'Erro ao gerar PDF. Tente novamente.',
        severity: 'error'
      });
    }
  };

  
  // Função para calcular totais gerais (sem filtro de data) para comparação
  const calcularTotaisGerais = () => {
    let titulosTotais = [...titulos];
    
    // Aplicar apenas filtros de filial, fornecedor e tipo (sem data)
    if (filtros.filial) {
      titulosTotais = titulosTotais.filter(titulo => titulo.filial === filtros.filial);
    }
    if (filtros.fornecedor) {
      titulosTotais = titulosTotais.filter(titulo => titulo.fornecedor === filtros.fornecedor);
    }
    if (filtros.tipo) {
      titulosTotais = titulosTotais.filter(titulo => titulo.tipo === filtros.tipo);
    }
    // Títulos pagos agora são sempre incluídos nos totais gerais

    const totalQuantidade = titulosTotais.length;
    const totalValor = titulosTotais.reduce((total, titulo) => {
      const valorValidado = validarValorMonetario(titulo.valor || '0') ? 
        parseDecimalSeguro(titulo.valor || '0') : 0;
      return parseDecimalSeguro(somarValores(total, valorValidado));
    }, 0);

    return { quantidade: totalQuantidade, valor: totalValor };
  };

  // Função para calcular totais filtrados (com filtro de data)
  const calcularTotaisFiltrados = () => {
    const totalQuantidade = titulosFiltrados.length;
    const totalValor = titulosFiltrados.reduce((total, titulo) => {
      const valorValidado = validarValorMonetario(titulo.valor || '0') ? 
        parseDecimalSeguro(titulo.valor || '0') : 0;
      return parseDecimalSeguro(somarValores(total, valorValidado));
    }, 0);

    return { quantidade: totalQuantidade, valor: totalValor };
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

      {/* Modal de relatório tabulado */}
      <Dialog open={modalRelatorioTabulado} onClose={() => setModalRelatorioTabulado(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Relatório Tabulado por Tipo de Título</DialogTitle>
        <DialogContent>
          {!mostrarDadosNoModal ? (
            // Tela de configuração
            <>
              <DialogContentText sx={{ mb: 3 }}>
                Configure as filiais e o período para gerar o relatório tabulado por tipo de título.
              </DialogContentText>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Resumo Geral de Títulos */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
                    📊 Resumo Geral de Títulos
                  </Typography>
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Título</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pendentes</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pagos</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Percentual</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {calcularResumoGeral().map((resumo, index) => (
                          <TableRow key={resumo.tipo} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {resumo.tipo}
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {resumo.pendente.quantidade} | R$ {formatarDecimal(resumo.pendente.valor)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {resumo.pago.quantidade} | R$ {formatarDecimal(resumo.pago.valor)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {resumo.total.quantidade} | R$ {formatarDecimal(resumo.total.valor)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {resumo.percentual.toFixed(1)}%
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Linha de Total Geral */}
                        {calcularResumoGeral().length > 0 && (
                          <TableRow sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                              TOTAL GERAL
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {calcularResumoGeral().reduce((acc, resumo) => acc + resumo.pendente.quantidade, 0)} | R$ {formatarDecimal(calcularResumoGeral().reduce((acc, resumo) => acc + resumo.pendente.valor, 0))}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {calcularResumoGeral().reduce((acc, resumo) => acc + resumo.pago.quantidade, 0)} | R$ {formatarDecimal(calcularResumoGeral().reduce((acc, resumo) => acc + resumo.pago.valor, 0))}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {calcularResumoGeral().reduce((acc, resumo) => acc + resumo.total.quantidade, 0)} | R$ {formatarDecimal(calcularResumoGeral().reduce((acc, resumo) => acc + resumo.total.valor, 0))}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                100.0%
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

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
                // Visualização por filial (quando múltiplas filiais estão selecionadas)
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
                // Visualização consolidada (quando apenas uma filial está selecionada)
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
                // Botões para visualização por filial (múltiplas filiais selecionadas)
                <>
                  <Button 
                    variant="outlined"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => handleGerarPDFTabulado()}
                    color="primary"
                  >
                    {configRelatorioTabulado.filiaisSelecionadas.length === filiais.length 
                      ? 'PDF Todas as Filiais (Meia A4)' 
                      : 'PDF das Filiais Selecionadas (Meia A4)'}
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

          {/* Resumo Geral de Títulos por Tipo */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
              📊 Resumo de Títulos por Tipo {filtros.filial ? `- ${filtros.filial}` : '(Todas as Filiais)'}
              {(filtros.dataInicial || filtros.dataFinal) && !filtroTipo.todos && (
                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'normal' }}>
                  Período: {filtros.dataInicial ? filtros.dataInicial.split('-').reverse().join('/') : '...'} até {filtros.dataFinal ? filtros.dataFinal.split('-').reverse().join('/') : '...'}
                </Typography>
              )}
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Título</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pendentes</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pagos</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Percentual</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calcularResumoDinamico().map((resumo, index) => (
                    <TableRow key={resumo.tipo} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {resumo.tipo}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {resumo.pendente.quantidade} títulos
                        </Typography>
                        <Typography variant="body2">
                          R$ {formatarDecimal(resumo.pendente.valor)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {resumo.pago.quantidade} títulos
                        </Typography>
                        <Typography variant="body2">
                          R$ {formatarDecimal(resumo.pago.valor)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {resumo.total.quantidade} títulos
                        </Typography>
                        <Typography variant="body2">
                          R$ {formatarDecimal(resumo.total.valor)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {resumo.percentual.toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Linha de Total Geral */}
                  {calcularResumoDinamico().length > 0 && (
                    <TableRow sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                        TOTAL GERAL
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {calcularResumoDinamico().reduce((acc, resumo) => acc + resumo.pendente.quantidade, 0)} títulos
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          R$ {formatarDecimal(calcularResumoDinamico().reduce((acc, resumo) => acc + resumo.pendente.valor, 0))}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {calcularResumoDinamico().reduce((acc, resumo) => acc + resumo.pago.quantidade, 0)} títulos
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          R$ {formatarDecimal(calcularResumoDinamico().reduce((acc, resumo) => acc + resumo.pago.valor, 0))}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {calcularResumoDinamico().reduce((acc, resumo) => acc + resumo.total.quantidade, 0)} títulos
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          R$ {formatarDecimal(calcularResumoDinamico().reduce((acc, resumo) => acc + resumo.total.valor, 0))}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                          100.0%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Seção de Breakdown Mensal */}
          {(() => {
            const breakdownData = (filtros.dataInicial && filtros.dataFinal) && !filtroTipo.todos ? calcularBreakdownMensal() : [];
            return breakdownData.length > 0 && breakdownData[0]?.meses?.length >= 1 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center', color: 'secondary.main' }}>
                  📅 BREAKDOWN MENSAL {filtros.filial ? `- ${filtros.filial.toUpperCase()}` : 'POR FILIAL'}
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>
                    Período: {filtros.dataInicial ? filtros.dataInicial.split('-').reverse().join('/') : '...'} até {filtros.dataFinal ? filtros.dataFinal.split('-').reverse().join('/') : '...'}
                  </Typography>
                </Typography>

                {/* Botões de Controle para PDF */}
                {!filtros.filial && breakdownData.length > 1 && (
                  <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        const novaSelecao: {[key: string]: boolean} = {};
                        breakdownData.forEach((d: any) => {
                          novaSelecao[d.filial] = true;
                        });
                        setFiliaisSelecionadasPDF(novaSelecao);
                      }}
                      size="small"
                    >
                      ☑️ Marcar Todas
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setFiliaisSelecionadasPDF({})}
                      size="small"
                    >
                      ☐ Desmarcar Todas
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => handleGerarPDFSelecionadas(breakdownData)}
                      color="success"
                      size="small"
                      disabled={Object.values(filiaisSelecionadasPDF).filter(Boolean).length === 0}
                    >
                      📄 PDF Selecionadas ({Object.values(filiaisSelecionadasPDF).filter(Boolean).length})
                    </Button>
                  </Box>
                )}

                {breakdownData.map((dadosFilial, index) => (
                <Box key={index} sx={{ mb: 3 }}>
                  {!filtros.filial && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        🏪 {dadosFilial.filial.toUpperCase()}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {dadosFilial.total.quantidade} títulos - R$ {formatarDecimal(dadosFilial.total.valor)}
                        </Typography>
                        <Checkbox
                          checked={filiaisSelecionadasPDF[dadosFilial.filial] || false}
                          onChange={() => handleToggleFilialPDF(dadosFilial.filial)}
                          color="primary"
                          size="small"
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PictureAsPdfIcon />}
                          onClick={() => handleGerarPDFFilial(dadosFilial.filial, dadosFilial)}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          PDF
                        </Button>
                      </Box>
                    </Box>
                  )}

                  <TableContainer component={Paper} sx={{ mb: 2, maxWidth: '100%', overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Mês/Ano</TableCell>
                          {tipos.map(tipo => (
                            <TableCell key={tipo.id} align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid #ddd' }} colSpan={2}>
                              {tipo.nome}
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }} colSpan={2}>
                            TOTAL
                          </TableCell>
                        </TableRow>
                        <TableRow sx={{ backgroundColor: '#fafafa' }}>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}></TableCell>
                          {tipos.map(tipo => (
                            <React.Fragment key={`${tipo.id}-header`}>
                              <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary', borderRight: '1px solid #eee' }}>
                                Pendentes
                              </TableCell>
                              <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary', borderRight: '1px solid #ddd' }}>
                                Pagos
                              </TableCell>
                            </React.Fragment>
                          ))}
                          <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary', backgroundColor: '#e3f2fd', borderRight: '1px solid #eee' }}>
                            Pendentes
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary', backgroundColor: '#e3f2fd' }}>
                            Pagos
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dadosFilial.meses.map((mes: any, mesIndex: number) => (
                          <TableRow key={mesIndex} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {mes.mes}
                            </TableCell>
                            {tipos.map(tipo => {
                              const dadosTipo = mes.tipos[tipo.nome] || { 
                                quantidade: 0, 
                                valor: 0, 
                                pendentes: { quantidade: 0, valor: 0 },
                                pagos: { quantidade: 0, valor: 0 }
                              };
                              return (
                                <React.Fragment key={tipo.id}>
                                  <TableCell align="center" sx={{ borderRight: '1px solid #eee' }}>
                                    <Typography variant="body2" sx={{ color: 'warning.main' }}>
                                      {dadosTipo.pendentes.quantidade}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                      R$ {formatarDecimal(dadosTipo.pendentes.valor)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center" sx={{ borderRight: '1px solid #ddd' }}>
                                    <Typography variant="body2" sx={{ color: 'success.main' }}>
                                      {dadosTipo.pagos.quantidade}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                      R$ {formatarDecimal(dadosTipo.pagos.valor)}
                                    </Typography>
                                  </TableCell>
                                </React.Fragment>
                              );
                            })}
                            <TableCell align="center" sx={{ backgroundColor: '#e3f2fd', borderRight: '1px solid #eee' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                {mes.total.pendentes || 0}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                R$ {formatarDecimal(mes.total.valorPendentes || 0)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ backgroundColor: '#e3f2fd' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                {mes.total.pagos || 0}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                R$ {formatarDecimal(mes.total.valorPagos || 0)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Linha de Total da Filial */}
                        <TableRow sx={{ backgroundColor: '#1976d2', color: 'white' }}>
                          <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>
                            TOTAL
                          </TableCell>
                          {tipos.map(tipo => {
                            const totalTipo = dadosFilial.meses.reduce((acc: any, mes: any) => ({
                              pendentes: acc.pendentes + (mes.tipos[tipo.nome]?.pendentes?.quantidade || 0),
                              pagos: acc.pagos + (mes.tipos[tipo.nome]?.pagos?.quantidade || 0),
                              valorPendentes: parseDecimalSeguro(somarValores(acc.valorPendentes, mes.tipos[tipo.nome]?.pendentes?.valor || 0)),
                              valorPagos: parseDecimalSeguro(somarValores(acc.valorPagos, mes.tipos[tipo.nome]?.pagos?.valor || 0))
                            }), { pendentes: 0, pagos: 0, valorPendentes: 0, valorPagos: 0 });
                            
                            return (
                              <React.Fragment key={tipo.id}>
                                <TableCell align="center" sx={{ color: 'white', borderRight: '1px solid #0d47a1' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {totalTipo.pendentes}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                    R$ {formatarDecimal(totalTipo.valorPendentes)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center" sx={{ color: 'white', borderRight: '1px solid #1976d2' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {totalTipo.pagos}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                    R$ {formatarDecimal(totalTipo.valorPagos)}
                                  </Typography>
                                </TableCell>
                              </React.Fragment>
                            );
                          })}
                          <TableCell align="center" sx={{ backgroundColor: '#0d47a1', color: 'white', borderRight: '1px solid #0d47a1' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {dadosFilial.total.pendentes || 0}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              R$ {formatarDecimal(dadosFilial.total.valorPendentes || 0)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ backgroundColor: '#0d47a1', color: 'white' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {(dadosFilial.total as any).pagos || 0}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              R$ {formatarDecimal(dadosFilial.total.valorPagos || 0)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}

                {/* Resumo Geral do Período (quando há múltiplas filiais) */}
                {!filtros.filial && breakdownData.length > 1 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'success.main' }}>
                      📈 Resumo Geral do Período
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#e8f5e8' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Filial</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Títulos</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Valor Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {breakdownData.map((dadosFilial: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{dadosFilial.filial}</TableCell>
                              <TableCell align="center">{dadosFilial.total.quantidade} títulos</TableCell>
                              <TableCell align="center">R$ {formatarDecimal(dadosFilial.total.valor)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow sx={{ backgroundColor: '#4caf50', color: 'white' }}>
                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>TOTAL GERAL</TableCell>
                            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {breakdownData.reduce((acc: number, filial: any) => acc + filial.total.quantidade, 0)} títulos
                            </TableCell>
                            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                              R$ {formatarDecimal(breakdownData.reduce((acc: number, filial: any) => parseDecimalSeguro(somarValores(acc, filial.total.valor)), 0))}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            );
          })()}

          {/* Separador visual */}
          <Box sx={{ my: 4, borderBottom: '2px solid #e0e0e0' }}></Box>

          {/* Seção da Listagem de Títulos */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
              📋 Listagem Detalhada de Títulos
              {(filtros.dataInicial || filtros.dataFinal) && !filtroTipo.todos && (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>
                  Mostrando {titulosFiltrados.length} título(s) do período selecionado
                </Typography>
              )}
            </Typography>
            
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
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};



export default EmissaoTitulos;
