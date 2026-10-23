import { TeamsComponent } from '@gitroom/frontend/components/settings/teams.component';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'ApolloMedia Equipes',
  description: '',
};

/*
 * ApolloMedia — "Equipes" saiu de Configurações e virou tela própria.
 *
 * O componente já era autossuficiente: não usa `useFormContext`, apesar de
 * viver dentro do <FormProvider> da tela de configurações. Foi o que permitiu
 * movê-lo sem reescrever nada — verificado antes de mexer.
 */
export default async function Index() {
  return (
    <div className="flex flex-col gap-[12px] p-[20px] bg-newBgColorInner flex-1">
      <TeamsComponent />
    </div>
  );
}
