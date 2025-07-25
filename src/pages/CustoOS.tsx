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
import { custoOSService } from '../services';
import { filiaisService } from '../services';
import { medicosService } from '../services';
import { formatDateToBrazilian } from '../utils/dateUtils';
// Importando a interface CustoOS diretamente do arquivo de serviço
interface CustoOS {
  id: number;
  filial_id: number;
  data: string;
  valor_venda: number;
  custo_lentes: number;
  custo_armacoes: number;
  custo_mkt: number;
  outros_custos: number;
  medico_id?: number;
  numero_tco?: string;
  created_at?: string;
  updated_at?: string;
}

interface FormCustoOS {
  id?: number;
  filial: string;
  filial_id: number;
  data: string;
  valorVenda: string;
  custoLentes: string;
  custoArmacoes: string;
  custoMkt: string;
  outrosCustos: string;
  medico: string;
  medico_id?: number;
  numeroTco: string;
}

const CustoOS: React.FC = () => {
  const [osList, setOsList] = useState<CustoOS[]>([]);
  const [form, setForm] = useState<Partial<FormCustoOS>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [filiais, setFiliais] = useState<{id: number, nome: string}[]>([]);
  const [medicos, setMedicos] = useState<{id: number, nome: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'}>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      try {
        const [dadosFiliais, dadosMedicos, dadosCustosOS] = await Promise.all([
          filiaisService.getAll(),
          medicosService.getAll(),
          custoOSService.getAll()
        ]);

        const filiaisFormatadas = dadosFiliais.map((f: any) => ({
          id: f.id!,
          nome: f.nome
        }));
        setFiliais(filiaisFormatadas);

        const medicosFormatados = dadosMedicos.map((m: any) => ({
          id: m.id!,
          nome: m.nome
        }));
        setMedicos(medicosFormatados);

        setOsList(dadosCustosOS);
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

  const arredondarDuasCasas = (valor: string | number) => {
    const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
    if (isNaN(num)) return '';
    return (Math.round(num * 100) / 100).toFixed(2);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const camposMonetarios = ['valorVenda', 'custoLentes', 'custoArmacoes', 'custoMkt', 'outrosCustos'];
    if (camposMonetarios.includes(e.target.name)) {
      let valor = e.target.value.replace(',', '.');
      if (/^\d*(\.\d{0,2})?$/.test(valor)) setForm({ ...form, [e.target.name]: valor });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleAddOrEdit = async () => {
    if (!form.filial_id) {
      setAlert({
        open: true,
        message: 'Selecione uma filial!',
        severity: 'warning'
      });
      return;
    }
    console.log('Formulário enviado:', form); // Debug: conferir filial_id
    if (!form.filial || !form.data || !form.valorVenda) {
      setAlert({
        open: true,
        message: 'Preencha todos os campos obrigatórios.',
        severity: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      const custoOSData = {
        filial_id: form.filial_id!,
        data: form.data,
        valor_venda: parseFloat(arredondarDuasCasas(form.valorVenda || '0')),
        custo_lentes: parseFloat(arredondarDuasCasas(form.custoLentes || '0')),
        custo_armacoes: parseFloat(arredondarDuasCasas(form.custoArmacoes || '0')),
        custo_mkt: parseFloat(arredondarDuasCasas(form.custoMkt || '0')),
        outros_custos: parseFloat(arredondarDuasCasas(form.outrosCustos || '0')),
        medico_id: form.medico_id || undefined,
        numero_tco: form.numeroTco || undefined
      };

      let resultado: CustoOS | null;
      if (editId) {
        resultado = await custoOSService.update(editId, custoOSData);
        if (resultado) {
          setOsList(osList.map(os => os?.id === editId ? resultado : os).filter((os): os is CustoOS => os !== null));
          setAlert({
            open: true,
            message: 'Custo de OS atualizado com sucesso!',
            severity: 'success'
          });
        }
      } else {
        resultado = await custoOSService.create(custoOSData);
        if (resultado) {
          // Garantir que resultado não seja null antes de adicionar à lista
          setOsList([...osList.filter((os): os is CustoOS => os !== null), resultado]);
          setAlert({
            open: true,
            message: 'Custo de OS adicionado com sucesso!',
            severity: 'success'
          });
        }
      }

      setForm({});
      setEditId(null);
    } catch (error) {
      console.error('Erro ao salvar custo de OS:', error);
      setAlert({
        open: true,
        message: 'Erro ao salvar custo de OS. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    const os = osList.find(o => o.id === id);
    if (os) {
      const filial = filiais.find(f => f.id === os.filial_id);
      const medico = medicos.find(m => m.id === os.medico_id);
      
      const formData: FormCustoOS = {
        id: os.id,
        filial: filial?.nome || '',
        filial_id: os.filial_id,
        data: os.data,
        valorVenda: os.valor_venda.toString(),
        custoLentes: os.custo_lentes.toString(),
        custoArmacoes: os.custo_armacoes.toString(),
        custoMkt: os.custo_mkt.toString(),
        outrosCustos: os.outros_custos.toString(),
        medico: medico?.nome || '',
        medico_id: os.medico_id,
        numeroTco: os.numero_tco || ''
      };
      
      setForm(formData);
      setEditId(id);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) {
      return;
    }

    setIsLoading(true);
    try {
      const sucesso = await custoOSService.delete(id);
      if (sucesso) {
        setOsList(osList.filter(o => o.id !== id));
        
        if (editId === id) {
          setForm({});
          setEditId(null);
        }
        
        setAlert({
          open: true,
          message: 'Custo de OS excluído com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao excluir custo de OS:', error);
      setAlert({
        open: true,
        message: 'Erro ao excluir custo de OS. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarData = (data: string) => {
    return formatDateToBrazilian(data);
  };

  const getNomeFilial = (filialId: number) => {
    const filial = filiais.find(f => f.id === filialId);
    return filial ? filial.nome : 'Filial não encontrada';
  };

  const getNomeMedico = (medicoId?: number) => {
    if (!medicoId) return 'Não informado';
    const medico = medicos.find(m => m.id === medicoId);
    return medico ? medico.nome : 'Médico não encontrado';
  };

  return (
    <Box sx={{ position: 'relative' }}>
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
        Custo de OS
      </Typography>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        <div style={{ gridColumn: 'span 6' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {editId ? 'Editar OS' : 'Nova OS'}
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  select
                  label="Filial"
                  name="filial_id"
                  value={form.filial_id || ''}
                  onChange={e => setForm({
                    ...form,
                    filial_id: Number(e.target.value),
                    filial: filiais.find(f => f.id === Number(e.target.value))?.nome || ''
                  })}
                  fullWidth
                  disabled={isLoading || filiais.length === 0}
                >
                  {filiais.length === 0 ? (
                    <MenuItem disabled>Carregando filiais...</MenuItem>
                  ) : (
                    filiais.map(filial => (
                      <MenuItem key={filial.id} value={filial.id}>
                        {filial.nome}
                      </MenuItem>
                    ))
                  )}
                </TextField>
                <TextField
                  label="Data da OS"
                  name="data"
                  type="date"
                  value={form.data || ''}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  helperText="Formato: AAAA-MM-DD"
                />
                <TextField
                  label="Valor de Venda"
                  name="valorVenda"
                  value={form.valorVenda || ''}
                  onChange={handleChange}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                  label="Custo das Lentes"
                  name="custoLentes"
                  value={form.custoLentes || ''}
                  onChange={handleChange}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                  label="Custo da Armação"
                  name="custoArmacoes"
                  value={form.custoArmacoes || ''}
                  onChange={handleChange}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                  label="Custo do MKT"
                  name="custoMkt"
                  value={form.custoMkt || ''}
                  onChange={handleChange}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                  label="Outros Custos"
                  name="outrosCustos"
                  value={form.outrosCustos || ''}
                  onChange={handleChange}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                  select
                  label="Médico"
                  name="medico_id"
                  value={form.medico_id || ''}
                  onChange={e => setForm({
                    ...form,
                    medico_id: Number(e.target.value),
                    medico: medicos.find(m => m.id === Number(e.target.value))?.nome || ''
                  })}
                  fullWidth
                  disabled={isLoading || medicos.length === 0}
                >
                  <MenuItem value="">
                    <em>Selecione um médico</em>
                  </MenuItem>
                  {medicos.length === 0 ? (
                    <MenuItem disabled>Carregando médicos...</MenuItem>
                  ) : (
                    medicos.map(medico => (
                      <MenuItem key={medico.id} value={medico.id}>
                        {medico.nome}
                      </MenuItem>
                    ))
                  )}
                </TextField>
                <TextField
                  label="Nº TCO"
                  name="numeroTco"
                  value={form.numeroTco || ''}
                  onChange={handleChange}
                  fullWidth
                  placeholder="Digite o número do TCO"
                />
                <Button variant="contained" color="primary" onClick={handleAddOrEdit} disabled={isLoading}>
                  {editId ? 'Salvar' : 'Adicionar'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </div>
        <div style={{ gridColumn: 'span 6' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                OS Cadastradas
              </Typography>
              <List>
                {osList.length === 0 && (
                  <Typography color="textSecondary">Nenhum registro encontrado.</Typography>
                )}
                {osList.map(os => (
                  <ListItem key={os.id} divider>
                    <ListItemText
                      primary={`${getNomeFilial(os.filial_id)} - ${formatarData(os.data)}`}
                      secondary={
                        <>
                          <span>{`Venda: ${formatarMoeda(os.valor_venda)} | Lentes: ${formatarMoeda(os.custo_lentes)} | Armação: ${formatarMoeda(os.custo_armacoes)} | MKT: ${formatarMoeda(os.custo_mkt)} | Outros: ${formatarMoeda(os.outros_custos)}`}</span>
                          <span style={{ display: 'block', marginTop: 4, fontSize: '0.875rem', color: '#666' }}>
                            {`Médico: ${getNomeMedico(os.medico_id)}${os.numero_tco ? ` | TCO: ${os.numero_tco}` : ''}`}
                          </span>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(os.id)} disabled={isLoading}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(os.id)} disabled={isLoading}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </div>
      </div>
    </Box>
  );
}

export default CustoOS;