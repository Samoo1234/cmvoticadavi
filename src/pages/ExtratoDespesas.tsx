import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  Chip
} from '@mui/material';

import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { despesasFixasService } from '../services/despesasFixasService';
import { despesasDiversasService } from '../services/despesasDiversasService';
import { categoriasDespesasService } from '../services/despesasService';
import type { CategoriaDespesa } from '../services/despesasService';
import { filiaisService } from '../services/filiaisService';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { RelatoriosPDFService } from '../services/relatoriosPDFService';

// Interface unificada para o extrato
interface DespesaExtrato {
  id: number;
  nome: string;
  valor: number;
  filial_id: number;
  filial_nome: string;
  categoria_id?: number;
  categoria_nome?: string;
  tipo_despesa: 'fixa' | 'diversa';
  status: string;
  data_despesa?: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  periodicidade?: string;
  dia_vencimento?: number;
  observacao?: string;
  created_at?: string;
}

const ExtratoDespesas: React.FC = () => {
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    tipoDespesa: '',    // 'fixa', 'diversa' ou ''
    filial: '',         // ID da filial ou ''
    categoria: '',      // ID da categoria ou ''
    status: '',         // 'pendente', 'pago', 'ativo', 'inativo' ou ''
    dataInicial: '',
    dataFinal: ''
  });
  
  // Estados para dados
  const [despesas, setDespesas] = useState<DespesaExtrato[]>([]);
  const [filiais, setFiliais] = useState<{id: number, nome: string}[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([]);
  
  // Estado para carregamento
  const [carregando, setCarregando] = useState(false);
  
  // Efeito para carregar dados iniciais
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setCarregando(true);
      try {
        // Carregar filiais e categorias
        const [filiaisData, categoriasData] = await Promise.all([
          filiaisService.getAll(),
          categoriasDespesasService.getAll()
        ]);
        
        setFiliais(filiaisData);
        setCategorias(categoriasData);
        
        // Definir datas iniciais para o período atual (mês corrente)
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        
        setFiltros({
          ...filtros,
          dataInicial: primeiroDiaMes.toISOString().slice(0, 10),
          dataFinal: ultimoDiaMes.toISOString().slice(0, 10)
        });
        
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      } finally {
        setCarregando(false);
      }
    };
    
    carregarDadosIniciais();
  }, []);
  
  // Efeito para carregar despesas quando os filtros mudarem
  useEffect(() => {
    const buscarDespesas = async () => {
      if (!filtros.dataInicial || !filtros.dataFinal) return;
      
      setCarregando(true);
      try {
        // Buscar dados das duas tabelas separadas com informações completas
        const [despesasFixas, despesasDiversas] = await Promise.all([
          despesasFixasService.getAllCompletas(),
          despesasDiversasService.getAllCompletas()
        ]);
        
        // Converter despesas fixas para o formato unificado
        const fixasUnificadas: DespesaExtrato[] = despesasFixas.map(despesa => ({
          id: despesa.id,
          nome: despesa.nome,
          valor: despesa.valor,
          filial_id: despesa.filial_id,
          filial_nome: despesa.filial_nome,
          categoria_id: despesa.categoria_id,
          categoria_nome: despesa.categoria_nome,
          tipo_despesa: 'fixa' as const,
          status: despesa.status,
          periodicidade: despesa.periodicidade,
          dia_vencimento: despesa.dia_vencimento,
          observacao: despesa.observacao,
          created_at: despesa.created_at
        }));
        
        // Converter despesas diversas para o formato unificado
        const diversasUnificadas: DespesaExtrato[] = despesasDiversas.map(despesa => ({
          id: despesa.id,
          nome: despesa.nome,
          valor: despesa.valor,
          filial_id: despesa.filial_id,
          filial_nome: despesa.filial_nome,
          categoria_id: despesa.categoria_id,
          categoria_nome: despesa.categoria_nome,
          tipo_despesa: 'diversa' as const,
          status: despesa.status,
          data_despesa: despesa.data_despesa,
          data_pagamento: despesa.data_pagamento,
          forma_pagamento: despesa.forma_pagamento,
          observacao: despesa.observacao,
          created_at: despesa.created_at
        }));
        
        // Combinar todas as despesas
        let todasDespesas = [...fixasUnificadas, ...diversasUnificadas];
        
        // Aplicar filtros
        if (filtros.tipoDespesa) {
          todasDespesas = todasDespesas.filter(
            despesa => despesa.tipo_despesa === filtros.tipoDespesa
          );
        }
        
        if (filtros.filial) {
          todasDespesas = todasDespesas.filter(
            despesa => despesa.filial_id === parseInt(filtros.filial)
          );
        }
        
        if (filtros.categoria) {
          todasDespesas = todasDespesas.filter(
            despesa => despesa.categoria_id === parseInt(filtros.categoria)
          );
        }
        
        if (filtros.status) {
          todasDespesas = todasDespesas.filter(
            despesa => despesa.status === filtros.status
          );
        }
        
        // Filtrar por período para despesas diversas (que têm data_despesa)
        todasDespesas = todasDespesas.filter(despesa => {
          if (despesa.tipo_despesa === 'diversa' && despesa.data_despesa) {
            const dataDespesa = new Date(despesa.data_despesa);
            const dataInicial = new Date(filtros.dataInicial);
            const dataFinal = new Date(filtros.dataFinal);
            return dataDespesa >= dataInicial && dataDespesa <= dataFinal;
          }
          // Para despesas fixas, incluir todas (não têm data específica)
          return despesa.tipo_despesa === 'fixa';
        });
        
        // Ordenar por data (diversas) ou nome (fixas)
        todasDespesas.sort((a, b) => {
          if (a.data_despesa && b.data_despesa) {
            return new Date(b.data_despesa).getTime() - new Date(a.data_despesa).getTime();
          }
          return a.nome.localeCompare(b.nome);
        });
        
        console.log('Despesas unificadas:', todasDespesas);
        setDespesas(todasDespesas);
      } catch (error) {
        console.error("Erro ao buscar despesas:", error);
      } finally {
        setCarregando(false);
      }
    };
    
    buscarDespesas();
  }, [filtros]);
  
  // Função para atualizar filtros
  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | {target: {name: string, value: string}}) => {
    const { name, value } = e.target;
    setFiltros({
      ...filtros,
      [name]: value
    });
  };

  // Função para gerar PDF
  const handleGerarPDF = () => {
    try {
      // Converter despesas para o formato do relatório
      const despesasRelatorio = despesas.map(despesa => ({
        id: despesa.id,
        nome: despesa.nome,
        valor: despesa.valor,
        filial_nome: despesa.filial_nome,
        categoria_nome: despesa.categoria_nome,
        tipo_despesa: despesa.tipo_despesa,
        status: despesa.status,
        data_despesa: despesa.data_despesa,
        data_pagamento: despesa.data_pagamento,
        forma_pagamento: despesa.forma_pagamento,
        periodicidade: despesa.periodicidade,
        dia_vencimento: despesa.dia_vencimento,
        observacao: despesa.observacao
      }));

      // Preparar nomes dos filtros para exibição
      const filialNome = filtros.filial ? filiais.find(f => f.id === parseInt(filtros.filial))?.nome : '';
      const categoriaNome = filtros.categoria ? categorias.find(c => c.id === parseInt(filtros.categoria))?.nome : '';

      const filtrosRelatorio = {
        dataInicial: filtros.dataInicial,
        dataFinal: filtros.dataFinal,
        tipoDespesa: filtros.tipoDespesa,
        filial: filialNome,
        categoria: categoriaNome,
        status: filtros.status
      };

      // Gerar PDF
      const relatorioService = new RelatoriosPDFService();
      const doc = relatorioService.gerarExtratoDespesas(despesasRelatorio, filtrosRelatorio);
      
      // Salvar PDF
      const nomeArquivo = `extrato-despesas-${filtros.dataInicial}-a-${filtros.dataFinal}.pdf`;
      relatorioService.salvar(nomeArquivo);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar relatório PDF. Tente novamente.');
    }
  };

  // Cálculos de totais
  const totalGeral = despesas.reduce((acc, despesa) => acc + despesa.valor, 0);
  const totalFixas = despesas.filter(d => d.tipo_despesa === 'fixa').reduce((acc, despesa) => acc + despesa.valor, 0);
  const totalDiversas = despesas.filter(d => d.tipo_despesa === 'diversa').reduce((acc, despesa) => acc + despesa.valor, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Extrato de Despesas
      </Typography>
      
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              name="dataInicial"
              label="Data Inicial"
              type="date"
              value={filtros.dataInicial}
              onChange={handleFiltroChange}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            
            <TextField
              name="dataFinal"
              label="Data Final"
              type="date"
              value={filtros.dataFinal}
              onChange={handleFiltroChange}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                name="tipoDespesa"
                value={filtros.tipoDespesa}
                onChange={(e) => handleFiltroChange({ target: { name: 'tipoDespesa', value: e.target.value } })}
                label="Tipo"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="fixa">Fixas</MenuItem>
                <MenuItem value="diversa">Diversas</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Filial</InputLabel>
              <Select
                name="filial"
                value={filtros.filial}
                onChange={(e) => handleFiltroChange({ target: { name: 'filial', value: e.target.value } })}
                label="Filial"
              >
                <MenuItem value="">Todas</MenuItem>
                {filiais.map(filial => (
                  <MenuItem key={filial.id} value={filial.id.toString()}>
                    {filial.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Categoria</InputLabel>
              <Select
                name="categoria"
                value={filtros.categoria}
                onChange={(e) => handleFiltroChange({ target: { name: 'categoria', value: e.target.value } })}
                label="Categoria"
              >
                <MenuItem value="">Todas</MenuItem>
                {categorias.map(categoria => (
                  <MenuItem key={categoria.id} value={categoria.id.toString()}>
                    {categoria.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={filtros.status}
                onChange={(e) => handleFiltroChange({ target: { name: 'status', value: e.target.value } })}
                label="Status"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
                <MenuItem value="pendente">Pendente</MenuItem>
                <MenuItem value="pago">Pago</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleGerarPDF}
              color="primary"
            >
              Gerar PDF
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resumo
          </Typography>
          
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total Geral
              </Typography>
              <Typography variant="h6" color="primary">
                R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="textSecondary">
                Despesas Fixas
              </Typography>
              <Typography variant="h6" color="info.main">
                R$ {totalFixas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="textSecondary">
                Despesas Diversas
              </Typography>
              <Typography variant="h6" color="warning.main">
                R$ {totalDiversas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total de Registros
              </Typography>
              <Typography variant="h6">
                {despesas.length}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Lista de Despesas */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Despesas ({despesas.length} registros)
          </Typography>
          
          {carregando ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {despesas.map((despesa, index) => (
                <React.Fragment key={`${despesa.tipo_despesa}-${despesa.id}`}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {despesa.nome}
                          </Typography>
                          <Chip 
                            label={despesa.tipo_despesa === 'fixa' ? 'Fixa' : 'Diversa'} 
                            size="small" 
                            color={despesa.tipo_despesa === 'fixa' ? 'info' : 'warning'}
                          />
                          <Chip 
                            label={despesa.status} 
                            size="small" 
                            color={
                              despesa.status === 'ativo' || despesa.status === 'pago' ? 'success' : 
                              despesa.status === 'pendente' ? 'warning' : 'default'
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            <strong>Filial:</strong> {despesa.filial_nome} | 
                            <strong> Categoria:</strong> {despesa.categoria_nome || 'Sem categoria'} | 
                            <strong> Valor:</strong> R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Typography>
                          
                          {despesa.tipo_despesa === 'fixa' && (
                            <Typography variant="body2" color="textSecondary">
                              <strong>Periodicidade:</strong> {despesa.periodicidade} | 
                              <strong> Dia Vencimento:</strong> {despesa.dia_vencimento}
                            </Typography>
                          )}
                          
                          {despesa.tipo_despesa === 'diversa' && (
                            <Typography variant="body2" color="textSecondary">
                              <strong>Data:</strong> {despesa.data_despesa ? formatDateToBrazilian(despesa.data_despesa) : 'Não informada'}
                              {despesa.data_pagamento && (
                                <> | <strong>Pago em:</strong> {formatDateToBrazilian(despesa.data_pagamento)}</>
                              )}
                              {despesa.forma_pagamento && (
                                <> | <strong>Forma:</strong> {despesa.forma_pagamento}</>
                              )}
                            </Typography>
                          )}
                          
                          {despesa.observacao && (
                            <Typography variant="body2" color="textSecondary">
                              <strong>Observação:</strong> {despesa.observacao}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < despesas.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              
              {despesas.length === 0 && !carregando && (
                <ListItem>
                  <ListItemText
                    primary="Nenhuma despesa encontrada"
                    secondary="Ajuste os filtros para visualizar as despesas"
                  />
                </ListItem>
              )}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExtratoDespesas;
