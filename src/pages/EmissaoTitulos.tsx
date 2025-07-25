import React, { useState, useEffect } from 'react';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { supabase } from '../services/supabase';
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
  InputLabel
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
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
          valor: (titulo.valor !== undefined && titulo.valor !== null && titulo.valor !== '' && !isNaN(Number(titulo.valor))) ? titulo.valor.toString() : '0.00',
          status: titulo.status,
          observacao: titulo.observacao,
          multa: titulo.multa,
          juros: titulo.juros
        };
      });
      
      console.log('Títulos formatados:', titulosFormatados);
      console.log('Quantidade de títulos formatados:', titulosFormatados.length);
      
      setTitulos(titulosFormatados);
      setTitulosFiltrados(titulosFormatados);
      
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
    aplicarFiltros(novosFiltros, filtroTipo);
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
    aplicarFiltros(filtros, novoFiltroTipo);
  };

  const aplicarFiltros = (filtrosAtuais = filtros, tiposFiltro = filtroTipo) => {
    let resultado = [...titulos];
    
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

  const arredondarDuasCasas = (valor: string | number) => {
    const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
    if (isNaN(num)) return '';
    return (Math.round(num * 100) / 100).toFixed(2);
  };

  // Substituir setMulta e setJuros para aceitar apenas até duas casas decimais
  const handleMultaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(',', '.');
    if (/^\d*(\.\d{0,2})?$/.test(valor)) setMulta(valor);
  };
  const handleJurosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(',', '.');
    if (/^\d*(\.\d{0,2})?$/.test(valor)) setJuros(valor);
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
      
      const multaValor = parseFloat(arredondarDuasCasas(multa)) || 0;
      const jurosValor = parseFloat(arredondarDuasCasas(juros)) || 0;
      
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
      
      const multaValor = parseFloat(arredondarDuasCasas(multa)) || 0;
      const jurosValor = parseFloat(arredondarDuasCasas(juros)) || 0;
      
      // Preparar dados para atualização
      const dadosAtualizacao = {
        multa: multaValor,
        juros: jurosValor
      };
      
      console.log('Dados de atualização:', dadosAtualizacao);
      
      // Atualizar no Supabase
      const resultado = await titulosService.update(tituloEdicao.id, dadosAtualizacao);
      console.log('Resultado da atualização:', resultado);
      
      if (resultado) {
        // Atualizar o estado local com os novos valores de multa e juros
        const novosTitulos = titulos.map(t => {
          if (t.id === tituloEdicao.id) {
            return {
              ...t,
              multa: multaValor,
              juros: jurosValor
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
              juros: jurosValor
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
            disabled={parseFloat(multa) <= 0 && parseFloat(juros) <= 0}
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
              value={tituloEdicao ? `R$ ${parseFloat(tituloEdicao.valor).toFixed(2)}` : ''}
              InputProps={{ readOnly: true }}
              fullWidth
              disabled
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
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={carregarDados}>Atualizar</Button>
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
                  secondary={`Vencimento: ${formatDateToBrazilian(titulo.vencimento)} | Valor: R$ ${parseFloat(titulo.valor).toFixed(2)} | Status: ${titulo.status || 'Em aberto'} | Pagamento: ${titulo.pagamento ? formatDateToBrazilian(titulo.pagamento) : '-'}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="pagar" onClick={() => handlePagar(titulo.id)} disabled={titulo.status === 'pago'}>
                    <PaymentIcon />
                  </IconButton>
                  {titulo.status === 'pago' && (
                    <IconButton edge="end" aria-label="editar" onClick={() => handleEditar(titulo)}>
                      <EditIcon />
                    </IconButton>
                  )}
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
