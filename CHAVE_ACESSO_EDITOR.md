Estrutura da Chave de Acesso (44 Dígitos)

A chave é organizada na seguinte sequência, conforme o [manual de integração](http://www.sistemaunico.com.br/arquivos/manuais/chave_nfe.pdf): 
- **02 dígitos:** Código da UF (Estado) do emitente (ex: 41 para PR, 35 para SP).
- **04 dígitos:** Ano e Mês de emissão (AAMM).
- **14 dígitos:** CNPJ do emitente da NF-e., em caso de CPFs são 11 dígitos com 000
- **02 dígitos:** Modelo do documento (ex: 55 para NF-e, 65 para NFC-e).
- **03 dígitos:** Série do documento.
- **09 dígitos:** Número da NF-e.
- **01 dígito:** Tipo de emissão.
- **08 dígitos:** Código numérico gerado pelo sistema.
- **01 dígito:** Dígito verificador (DV)

# 🧮 Cálculo do Dígito Verificador (cDV)

O **cDV** é calculado com base nos **43 primeiros dígitos**, utilizando o algoritmo de **módulo 11**.

## 📌 Passo a passo

1. Pegue os **43 primeiros dígitos da chave**
2. Multiplique cada dígito por um peso
3. Os pesos vão de **2 a 9**, da direita para a esquerda (cíclico)
4. Some todos os resultados
5. Calcule o resto da divisão por 11
6. Aplique a regra final

---

## ⚙️ Regra matemática

resto = soma % 11  
  
se (resto == 0 ou resto == 1)  
    cDV = 0  
senão  
    cDV = 11 - resto

---

## 🔁 Sequência de pesos

Da direita para esquerda:

2, 3, 4, 5, 6, 7, 8, 9, 2, 3, ...

---

## 🧪 Exemplo prático

### Base (43 dígitos)

4224111708156200010055003000005181139472620

### Cálculo (resumido)

(último dígito × 2) +  
(próximo × 3) +  
(próximo × 4) +  
...

(Seguindo os pesos até o primeiro dígito)

### Resultado

resto = 6  
cDV = 11 - 6 = 5

### Chave final

42241117081562000100550030000051811394726205

### Comparação campo a campo do exemplo

Usando a chave `42241117081562000100550030000051811394726205`, a separação correta dos campos é:

- `42` -> Código da UF
- `2411` -> Ano e Mês de emissão
- `17081562000100` -> Documento do emitente
- `55` -> Modelo do documento
- `003` -> Série
- `000005181` -> Número do documento
- `1` -> Tipo de emissão
- `39472620` -> Código numérico
- `5` -> Dígito verificador

Observação: no exemplo anterior, o valor `13947262` estava inconsistente com a estrutura fixa da chave. O valor correto do código numérico para esta chave é `39472620`, pois o dígito `1` anterior pertence ao campo de tipo de emissão.

---

Implementation example

Como você trabalha com Java/Spring, aqui vai direto algo pronto:

```java 
public static int calcularDV(String chave43) {  
    int soma = 0;  
    int peso = 2;  
    for (int i = chave43.length() - 1; i >= 0; i--) {  
        int num = Character.getNumericValue(chave43.charAt(i));  
        soma += num * peso;  
        peso++;  
        if (peso > 9) {  
            peso = 2;  
        }  
    }  
    int resto = soma % 11;  
    if (resto == 0 || resto == 1) {  
        return 0;  
    }  
    return 11 - resto;  
}
```

# Definição

Quero uma interface simples, onde o usuário pode colocar a chave de acesso e poder ver a definição de cada campo, poder identificar a UF diretamente da chave, saber qual é o código numérico, resumidamente uma visualização dos campos,

Também é possível que o usuário possa alterar os campos da chave e ter o código verificador recalculado,

Faça o backend com java e um frontend simples em bootstrap

# Perguntas em Aberto para Implementação

Responda diretamente nesta seção para fechar o escopo antes da implementação.

## 1. Modelos aceitos

O sistema deve aceitar apenas os modelos `55` e `65`, ou qualquer modelo de documento com 2 dígitos?

Resposta: Todos modelos de 2 digitos, nfe, cte, nfce, etc

## 2. CPF no campo de 14 dígitos

Quando o emitente for CPF, como ele deve ser representado dentro do campo de 14 dígitos?

Opções que precisam ser esclarecidas:
- Completar com `000` à esquerda
- Completar com `000` à direita
- Outra regra

Resposta: Right Padding

## 3. Entrada da chave

O usuário deve poder:
- Informar apenas a chave completa de 44 dígitos
- Informar apenas os campos separados
- Usar os dois modos

Resposta: Informar apenas a chave de acesso completa com 44 digitos podendo ter máscaras

## 4. Edição dos campos

Depois de carregar uma chave, o usuário poderá editar:
- Todos os campos editáveis individualmente
- Apenas alguns campos específicos
- A chave completa e os campos separados ao mesmo tempo

Resposta: A chave completa e os campos separados ao mesmo tempo

## 5. Recalcular DV

O dígito verificador deve ser recalculado:
- Automaticamente ao alterar qualquer campo
- Apenas ao clicar em um botão
- Nos dois casos

Resposta: Ao clickar em um botão

## 6. Validações da aplicação

Além de validar o DV, quais regras devem existir?

Exemplos:
- Permitir apenas números
- Exigir exatamente 44 dígitos na chave completa
- Validar código de UF
- Validar mês em `AAMM`
- Validar modelos permitidos
- Validar tamanhos exatos de cada campo

Resposta: Todas com exceção de permitir apenas numeros, pois pode ter máscara,

## 7. Formatação da interface

Na tela, a chave e os campos devem aparecer:
- Sem máscara, apenas números
- Com máscara visual
- Com opção de alternar entre os dois formatos

Resposta: O usuário pode colar nos 2 formatos, devemos processar apenas sem mascara internamente

## 8. Comportamento para chave inválida

Quando a chave estiver inválida, a aplicação deve:
- Bloquear totalmente a visualização
- Mostrar os campos mesmo assim e destacar os erros
- Permitir edição para correção

Resposta: Se a chave possuir 44 caracteres e for inválida, devemos demonstrar qual campo é inválido, seja CDV, seja CNPJ, etc, se não possuir 44 caracteres, apenas mostre tamanho inválido

## 9. Tabela de UF

Posso assumir a tabela padrão de códigos de UF da NF-e para identificar o estado?

Resposta: Sim

## 10. Tipo de frontend

Você quer:
- Backend Spring Boot servindo páginas HTML com Bootstrap
- Backend Spring Boot com API REST e frontend separado no mesmo projeto

Resposta: Spring Boot + Bootstrap

## 11. Persistência

A aplicação precisa salvar histórico, últimas chaves consultadas ou qualquer dado em banco?

Se sim, descreva o que deve ser salvo.

Resposta: Não

## 12. Idioma e texto da interface

A interface deve ficar totalmente em português do Brasil?

Resposta: No momento sim, mas deixe brecha para um i18n
