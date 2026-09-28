# Ki Delícia Gestor

Gestão Ki Delícia

Atue como arquiteto de software, analista de processos e desenvolvedor de um sistema de gestão empresarial para a operação comercial da Ki Delícia, marca de biscoitos, polvilhos, broas, empadas, chips, salgadinhos e outros alimentos. O contexto sugere fabricação e distribuição; permita classificar cada produto como fabricado, revendido ou material, sem presumir que todos sejam de fabricação própria.

Desenvolva uma aplicação web operacional em português do Brasil, adequada para computador, tablet e celular. Precisamos substituir controles dispersos em Excel por registros integrados, com rastreabilidade. Construa o sistema de trabalho, com formulários, tabelas, cálculos e ações reais.

1. Evidências dos arquivos e limites do levantamento

Pasta de origem: https://drive.google.com/drive/folders/1FFSOlb0QYIpTNS3vTVO8XrcirZ_Pk2Y9

Arquivo

Conteúdo observado

Destino no sistema

00 VENDA GERAL ANO  2025.xlsx

Consolidado mensal de 2025 por produto, quantidade e valor; categorias de etiquetas e doces; total anual informado de R$ 587.706,30

Histórico comercial, relatórios e reconciliação

01 JANEIRO POR VENDEDOR  2025 OK.xlsx

Quantidades e valores por vendedor e produto, distribuídos em dois blocos

Histórico por vendedor

12° DEZEMBRO POR VENDEDOR 2025 OK.xlsx

Quantidades e valores por vendedor; linha FÁBRICA

Histórico por vendedor/canal

PEDIDO OTAVIO TERRA NOVA.xlsx

Cliente, CNPJ, inscrição, endereço, entrega, vencimento, referência de NF/documento/boleto, itens; total R$ 1.585,00

Cliente, pedido e referências financeiras em revisão

PEDIDO SUPER NOVA CENTRAL.xlsx

Cliente/loja, entrega, dois vencimentos, referências de NF/documento/boletos, itens; total R$ 1.478,00

Cliente/filial, pedido e parcelamento a conferir

SUGESTÃO DE PEDIDO OTAVIO TERRA NOVA.xlsx — duas cópias idênticas

Código, código de barras, descrição, NCM, preço, embalagem e quantidade sugerida; total R$ 1.038,00

Catálogo e pré-venda; importar uma vez

SUGESTÃO DE PEDIDO SUPER NOVA CENTRAL.xlsx

Loja, EAN, fardo, quantidade sugerida, preço unitário e produto; total R$ 1.478,00; identificação de possíveis emitentes

Sugestão comercial e candidatos a emitentes

PLACA NOVA EXPOSITOR.pdf

Arte da marca Biscoitos Ki Delícia com vermelho, amarelo e branco, e contato para revenda

Referência visual, não fonte de transações

Os arquivos de vendas históricas são de 2025; os exemplos de pedidos e sugestões incluem datas de 2026. Não misturar os períodos. Somente janeiro e dezembro têm detalhamento por vendedor nesta pasta. Não inventar os outros meses por vendedor.

Financeiro completo, receitas de fabricação, consumo de matérias-primas, capacidade produtiva, estoque inicial, custos, comissões e regras de aprovação não estão documentados integralmente. Os módulos abaixo que tratam desses assuntos são novos requisitos propostos, com parâmetros configuráveis; não apresentá-los como regras extraídas dos arquivos.

2. Problemas de origem que o sistema precisa tratar

As duas sugestões Otavio são arquivos binariamente idênticos. Detectar duplicidade por hash e registrar a segunda como ignorada.

Os códigos 107 e 108 aparecem associados a produtos distintos na sugestão Otavio. O código 202 aparece em descrições de broa e mini broa nos pedidos. Não usar código legado como chave primária nem fundir produtos automaticamente.

Existem EANs compartilhados por descrições diferentes: na sugestão Otavio, 0040141138767 aparece em banana chips salgada e cocada; 0040141138781 em banana chips doce e doce de leite. Conservar o dado original e exigir revisão para ativar o mapeamento.

O código 113 aparece duas vezes na mesma sugestão com preços 0,95 e 10,00. Não selecionar silenciosamente o último valor.

