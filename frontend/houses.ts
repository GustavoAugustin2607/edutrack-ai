// The four EduTrack houses. Each one is a learning profile, not a ranking of
// intelligence: the ceremony just suggests where a student studies best.
export type HouseId = 'lumina' | 'eco' | 'forja' | 'raiz';

export type House = {
  id: HouseId;
  name: string;
  profile: string;
  motto: string;
  color: string;
  deep: string;
  soft: string;
  emblem: string;
  description: string;
  strengths: string[];
  tips: string[];
  tools: Array<{ label: string; page: string }>;
};

export const HOUSES: Record<HouseId, House> = {
  lumina: {
    id: 'lumina',
    name: 'Lumina',
    profile: 'Aprendizagem visual',
    motto: 'Ver para compreender.',
    color: '#e0a030',
    deep: '#6b4400',
    soft: '#fdf0d4',
    emblem: 'eye',
    description:
      'Você pensa em imagens. Diagramas, cores, mapas mentais e linhas do tempo fazem as ideias se encaixarem.',
    strengths: ['Enxerga padrões e conexões', 'Memória visual forte', 'Organiza bem o espaço de estudo'],
    tips: [
      'Transforme cada capítulo em um mapa mental de uma página.',
      'Use uma cor fixa por tipo de informação (definição, exemplo, fórmula).',
      'Desenhe o problema antes de tentar resolver.',
    ],
    tools: [
      { label: 'Planejar a semana', page: 'Planejamento' },
      { label: 'Ver sua análise', page: 'Análise' },
    ],
  },
  eco: {
    id: 'eco',
    name: 'Eco',
    profile: 'Aprendizagem auditiva e social',
    motto: 'Quem explica, aprende duas vezes.',
    color: '#3b82f6',
    deep: '#102a66',
    soft: '#dbe8ff',
    emblem: 'waves',
    description:
      'Você aprende conversando, ouvindo e explicando. Debater uma ideia em voz alta é o que faz ela ficar.',
    strengths: ['Explica bem para os outros', 'Lembra do que ouviu', 'Aprende rápido em grupo'],
    tips: [
      'Explique o conteúdo em voz alta como se fosse o professor.',
      'Grave áudios curtos com os pontos-chave e ouça no caminho.',
      'Peça ao Tutor IA para explicar e depois reconte com suas palavras.',
    ],
    tools: [
      { label: 'Pedir explicação ao Tutor IA', page: 'Assistente' },
      { label: 'Jogar Quiz Relâmpago', page: 'Arena' },
    ],
  },
  forja: {
    id: 'forja',
    name: 'Forja',
    profile: 'Aprendizagem prática',
    motto: 'Aprender fazendo.',
    color: '#e5484d',
    deep: '#5c0e16',
    soft: '#ffe0e2',
    emblem: 'hammer',
    description:
      'Você aprende com as mãos na massa. Exercícios, projetos e tentativa e erro valem mais que horas de leitura.',
    strengths: ['Resolve problemas com rapidez', 'Não tem medo de errar', 'Transforma teoria em prática'],
    tips: [
      'Comece pelos exercícios e volte à teoria quando travar.',
      'Estude em blocos curtos de foco com pausas ativas.',
      'Crie um mini projeto para cada conteúdo importante.',
    ],
    tools: [
      { label: 'Abrir o Modo foco', page: 'Modo foco' },
      { label: 'Jogar na Arena', page: 'Arena' },
    ],
  },
  raiz: {
    id: 'raiz',
    name: 'Raiz',
    profile: 'Aprendizagem reflexiva (leitura e escrita)',
    motto: 'Profundidade antes de velocidade.',
    color: '#2a9d6f',
    deep: '#0b3d2a',
    soft: '#d6f3e6',
    emblem: 'feather',
    description:
      'Você aprende lendo com calma e escrevendo. Resumos, listas e anotações bem feitas são o seu mapa.',
    strengths: ['Compreensão profunda', 'Anotações organizadas', 'Constância no longo prazo'],
    tips: [
      'Feche o livro e escreva um resumo do que lembra antes de reler.',
      'Transforme cada resumo em flashcards.',
      'Revise na data marcada: a repetição espaçada é sua aliada.',
    ],
    tools: [
      { label: 'Revisar flashcards', page: 'Revisões' },
      { label: 'Jogo da Memória', page: 'Arena' },
    ],
  },
};
export const HOUSE_LIST = Object.values(HOUSES);

export type SortingQuestion = { prompt: string; options: Array<{ text: string; house: HouseId }> };

