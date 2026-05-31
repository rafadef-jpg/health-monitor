export type Achievement = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  sarcasm: string; // frase sarcástica ao desbloquear
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "sobrevivente",
    emoji: "🏆",
    name: "Sobrevivente",
    description: "Completou 7 dias usando o app",
    sarcasm: "Parabéns, você durou mais que seu plano de academia.",
  },
  {
    id: "maquina_humana",
    emoji: "🔥",
    name: "Máquina Humana",
    description: "5 dias verdes consecutivos",
    sarcasm: "Caralho, você é um ser humano funcional. Raridade.",
  },
  {
    id: "zumbi_funcional",
    emoji: "🧟",
    name: "Zumbi Funcional",
    description: "Recuperação vermelha por 3+ dias e ainda acordou",
    sarcasm: "Seu corpo tá pedindo socorro mas você ignorou. Respeito.",
  },
  {
    id: "rei_travesseiro",
    emoji: "😴",
    name: "Rei do Travesseiro",
    description: "Sono ruim por 5+ dias consecutivos",
    sarcasm: "Você dorme mas não descansa. Igual trabalhar de graça.",
  },
  {
    id: "campeao_sofa",
    emoji: "🛋️",
    name: "Campeão do Sofá",
    description: "Stress zero por 3+ dias seguidos",
    sarcasm: "Seu corpo não fez nada. Literalmente nada. Orgulho.",
  },
  {
    id: "viciado_cafe",
    emoji: "☕",
    name: "Viciado em Café",
    description: "Stress alto por 3+ dias consecutivos",
    sarcasm: "Você tá estressado há dias. Tudo bem, o café também te ama.",
  },
  {
    id: "morto_vivo",
    emoji: "💀",
    name: "Morto-Vivo",
    description: "Vermelho por 3+ dias consecutivos",
    sarcasm: "Você não tá bem. Você sabe disso. Todos sabem disso.",
  },
  {
    id: "atleta_mentira",
    emoji: "🥇",
    name: "Atleta de Mentira",
    description: "10+ dias de streak sem chegar a ótimo",
    sarcasm: "10 dias monitorando sem melhorar. Comprometimento inútil.",
  },
  {
    id: "fantasma_academia",
    emoji: "👻",
    name: "Fantasma da Academia",
    description: "Primeira semana completa sem dia ótimo",
    sarcasm: "Você pagou a academia. Só não foi. Clássico.",
  },
  {
    id: "ressaca_eterna",
    emoji: "🍺",
    name: "Ressaca Eterna",
    description: "Coração abaixo do normal por 7+ dias",
    sarcasm: "Seu coração tá de férias há uma semana. Que sortudo.",
  },
  {
    id: "primeiro_verde",
    emoji: "⚡",
    name: "Flash Humano",
    description: "Primeiro dia verde",
    sarcasm: "Uau. Um dia bom. Anota aí, vai ser raro.",
  },
  {
    id: "ironman",
    emoji: "🦾",
    name: "Ironman",
    description: "30 dias de streak",
    sarcasm: "30 dias monitorando. Você é louco ou disciplinado. Talvez os dois.",
  },
];
