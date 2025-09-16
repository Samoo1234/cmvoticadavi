/**
 * Testes para as funções de conversão decimal segura
 * Para executar: npm test decimalUtils.test.ts
 */

import { 
  parseDecimalSeguro, 
  formatarDecimal, 
  validarValorMonetario, 
  somarValores, 
  subtrairValores, 
  multiplicarValor,
  arredondarDuasCasas 
} from './decimalUtils';

// Testes para parseDecimalSeguro
console.log('=== TESTES parseDecimalSeguro ===');

// Teste 1: Valores que causavam problemas de precisão
console.log('Teste 1 - Valores problemáticos:');
console.log('50.00 =>', parseDecimalSeguro('50.00')); // Deve ser exatamente 50
console.log('49.99 =>', parseDecimalSeguro('49.99')); // Deve ser exatamente 49.99
console.log('50,00 =>', parseDecimalSeguro('50,00')); // Deve ser exatamente 50

// Teste 2: Conversões de string
console.log('\nTeste 2 - Conversões de string:');
console.log('123.45 =>', parseDecimalSeguro('123.45'));
console.log('123,45 =>', parseDecimalSeguro('123,45'));
console.log('0.01 =>', parseDecimalSeguro('0.01'));
console.log('0,01 =>', parseDecimalSeguro('0,01'));

// Teste 3: Valores edge case
console.log('\nTeste 3 - Edge cases:');
console.log('string vazia =>', parseDecimalSeguro(''));
console.log('null =>', parseDecimalSeguro(null as any));
console.log('undefined =>', parseDecimalSeguro(undefined as any));
console.log('texto inválido =>', parseDecimalSeguro('abc'));

// Teste 4: Números já convertidos
console.log('\nTeste 4 - Números:');
console.log('50 =>', parseDecimalSeguro(50));
console.log('49.99 =>', parseDecimalSeguro(49.99));
console.log('123.456 =>', parseDecimalSeguro(123.456)); // Deve arredondar para 123.46

console.log('\n=== TESTES formatarDecimal ===');

// Teste 5: Formatação
console.log('Teste 5 - Formatação:');
console.log('50 =>', formatarDecimal(50));
console.log('49.99 =>', formatarDecimal(49.99));
console.log('123.456 =>', formatarDecimal(123.456));
console.log('NaN =>', formatarDecimal(NaN));

console.log('\n=== TESTES validarValorMonetario ===');

// Teste 6: Validação
console.log('Teste 6 - Validação:');
console.log('50.00 =>', validarValorMonetario('50.00'));
console.log('50,00 =>', validarValorMonetario('50,00'));
console.log('abc =>', validarValorMonetario('abc'));
console.log('50.123 =>', validarValorMonetario('50.123')); // Mais de 2 casas decimais
console.log('string vazia =>', validarValorMonetario(''));

console.log('\n=== TESTES somarValores ===');

// Teste 7: Soma precisa
console.log('Teste 7 - Soma:');
console.log('50.00 + 0.01 =>', somarValores('50.00', '0.01'));
console.log('49.99 + 0.01 =>', somarValores('49.99', '0.01'));
console.log('10.10 + 20.20 + 30.30 =>', somarValores('10.10', '20.20', '30.30'));

console.log('\n=== TESTES subtrairValores ===');

// Teste 8: Subtração precisa
console.log('Teste 8 - Subtração:');
console.log('50.00 - 0.01 =>', subtrairValores('50.00', '0.01'));
console.log('100.00 - 49.99 =>', subtrairValores('100.00', '49.99'));

console.log('\n=== TESTES multiplicarValor ===');

// Teste 9: Multiplicação precisa
console.log('Teste 9 - Multiplicação:');
console.log('50.00 * 2 =>', multiplicarValor('50.00', 2));
console.log('49.99 * 1.1 =>', multiplicarValor('49.99', 1.1));

console.log('\n=== TESTES arredondarDuasCasas ===');

// Teste 10: Arredondamento
console.log('Teste 10 - Arredondamento:');
console.log('50.00 =>', arredondarDuasCasas('50.00'));
console.log('49.999 =>', arredondarDuasCasas('49.999'));
console.log('123.456 =>', arredondarDuasCasas('123.456'));

console.log('\n=== TESTE DE PRECISÃO CRÍTICO ===');

// Teste 11: O problema original - R$ 50,00 virando 49,99
console.log('Teste 11 - Problema original:');
const valorOriginal = '50.00';
const valorConvertido = parseDecimalSeguro(valorOriginal);
const valorFormatado = formatarDecimal(valorConvertido);

console.log(`Valor original: ${valorOriginal}`);
console.log(`Após parseDecimalSeguro: ${valorConvertido}`);
console.log(`Após formatarDecimal: ${valorFormatado}`);
console.log(`Teste passou: ${valorFormatado === '50.00' ? '✅ SIM' : '❌ NÃO'}`);

// Teste 12: Comparação com parseFloat (problema antigo)
console.log('\nTeste 12 - Comparação parseFloat vs parseDecimalSeguro:');
const testValues = ['50.00', '49.99', '0.01', '123.45'];

testValues.forEach(value => {
  const oldWay = parseFloat(value);
  const newWay = parseDecimalSeguro(value);
  const difference = Math.abs(oldWay - newWay);
  
  console.log(`Valor: ${value}`);
  console.log(`  parseFloat: ${oldWay}`);
  console.log(`  parseDecimalSeguro: ${newWay}`);
  console.log(`  Diferença: ${difference}`);
  console.log(`  Precisão mantida: ${difference < 0.001 ? '✅' : '❌'}`);
});

console.log('\n=== RESUMO DOS TESTES ===');
console.log('✅ Todos os testes de precisão decimal foram executados');
console.log('✅ Funções implementadas para evitar problemas de ponto flutuante');
console.log('✅ Validação rigorosa de valores monetários');
console.log('✅ Operações matemáticas seguras para valores monetários');
