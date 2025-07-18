import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, List, ListItem, ListItemText, MenuItem, Divider, CircularProgress, FormControl, InputLabel, Select, Snackbar, Alert } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { filiaisService } from '../services/filiaisService';
import type { Filial } from '../services/filiaisService';
import { custoOSService } from '../services/custoOSService';
import type { CustoOS } from '../services/custoOSService';
import { medicosService } from '../services/medicosService';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { RelatoriosPDFService } from '../services/relatoriosPDFService';


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

// Função para converter CustoOS para o formato OS usado no componente
const mapCustoOSToOS = (custoOS: CustoOS, filialNome: string): OS => ({
  id: custoOS.id,
  filial: filialNome,
  filial_id: custoOS.filial_id,
  data: custoOS.data,
  valorVenda: custoOS.valor_venda,
  custoLentes: custoOS.custo_lentes,
  custoArmacoes: custoOS.custo_armacoes,
  custoMkt: custoOS.custo_mkt,
  outrosCustos: custoOS.outros_custos,
  medico_id: custoOS.medico_id,
  numero_tco: custoOS.numero_tco
});

const RelatorioOS: React.FC = () => {
  const [filtros, setFiltros] = useState({ filial: '', dataInicial: '', dataFinal: '' });
  const [osList, setOsList] = useState<OS[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [medicos, setMedicos] = useState<{id: number, nome: string}[]>([]);
  const [carregandoFiliais, setCarregandoFiliais] = useState(true);
  const [carregandoOS, setCarregandoOS] = useState(true);
  const [filialMap, setFilialMap] = useState<Map<number, string>>(new Map());
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const buscarDados = async () => {
      try {
        setCarregandoFiliais(true);
        const [filiaisData, medicosData] = await Promise.all([
          filiaisService.getAll(),
          medicosService.getAll()
        ]);
        
        setFiliais(filiaisData);
        
        // Criar um mapa de ID da filial para nome da filial para uso posterior
        const novoFilialMap = new Map<number, string>();
        filiaisData.forEach(filial => {
          if (filial.id !== undefined) {
            novoFilialMap.set(filial.id, filial.nome);
          }
        });
        setFilialMap(novoFilialMap);
        
        // Formatar dados dos médicos
        const medicosFormatados = medicosData.map((m: any) => ({
          id: m.id!,
          nome: m.nome
        }));
        setMedicos(medicosFormatados);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setCarregandoFiliais(false);
      }
    };

    buscarDados();
  }, []);
  
  // Efeito para buscar os dados de custos_os quando o mapa de filiais estiver pronto
  useEffect(() => {
    if (filialMap.size > 0) {
      buscarDados();
    }
  }, [filialMap]);
  
  // Efeito para buscar os dados quando os filtros mudarem
  useEffect(() => {
    if (filialMap.size > 0) {
      buscarDados();
    }
  }, [filtros]);

  // Função para buscar dados com base nos filtros
  const buscarDados = async () => {
    try {
      setCarregandoOS(true);
      let custosData: CustoOS[] = [];
      
      // Buscar dados com base nos filtros selecionados
      if (filtros.filial && filtros.dataInicial && filtros.dataFinal) {
        // Encontrar o ID da filial pelo nome
        const filialId = [...filialMap.entries()]
          .find(([_, nome]) => nome === filtros.filial)?.[0];
          
        if (filialId) {
          custosData = await custoOSService.getByFilialEPeriodo(
            filialId, 
            filtros.dataInicial, 
            filtros.dataFinal
          );
        }
      } else if (filtros.filial) {
        // Encontrar o ID da filial pelo nome
        const filialId = [...filialMap.entries()]
          .find(([_, nome]) => nome === filtros.filial)?.[0];
          
        if (filialId) {
          custosData = await custoOSService.getByFilial(filialId);
        }
      } else if (filtros.dataInicial && filtros.dataFinal) {
        custosData = await custoOSService.getByPeriodo(
          filtros.dataInicial, 
          filtros.dataFinal
        );
      } else {
        custosData = await custoOSService.getAll();
      }
      
      // Mapear os dados para o formato usado no componente
      const osData = custosData.map(custo => {
        // Buscar o nome da filial no mapa ou tentar obter da API se necessário
        let filialNome = filialMap.get(custo.filial_id);
        
        // Se o nome não for encontrado, garantir que estamos usando o nome completo
        if (!filialNome) {
          const filial = filiais.find(f => f.id === custo.filial_id);
          filialNome = filial ? filial.nome : `Filial ${custo.filial_id}`;
          
          // Atualizar o mapa para futuras referências
          if (filial && filial.id !== undefined) {
            setFilialMap(new Map(filialMap.set(filial.id, filial.nome)));
          }
        }
        return mapCustoOSToOS(custo, filialNome);
      });
      
      setOsList(osData);
    } catch (error) {
      console.error('Erro ao buscar dados de custos de OS:', error);
    } finally {
      setCarregandoOS(false);
    }
  };
  
  // Usar os dados já filtrados da API
  const osFiltradas = osList;

  // Totais e indicadores
  const totalVendas = osFiltradas.reduce((acc, os) => acc + (os.valorVenda || 0), 0);
  const totalLentes = osFiltradas.reduce((acc, os) => acc + (os.custoLentes || 0), 0);
  const totalArmacoes = osFiltradas.reduce((acc, os) => acc + (os.custoArmacoes || 0), 0);
  const totalMkt = osFiltradas.reduce((acc, os) => acc + (os.custoMkt || 0), 0);
  const totalOutros = osFiltradas.reduce((acc, os) => acc + (os.outrosCustos || 0), 0);
  const margemBruta = totalVendas - (totalLentes + totalArmacoes + totalMkt + totalOutros);
  const totalOS = osFiltradas.length;
  const totalArmacoesQtd = osFiltradas.length; // Exemplo: quantidade de OS = quantidade de armações
  const margemMedia = totalOS ? margemBruta / totalOS : 0;

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Se for um campo de data, garantir que o formato seja ISO para o backend
    if (e.target.name === 'dataInicial' || e.target.name === 'dataFinal') {
      setFiltros({ ...filtros, [e.target.name]: e.target.value });
    } else {
      setFiltros({ ...filtros, [e.target.name]: e.target.value });
    }
  };

  // Função para gerar PDF
  const handleGerarPDF = () => {
    try {
      const relatorioService = new RelatoriosPDFService();
      
      const filtrosRelatorio = {
        filial: filtros.filial || undefined,
        dataInicial: filtros.dataInicial || undefined,
        dataFinal: filtros.dataFinal || undefined
      };
      
      // Adicionar os campos nomeMedico e numeroTco aos dados
      const osComDadosCompletos = osFiltradas.map(os => ({
        ...os,
        nomeMedico: getNomeMedico(os.medico_id),
        numeroTco: os.numero_tco
      }));
      
      const doc = relatorioService.gerarRelatorioOS(osComDadosCompletos, filtrosRelatorio);
      
      const nomeArquivo = `relatorio-os-${new Date().toISOString().slice(0, 10)}.pdf`;
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