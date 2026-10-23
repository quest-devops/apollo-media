#!/usr/bin/env node
/*
 * ApolloMedia — traduz os textos que o Postiz deixou CRAVADOS no componente.
 *
 * POR QUE ESTE SEGUNDO SCRIPT EXISTE
 * ----------------------------------
 * O locale `pt` do Postiz está 100% completo (732 de 732 chaves) e o
 * rebrand-textos.js já o torna padrão. Mesmo assim sobra inglês na tela: são
 * strings que o upstream nunca passou pelo `t()` — estão escritas direto no
 * JSX. Nenhuma tradução de locale alcança isso; só editando o componente.
 *
 * ESCOPO — DELIBERADAMENTE PARCIAL
 * Entram aqui os termos GENÉRICOS e de tela principal (ações, rótulos de
 * ajustes, estados). Fica FORA o jargão específico de cada rede — "Flair" do
 * Reddit, "Made for kids" do YouTube, "Graduation Strategy" — por dois
 * motivos: são dezenas, e boa parte é nome próprio da plataforma, que o
 * usuário reconhece melhor em inglês (é assim que aparece no app da rede).
 *
 * ⚠️ POR QUE DICIONÁRIO E NÃO EDIÇÃO À MÃO
 * Editar 38 arquivos à mão viraria 38 conflitos no rebase. Um dicionário é
 * uma lista revisável, reaplicada a cada versão nova — e o que não casar mais
 * aparece na contagem, em vez de sumir em silêncio.
 *
 * ⚠️ A TROCA É ANCORADA NA SINTAXE, NUNCA SOLTA NO ARQUIVO.
 * Só casa `>Texto<` (conteúdo de elemento) e `label="Texto"` / `placeholder=`
 * / `title=`. Trocar a palavra solta pegaria nome de variável, chave de
 * objeto e import — e quebraria o build de um jeito difícil de rastrear.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = process.argv[2] || '/app/apps/frontend/src';

const DICIONARIO = {
  // ações
  Agent: 'Agente', Add: 'Adicionar', Apply: 'Aplicar', Back: 'Voltar', Cancel: 'Cancelar',
  Close: 'Fechar', Copy: 'Copiar', Publish: 'Publicar', Reply: 'Responder',
  Send: 'Enviar', Share: 'Compartilhar', Use: 'Usar', Repost: 'Repostar',
  'Close dialog': 'Fechar caixa de diálogo', 'Close window': 'Fechar janela',
  'Go to next page': 'Ir para a próxima página',
  'Go to previous page': 'Ir para a página anterior',
  // rótulos e seções
  Actions: 'Ações', Comments: 'Comentários', Count: 'Contagem',
  Created: 'Criado em', Draft: 'Rascunho', Errors: 'Erros',
  Group: 'Grupo', Message: 'Mensagem', Organization: 'Organização',
  Pending: 'Pendente', Platform: 'Plataforma', Primary: 'Principal',
  Private: 'Privado', Settings: 'Configurações', Users: 'Usuários',
  From: 'De', To: 'Para', Name: 'Nome', Email: 'E-mail', Media: 'Mídia',
  Channel: 'Canal', Categories: 'Categorias', Company: 'Empresa',
  Code: 'Código', Feedback: 'Comentário', Delay: 'Atraso',
  Integrations: 'Integrações', 'New Password': 'Nova senha',
  'Per page': 'Por página', 'Post ID': 'ID da publicação',
  'Date Metrics': 'Período das métricas',
  'Current Timezone': 'Fuso horário atual',
  'All platforms': 'Todas as plataformas',
  'Error Details': 'Detalhes do erro',
  'Event Details': 'Detalhes do evento',
  'Event Title': 'Título do evento',
  'Offer Details': 'Detalhes da oferta',
  'Admin Stats': 'Estatísticas de administração',
  'Copy Debug Code': 'Copiar código de depuração',
  'End Date': 'Data de término',
  'Link URL': 'URL do link',
  'Call to Action': 'Chamada para ação',
  'Call to Action URL': 'URL da chamada para ação',
  'Cover picture': 'Imagem de capa',
  'Select Avatar': 'Selecionar avatar',
  'Select Organization': 'Selecionar organização',
  'Select Voice': 'Selecionar voz',
  'Generate Video': 'Gerar vídeo',
  'Generate Captions': 'Gerar legendas',
  'Aspect Ratio': 'Proporção',
  'Message Type': 'Tipo de mensagem',
  'Autogenerate content': 'Gerar conteúdo automaticamente',
  'Canonical Link': 'Link canônico',
  'Announcement Color': 'Cor do aviso',
  // tela de configurações
  'Email Notifications': 'Notificações por e-mail',
  'Success Emails': 'E-mails de sucesso',
  'Failure Emails': 'E-mails de falha',
  'Streak Reminder Emails': 'E-mails de lembrete de sequência',
  'Receive email notifications when posts are published successfully':
    'Receber e-mail quando uma publicação for concluída com sucesso',
  'Receive email notifications when posts fail to publish':
    'Receber e-mail quando uma publicação falhar',
  'Receive email reminders when your posting streak is about to end':
    'Receber lembrete quando sua sequência de publicações estiver prestes a acabar',
  'Shortlink Settings': 'Encurtador de links',
  Developers: 'Desenvolvedores',
  'Approved Apps': 'Aplicativos aprovados',
  Teams: 'Equipes',
  '24 hours': '24 horas',
  '7 days': '7 dias',
  '30 days': '30 dias',
  // estados e vazios
  'No results found': 'Nenhum resultado encontrado',
  'No Integrations Yet': 'Ainda não há integrações',
  'Most relevant': 'Mais relevantes',
  'Read your post analytics': 'Veja as métricas da sua publicação',
  'Access your integrations and channels': 'Acesse suas integrações e canais',
};

function varre(dir, acc = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const cheio = path.join(dir, item.name);
    if (cheio.includes('node_modules') || cheio.includes('.next')) continue;
    if (item.isDirectory()) varre(cheio, acc);
    else if (path.extname(item.name) === '.tsx') acc.push(cheio);
  }
  return acc;
}

const escapa = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let trocas = 0, arquivos = 0;
const usados = new Set();

for (const arq of varre(RAIZ)) {
  const antes = fs.readFileSync(arq, 'utf8');
  let texto = antes;
  for (const [en, pt] of Object.entries(DICIONARIO)) {
    const e = escapa(en);
    const alvos = [
      // ⚠️ `\s*` dos dois lados NÃO é zelo: o JSX quebra linha e indenta o
      // conteúdo (`>\n        Email Notifications\n      <`). A primeira
      // versão exigia o texto colado nos sinais e passou direto por metade da
      // tela de configurações — traduzia "Date Metrics" e deixava
      // "Email Notifications" em inglês logo abaixo.
      [new RegExp(`>\\s*${e}\\s*<`, 'g'), `>${pt}<`],
      [new RegExp(`(label|placeholder|title)="${e}"`, 'g'), `$1="${pt}"`],
      // Terceira forma: literal em objeto — `name: 'Agent'`, `label: '24 hours'`.
      // É como o Postiz monta o menu lateral e as listas de opção. O item
      // "Agent" do menu é o único que o upstream esqueceu de passar pelo t():
      // todos os vizinhos usam t('calendar', 'Calendar') e só ele é cru.
      [new RegExp(`\\b(name|label|title|placeholder):\\s*'${e}'`, 'g'), `$1: '${pt}'`],
    ];
    for (const [re, sub] of alvos) {
      const achou = texto.match(re);
      if (achou) { trocas += achou.length; usados.add(en); texto = texto.replace(re, sub); }
    }
  }
  if (texto !== antes) { fs.writeFileSync(arq, texto); arquivos++; }
}

// Conferir o EFEITO, não o exit code. E mais: avisar quais entradas do
// dicionário NÃO casaram — é assim que se percebe que o upstream renomeou ou
// finalmente passou aquele texto pelo t(), em vez de carregar entrada morta.
const mortos = Object.keys(DICIONARIO).filter((k) => !usados.has(k));
console.log(`rebrand-textos-cravados: ${trocas} trocas em ${arquivos} arquivos`);
if (mortos.length) console.log(`  (sem uso nesta versao: ${mortos.join(', ')})`);
if (trocas === 0) {
  console.error('!! ERRO: nenhuma troca — o JSX mudou de forma no upstream?');
  process.exit(1);
}