Há embalagens divergentes: pururuca 25 g versus 35 g; biscoitos descritos como 70 g versus 170 g; banana chips com diferentes apresentações. Não inferir correção apenas pela semelhança do nome.

“CRAVALHO” em janeiro e “CARVALHO” em dezembro podem ser a mesma pessoa, mas a equivalência exige confirmação. “HELP”, “CARV” e “FÁBRICA” precisam de classificação antes de virar vendedor, emitente ou canal. Não presumir que FÁBRICA é uma pessoa.

A sugestão Otavio contém erro de fórmula #VALUE! em I50, fora do total principal I49. Registrar a ocorrência e não importar a linha como produto nem transformar erro em zero silenciosamente.

No consolidado anual, W6 contém “19*”. Manter anotação e quantidade pendente de revisão. Janeiro tem polvilho 102 no anual e 102,5 no relatório de vendedores; broa 711 no anual e 112 no relatório de vendedores. Há outras diferenças que precisam ser reconciliadas por produto e período, sem corrigir a fonte automaticamente.

Os dois pedidos exibem os mesmos números legados de VENDA 832 e PEDIDO 676. Criar IDs internos únicos, conservar esses números como referências não exclusivas e sinalizar a coincidência.

Sugestão e pedido Super Nova têm o mesmo total, mas referências de datas e pagamento diferentes. Igualdade de total não comprova que sejam a mesma transação; exigir vínculo confirmado antes de conversão ou consolidação.

Há múltiplas identificações em “FATURADO POR”. Não escolher automaticamente um CNPJ emitente, nem assumir que os nomes citados são funcionários.

3. Estrutura do produto

Menu: Visão geral; Pré-vendas; Orçamentos; Pedidos e vendas; Clientes e lojas; Produtos e preços; Estoque; Produção; Compras; Financeiro; Relatórios; Importações; Configurações.

Usar “Ki Delícia Gestão” como nome inicial editável. Visual de ERP legível: fundo claro, texto escuro, vermelho da marca nas ações principais e amarelo como detalhe. Usar o PDF apenas como referência; não aplicar o anúncio inteiro como fundo de trabalho. Quando não houver logo isolada disponível, usar o nome em texto e permitir upload posterior. Não usar a identidade de outras empresas.

Tabelas com busca, filtros, ordenação, paginação e totais do conjunto filtrado, não apenas da página atual. Formulários com validação, estados de carregamento, erros específicos e confirmação de sucesso somente após persistência. No celular, facilitar lançamento de pedidos com seleção de produtos e resumo fixo do total. Permitir salvar rascunhos.

Datas dd/mm/aaaa, moeda BRL e números em pt-BR. Fuso da empresa configurável, inicialmente America/Manaus pelo contexto dos arquivos. Vencimentos e datas comerciais como datas sem conversão indevida de fuso; eventos de auditoria com horário.

4. Cadastros e precificação

Empresa e emitentes: operação principal, razão social, nome fantasia, documento, endereço, contato, logo e emitentes vinculados com seus próprios dados. Manter emitente distinto de cliente, vendedor e usuário. Começar com uma organização de acesso e múltiplos emitentes configuráveis.

Clientes e lojas: razão social, fantasia, CNPJ/CPF como texto, inscrição estadual, contatos, endereço estruturado, grupo comercial, loja/filial, vendedor responsável, condição de pagamento, tabela de preços, observações e ativo/inativo. Documentos devem preservar zeros e poder ser normalizados para comparação. Endereço e condições do pedido devem ser uma cópia histórica, sem mudar quando o cadastro for alterado.

Vendedores e canais: cadastro separado de usuários, vínculo opcional a usuário, responsável/canal, ativo e aliases aprovados para importação. Permitir vendas internas da fábrica sem criar uma pessoa fictícia. Comissões são configuração futura; não inventar percentual.

Produtos: UUID interno, SKU novo único na organização, código legado não necessariamente único, descrição, marca, categoria, sabor, apresentação, unidade base, peso e unidade de medida, embalagem comercial, conversão para unidade base, EAN textual, NCM textual, fabricado/revendido/material, controle de lote e validade, estoque mínimo, ativo e observações. Preservar descrição e embalagem brutas dos arquivos.

