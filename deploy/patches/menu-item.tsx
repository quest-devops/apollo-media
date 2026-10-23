'use client';
/*
 * ApolloMedia — item do menu lateral.
 *
 * SUBSTITUI apps/frontend/src/components/new-layout/menu-item.tsx.
 *
 * ⚠️ POR QUE NÃO É MAIS FUNDO INTEIRO
 * O upstream marca o item ativo com `bg-boxFocused` — uma pílula que ocupa a
 * largura toda do item. Com a pílula em BRANCO (padrão do Postiz) isso passa
 * despercebido; pintada com o verde da marca, a peça vira a coisa mais forte
 * da tela e, na barra estreita, ainda ENCOSTA E VAZA pela borda direita do
 * menu (o item tem `w-full` mais padding, e o raio de 12px não perdoa).
 *
 * No lugar entra uma BARRA VERTICAL verde à esquerda do item selecionado —
 * indicador clássico de navegação lateral: marca a seleção sem disputar
 * atenção com o conteúdo e sem depender da largura do menu.
 *
 * ⚠️ SEM FUNDO NO HOVER TAMBÉM. Trocar só a pílula do ativo e deixar o
 * `hover:bg-*` de pé resolvia metade: ao passar o mouse, o retângulo cinza
 * reaparecia e vazava igual — o mesmo defeito, só que intermitente.
 * Hover e seleção usam a MESMA peça, mudando só a cor.
 *
 * ⚠️ E o texto do item ativo tem de mudar junto: `--new-textItemFocused` era
 * pensado para ser lido SOBRE a pílula clara (no tema escuro, quase preto).
 * Sem a pílula, aquele valor sumiria no fundo escuro — por isso o rótulo usa
 * `text-btnPrimary`, o verde da marca por tema.
 */
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{
  label: string;
  icon: ReactNode;
  path: string;
  onClick?: () => void;
  /*
   * Modo "só ícone", usado no grupo de baixo da barra (Configurações).
   *
   * Ali o rótulo é ruído: é um item só, sempre no mesmo lugar, e a engrenagem
   * já é universalmente entendida. Sem texto, o ícone pode crescer e ocupar o
   * espaço com folga. A barra de estado também sai — ela existe para
   * diferenciar itens numa LISTA, e não há lista aqui.
   *
   * O nome continua no `title`, então o tooltip do navegador e o leitor de
   * tela seguem anunciando "Configurações".
   */
  soIcone?: boolean;
}> = ({ label, icon, path, onClick, soIcone }) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  /*
   * ⚠️ O rótulo ativo usa `text-btnPrimary`, NÃO `text-textItemFocused`.
   * `textItemFocused` é a cor do texto que fica DENTRO da pílula verde (grafite,
   * pela regra de contraste da marca) e continua servindo às abas do calendário.
   * Aqui, sem pílula atrás, aquele grafite sumiria no fundo escuro.
   *
   * No modo só-ícone o hover também vai para o verde: sem texto e sem barra,
   * a cor é o único retorno visual que sobra.
   */
  const className = clsx(
    'relative group w-full minCustom:h-[54px] custom:h-[44px] py-[8px] px-[6px] minCustom:gap-[4px] custom:gap-[2px] flex flex-col font-[600] items-center justify-center rounded-[12px] transition-colors',
    isActive
      ? 'text-btnPrimary'
      : clsx(
          'text-textItemBlur',
          soIcone ? 'hover:text-btnPrimary' : 'hover:text-menuDotsHover'
        )
  );

  // A barra existe sempre no DOM; o que muda é cor e opacidade. Animar
  // opacidade em vez de montar/desmontar o elemento evita o "pulo" de layout
  // que aparece quando o mouse atravessa a lista rápido.
  const barra = clsx(
    'absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-[3px] transition-opacity duration-150',
    isActive
      ? 'bg-btnPrimary opacity-100'
      : 'bg-menuDots opacity-0 group-hover:opacity-100'
  );

  const inner = (
    <>
      {/* Barra de estado: cinza no hover, verde quando selecionado. `left-0`
          encostada na borda interna do menu — nunca ultrapassa a largura do
          item, que era o defeito da pílula de fundo cheio. */}
      {!soIcone && <span aria-hidden="true" className={barra} />}
      <div
        className={clsx(
          'transition-transform',
          soIcone ? 'scale-[1.35]' : 'custom:scale-90'
        )}
      >
        {icon}
      </div>
      {!soIcone && (
        <div className="custom:text-[9px] minCustom:text-[10px] leading-[1.1] text-center">
          {label}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} title={label} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      title={label}
      {...(path.indexOf('http') === 0 && { target: '_blank' })}
      className={className}
    >
      {inner}
    </Link>
  );
};
