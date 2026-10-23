/*
 * ApolloMedia — tela de autenticação no padrão dos apps Apollo.
 *
 * SUBSTITUI apps/frontend/src/app/(app)/auth/layout.tsx do Postiz.
 *
 * O upstream põe o formulário à esquerda e, à direita, um painel de marketing
 * ("Over 20,000+ Entrepreneurs use Postiz" + depoimentos). Isso não pode
 * aparecer para o cliente: é propaganda do produto de base dentro de um
 * produto vendido com a nossa marca.
 *
 * No lugar entra o split da casa — painel de arte à esquerda com o lockup e a
 * frase, formulário à direita — o mesmo do ApolloAuth, ApolloMail, Apollo
 * Cloud e ApolloDesk. Os valores visuais (cores, raios, sombras, tipos) foram
 * COPIADOS de apollo-desk/brand/login/login-apollo.css, não redesenhados: é o
 * que mantém os logins idênticos quando vistos lado a lado.
 *
 * ⚠️ POR QUE AQUI É COMPONENTE E NO ApolloDesk FOI CSS INJETADO
 * No Chatwoot a tela é um componente Vue compilado, e o fork estava limitado
 * ao OIDC — mexer no DOM custaria caro. Aqui o fork do frontend JÁ É a
 * decisão da frente (o Postiz não tem rebrand por configuração), o fonte vem
 * dentro da imagem e o build do Next leva menos de um minuto. Sendo assim,
 * mexer no componente é mais honesto e mais estável do que empilhar CSS por
 * cima de um DOM que não controlamos.
 *
 * ⚠️ O <h1> ("Sign In") continua vindo do componente do Postiz e NÃO foi
 * traduzido de propósito: o app inteiro está em inglês, e traduzir só o login
 * deixaria a costura à mostra. A tradução é decisão separada, registrada no
 * README da frente.
 */
import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import './apollo-login.css';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  await getT();

  return (
    <div className="apollo-login">
      <ReturnUrlComponent />

      {/* Painel de arte. Sai de cena abaixo de 1100px — em tela estreita
          sobra só o lockup, como nos outros apps. */}
      {/* ⚠️ A arte é um <img> com object-fit, e o degradê é uma camada
          própria, em vez de um `background` de várias camadas no <aside>.
          A versão em camadas ficava PRETA aqui — a mesma declaração aplicada
          inline pintava, vinda da folha de estilo não pintava — e depurar isso
          não valia o tempo: <img> + overlay é determinístico, dá semântica de
          carregamento à imagem e não depende da ordem de background-size. */}
      <aside className="apollo-painel">
        <img className="apollo-arte" src="/apollo-login-panel.webp" alt="" />
        <div className="apollo-veu" />
        <img
          className="apollo-lockup"
          src="/apollo-lockup.svg"
          alt="ApolloMedia"
        />
        <p className="apollo-frase">
          ApolloMedia — a presença da sua empresa nas redes, no horário certo.
        </p>
      </aside>

      {/* Coluna do formulário. */}
      <main className="apollo-coluna">
        <div className="apollo-form">{children}</div>
      </main>
    </div>
  );
}
