import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, List, ListItem, ListItemText, MenuItem, Divider, CircularProgress, FormControl, InputLabel, Select, Snackbar, Alert } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { filiaisService } from '../services/filiaisService';
import type { Filial } from '../services/filiaisService';
import { custoOSService } from '../services/custoOSService';
import type { CustoOS } from '../services/custoOSService';
import { medicosService } from '../services/medicosService';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { relatoriosPDFService } from '../services/relatoriosPDFService';


// Componente principal
const RelatorioOS: React.FC = () => {
  // Estados básicos
  const [filiais, setFiliais] = useState<{ id: number; nome: string }[]>([]);
  const [medicos, setMedicos] = useState<{ id: number; nome: string }[]>([]);
  const [carregandoFiliais, setCarregandoFiliais] = useState<boolean>(true);
  const [carregandoOS, setCarregandoOS] = useState<boolean>(true);
  const [osList, setOsList] = useState<CustoOS[]>([]);
  const [filtros, setFiltros] = useState<{ filial: string; dataInicial: string; dataFinal: string }>({ filial: '', dataInicial: '', dataFinal: '' });
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregandoFiliais(true);
        setCarregandoOS(true);
        const [dadosFiliais, dadosMedicos, dadosCustos] = await Promise.all([
          filiaisService.getAll(),
          medicosService.getAll(),
          custoOSService.getAll()
        ]);

        setFiliais((dadosFiliais || []).map((f: any) => ({ id: f.id, nome: f.nome })));
        setMedicos((dadosMedicos || []).map((m: any) => ({ id: m.id, nome: m.nome })));
        setOsList(dadosCustos || []);
      } catch (error) {
        console.error('Erro ao carregar dados para Relatório de OS:', error);
        setAlert({ open: true, message: 'Erro ao carregar dados. Tente novamente.', severity: 'error' });
      } finally {
        setCarregandoFiliais(false);
        setCarregandoOS(false);
      }
    };

    carregarDados();
  }, []);

  // Utilitários
  const getNomeFilial = (filialId: number) => {
    const filial = filiais.find(f => f.id === filialId);
    return filial ? filial.nome : 'Filial não encontrada';
  };

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  // Aplicar filtros e adaptar dados para a UI
  const osFiltradas: OS[] = (osList || [])
    .filter(os => !filtros.filial || getNomeFilial(os.filial_id) === filtros.filial)
    .filter(os => !filtros.dataInicial || os.data >= filtros.dataInicial)
    .filter(os => !filtros.dataFinal || os.data <= filtros.dataFinal)
    .map(os => ({
      id: os.id,
      filial: getNomeFilial(os.filial_id),
      filial_id: os.filial_id,
      data: os.data,
      valorVenda: os.valor_venda || 0,
      custoLentes: os.custo_lentes || 0,
      custoArmacoes: os.custo_armacoes || 0,
      custoMkt: os.custo_mkt || 0,
      outrosCustos: os.outros_custos || 0,
      medico_id: os.medico_id,
      numero_tco: os.numero_tco
    }));

  // Totais e indicadores
  const totalVendas = osFiltradas.reduce((acc, o) => acc + (o.valorVenda || 0), 0);
  const totalLentes = osFiltradas.reduce((acc, o) => acc + (o.custoLentes || 0), 0);
  const totalArmacoes = osFiltradas.reduce((acc, o) => acc + (o.custoArmacoes || 0), 0);
  const totalMkt = osFiltradas.reduce((acc, o) => acc + (o.custoMkt || 0), 0);
  const totalOutros = osFiltradas.reduce((acc, o) => acc + (o.outrosCustos || 0), 0);
  const margemBruta = totalVendas - (totalLentes + totalArmacoes + totalMkt + totalOutros);
  const totalOS = osFiltradas.length;
  const margemMedia = totalOS ? margemBruta / totalOS : 0;
  const totalArmacoesQtd = 0; // Campo não disponível na tabela, manter 0 para exibição

