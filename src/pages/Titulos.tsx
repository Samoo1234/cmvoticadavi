import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { titulosService, type Titulo } from '../services/titulosService';
import { filiaisService } from '../services/filiaisService';
import { fornecedoresService } from '../services/fornecedoresService';

// Interface local para o formulário
interface FormTitulo {
  id?: number;
  filial: string;
  fornecedor: string;
  vencimento: string;
  valor: string;
  observacoes: string;
}

// Interface para os itens de múltiplos títulos
interface TituloItem {
  vencimento: string;
  valor: string;
}

// Tipo que combina os campos do formulário com os do banco de dados
interface TituloCompleto extends Omit<Titulo, 'valor' | 'fornecedor_id' | 'filial_id' | 'data_vencimento' | 'observacao'> {
  filial: string;
  fornecedor: string;
  vencimento: string;
  valor: string; // string no formulário, number no banco
  observacoes: string;
  // Campos opcionais para compatibilidade
  fornecedor_id?: number;
  filial_id?: number;
  data_vencimento?: string;
  observacao?: string;
}

const Titulos: React.FC = () => {
  const [titulos, setTitulos] = useState<TituloCompleto[]>([]);
  const [filiais, setFiliais] = useState<{id: number, nome: string}[]>([]);
  const [fornecedores, setFornecedores] = useState<{id: number, nome: string}[]>([]);
  const [form, setForm] = useState<Partial<FormTitulo>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'}>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });
  // Estados para controle de múltiplos títulos
  const [multiplosTitulos, setMultiplosTitulos] = useState(false);
  const [quantidadeTitulos, setQuantidadeTitulos] = useState(1);
  const [itensTitulos, setItensTitulos] = useState<TituloItem[]>([{vencimento: '', valor: ''}]);

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      try {
        // Carregar títulos
        const [dadosTitulos, dadosFiliais, dadosFornecedores] = await Promise.all([
          titulosService.getAll(),
          filiaisService.getAll(),
          fornecedoresService.getAll()
        ]);

        // Mapear filiais para o formato {id, nome}
        const filiaisFormatadas = dadosFiliais.map(f => ({
          id: f.id,
          nome: f.nome
        }));
        setFiliais(filiaisFormatadas);

        // Mapear fornecedores para o formato {id, nome}
        const fornecedoresFormatados = dadosFornecedores.map(f => ({
          id: f.id,
          nome: f.nome
        }));
        setFornecedores(fornecedoresFormatados);

        // Converter os dados dos títulos para o formato do formulário
        const titulosFormatados: TituloCompleto[] = await Promise.all(
          dadosTitulos.map(async (titulo) => {
            // Buscar nome da filial
            const filial = filiaisFormatadas.find(f => f.id === titulo.filial_id);
            // Buscar nome do fornecedor
            const fornecedor = fornecedoresFormatados.find(f => f.id === titulo.fornecedor_id);
            
            return {
              ...titulo,
              filial: filial?.nome || 'Filial não encontrada',
              fornecedor: fornecedor?.nome || 'Fornecedor não encontrado',
              vencimento: titulo.data_vencimento,
              valor: titulo.valor.toString(),
              observacoes: titulo.observacao || ''
            };
          })
        );
        
        setTitulos(titulosFormatados);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setAlert({
          open: true,
          message: 'Erro ao carregar dados. Tente novamente.',
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    carregarDados();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Atualiza a quantidade de títulos
  const handleQuantidadeTitulosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantidade = parseInt(e.target.value) || 1;
    setQuantidadeTitulos(quantidade);
    
    // Atualiza o array de itens de títulos
    const novoArray = Array(quantidade).fill(null).map((_, index) => {
      return itensTitulos[index] || { vencimento: '', valor: '' };
    });
    
    setItensTitulos(novoArray);
  };

  // Atualiza os valores dos itens de títulos
  const handleItemTituloChange = (index: number, campo: keyof TituloItem, valor: string) => {
    const novoItens = [...itensTitulos];
    novoItens[index] = { ...novoItens[index], [campo]: valor };
    setItensTitulos(novoItens);
  };

  const handleAddOrEdit = async () => {
    // Validações específicas para múltiplos títulos
    if (multiplosTitulos) {
      const camposVazios = itensTitulos.some(item => !item.vencimento || !item.valor);
      if (camposVazios) {
        setAlert({
          open: true,
          message: 'Por favor, preencha todos os campos de data e valor para cada título.',
          severity: 'warning'
        });
        return;
      }
    }
    if (!form.filial || !form.fornecedor || !form.vencimento || !form.valor || isNaN(parseFloat(form.valor))) {
      setAlert({
        open: true,
        message: 'Preencha todos os campos obrigatórios.',
        severity: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Encontrar o ID do fornecedor pelo nome
      const fornecedorSelecionado = fornecedores.find(f => f.nome === form.fornecedor);
      if (!fornecedorSelecionado) {
        setAlert({
          open: true,
          message: 'Fornecedor não encontrado. Por favor, selecione um fornecedor válido.',
          severity: 'error'
        });
        setIsLoading(false);
        return;
      }
      
      // Encontrar o ID da filial pelo nome
      const filialSelecionada = filiais.find(f => f.nome === form.filial);
      if (!filialSelecionada) {
        setAlert({
          open: true,
          message: 'Filial não encontrada. Por favor, selecione uma filial válida.',
          severity: 'error'
        });
        setIsLoading(false);
        return;
      }
      
      const tituloData = {
        // Mapear campos do formulário para o modelo do banco de dados
        numero: `TIT-${Date.now()}`,
        fornecedor_id: fornecedorSelecionado.id,
        filial_id: filialSelecionada.id,
        valor: parseFloat(form.valor),
        data_emissao: new Date().toISOString(),
        data_vencimento: form.vencimento || '',
        status: 'pendente' as const,
        observacao: form.observacoes || undefined
      };

      // Não permite edição em modo de múltiplos títulos
      if (editId) {
        // Atualizar título existente
        const updatedTitulo = await titulosService.update(editId, tituloData);
        if (updatedTitulo) {
          // Atualizar a lista de títulos com os dados atualizados
          setTitulos(titulos.map(t => {
            if (t.id === editId) {
              return {
                ...t,
                ...form,
                valor: form.valor || t.valor,
                vencimento: form.vencimento || t.vencimento,
                observacoes: form.observacoes || t.observacoes
              };
            }
            return t;
          }));
          setAlert({
            open: true,
            message: 'Título atualizado com sucesso!',
            severity: 'success'
          });
        }
      } else if (multiplosTitulos) {
        // Cadastrar múltiplos títulos
        const fornecedorObj = fornecedores.find(f => f.nome === form.fornecedor);
        const filialObj = filiais.find(f => f.nome === form.filial);

        if (!fornecedorObj || !filialObj) {
          setAlert({
            open: true,
            message: 'Fornecedor ou filial não encontrado.',
            severity: 'error'
          });
          return;
        }

        try {
          // Preparar array de promessas para criar todos os títulos
          const promessasTitulos = itensTitulos.map((item, index) => {
            // Gerar número do título baseado no fornecedor e data
            const numeroTitulo = `${fornecedorObj.nome.substring(0, 3).toUpperCase()}-${new Date().getTime()}-${index + 1}`;
            
            const tituloData: Omit<Titulo, 'id'> = {
              fornecedor_id: fornecedorObj.id,
              filial_id: filialObj.id,
              numero: numeroTitulo,
              data_emissao: new Date().toISOString().split('T')[0],
              data_vencimento: item.vencimento,
              valor: parseFloat(item.valor),
              status: 'pendente',
              observacao: form.observacoes || ''
            };
            return titulosService.create(tituloData);
          });

          // Executar todas as promessas
          const titulosCriados = await Promise.all(promessasTitulos);
          
          // Formatar os títulos criados para adicionar à lista
          const novosTitulos = titulosCriados.map(titulo => ({
            ...titulo,
            filial: form.filial || '',
            fornecedor: form.fornecedor || '',
            vencimento: titulo.data_vencimento || '',
            valor: titulo.valor.toString(),
            observacoes: titulo.observacao || ''
          }));

          setTitulos([...titulos, ...novosTitulos]);
          setAlert({
            open: true,
            message: `${titulosCriados.length} títulos adicionados com sucesso!`,
            severity: 'success'
          });

          // Limpar formulário
          setForm({});
          setMultiplosTitulos(false);
          setQuantidadeTitulos(1);
          setItensTitulos([{vencimento: '', valor: ''}]);
        } catch (error) {
          console.error('Erro ao cadastrar múltiplos títulos:', error);
          setAlert({
            open: true,
            message: 'Erro ao cadastrar títulos. Por favor, tente novamente.',
            severity: 'error'
          });
        }
      } else {
        // Criar novo título
        const novoTitulo = await titulosService.create(tituloData);
        if (novoTitulo) {
          // Adicionar o novo título à lista
          const novoTituloCompleto: TituloCompleto = {
            ...novoTitulo,
            filial: form.filial,
            fornecedor: form.fornecedor,
            vencimento: form.vencimento || '',
            valor: form.valor || '0',
            observacoes: form.observacoes || ''
          };
          setTitulos([...titulos, novoTituloCompleto]);
          setAlert({
            open: true,
            message: 'Título adicionado com sucesso!',
            severity: 'success'
          });
        }
      }
      
      // Limpar formulário
      setForm({});
      setEditId(null);
    } catch (error) {
      console.error('Erro ao salvar título:', error);
      setAlert({
        open: true,
        message: 'Erro ao salvar título. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    const titulo = titulos.find(t => t.id === id);
    if (titulo) {
      // Criar um objeto apenas com os campos do formulário
      const formData: FormTitulo = {
        id: titulo.id,
        filial: titulo.filial,
        fornecedor: titulo.fornecedor,
        vencimento: titulo.vencimento,
        valor: titulo.valor,
        observacoes: titulo.observacoes
      };
      setForm(formData);
      setEditId(id);
      // Rolar para o topo do formulário
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este título?')) {
      return;
    }

    setIsLoading(true);
    try {
      const sucesso = await titulosService.delete(id);
      if (sucesso) {
        setTitulos(titulos.filter(t => t.id !== id));
        if (editId === id) {
          setForm({});
          setEditId(null);
        }
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
      <Typography variant="h4" gutterBottom color="primary">
        Cadastro de Títulos
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {editId ? 'Editar Título' : 'Novo Título'}
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {/* Opção para múltiplos títulos */}
                <Box display="flex" alignItems="center" gap={2} sx={{ mt: 1 }}>
                  <Button
                    variant={multiplosTitulos ? "contained" : "outlined"}
                    color="primary"
                    onClick={() => {
                      setMultiplosTitulos(!multiplosTitulos);
                      if (!multiplosTitulos) {
                        setItensTitulos([{vencimento: '', valor: ''}]);
                        setQuantidadeTitulos(1);
                      }
                    }}
                    disabled={!!editId}
                    sx={{ mb: 1 }}
                  >
                    {multiplosTitulos ? 'Múltiplos Títulos Ativado' : 'Cadastrar Múltiplos Títulos'}
                  </Button>
                </Box>
                <TextField
                  select
                  fullWidth
                  label="Filial"
                  name="filial"
                  value={form.filial || ''}
                  onChange={handleChange}
                  margin="normal"
                  required
                  disabled={isLoading || filiais.length === 0}
                >
                  {filiais.length === 0 ? (
                    <MenuItem disabled>Carregando filiais...</MenuItem>
                  ) : (
                    filiais.map((filial) => (
                      <MenuItem key={filial.id} value={filial.nome}>
                        {filial.nome}
                      </MenuItem>
                    ))
                  )}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label="Fornecedor"
                  name="fornecedor"
                  value={form.fornecedor || ''}
                  onChange={handleChange}
                  margin="normal"
                  required
                  disabled={isLoading || fornecedores.length === 0}
                >
                  {fornecedores.length === 0 ? (
                    <MenuItem disabled>Carregando fornecedores...</MenuItem>
                  ) : (
                    fornecedores.map((fornecedor) => (
                      <MenuItem key={fornecedor.id} value={fornecedor.nome}>
                        {fornecedor.nome}
                      </MenuItem>
                    ))
                  )}
                </TextField>
                {/* Campos normais ou campos para múltiplos títulos */}
                {!multiplosTitulos ? (
                  <>
                    <TextField
                      label="Data de Vencimento"
                      name="vencimento"
                      type="date"
                      value={form.vencimento || ''}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Valor"
                      name="valor"
                      value={form.valor || ''}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      label="Quantidade de Títulos"
                      name="quantidadeTitulos"
                      type="number"
                      value={quantidadeTitulos}
                      onChange={handleQuantidadeTitulosChange}
                      InputProps={{ inputProps: { min: 1, max: 12 } }}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                      Detalhes dos Títulos
                    </Typography>
                    <Box sx={{ ml: 2 }}>
                      {itensTitulos.map((item, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ minWidth: 70 }}>
                            Título {index + 1}:
                          </Typography>
                          <TextField
                            label="Data de Vencimento"
                            type="date"
                            value={item.vencimento}
                            onChange={(e) => handleItemTituloChange(index, 'vencimento', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: 1 }}
                            required
                          />
                          <TextField
                            label="Valor"
                            value={item.valor}
                            onChange={(e) => handleItemTituloChange(index, 'valor', e.target.value)}
                            sx={{ flex: 1 }}
                            required
                          />
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
                <TextField
                  label="Observações"
                  name="observacoes"
                  value={form.observacoes || ''}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={2}
                />
                <Button variant="contained" color="primary" onClick={handleAddOrEdit}>
                  {editId ? 'Salvar' : 'Adicionar'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Títulos Cadastrados
              </Typography>
              <List>
                {titulos.map(titulo => (
                  <ListItem key={titulo.id} divider>
                    <ListItemText
                      primary={`${titulo.filial} - ${titulo.fornecedor}`}
                      secondary={`Vencimento: ${titulo.vencimento} | Valor: ${titulo.valor} | Obs: ${titulo.observacoes}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(titulo.id)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(titulo.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Titulos; 