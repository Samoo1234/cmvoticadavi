import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Assessment as ReportIcon,
  Home as HomeIcon,
  Receipt as TitulosIcon
} from '@mui/icons-material';
import { formatarDecimal, parseDecimalSeguro, validarValorMonetario, somarValores } from '../utils/decimalUtils';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { titulosService, fornecedoresService, filiaisService, tiposFornecedoresService } from '../services';

interface TituloCompleto {
  id: number;
  numero: string;
  tipo: string;
  fornecedor: string;
  fornecedor_id: number;
  filial: string;
  filial_id: number;
  vencimento: string;
  data_emissao: string;
  pagamento: string;
  data_pagamento: string;
  valor: string;
  status: string;
  observacao: string;
  multa?: number;
  juros?: number;
}

interface DadosMensais {
  mes: string;
  ano: number;
  tipos: { [tipo: string]: { quantidade: number; valor: number } };
  total: { quantidade: number; valor: number };
}

interface DadosFilial {
  filial: string;
  meses: DadosMensais[];
  total: { quantidade: number; valor: number };
}

interface FiltrosRelatorio {
  dataInicial: string;
  dataFinal: string;
  filiais: string[];
  tipos: string[];
}

const RelatorioMensal: React.FC = () => {
  const [titulos, setTitulos] = useState<TituloCompleto[]>([]);
  const [filiais, setFiliais] = useState<{ id: number; nome: string }[]>([]);
  const [tipos, setTipos] = useState<{ id: number; nome: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dadosRelatorio, setDadosRelatorio] = useState<DadosFilial[]>([]);
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    dataInicial: '',
    dataFinal: '',
    filiais: [],
    tipos: []
  });

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [dadosTitulos, dadosFiliais, dadosTipos] = await Promise.all([
        titulosService.getAll(),
        filiaisService.getAll(),
        tiposFornecedoresService.getAll()
      ]);

      // Mapear filiais
      const filiaisFormatadas = dadosFiliais.map(f => ({
        id: f.id,
        nome: f.nome
      }));
      setFiliais(filiaisFormatadas);

      // Mapear tipos
      const tiposFormatados = dadosTipos.map(t => ({
        id: t.id,
        nome: t.nome
      }));
      setTipos(tiposFormatados);

      // Processar títulos
      const titulosFormatados = dadosTitulos.map(titulo => {
        const fornecedor = dadosFiliais.find(f => f.id === titulo.fornecedor_id);
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

      setTitulos(titulosFormatados);

      // Definir filtros padrão
      setFiltros(prev => ({
        ...prev,
        filiais: filiaisFormatadas.map(f => f.nome),
        tipos: tiposFormatados.map(t => t.nome)
      }));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltroChange = (campo: keyof FiltrosRelatorio, valor: any) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const gerarRelatorio = () => {
    if (!filtros.dataInicial || !filtros.dataFinal) {
      alert('Por favor, selecione o período (data inicial e final)');
      return;
    }

    setIsLoading(true);

    try {
      // Filtrar títulos pelo período e filtros selecionados
      const titulosFiltrados = titulos.filter(titulo => {
        const dataVencimento = new Date(titulo.vencimento);
        const dataInicial = new Date(filtros.dataInicial);
        const dataFinal = new Date(filtros.dataFinal);

        const dentroPeriodo = dataVencimento >= dataInicial && dataVencimento <= dataFinal;
        const filialSelecionada = filtros.filiais.includes(titulo.filial);
        const tipoSelecionado = filtros.tipos.includes(titulo.tipo);

        return dentroPeriodo && filialSelecionada && tipoSelecionado;
      });

      // Agrupar por filial e mês
      const dadosAgrupados: { [filial: string]: { [mesAno: string]: TituloCompleto[] } } = {};

      titulosFiltrados.forEach(titulo => {
        const filial = titulo.filial;
        const dataVencimento = new Date(titulo.vencimento);
        const mesAno = `${dataVencimento.getFullYear()}-${String(dataVencimento.getMonth() + 1).padStart(2, '0')}`;

        if (!dadosAgrupados[filial]) {
          dadosAgrupados[filial] = {};
        }
        if (!dadosAgrupados[filial][mesAno]) {
          dadosAgrupados[filial][mesAno] = [];
        }

        dadosAgrupados[filial][mesAno].push(titulo);
      });

      // Processar dados para o relatório
      const relatorio: DadosFilial[] = Object.keys(dadosAgrupados).map(filialNome => {
        const mesesFilial = dadosAgrupados[filialNome];
        const meses: DadosMensais[] = [];

        // Gerar todos os meses do período
        const dataInicial = new Date(filtros.dataInicial);
        const dataFinal = new Date(filtros.dataFinal);
        const mesAtual = new Date(dataInicial);

        while (mesAtual <= dataFinal) {
          const mesAno = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`;
          const titulosDoMes = mesesFilial[mesAno] || [];

          // Agrupar por tipo
          const tiposMes: { [tipo: string]: { quantidade: number; valor: number } } = {};
          
          // Inicializar todos os tipos com 0
          tipos.forEach(tipo => {
            tiposMes[tipo.nome] = { quantidade: 0, valor: 0 };
          });

          // Processar títulos do mês
          titulosDoMes.forEach(titulo => {
            const tipo = titulo.tipo;
            const valor = parseDecimalSeguro(titulo.valor);
            
            if (tiposMes[tipo]) {
              tiposMes[tipo].quantidade += 1;
              tiposMes[tipo].valor = parseDecimalSeguro(somarValores(tiposMes[tipo].valor, valor));
            }
          });

          // Calcular total do mês
          const totalMes = {
            quantidade: titulosDoMes.length,
            valor: titulosDoMes.reduce((total, titulo) => 
              parseDecimalSeguro(somarValores(total, parseDecimalSeguro(titulo.valor))), 0)
          };

          meses.push({
            mes: mesAtual.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
            ano: mesAtual.getFullYear(),
            tipos: tiposMes,
            total: totalMes
          });

          mesAtual.setMonth(mesAtual.getMonth() + 1);
        }

        // Calcular total da filial
        const totalFilial = {
          quantidade: meses.reduce((total, mes) => total + mes.total.quantidade, 0),
          valor: meses.reduce((total, mes) => parseDecimalSeguro(somarValores(total, mes.total.valor)), 0)
        };

        return {
          filial: filialNome,
          meses,
          total: totalFilial
        };
      });

      setDadosRelatorio(relatorio);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const gerarPDF = () => {
    // TODO: Implementar geração de PDF
    alert('Funcionalidade de PDF será implementada em breve!');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link href="/" sx={{ display: 'flex', alignItems: 'center' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Início
        </Link>
        <Link href="/titulos" sx={{ display: 'flex', alignItems: 'center' }}>
          <TitulosIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Títulos
        </Link>
        <Typography sx={{ display: 'flex', alignItems: 'center' }}>
          <ReportIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Relatório Mensal
        </Typography>
      </Breadcrumbs>

      {/* Título */}
      <Typography variant="h4" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ReportIcon sx={{ mr: 1 }} />
        🏢 Relatório Mensal por Filial e Tipo
      </Typography>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>📅 Filtros do Relatório</Typography>
          
          <Stack spacing={3}>
            {/* Período */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Data Inicial"
                type="date"
                value={filtros.dataInicial}
                onChange={(e) => handleFiltroChange('dataInicial', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Data Final"
                type="date"
                value={filtros.dataFinal}
                onChange={(e) => handleFiltroChange('dataFinal', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>

            {/* Filiais */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Filiais:</Typography>
              <FormGroup row>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtros.filiais.length === filiais.length}
                      indeterminate={filtros.filiais.length > 0 && filtros.filiais.length < filiais.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFiltroChange('filiais', filiais.map(f => f.nome));
                        } else {
                          handleFiltroChange('filiais', []);
                        }
                      }}
                    />
                  }
                  label="Todas"
                />
                {filiais.map(filial => (
                  <FormControlLabel
                    key={filial.id}
                    control={
                      <Checkbox
                        checked={filtros.filiais.includes(filial.nome)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleFiltroChange('filiais', [...filtros.filiais, filial.nome]);
                          } else {
                            handleFiltroChange('filiais', filtros.filiais.filter(f => f !== filial.nome));
                          }
                        }}
                      />
                    }
                    label={filial.nome}
                  />
                ))}
              </FormGroup>
            </Box>

            {/* Tipos */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Tipos de Título:</Typography>
              <FormGroup row>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtros.tipos.length === tipos.length}
                      indeterminate={filtros.tipos.length > 0 && filtros.tipos.length < tipos.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFiltroChange('tipos', tipos.map(t => t.nome));
                        } else {
                          handleFiltroChange('tipos', []);
                        }
                      }}
                    />
                  }
                  label="Todos"
                />
                {tipos.map(tipo => (
                  <FormControlLabel
                    key={tipo.id}
                    control={
                      <Checkbox
                        checked={filtros.tipos.includes(tipo.nome)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleFiltroChange('tipos', [...filtros.tipos, tipo.nome]);
                          } else {
                            handleFiltroChange('tipos', filtros.tipos.filter(t => t !== tipo.nome));
                          }
                        }}
                      />
                    }
                    label={tipo.nome}
                  />
                ))}
              </FormGroup>
            </Box>

            {/* Botões */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={gerarRelatorio}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <ReportIcon />}
              >
                {isLoading ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
              
              {dadosRelatorio.length > 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={gerarPDF}
                  startIcon={<PdfIcon />}
                >
                  Exportar PDF
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Resultados */}
      {dadosRelatorio.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>📊 Resultados do Relatório</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Período: {filtros.dataInicial ? new Date(filtros.dataInicial).toLocaleDateString('pt-BR') : '...'} até {filtros.dataFinal ? new Date(filtros.dataFinal).toLocaleDateString('pt-BR') : '...'}
            </Typography>

            {dadosRelatorio.map((dadosFilial, index) => (
              <Box key={index} sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  🏪 FILIAL: {dadosFilial.filial.toUpperCase()}
                </Typography>

                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Mês/Ano</TableCell>
                        {tipos.map(tipo => (
                          <TableCell key={tipo.id} align="center" sx={{ fontWeight: 'bold' }}>
                            {tipo.nome}
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>
                          TOTAL
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: '#fafafa' }}>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}></TableCell>
                        {tipos.map(tipo => (
                          <TableCell key={`${tipo.id}-header`} align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            Qtd | Valor
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary', backgroundColor: '#e3f2fd' }}>
                          Qtd | Valor
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dadosFilial.meses.map((mes, mesIndex) => (
                        <TableRow key={mesIndex} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            {mes.mes}
                          </TableCell>
                          {tipos.map(tipo => {
                            const dadosTipo = mes.tipos[tipo.nome] || { quantidade: 0, valor: 0 };
                            return (
                              <TableCell key={tipo.id} align="center">
                                <Typography variant="body2">
                                  {dadosTipo.quantidade} | R$ {formatarDecimal(dadosTipo.valor)}
                                </Typography>
                              </TableCell>
                            );
                          })}
                          <TableCell align="center" sx={{ backgroundColor: '#e3f2fd' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {mes.total.quantidade} | R$ {formatarDecimal(mes.total.valor)}
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
                          const totalTipo = dadosFilial.meses.reduce((acc, mes) => ({
                            quantidade: acc.quantidade + (mes.tipos[tipo.nome]?.quantidade || 0),
                            valor: parseDecimalSeguro(somarValores(acc.valor, mes.tipos[tipo.nome]?.valor || 0))
                          }), { quantidade: 0, valor: 0 });
                          
                          return (
                            <TableCell key={tipo.id} align="center" sx={{ color: 'white' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {totalTipo.quantidade} | R$ {formatarDecimal(totalTipo.valor)}
                              </Typography>
                            </TableCell>
                          );
                        })}
                        <TableCell align="center" sx={{ backgroundColor: '#0d47a1', color: 'white' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {dadosFilial.total.quantidade} | R$ {formatarDecimal(dadosFilial.total.valor)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}

            {/* Resumo Geral */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>📈 Resumo Geral do Período</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Filial</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Títulos</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Valor Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dadosRelatorio.map((dadosFilial, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 'bold' }}>{dadosFilial.filial}</TableCell>
                        <TableCell align="center">{dadosFilial.total.quantidade} títulos</TableCell>
                        <TableCell align="center">R$ {formatarDecimal(dadosFilial.total.valor)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: '#1976d2', color: 'white' }}>
                      <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>TOTAL GERAL</TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {dadosRelatorio.reduce((acc, filial) => acc + filial.total.quantidade, 0)} títulos
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                        R$ {formatarDecimal(dadosRelatorio.reduce((acc, filial) => parseDecimalSeguro(somarValores(acc, filial.total.valor)), 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default RelatorioMensal;