Unidades e embalagens: separar unidade comercial de unidade de estoque. Não tratar “1X40X35GR” como uma quantidade única nem converter peso em unidades de venda. Apresentações alternativas precisam de conversão explícita aprovada. Frações de fardo só podem ser vendidas quando a quantidade em unidade base for compatível com a divisibilidade do produto.

Exemplo: em Super Nova, 80 unidades de polvilho a R$ 2,10 = R$ 168,00; o pedido registra 2 fardos a R$ 84,00 = R$ 168,00. Para fardo aprovado de 40 unidades, 1,5 fardo equivale a 60 unidades. Os itens devem exibir quantidade comercial, fator e quantidade base, evitando baixa de apenas 1,5 unidade.

Tabelas de preço: geral, por cliente e eventualmente por canal/vendedor, com vigência e unidade do preço. Prioridade explícita: preço negociado autorizado no item > tabela do cliente vigente > tabela geral vigente. Gravar preço, fator de conversão e descontos no item. Alterações futuras no catálogo não recalculam pedidos confirmados. Não extrapolar preços históricos para uma tabela atual sem aprovação.

5. Pré-vendas, orçamentos e pedidos

Pré-venda/sugestão: cliente ou prospect, loja, responsável, data, origem, próxima ação, previsão de entrega, produtos e quantidades sugeridas, observações e status: rascunho, em contato, proposta, convertida, perdida. Registrar motivo de perda e histórico de acompanhamento. Duplicar sugestão anterior para reposição criando nova referência, sem criar nova venda automaticamente.

Orçamento: cliente, loja, vendedor, emitente proposto, validade, itens, unidade, preço, desconto, frete, condições e prazo de entrega. Status: rascunho, enviado, aprovado, recusado, expirado. Guardar revisões e data da aprovação. Converter orçamento aprovado em pedido uma única vez, mantendo o vínculo e a versão aprovada. A marcação “enviado” é manual enquanto não existir envio integrado; não fingir envio de mensagem.

Pedido: numeração interna única, referências legadas, origem, cliente/loja, vendedor/canal, emitente, datas, itens, totais, condição de pagamento, observações e histórico. Status comercial: rascunho, confirmado, cancelado. Controlar separadamente status de produção, expedição e financeiro para que recebimento parcial não apague o andamento da entrega.

Fluxo operacional: sugestão → orçamento opcional → pedido confirmado → reserva de estoque disponível e indicação de faltas → produção/compra do faltante quando aplicável → separação → expedição → entrega. Permitir pedido direto sem sugestão ou orçamento. Pedido confirmado gera títulos a receber conforme condição definida, em operação atômica; isso não gera recebimento nem significa emissão fiscal.

Subtotal do item = quantidade na unidade comercial × preço nessa mesma unidade. Total = soma dos subtotais − descontos + frete + acréscimos explícitos. Validar descontos, valores negativos e parcelas. Utilizar decimal exato ou centavos para dinheiro e precisão adequada para quantidades. Fixar política de arredondamento por item em duas casas e distribuir resíduos de parcelamento na última parcela.

Congelar itens confirmados; alterações posteriores exigem revisão controlada com ajuste de reservas e títulos, auditada. Bloquear simples edição de valores já recebidos ou expedidos. Cancelamentos liberam reservas e cancelam saldos elegíveis; recebimentos e expedições existentes exigem estorno/devolução vinculados, sem apagar histórico.

Imprimir/gerar PDF de orçamento, pedido e comprovante interno com emitente, cliente, itens, unidade, condições e totais. Identificar esses documentos como comerciais, sem simular nota fiscal autorizada ou boleto registrado.

6. Estoque, compras e produção

Estoque: saldo físico, reservado, bloqueado e disponível por produto/local/lote. Disponível = físico − reservado − bloqueado. Reservar somente saldo disponível; faltante vira demanda pendente. Entradas e saídas em razão imutável de movimentos, com origem, quantidade base, lote, usuário e data. Ajustes exigem motivo. Bloquear saldo negativo e impedir reservas concorrentes acima do saldo com transações e controle no servidor.