// Interface para mapear os dados da API para o formato usado no componente
interface OS {
  id: number;
  filial: string;
  filial_id: number;
  data: string;
  valorVenda: number;
  custoLentes: number;
  custoArmacoes: number;
  custoMkt: number;
  outrosCustos: number;
  medico_id?: number;
  numero_tco?: string;
}

  // Função para gerar PDF
  const handleGerarPDF = () => {
    try {
      const relatorioService = relatoriosPDFService;
      const filtrosRelatorio = {
        filial: filtros.filial || undefined,
        dataInicial: filtros.dataInicial || undefined,
        dataFinal: filtros.dataFinal || undefined
      };
      
      const osComDadosCompletos = osFiltradas.map(os => ({
        ...os,
        nomeMedico: getNomeMedico(os.medico_id),
        numeroTco: os.numero_tco
      }));
            const doc = relatorioService.gerarRelatorioOS(osComDadosCompletos, filtrosRelatorio);
       
       const nomeArquivo = `relatorio-os-${new Date().toISOString().slice(0, 10)}.pdf`;
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

  const getNomeMedico = (medicoId?: number) => {
    if (!medicoId) return 'Não informado';
    const medico = medicos.find(m => m.id === medicoId);
    return medico ? medico.nome : 'Médico não encontrado';
  };

  return (
    <Box>
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
        Relatório de OS
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel id="filial-label">Filial</InputLabel>
                <Select
                  labelId="filial-label"
                  value={filtros.filial}
                  label="Filial"
                  onChange={(e) => setFiltros({ ...filtros, filial: e.target.value })}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {carregandoFiliais ? (
                    <MenuItem disabled>
                      <Box display="flex" alignItems="center">
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Carregando filiais...
                      </Box>
                    </MenuItem>
                  ) : (
                    filiais.map(filial => 
                      <MenuItem key={filial.id} value={filial.nome}>{filial.nome}</MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField label="Data Inicial" name="dataInicial" type="date" value={filtros.dataInicial} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} fullWidth />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField label="Data Final" name="dataFinal" type="date" value={filtros.dataFinal} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} fullWidth />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px', display: "flex", alignItems: "center" }}>
              <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleGerarPDF} sx={{ mt: { xs: 2, md: 0 } }}>
                Gerar PDF
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>OS Filtradas</Typography>
          {carregandoOS ? (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {osFiltradas.length === 0 && (
                <Typography color="textSecondary">Nenhuma OS encontrada.</Typography>
              )}
              {osFiltradas.map(os => (
                <ListItem key={os.id} divider>
                  <ListItemText
                    primary={`${os.filial} - ${formatDateToBrazilian(os.data)}`}
                    secondary={
                      <>
                        <div>{`Venda: R$ ${os.valorVenda.toFixed(2)} | Lentes: R$ ${os.custoLentes.toFixed(2)} | Armação: R$ ${os.custoArmacoes.toFixed(2)} | MKT: R$ ${os.custoMkt.toFixed(2)} | Outros: R$ ${os.outrosCustos.toFixed(2)}`}</div>
                        <div style={{ marginTop: '4px', fontSize: '0.875rem', color: '#666' }}>
                          {`Médico: ${getNomeMedico(os.medico_id)}${os.numero_tco ? ` | TCO: ${os.numero_tco}` : ''}`}
                        </div>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1"><b>Totais e Indicadores</b></Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1 }}>
            <Box>Valor total das vendas: <b>R$ {totalVendas.toFixed(2)}</b></Box>
            <Box>Custo total das lentes: <b>R$ {totalLentes.toFixed(2)}</b></Box>
            <Box>Custo total das armações: <b>R$ {totalArmacoes.toFixed(2)}</b></Box>
            <Box>Custo total do MKT: <b>R$ {totalMkt.toFixed(2)}</b></Box>
            <Box>Custo total "outros": <b>R$ {totalOutros.toFixed(2)}</b></Box>
            <Box>Margem bruta: <b>R$ {margemBruta.toFixed(2)}</b></Box>
            <Box>Total de OS: <b>{totalOS}</b></Box>
            <Box>Total de armações: <b>{totalArmacoesQtd}</b></Box>
            <Box>Margem média por OS: <b>R$ {margemMedia.toFixed(2)}</b></Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RelatorioOS;