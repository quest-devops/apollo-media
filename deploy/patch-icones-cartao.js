#!/usr/bin/env node
/*
 * ApolloMedia — ícones de ação do cartão de publicação (duplicar, prévia,
 * excluir), que aparecem no topo do cartão ao passar o mouse.
 *
 * O CONJUNTO DO POSTIZ NÃO ERA UM CONJUNTO
 * Os três vinham de famílias diferentes e todos PREENCHIDOS: a duplicata em
 * 32px de grade, o olho com pupila sólida e desenho pesado, a lixeira em 24px
 * com tampa cheia. Sobre a faixa verde do cartão, massa sólida vira borrão —
 * é o pior caso para ícone pequeno.
 *
 * Entram três ícones de TRAÇO, mesma grade (24), mesma espessura (1.8) e
 * mesmos cantos: duplicar (duas folhas), prévia (olho aberto) e excluir
 * (lixeira). Traço fino sobre verde mantém a forma legível em 16px e casa com
 * o resto da interface, que já é majoritariamente de traço.
 *
 * ⚠️ `fill="none"` no <svg> e `stroke="currentColor"` nos paths: é o que faz o
 * ícone herdar a cor do contexto — inclusive o grafite que a regra da marca
 * impõe sobre verde. Um ícone com `fill` fixo ignoraria essa regra, que foi
 * exatamente o problema do "+" do botão de publicar.
 */
const fs = require('fs');

const ARQ =
  process.argv[2] || '/app/apps/frontend/src/components/launches/calendar.tsx';

const cabecalho = (tooltipChave, tooltipTexto) => `    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-tooltip-id="tooltip"
      data-tooltip-content={t('${tooltipChave}', '${tooltipTexto}')}
    >`;

const NOVO_DUPLICATE = `const Duplicate = () => {
  const t = useT();
  return (
${cabecalho('duplicate_post', 'Duplicate Post')}
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M5.5 15.5H5A1.5 1.5 0 0 1 3.5 14V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v.5" />
    </svg>
  );
};
`;

const NOVO_PREVIEW = `const Preview = () => {
  const t = useT();
  return (
${cabecalho('preview_post', 'Preview Post')}
      <path d="M2.5 12S6.2 5.5 12 5.5 21.5 12 21.5 12 17.8 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
};
`;

const NOVO_DELETE = `export const DeletePost = () => {
  const t = useT();
  return (
${cabecalho('delete_post', 'Delete Post')}
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5V5A1.5 1.5 0 0 1 11 3.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
      <path d="M6.5 6.5l.75 12A2 2 0 0 0 9.25 20.5h5.5a2 2 0 0 0 2-1.99l.75-12" />
      <path d="M10.3 10.5v6M13.7 10.5v6" />
    </svg>
  );
};
`;

const texto = fs.readFileSync(ARQ, 'utf8');

/*
 * ⚠️ Cada componente é trocado INTEIRO, ancorado no nome e no fechamento
 * `\n};\n`. Trocar só o `d=` do path não bastaria: os originais são de grade
 * 32 e preenchidos, então o novo desenho precisa do cabeçalho novo junto
 * (viewBox, stroke, fill="none").
 */
const alvos = [
  { nome: 'Duplicate', re: /const Duplicate = \(\) => \{[\s\S]*?\n\};\n/, novo: NOVO_DUPLICATE },
  { nome: 'Preview', re: /const Preview = \(\) => \{[\s\S]*?\n\};\n/, novo: NOVO_PREVIEW },
  { nome: 'DeletePost', re: /export const DeletePost = \(\) => \{[\s\S]*?\n\};\n/, novo: NOVO_DELETE },
];

let saida = texto;
for (const alvo of alvos) {
  if (!alvo.re.test(saida)) {
    console.error(`!! ERRO: componente ${alvo.nome} nao encontrado (upstream mudou os icones?)`);
    process.exit(1);
  }
  saida = saida.replace(alvo.re, alvo.novo);
}
fs.writeFileSync(ARQ, saida);

// Conferir o EFEITO, não o exit code.
const final = fs.readFileSync(ARQ, 'utf8');
const ok =
  final.includes('M2.5 12S6.2 5.5 12 5.5') &&
  final.includes('<rect x="8.5" y="8.5"') &&
  final.includes('M6.5 6.5l.75 12A2 2 0') &&
  !final.includes('M27 5H9C8.46957 5'); // path preenchido da duplicata antiga
if (!ok) {
  console.error('!! ERRO: a troca dos icones do cartao nao gravou por completo');
  process.exit(1);
}
console.log('patch-icones-cartao: duplicar, previa e excluir redesenhados em traco');
