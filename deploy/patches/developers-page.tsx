import { PublicComponent } from '@gitroom/frontend/components/public-api/public.component';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'ApolloMedia Desenvolvedores',
  description: '',
};

/*
 * ApolloMedia — "Desenvolvedores" saiu de Configurações e virou tela própria.
 *
 * É a tela de chave de API, servidor MCP e CLI — o ponto de integração do
 * ApolloMedia com o resto da casa (o `mkt-engine` publica por aqui). Enterrada
 * numa aba de configurações, ninguém achava.
 *
 * Como o TeamsComponent, o PublicComponent não usa `useFormContext` — por isso
 * sai do <FormProvider> das configurações sem quebrar.
 */
export default async function Index() {
  return (
    <div className="flex flex-col gap-[12px] p-[20px] bg-newBgColorInner flex-1">
      <PublicComponent />

      {/* AGPL-3.0 §13 — segundo ponto de oferta do fonte, além da tela de
          login. Aqui é onde o público técnico procura, e é a tela de chave de
          API/MCP, então o link cai no contexto certo. */}
      <p className="text-[12px] text-customColor18 mt-[8px]">
        ApolloMedia é um trabalho derivado do{' '}
        <a
          className="underline hover:text-btnPrimary"
          href="https://github.com/gitroomhq/postiz-app"
          target="_blank"
          rel="noreferrer"
        >
          Postiz
        </a>{' '}
        sob AGPL-3.0. O fonte modificado está em{' '}
        <a
          className="underline hover:text-btnPrimary"
          href="https://github.com/quest-devops/apollo-media"
          target="_blank"
          rel="noreferrer"
        >
          github.com/quest-devops/apollo-media
        </a>
        .
      </p>
    </div>
  );
}
