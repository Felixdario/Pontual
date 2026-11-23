import { DateTime } from 'luxon';
import type { DependenciasApp } from '../../application/portas-app';
import type { PrismaClient } from '../prisma';
import { FUSO_DEMO, SLUG_DEMO, semearDemo } from '../seed/demo';

/**
 * A demo publicada precisa parecer de hoje: o seed monta histórico e próximas duas semanas a partir
 * do dia em que roda. `true` quando a demo não existe ou foi semeada noutro dia (no fuso da demo).
 */
export function demoDesatualizada(semeadaEm: Date | null, agora: number): boolean {
  if (!semeadaEm) return true;
  const dia = (ms: number) => DateTime.fromMillis(ms, { zone: FUSO_DEMO }).toISODate();
  return dia(semeadaEm.getTime()) !== dia(agora);
}

/** Refaz a demo se ela for de outro dia. Devolve `true` quando refez. */
export async function renovarDemoSeDesatualizada(
  prisma: PrismaClient,
  deps: Pick<DependenciasApp, 'hasher' | 'relogio'>,
  log: (m: string) => void = () => undefined,
): Promise<boolean> {
  const agora = deps.relogio.agora();
  const demo = await prisma.estabelecimento.findUnique({
    where: { slug: SLUG_DEMO },
    select: { criadoEm: true },
  });
  if (!demoDesatualizada(demo?.criadoEm ?? null, agora)) return false;
  await semearDemo(prisma, { agora, hasher: deps.hasher, log });
  return true;
}

/**
 * DEMO_RENOVAR_DIARIA=true (só na hospedagem da demo): confere ao subir a API e depois a cada
 * `intervaloMs` (padrão 1 h), porque a instância pode ficar acordada de um dia para o outro.
 * Apaga e recria só o estabelecimento demo; agendamentos feitos por visitantes somem na renovação.
 */
export function iniciarJobDeDemoDiaria(
  prisma: PrismaClient,
  deps: DependenciasApp,
  intervaloMs = 3_600_000,
): () => void {
  let rodando = false;
  const rodada = async () => {
    if (rodando) return;
    rodando = true;
    try {
      if (await renovarDemoSeDesatualizada(prisma, deps, console.log))
        console.log('Demo renovada para hoje.');
    } catch (erro) {
      deps.registro.erro('Falha ao renovar a demo', erro);
    } finally {
      rodando = false;
    }
  };
  void rodada();
  const timer = setInterval(() => void rodada(), intervaloMs);
  timer.unref();
  return () => clearInterval(timer);
}
