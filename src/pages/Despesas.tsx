import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid,
  Paper,
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  InputAdornment,
  Alert,
  Snackbar
} from '@mui/material';
import { categoriasDespesasService, despesasService, type CategoriaDespesa, type Despesa } from '../services/despesasService';
import { filiaisService } from '../services/filiaisService';

const Despesas: React.FC = () => {
  // Estado para indicar carregamento
  const [loading, setLoading] = useState(false);
  
  // Estado para mensagem de sucesso/erro
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  
  // Estado para armazenar as listas
  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([]);
  const [filiais, setFiliais] = useState<{id: number, nome: string}[]>([]);
  
  // Estado para a nova despesa sendo cadastrada
  const [novaDespesa, setNovaDespesa] = useState<{
    nome: string;
    valor: string;
    categoria_id: number | null;
    filial_id: number | null;
    tipo_despesa: 'fixa' | 'variavel';
    data_despesa: string;
    data_pagamento: string;
    forma_pagamento: string;
    periodicidade?: 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
    dia_vencimento?: number;
    data_vencimento?: string; // Campo auxiliar para interface do usuário
    status: 'pendente' | 'pago' | 'ativo' | 'inativo';
    observacao: string;
  }>({
    nome: '',
    valor: '',
    categoria_id: null,
    filial_id: null,
    tipo_despesa: 'fixa',
    data_despesa: new Date().toISOString().slice(0, 10),
    data_pagamento: '',
    data_vencimento: new Date().toISOString().slice(0, 10),
    forma_pagamento: '',
    status: 'ativo',
    observacao: ''
  });

  // Função para limpar o formulário
  const handleLimparForm = () => {
    setNovaDespesa({
      nome: '',
      valor: '',
      categoria_id: null,
      filial_id: null,
      tipo_despesa: 'variavel',
      data_despesa: new Date().toISOString().slice(0, 10),
      data_pagamento: '',
      data_vencimento: new Date().toISOString().slice(0, 10),
      forma_pagamento: '',
      status: 'pendente',
      observacao: ''
    });
  };
  
  // Função para manipular os campos do formulário
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.SyntheticEvent<Element, Event>) => {
    if ('name' in e.target && 'value' in e.target) {
      const { name, value } = e.target as { name: string; value: string };
      setNovaDespesa(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Função para manipular campos do tipo select
  const handleSelectChange = (name: string, value: unknown) => {
    setNovaDespesa(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Se mudar o tipo para fixa, definir status como 'ativo' por padrão
    if (name === 'tipo_despesa' && value === 'fixa') {
      setNovaDespesa(prev => ({
        ...prev,
        status: 'ativo'
      }));
    }
    
    // Se mudar o tipo para variável, definir status como 'pendente' por padrão
    if (name === 'tipo_despesa' && value === 'variavel') {
      setNovaDespesa(prev => ({
        ...prev,
        status: 'pendente',
        periodicidade: undefined,
        dia_vencimento: undefined
      }));
    }
  };
  
  // Função para salvar uma nova despesa
  const handleSaveDespesa = async () => {
    try {
      setLoading(true);
      
      // Se o nome não estiver preenchido, gerar um nome automático baseado na categoria
      if (!novaDespesa.nome) {
        const categoria = categorias.find(c => c.id === novaDespesa.categoria_id);
        const categoriaNome = categoria ? categoria.nome : 'Despesa';
        const data = new Date();
        const nomeAutomatico = `${categoriaNome} - ${data.getDate()}/${data.getMonth()+1}/${data.getFullYear()}`;
        setNovaDespesa(prev => ({ ...prev, nome: nomeAutomatico }));
      }
      
      // Validar outros campos obrigatórios
      if (!novaDespesa.valor || !novaDespesa.filial_id || !novaDespesa.categoria_id) {
        setSnackbar({ open: true, message: 'Preencha todos os campos obrigatórios', severity: 'error' });
        setLoading(false);
        return;
      }
    
    // Validar campos específicos por tipo
    if (novaDespesa.tipo_despesa === 'fixa' && !novaDespesa.dia_vencimento) {
      setSnackbar({
        open: true,
        message: 'Para despesas fixas, informe a Data de Vencimento.',
        severity: 'error'
      });
      setLoading(false);
      return;
    }
      
      // Preparar objeto base com os campos comuns e obrigatórios
      // Campos como id, created_at, updated_at são gerenciados pelo Supabase
      const despesaBase = {
        nome: novaDespesa.nome,
        valor: parseFloat(novaDespesa.valor),
        filial_id: novaDespesa.filial_id as number,
        categoria_id: novaDespesa.categoria_id || null, // Campo pode ser nulo
        tipo_despesa: novaDespesa.tipo_despesa, // 'fixa' ou 'variavel'
        status: novaDespesa.status, // 'pendente', 'pago', 'ativo' ou 'inativo'
        observacao: novaDespesa.observacao || null,
        comprovante_url: null // Não implementamos upload de comprovante ainda
      };
      
      // Registrar os valores sendo usados para debug
      console.log('Dia do vencimento:', novaDespesa.dia_vencimento);
      console.log('Data de vencimento:', novaDespesa.data_vencimento);
      
      // Adicionar campos específicos conforme o tipo da despesa
      let despesaParaSalvar;
      
      if (novaDespesa.tipo_despesa === 'fixa') {
        // Despesa fixa: adicionar periodicidade, dia do vencimento e data completa de vencimento
        despesaParaSalvar = {
          ...despesaBase,
          periodicidade: 'mensal', // Definido como padrão 'mensal' já que removemos o campo
          dia_vencimento: novaDespesa.dia_vencimento as number,
          data_vencimento: novaDespesa.data_vencimento, // Salvar a data completa de vencimento
        };
      } else {
        // Despesa variável: adicionar data da despesa, data de pagamento e forma de pagamento
        despesaParaSalvar = {
          ...despesaBase,
          data_despesa: novaDespesa.data_despesa,
          data_pagamento: novaDespesa.status === 'pago' ? novaDespesa.data_pagamento : null,
          forma_pagamento: novaDespesa.status === 'pago' ? novaDespesa.forma_pagamento : null,
        };
      }
      
      console.log('Despesa a ser salva:', despesaParaSalvar);
      
      // Salvar a despesa no banco de dados
      const resultado = await despesasService.create(despesaParaSalvar);
      
      setSnackbar({
        open: true,
        message: 'Despesa cadastrada com sucesso!',
        severity: 'success'
      });
      
      // Limpar o formulário
      handleLimparForm();
      
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao cadastrar despesa. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Função para carregar dados
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [categoriasData, filiaisData] = await Promise.all([
        categoriasDespesasService.getAll(),
        filiaisService.getAll()
      ]);
      
      setCategorias(categoriasData);
      setFiliais(filiaisData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar dados. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Efeito para carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  // Função para fechar o snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ maxWidth: '100%', margin: '0 auto', p: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Cadastro de Despesas
      </Typography>
      
      {/* Snackbar para mensagens */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
      
      <Paper elevation={2} sx={{ p: 4, mt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Tipo de Despesa */}
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel id="tipo-despesa-label">Tipo de Despesa</InputLabel>
              <Select
                labelId="tipo-despesa-label"
                value={novaDespesa.tipo_despesa}
                label="Tipo de Despesa"
                onChange={(e) => handleSelectChange('tipo_despesa', e.target.value)}
              >
                <MenuItem value="fixa">Fixa</MenuItem>
                <MenuItem value="variavel">Variável</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          {/* Valor */}
          <Box>
            <TextField
              label="Valor"
              name="valor"
              type="number"
              value={novaDespesa.valor}
              onChange={handleFormChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                inputProps: { step: '0.01', min: '0' }
              }}
              fullWidth
              required
              size="small"
            />
          </Box>
          
          {/* Categoria */}
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel id="categoria-label">Categoria</InputLabel>
              <Select
                labelId="categoria-label"
                value={novaDespesa.categoria_id || ''}
                label="Categoria"
                onChange={(e) => handleSelectChange('categoria_id', e.target.value ? Number(e.target.value) : null)}
                required
              >
                <MenuItem value="">Selecione...</MenuItem>
                {categorias.filter(c => c.tipo === novaDespesa.tipo_despesa || c.tipo === 'ambos').map(categoria => (
                  <MenuItem key={categoria.id} value={categoria.id}>{categoria.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {/* Filial */}
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel id="filial-label">Filial</InputLabel>
              <Select
                labelId="filial-label"
                value={novaDespesa.filial_id || ''}
                label="Filial"
                onChange={(e) => handleSelectChange('filial_id', e.target.value ? Number(e.target.value) : null)}
                required
              >
                <MenuItem value="">Selecione...</MenuItem>
                {filiais.map(filial => (
                  <MenuItem key={filial.id} value={filial.id}>{filial.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {/* Campos específicos para despesas fixas */}
          {novaDespesa.tipo_despesa === 'fixa' && (
            <>
              <Box>
                <TextField
                  label="Data de Vencimento"
                  name="data_vencimento"
                  type="date"
                  value={novaDespesa.data_vencimento}
                  onChange={(e) => {
                    // Atualiza o campo data_vencimento com o valor do input
                    const novaData = e.target.value;
                    
                    // Extrai o dia da data selecionada e atualiza ambos os campos
                    const dataVencimento = new Date(novaData);
                    const diaDoMes = dataVencimento.getDate();
                    
                    setNovaDespesa(prev => ({
                      ...prev,
                      data_vencimento: novaData,
                      dia_vencimento: diaDoMes
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                  size="small"
                  helperText="Será considerado apenas o dia do mês para o vencimento"
                />
              </Box>
              
              {/* Linha removida conforme solicitado */}
            </>
          )}
          
          {/* Campos específicos para despesas variáveis */}
          {novaDespesa.tipo_despesa === 'variavel' && (
            <>
              <Box>
                <TextField
                  label="Data da Despesa"
                  name="data_despesa"
                  type="date"
                  value={novaDespesa.data_despesa}
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                  size="small"
                />
              </Box>
              
              <Box>
                <FormControl fullWidth size="small">
                  <InputLabel id="forma-pagamento-label">Forma de Pagamento</InputLabel>
                  <Select
                    labelId="forma-pagamento-label"
                    name="forma_pagamento"
                    value={novaDespesa.forma_pagamento || ''}
                    label="Forma de Pagamento"
                    onChange={(e) => handleSelectChange('forma_pagamento', e.target.value)}
                  >
                    <MenuItem value="">Selecione...</MenuItem>
                    <MenuItem value="dinheiro">Dinheiro</MenuItem>
                    <MenuItem value="pix">PIX</MenuItem>
                    <MenuItem value="cartao_credito">Cartão de Crédito</MenuItem>
                    <MenuItem value="cartao_debito">Cartão de Débito</MenuItem>
                    <MenuItem value="boleto">Boleto</MenuItem>
                    <MenuItem value="transferencia">Transferência</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </>
          )}
          
          {/* Observações */}
          <Box>
            <TextField
              label="Observações"
              name="observacao"
              value={novaDespesa.observacao}
              onChange={handleFormChange}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Box>
        </Box>
        
        {/* Botões */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            variant="outlined"
            onClick={handleLimparForm}
            size="medium"
          >
            Limpar
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveDespesa}
            disabled={loading}
            size="medium"
          >
            {loading ? 'Salvando...' : 'Cadastrar Despesa'}
          </Button>
        </Box>
      </Paper>
      
      <Box mt={2} textAlign="center">
        <Typography variant="body2" color="textSecondary">
          Utilize o Extrato de Despesas para consultar os registros cadastrados.
        </Typography>
      </Box>
    </Box>
  );
};

export default Despesas;
