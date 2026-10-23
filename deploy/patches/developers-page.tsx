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
    </div>
  );
}