Na expedição, consumir reserva e baixar estoque uma única vez; confirmação do pedido não baixa o físico. Registrar entregas parciais por item e saldo a entregar. Usar lotes válidos com vencimento mais próximo primeiro quando aplicável, permitindo escolha autorizada e auditada. Produtos vencidos/bloqueados não ficam disponíveis para expedição.

Compras: fornecedor, requisição, pedido de compra, itens, custo, prazo e recebimento parcial. Recebimento confirmado cria entrada de estoque e título a pagar correspondente, com proteção contra duplicação. Demanda de produto revendido gera sugestão de compra, não ordem de fabricação.

Produção — módulo novo a configurar: ficha técnica versionada com produto, rendimento padrão, unidade do rendimento, matérias-primas, quantidades e unidades, embalagens, perdas previstas e etapas. Não inventar receitas, validade ou capacidade. Sem ficha técnica aprovada, permitir planejar a demanda, mas bloquear consumo automático de insumos.

Ordens de produção podem atender um ou vários pedidos, com vínculos e quantidades alocadas, ou reposição de estoque. Campos: produto, quantidade planejada, versão da ficha, prazo, prioridade, responsável, lote previsto, etapas e status planejada/em produção/pausada/concluída/cancelada. Proposta inicial de etapas editáveis: preparação, processamento, embalagem, conferência.

Apontar consumo real de insumos, perdas, quantidade boa produzida e lote/validade informados conforme cadastro aprovado. Cada apontamento confirmado gera consumo e entrada do produto acabado atomicamente, apenas uma vez. Permitir produção parcial sem duplicar o total ao concluir. Ajustes por movimentos reversos. Registrar custo real quando houver insumos e custos cadastrados; sem esses dados, exibir “custo não apurado”, nunca lucro presumido.

Relacionar faltas de estoque à necessidade de produção. Alterar prioridade não confirma produção nem movimenta estoque. Incluir rastreio do lote de insumo até lote produzido e pedidos expedidos.

7. Financeiro

Contas a receber e a pagar com cliente/fornecedor, pedido/compra de origem, emitente, parcela, categoria, competência, vencimento, valor original, ajustes, saldo e situação. Métodos configuráveis: dinheiro, PIX, transferência, cartão e boleto como classificação de pagamento. Referências de NF, documento e número de boleto em campos distintos, sem presumir integração bancária/fiscal.

Parcelas com datas e valores editáveis antes da confirmação; soma obrigatoriamente igual ao total financiado. As duas datas do pedido Super Nova não informam os valores de cada parcela: solicitar conferência, sem importar metade para cada uma como fato. Permitir simulação explícita de divisão igual para novos pedidos, com aceite.

Registrar recebimentos/pagamentos parciais, conta financeira, data, valor, observação e comprovante opcional. Calcular saldo a partir dos movimentos. Estados: em aberto, parcial, quitado, cancelado; atraso é calculado pelo saldo e vencimento. Estorno gera evento reverso, requer motivo e reabre o saldo correto. Impedir baixa maior que o saldo, salvo adiantamento tratado em registro separado.

Saldo de conta = saldo inicial conferido + entradas liquidadas − saídas liquidadas. Transferência entre contas gera movimentos vinculados e não receita/despesa. Fluxo previsto por vencimento separado do realizado por liquidação. Histórico de vendas agregado não gera caixa, títulos ou inadimplência.

Não declarar os pedidos históricos como pendentes, quitados ou atrasados apenas porque têm vencimento. Importar estado financeiro como “não informado — conciliar”; só criar saldos operacionais após conferência de recebimentos já ocorridos. Incluir contas operacionais antigas apenas com data de corte e saldo de abertura aprovados.

Indicadores: valor de pedidos confirmados, contas a receber, vencidas, contas a pagar, entradas/saídas liquidadas e saldo. Exibir definição e período. Não chamar valor de pedidos de faturamento fiscal. Não exibir lucro sem custos; análises gerenciais não devem simular escrituração contábil.

8. Histórico, relatórios e importação

Criar área de importação Excel com detecção do layout, pré-visualização, mapeamento, validações, conflitos, aprovação e relatório. Não presumir cabeçalho na primeira linha. Os relatórios por vendedor têm dois blocos; o anual tem três. Ignorar abas vazias e cabeçalhos artificiais como “Colunas1”. Registrar arquivo, hash, aba, célula/linha, conteúdo bruto, lote de importação, usuário e resolução.

