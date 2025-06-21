import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import TiposFornecedores from '../pages/TiposFornecedores';
import Fornecedores from '../pages/Fornecedores';
import Titulos from '../pages/Titulos';
import EmissaoTitulos from '../pages/EmissaoTitulos';
import CustoOS from '../pages/CustoOS';
import RelatorioOS from '../pages/RelatorioOS';
import Filiais from '../pages/Filiais';
import Despesas from '../pages/Despesas';
import DespesasFixas from '../pages/DespesasFixas';
import DespesasDiversas from '../pages/DespesasDiversas';
import ExtratoDespesas from '../pages/ExtratoDespesas';

const AppRoutes: React.FC = () => (
  <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tipos-fornecedores" element={<TiposFornecedores />} />
        <Route path="/fornecedores" element={<Fornecedores />} />
        <Route path="/titulos" element={<Titulos />} />
        <Route path="/extrato-titulos" element={<EmissaoTitulos />} />
        <Route path="/emissao-titulos" element={<EmissaoTitulos />} />
        <Route path="/custo-os" element={<CustoOS />} />
        <Route path="/relatorio-os" element={<RelatorioOS />} />
        <Route path="/filiais" element={<Filiais />} />
        <Route path="/despesas" element={<Despesas />} />
        <Route path="/despesas-fixas" element={<DespesasFixas />} />
        <Route path="/despesas-diversas" element={<DespesasDiversas />} />
        <Route path="/extrato-despesas" element={<ExtratoDespesas />} />
      </Routes>
    </Layout>
  </BrowserRouter>
);

export default AppRoutes;
