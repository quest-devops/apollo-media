#!/usr/bin/env node
/*
 * ApolloMedia — "Equipes" e "Desenvolvedores" saem de Configurações e viram
 * itens do menu lateral, logo abaixo de "Divulgações".
 *
 * POR QUE MOVER
 * Decisão do Leonardo (03/set). As duas não são ajuste fino de conta: "Equipes"
 * é quem trabalha na organização, e "Desenvolvedores" é a tela de chave de API,
 * servidor MCP e CLI — o ponto por onde o `mkt-engine` publica. Enterradas numa
 * aba de configurações, ninguém acha.
 *
 * ⚠️ VIRAM ROTAS DE VERDADE (/teams e /developers), não link para
 * `/settings?tab=...`. Com query string o `MenuItem` nunca marcaria o item como
 * ativo (ele compara `usePathname()`, que ignora a query) e a pessoa continuaria
 * vendo a coluna de abas de Configurações ao lado — ou seja, não teria saído
 * de lá de fato.
 *
 * ⚠️ Isso só é seguro porque os dois componentes NÃO usam `useFormContext`:
 * eles viviam dentro do <FormProvider> da tela de configurações, mas não
 * dependiam dele. Verificado antes de mover — se dependessem, arrancá-los
 * quebraria em tempo de execução, não no build.
 */
const fs = require('fs');

const MENU =
  process.argv[2] || '/app/apps/frontend/src/components/layout/top.menu.tsx';
const CONFIG =
  process.argv[3] || '/app/apps/frontend/src/components/layout/settings.component.tsx';

// --- 1. entradas no menu, logo depois de "Divulgações" ---------------------
const ANCORA = "      path: '/plugs',\n    },";

/*
 * Ícones no mesmo traço dos vizinhos do menu (grade 24, 1.8 de espessura,
 * `currentColor`) — herdam o verde do item ativo e o cinza do inativo.
 *   • Equipes: duas pessoas.
 *   • Desenvolvedores: chaves de código `< >` com barra, que é o desenho que o
 *     usuário associa a API/integração. O MCP não tem um símbolo consagrado;
 *     inventar um só para esse item deixaria o menu com uma forma que ninguém
 *     reconhece.
 */
const NOVAS_ENTRADAS = `      path: '/plugs',
    },
    {
      name: t('teams', 'Teams'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
          <circle cx="10" cy="7.5" r="3.2" />
          <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.38" />
          <path d="M15.4 4.6a3.2 3.2 0 0 1 0 5.8" />
        </svg>
      ),
      path: '/teams',
    },
    {
      name: t('developers', 'Developers'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 8.5 5 12l3.5 3.5" />
          <path d="M15.5 8.5 19 12l-3.5 3.5" />
          <path d="M13.2 5.5 10.8 18.5" />
        </svg>
      ),
      labelCurto: 'Dev',
      path: '/developers',
    },`;

/*
 * ⚠️ RÓTULO CURTO NO MENU, NOME COMPLETO NO CABEÇALHO.
 * "Desenvolvedores" tem 15 caracteres e ESTOURA a barra lateral, que é
 * estreita — foi o que quebrou o layout na primeira versão. Mas trocar o
 * `name` por "Dev" renomearia a TELA junto: o componente `Title` monta o
 * cabeçalho procurando o item de menu cujo `path` casa com a rota e usando o
 * `name` dele. Um cabeçalho escrito "Dev" seria pior que o menu quebrado.
 *
 * Daí o campo `labelCurto`: o menu usa ele quando existe, o cabeçalho continua
 * usando `name`. Precisa entrar também na interface, senão o build do Next
 * falha na checagem de tipos.
 */
const INTERFACE_ANTIGA = 'interface MenuItemInterface {\n  name: string;';
const INTERFACE_NOVA =
  'interface MenuItemInterface {\n  name: string;\n  /* ApolloMedia: rótulo curto para a barra lateral estreita (o cabeçalho da\n     tela continua usando `name`). */\n  labelCurto?: string;';

const RENDER_ANTIGO = 'label={item.name}';
const RENDER_NOVO = 'label={item.labelCurto || item.name}';

const menu = fs.readFileSync(MENU, 'utf8');
if ((menu.split(ANCORA).length - 1) !== 1) {
  console.error('!! ERRO: nao achei (ou achei duplicada) a entrada de menu /plugs');
  process.exit(1);
}
if (!menu.includes(INTERFACE_ANTIGA)) {
  console.error('!! ERRO: MenuItemInterface nao encontrada (upstream mudou?)');
  process.exit(1);
}
const quantosRender = menu.split(RENDER_ANTIGO).length - 1;
if (quantosRender !== 2) {
  console.error(`!! ERRO: esperava 2 usos de label={item.name} (os dois grupos do menu), achei ${quantosRender}`);
  process.exit(1);
}
fs.writeFileSync(
  MENU,
  menu
    .replace(ANCORA, NOVAS_ENTRADAS)
    .replace(INTERFACE_ANTIGA, INTERFACE_NOVA)
    .split(RENDER_ANTIGO)
    .join(RENDER_NOVO)
);

// --- 2. tirar as duas abas de Configurações --------------------------------
/*
 * Só a LISTA de abas é tocada. O `switch` que renderiza cada aba continua
 * intacto de propósito: mexer nele seria trabalho extra para nenhum efeito
 * visível (sem entrada na lista, aquele `tab` nunca é selecionado) e mais
 * conflito no rebase.
 */
const ABA_EQUIPES = `    if (user?.tier?.team_members && isGeneral) {
      arr.push({ tab: 'teams', label: t('teams', 'Teams') });
    }
`;
const ABA_API = `    if (user?.tier?.public_api && isGeneral && showLogout) {
      arr.push({ tab: 'api', label: t('developers', 'Developers') });
    }
`;

const config = fs.readFileSync(CONFIG, 'utf8');
const erros = [];
if (!config.includes(ABA_EQUIPES)) erros.push('aba Equipes nao encontrada');
if (!config.includes(ABA_API)) erros.push('aba Desenvolvedores nao encontrada');
if (erros.length) {
  console.error('!! ERRO: ' + erros.join(' | ') + ' (upstream mudou as configuracoes?)');
  process.exit(1);
}
fs.writeFileSync(CONFIG, config.replace(ABA_EQUIPES, '').replace(ABA_API, ''));

// --- Conferir o EFEITO, não o exit code ------------------------------------
const menuFinal = fs.readFileSync(MENU, 'utf8');
const configFinal = fs.readFileSync(CONFIG, 'utf8');
const ok =
  menuFinal.includes("path: '/teams',") &&
  menuFinal.includes("path: '/developers',") &&
  menuFinal.includes("labelCurto: 'Dev',") &&
  menuFinal.includes('label={item.labelCurto || item.name}') &&
  !configFinal.includes("arr.push({ tab: 'teams'") &&
  !configFinal.includes("arr.push({ tab: 'api'");
if (!ok) {
  console.error('!! ERRO: a mudanca de Equipes/Desenvolvedores nao gravou por completo');
  process.exit(1);
}
console.log('patch-menu-equipes-dev: Equipes e Desenvolvedores movidos para o menu lateral');
