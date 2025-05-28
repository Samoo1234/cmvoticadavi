import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, List, ListItem, ListItemText, MenuItem, Divider, CircularProgress, FormControl, InputLabel, Select } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { filiaisService } from '../services/filiaisService';
import type { Filial } from '../services/filiaisService';
import { custoOSService } from '../services/custoOSService';
import type { CustoOS } from '../services/custoOSService';
import { formatDateToBrazilian } from '../utils/dateUtils';

// Estilos CSS para impressão
const printStyles = `
  @media print {
    /* Ocultar elementos que não devem ser impressos */
    nav, header, footer, .MuiAppBar-root, .MuiDrawer-root, .no-print {
      display: none !important;
    }
    
    /* Garantir que o conteúdo do relatório ocupe toda a página */
    body, html {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: white !important;
    }
    
    /* Ajustar o conteúdo do relatório */
    .print-only {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* Remover sombras e bordas para economizar tinta */
    .MuiCard-root, .MuiPaper-root {
      box-shadow: none !important;
      border: 1px solid #ddd !important;
    }
    
    /* Ajustar o tamanho da fonte para impressão */
    body {
      font-size: 12pt !important;
    }
    
    /* Garantir que os totais e indicadores sejam impressos corretamente */
    .totais-indicadores {
      page-break-inside: avoid !important;
    }
  }
`;

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
  outrosCustos: custoOS.outros_custos
});

const RelatorioOS: React.FC = () => {
  const [filtros, setFiltros] = useState({ filial: '', dataInicial: '', dataFinal: '' });
  const [osList, setOsList] = useState<OS[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [carregandoFiliais, setCarregandoFiliais] = useState(true);
  const [carregandoOS, setCarregandoOS] = useState(true);
  const [filialMap, setFilialMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const buscarFiliais = async () => {
      try {
        setCarregandoFiliais(true);
        const filiaisData = await filiaisService.getAll();
        setFiliais(filiaisData);
        
        // Criar um mapa de ID da filial para nome da filial para uso posterior
        const novoFilialMap = new Map<number, string>();
        filiaisData.forEach(filial => {
          if (filial.id !== undefined) {
            novoFilialMap.set(filial.id, filial.nome);
          }
        });
        setFilialMap(novoFilialMap);
      } catch (error) {
        console.error('Erro ao buscar filiais:', error);
      } finally {
        setCarregandoFiliais(false);
      }
    };

    buscarFiliais();
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

  // Função para imprimir o relatório
  const handleImprimir = () => {
    // Adicionar estilos de impressão ao documento
    const styleElement = document.createElement('style');
    styleElement.setAttribute('id', 'print-styles');
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);
    
    // Imprimir a página
    window.print();
    
    // Remover os estilos de impressão após a impressão
    setTimeout(() => {
      const printStyleElement = document.getElementById('print-styles');
      if (printStyleElement) {
        printStyleElement.remove();
      }
    }, 1000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="primary">
        Relatório de OS
      </Typography>
      <Card sx={{ mb: 3 }} className="no-print">
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
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={handleImprimir} sx={{ mt: { xs: 2, md: 0 } }}>
                Imprimir Relatório
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card className="print-only">
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
                    secondary={`Venda: R$ ${os.valorVenda.toFixed(2)} | Lentes: R$ ${os.custoLentes.toFixed(2)} | Armação: R$ ${os.custoArmacoes.toFixed(2)} | MKT: R$ ${os.custoMkt.toFixed(2)} | Outros: R$ ${os.outrosCustos.toFixed(2)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" className="totais-indicadores"><b>Totais e Indicadores</b></Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1 }} className="totais-indicadores">
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