Fluxo: carregar → extrair em área temporária → classificar → sugerir correspondências → resolver conflitos → conferir totais → confirmar. Nenhuma importação histórica movimenta automaticamente caixa ou estoque. Importação repetida é idempotente por arquivo e registro; apontar arquivos diferentes com conteúdos equivalentes para revisão. Uma sugestão não deve ser importada novamente como venda.

Guardar histórico mensal agregado separado de pedidos operacionais, com granularidade declarada: total mensal; mês/produto; mês/vendedor/produto. Relatórios devem escolher uma granularidade compatível e impedir que o consolidado anual seja somado ao detalhamento dos mesmos meses. No histórico de 2025, não calcular número de pedidos, ticket médio, estoque, margem ou recebimentos a partir de totais agregados.

O valor R$ 587.706,30 é o total informado na origem, não valor auditado. Comparar totais informados com recomposição dos itens e detalhamento disponível; exibir diferenças e cobertura. Mostrar meses sem detalhamento de vendedores como “não disponível”, não zero. Preservar categorias ETIQ MANUEL, ETIQ TOMAS e DOCES até classificação confirmada; não descartá-las nem classificá-las automaticamente como despesa.

Relatórios: pedidos por período/cliente/vendedor/canal/produto/emitente; quantidade na unidade apropriada; histórico 2025; comparação mensal; contas por vencimento; fluxo de caixa previsto/realizado; produtos com falta; ordens de produção e perdas; lotes e validade. Exportar CSV/XLSX quando implementado e oferecer impressão. Não somar quantidades de unidades incompatíveis em um único indicador.

9. Dados, segurança e integridade

Usar a estrutura atual suportada pelo projeto Lovable, com TypeScript e backend persistente. Preferir integração Supabase para PostgreSQL, autenticação e arquivos privados, ou reutilizar backend já configurado compatível. Não criar dois backends paralelos nem substituir persistência por localStorage. Se houver conexão manual necessária, indicar exatamente a ação e não apresentar gravações simuladas como reais.

Modelo relacional mínimo, implementado progressivamente:

organizations, organization_members, role_assignments, issuers;

customers, customer_locations, salespeople, sales_channels;

products, product_presentations, product_aliases, price_lists, price_list_items;

presales, presale_items, followups, quotes, quote_versions, quote_items;

sales_orders, sales_order_items, deliveries, delivery_items;

warehouses, stock_lots, stock_movements, stock_reservations;

suppliers, purchase_orders, purchase_items, purchase_receipts;

recipes, recipe_versions, recipe_items, production_orders, production_allocations, production_reports;

financial_accounts, financial_titles, settlements, financial_movements, financial_categories;

import_batches, import_rows, import_conflicts, historical_sales, audit_events.

Usar UUIDs, chaves estrangeiras e organization_id nas entidades operacionais. Vínculos entre entidades devem pertencer à mesma organização. Identificadores legados não são IDs de banco. Para eventos que afetem vários módulos, usar transações no backend, restrições únicas e chaves de idempotência; dupla execução não pode duplicar pedido, parcela ou movimento. Registrar versão para evitar sobrescrita por dois usuários.

Login obrigatório; acesso inicial por convite/aprovação do administrador. Perfis: administrador, gestor, comercial, financeiro, produção/estoque e consulta. Comercial visualiza carteira autorizada; financeiro opera títulos e contas; produção vê demanda, produtos e insumos necessários, sem acesso irrestrito a dados financeiros. Criar matriz explícita de permissões e aplicar no banco/backend, não apenas escondendo botões. Ativar e testar RLS nas tabelas expostas, inclusive arquivos privados e relatórios. Usuário não pode atribuir a si mesmo papel de administrador; não expor segredos de serviço no navegador.

Auditoria de alterações relevantes: ator, data, entidade, ação, estado anterior/posterior, motivo e origem. Registro de negócio concluído não pode ser apagado para corrigir erro; usar cancelamento, estorno ou inativação. Relatórios e exportações obedecem às mesmas permissões dos registros.

10. Entrega em fases

