'use client';
/*
 * ApolloMedia — logo da barra lateral.
 *
 * SUBSTITUI apps/frontend/src/components/new-layout/logo.tsx do Postiz, que
 * traz o "P" deles como SVG inline (cartões empilhados). A varredura de cores
 * deixava aquele "P" verde — verde, mas ainda o "P" do Postiz.
 *
 * ⚠️ O ícone é servido de /apollo-icone.svg, na RAIZ do public/. Subpasta não
 * funciona: o matcher do proxy.ts do Postiz só deixa passar arquivo de um
 * segmento, e qualquer caminho com barra volta 307 para /auth — a imagem
 * simplesmente não aparece, sem erro nenhum no log.
 *
 * As classes de tamanho são as mesmas do original, para o alinhamento do
 * cabeçalho da barra lateral não mudar.
 */
export const Logo = () => {
  return (
    <img
      src="/apollo-icone.svg"
      alt="ApolloMedia"
      width={60}
      height={60}
      className="mt-[8px] min-w-[60px] min-h-[60px] w-[60px] h-[60px] object-contain"
    />
  );
};