export const SORTING_QUESTIONS: SortingQuestion[] = [
  {
    prompt: 'Você precisa aprender um assunto novo até amanhã. O que faz primeiro?',
    options: [
      { text: 'Procuro um vídeo, infográfico ou mapa mental sobre ele.', house: 'lumina' },
      { text: 'Chamo alguém para me explicar ou conversar sobre o tema.', house: 'eco' },
      { text: 'Vou direto para os exercícios e aprendo errando.', house: 'forja' },
      { text: 'Leio o material com calma e vou anotando.', house: 'raiz' },
    ],
  },
  {
    prompt: 'Na hora da prova, do que você lembra com mais facilidade?',
    options: [
      { text: 'Da explicação que o professor deu em aula.', house: 'eco' },
      { text: 'Do exercício parecido que eu já resolvi.', house: 'forja' },
      { text: 'Do resumo que eu mesmo escrevi.', house: 'raiz' },
      { text: 'Da imagem, da cor ou da posição da informação na página.', house: 'lumina' },
    ],
  },
  {
    prompt: 'Como é o seu caderno ideal?',
    options: [
      { text: 'Rabiscado de contas, testes e tentativas.', house: 'forja' },
      { text: 'Organizado em tópicos, com textos bem escritos.', house: 'raiz' },
      { text: 'Colorido, com setas, esquemas e desenhos.', house: 'lumina' },
      { text: 'Quase vazio: prefiro gravar áudios ou discutir.', house: 'eco' },
    ],
  },
  {
    prompt: 'Você travou em um problema difícil. O que faz?',
    options: [
      { text: 'Pesquiso e leio mais sobre o assunto até entender.', house: 'raiz' },
      { text: 'Desenho o problema para enxergar o que está acontecendo.', house: 'lumina' },
      { text: 'Explico em voz alta ou peço ajuda a alguém.', house: 'eco' },
      { text: 'Tento outro caminho, erro de novo, até sair.', house: 'forja' },
    ],
  },
  {
    prompt: 'Em um trabalho em grupo, qual parte você pega?',
    options: [
      { text: 'Os slides e a parte visual.', house: 'lumina' },
      { text: 'A apresentação e o debate com a turma.', house: 'eco' },
      { text: 'A parte prática: montar, programar, construir.', house: 'forja' },
      { text: 'A pesquisa e o texto final.', house: 'raiz' },
    ],
  },
  {
    prompt: 'Qual é o seu momento favorito de uma aula?',
    options: [
      { text: 'Leitura e reflexão em silêncio.', house: 'raiz' },
      { text: 'Laboratório ou atividade prática.', house: 'forja' },
      { text: 'Quando o professor desenha um esquema no quadro.', house: 'lumina' },
      { text: 'Debates e rodadas de perguntas.', house: 'eco' },
    ],
  },
  {
    prompt: 'Como você decora uma fórmula ou definição?',
    options: [
      { text: 'Repito em voz alta ou invento uma musiquinha.', house: 'eco' },
      { text: 'Escrevo várias vezes e entendo de onde ela vem.', house: 'raiz' },
      { text: 'Uso ela em vários exercícios seguidos.', house: 'forja' },
      { text: 'Visualizo ela destacada, numa cor ou num mapa.', house: 'lumina' },
    ],
  },
  {
    prompt: 'Se pudesse escolher um superpoder de estudo, qual seria?',
    options: [
      { text: 'Aprender qualquer habilidade na primeira tentativa.', house: 'forja' },
      { text: 'Memória fotográfica.', house: 'lumina' },
      { text: 'Ler e entender um livro inteiro em um minuto.', house: 'raiz' },
      { text: 'Ouvir uma vez e nunca mais esquecer.', house: 'eco' },
    ],
  },
];

/** What the hat mutters after each answer, to keep the ceremony alive. */
export const HAT_LINES: Record<HouseId, string[]> = {
  lumina: ['Hmm… vejo olhos atentos aos detalhes.', 'Cores, formas… interessante.', 'Você enxerga o que outros não veem.'],
  eco: ['Ah, uma voz que gosta de ser ouvida!', 'Conversar te faz pensar, não é?', 'Ouço muita coisa aqui dentro…'],
  forja: ['Mãos inquietas… gosta de fazer, hein?', 'Errar não te assusta. Ótimo.', 'Sinto cheiro de ferramenta quente!'],
  raiz: ['Paciência… e muita profundidade.', 'Palavras bem escolhidas por aqui.', 'Uma mente que gosta de ir até o fundo.'],
};

export const THINKING_LINES = [
  'Difícil… muito difícil…',
  'Há coragem aqui, e curiosidade também…',
  'Onde devo colocar você?',
  'Já sei!',
];

export function sortHouse(answers: HouseId[]) {
  const scores: Record<HouseId, number> = { lumina: 0, eco: 0, forja: 0, raiz: 0 };
  for (const house of answers) scores[house]++;
  const best = Math.max(...Object.values(scores));
  const tied = (Object.keys(scores) as HouseId[]).filter(h => scores[h] === best);
  // Ties go to the house chosen most recently: later answers reflect the
  // student's settled preference after warming up.
  const house = [...answers].reverse().find(h => tied.includes(h)) ?? tied[0];
  return { house, scores };
}

export const HOUSE_CHANGE_PRICE = 150;