Mantenha este documento como especificação geral. Comece implementando a fase 1, sem tentar representar todos os módulos como concluídos. Não entregue somente um plano: execute a primeira etapa com telas, persistência, regras e validação. Se um dado de negócio ambíguo não bloquear a estrutura, registre a pendência e prossiga sem inventá-lo.

Fase 1 — núcleo comercial: estrutura visual, login/perfis, empresa/emitentes, clientes/lojas, vendedores/canais, produtos/apresentações e preços, pré-vendas, orçamentos e pedidos. Criar rascunho, calcular valores, salvar, reabrir e converter orçamento em pedido sem duplicação. Separar confirmação comercial e implantação posterior de reservas/títulos; enquanto as integrações não estiverem implementadas, permitir rascunhos e bloquear confirmação operacional com explicação clara. Incluir lista de pendências de cadastro/importação.

Fase 2 — importação e histórico: leitura dos layouts reais, área temporária, deduplicação, conflitos, reconciliação e relatórios históricos. Só importar os dados reais quando os arquivos estiverem anexados e os mapeamentos forem aprovados.

Fase 3 — financeiro e estoque integrado: títulos/parcelas, recebimentos/pagamentos, contas, movimentos, reservas, expedição parcial e confirmação atômica do pedido. Habilitar operação completa apenas após os testes integrados.

Fase 4 — produção e compras: receitas/fichas, demanda, ordens, apontamentos, lotes, perdas, compras e recebimentos integrados.

Fase 5 — relatórios e homologação: filtros, exportações, impressão, revisão das permissões, testes de concorrência e conferência do fluxo completo.

Durante o desenvolvimento, usar exemplos sintéticos somente em ambiente de demonstração claramente identificado, separados dos dados reais. Não preencher caixa, estoque, clientes ou pedidos de produção com números inventados. Áreas ainda não implementadas devem indicar isso, sem botões de sucesso fictício.

11. Critérios de aceite

Cliente, produto e orçamento salvos continuam disponíveis após recarregar e acessar por outra sessão autorizada.

A conversão do mesmo orçamento, acionada duas vezes ou por duas sessões, cria um único pedido.

80 unidades × R$ 2,10 e 2 fardos de 40 × R$ 84,00 resultam em R$ 168,00 e 80 unidades base, sem dupla baixa.

1,5 fardo de 40 gera 60 unidades base; fracionamento incompatível é recusado.

Alterar preço do catálogo não altera pedido já confirmado.

Os itens dos exemplos Otavio e Super Nova recompõem R$ 1.585,00 e R$ 1.478,00, respectivamente; sugestões continuam documentos separados até vinculação validada.

Parcelamento soma o total exato; recebimento parcial altera o saldo corretamente; estorno reverte o efeito uma única vez.

Pedido confirmado gera reservas e títulos uma vez; falha em parte da operação reverte o conjunto. Duas confirmações concorrentes não reservam o mesmo saldo acima do disponível.

Expedição parcial baixa somente o expedido e mantém o saldo; cancelamento libera reservas sem apagar recebimentos ou entregas.

Produção parcial consome insumos e entra produto por apontamento, sem repetir movimentos ao concluir a ordem.

Arquivo duplicado é identificado; código/EAN ambíguo não funde produtos; #VALUE! e “19*” geram pendências visíveis.

Histórico de 2025 não se soma novamente ao detalhamento de vendedores e não gera contas vencidas nem estoque fictício.

Usuário sem permissão recebe recusa também ao chamar diretamente a API/banco; não acessa dados de outra organização ou amplia o próprio papel.

Relatórios respeitam filtros, período, unidade e permissões; nenhuma margem é mostrada sem base de custos.

Fluxo demonstrado: cadastrar → sugerir → orçar → aprovar → confirmar pedido → atender falta por produção/compra → expedir → receber → conferir saldos e histórico.

Ao concluir cada fase, informe o que funciona, o que foi testado, as pendências reais e a próxima fase. Não declare o ERP pronto antes de validar o fluxo integrado. Emissão de NF-e, registro bancário de boletos, conciliação automática, WhatsApp e integrações contábeis ficam fora da primeira entrega; manter apenas referências manuais até uma integração real ser solicitada e configurada.

FIM DO PROMPT

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/12068eaf-4d28-4d16-b9ef-1ef7c071caaf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
