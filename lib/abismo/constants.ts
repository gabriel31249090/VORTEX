// lib/abismo/constants.ts
import type { EnemyDef, RelicDef, ShopItemDef, EventDef, ClassId, ClassPassive, HandType } from './types'

export const SUITS: Record<string, { name: string; sym: string; cls: string }> = {
  H: { name: 'Copas', sym: '♥', cls: 'red' },
  D: { name: 'Ouros', sym: '♦', cls: 'red' },
  S: { name: 'Espadas', sym: '♠', cls: 'black' },
  C: { name: 'Paus', sym: '♣', cls: 'black' },
}

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export const RV: Record<string, number> = {
  J: 11, Q: 12, K: 13, A: 14,
}

// Mapeia o classId da ficha (Supabase) pro passive do jogo original
export const CLASS_PASSIVES: Record<ClassId, ClassPassive> = {
  gambler: 'gold_double',
  trickster: 'extra_discard',
  knight: 'armor_start',
  necromancer: 'lifesteal',
  dealer: 'cursed_master',
}

export const ENEMIES: EnemyDef[] = [
  { id: 'debt_ghost', name: 'Fantasma das Dívidas', icon: '👻', type: 'Espectro', hp: 22, atk: [4, 7], desc: 'Almas presas por dívidas impagáveis.', skills: '• Roubo Astral: -3 fichas ao atacar\n• Desaparecer: cura 4 HP uma vez', floor: 1, reward: { gold: [10, 20] } },
  { id: 'chip_rat', name: 'Rato das Fichas', icon: '🐀', type: 'Vermin', hp: 18, atk: [3, 6], desc: 'Infesta cassinos roendo fichas e esperanças.', skills: '• Mordida Rápida: ataca 2x a cada 3 turnos\n• Roubo: -5 fichas', floor: 1, reward: { gold: [8, 15] } },
  { id: 'card_golem', name: 'Golem de Cartas', icon: '🃏', type: 'Construto', hp: 32, atk: [6, 10], desc: 'Feito de cartas amaldiçoadas. Ganha força a cada turno.', skills: '• Fortalecer: +1 ataque/turno\n• Shuffle: embaralha sua mão', floor: 2, reward: { gold: [15, 28] } },
  { id: 'crooked_dealer', name: 'Dealer Torto', icon: '🎩', type: 'Humanóide', hp: 28, atk: [5, 9], desc: 'Trapaceiro que manipula o baralho do adversário.', skills: '• Mão Marcada: remove 1 carta aleatória\n• Blefe: finge ter +atk', floor: 2, reward: { gold: [18, 30] } },
  { id: 'shadow_gambler', name: 'Apostador Sombra', icon: '🌑', type: 'Sombra', hp: 40, atk: [7, 12], desc: 'Apostou sua sombra e perdeu.', skills: '• Aposta do Destino: dano = 2x sua aposta\n• Evasão: 20% de esquivar', floor: 3, reward: { gold: [22, 38] } },
  { id: 'wailing_ace', name: 'Ás Choroso', icon: '😭', type: 'Entidade', hp: 35, atk: [8, 13], desc: 'Um Ás que perdeu seus parceiros.', skills: '• Lágrimas de Sangue: -2 dmg por 2 turnos\n• Solitário: +5 atk quando o último', floor: 3, reward: { gold: [20, 35] } },
  { id: 'bone_croupier', name: 'Crupier de Osso', icon: '☠️', type: 'Morto-vivo', hp: 48, atk: [9, 15], desc: 'Conduz mesas com mãos descarnadas.', skills: '• Oferta Final: 15 dano fixo uma vez\n• Ressurgir: volta com 10 HP', floor: 4, reward: { gold: [28, 45] } },
  { id: 'crimson_mask', name: 'Máscara Carmesim', icon: '🎭', type: 'Demônio', hp: 55, atk: [10, 16], desc: 'Usa mil faces, mas todas sangram.', skills: '• Troca de Face: muda intenção\n• Sangradura: dano extra', floor: 5, reward: { gold: [35, 55] } },
  { id: 'the_house', name: 'A Casa', icon: '🏚️', type: 'Entidade Maior', hp: 65, atk: [12, 18], desc: 'A Casa sempre ganha. Sempre.', skills: '• Edge da Casa: ignora armadura\n• Sangrar Fichas: rouba 15 fichas', floor: 6, reward: { gold: [45, 70] } },
]

export const BOSSES: EnemyDef[] = [
  { id: 'joker', name: 'O Coringa', icon: '🃏', type: 'Boss Supremo', hp: 90, atk: [12, 20], desc: 'Não tem regras, não tem limites.', skills: '• Caos Absoluto: embaralha TUDO\n• Riso Final: cura 15 HP ao atacar\n• Coringa Selvagem: 2x dano em turnos ímpares', floor: 7, reward: { gold: [80, 120] }, deathMsg: 'O Coringa desaparece em uma gargalhada que ecoa para sempre...' },
  { id: 'red_king', name: 'Rei Carmesim', icon: '👑', type: 'Boss Nobre', hp: 85, atk: [14, 22], desc: 'Governou até que todos perdessem.', skills: '• Decreto Real: bloqueia certas mãos\n• Corte Real: 20 dano fixo no turno 3\n• Guarda Real: +6 armadura', floor: 7, reward: { gold: [75, 110] }, deathMsg: 'A coroa cai e dissolve-se em cinzas de ouro...' },
  { id: 'red_queen', name: 'Rainha Vermelha', icon: '👸', type: 'Boss Nobre', hp: 80, atk: [13, 19], desc: 'Cortou tantas cabeças que o baralho ficou vermelho.', skills: '• Sentença: 3 turnos ou perde 25 HP\n• Exército: invoca aliado\n• Executar: abaixo de 20% HP morre', floor: 7, reward: { gold: [70, 105] }, deathMsg: 'Sua coroa de espinhos cai, e com ela, o medo...' },
  { id: 'faceless_dealer', name: 'Dealer Sem Rosto', icon: '🎰', type: 'Boss Final', hp: 120, atk: [15, 25], desc: 'Sempre existiu. Sempre existirá.', skills: '• Mão Marcada: compra 3 cartas piores\n• Dealer Vantagem: ignora 30% do dano\n• O Jogo Continua: revive com 40 HP\n• Aposta Final: 3x ataque se você tiver >50 fichas', floor: 7, reward: { gold: [150, 200] }, deathMsg: 'Finalmente... o Dealer cai. O cassino desmorona. Você foi o último jogador.' },
]

export const RELICS: RelicDef[] = [
  { id: 'blood_chip', name: 'Ficha Sangrenta', icon: '🔴', desc: 'Copas cura +50% a mais.', effect: 'hearts_heal_bonus' },
  { id: 'iron_shield', name: 'Escudo de Ferro', icon: '🛡️', desc: 'Inicia combate com 3 armadura extra.', effect: 'armor_plus' },
  { id: 'lucky_coin', name: 'Moeda da Sorte', icon: '🪙', desc: '10% de chance de não gastar fichas.', effect: 'lucky_gold' },
  { id: 'cursed_hand', name: 'Mão Amaldiçoada', icon: '🤚', desc: 'Par vira Dois Pares em dano, mas perde 3 HP.', effect: 'cursed_pair' },
  { id: 'philosophers_card', name: 'Carta do Filósofo', icon: '📜', desc: 'Royal Flush causa 3x dano.', effect: 'royal_triple' },
  { id: 'jokers_eye', name: 'Olho do Coringa', icon: '👁️', desc: 'Veja 1 carta inimiga por turno.', effect: 'see_intent' },
  { id: 'blood_pact', name: 'Pacto de Sangue', icon: '📿', desc: 'Cada turno sobrevivendo: +1 dano permanente.', effect: 'survive_bonus' },
  { id: 'hollow_crown', name: 'Coroa Oca', icon: '👑', desc: 'Quadra e acima: inimigo perde 5 armadura.', effect: 'crown_pierce' },
  { id: 'poison_ring', name: 'Anel Venenado', icon: '💍', desc: 'Paus aplica +3 turnos de veneno.', effect: 'poison_plus' },
  { id: 'mirror_shard', name: 'Estilhaço Espelhado', icon: '🪞', desc: '30% de refletir dano recebido.', effect: 'reflect' },
  { id: 'dead_mans_hand', name: 'Mão do Morto', icon: '💀', desc: 'Ases e 8s = Full House especial +10 dano.', effect: 'dead_mans' },
  { id: 'void_token', name: 'Ficha do Vazio', icon: '🌑', desc: 'Ao fugir, guarda 50% das fichas apostadas.', effect: 'flee_save' },
]

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: 'health_pot', name: 'Elixir Carmesim', icon: '🧪', desc: 'Restaura 15 HP imediatamente.', cost: 40, type: 'heal', val: 15 },
  { id: 'health_pot_big', name: 'Sangue do Mártir', icon: '🩸', desc: 'Restaura 25 HP.', cost: 70, type: 'heal', val: 25 },
  { id: 'extra_draw', name: 'Carta do Destino', icon: '🃏', desc: '+1 troca permanente por andar.', cost: 60, type: 'stat', stat: 'discard' },
  { id: 'gold_mult', name: 'Ficha Dourada', icon: '🏅', desc: 'Fichas ganhas +20% pela run.', cost: 80, type: 'stat', stat: 'gold_mult' },
  { id: 'dmg_up', name: 'Cristal do Abismo', icon: '💎', desc: '+3 de dano em todas as mãos.', cost: 90, type: 'stat', stat: 'dmg_flat', val: 3 },
  { id: 'max_hp', name: 'Coração de Pedra', icon: '❤️‍🔥', desc: '+10 HP Máximo e cura 5.', cost: 65, type: 'stat', stat: 'maxhp' },
  { id: 'relic_roll', name: 'Caixa Misteriosa', icon: '📦', desc: 'Relíquia aleatória.', cost: 55, type: 'relic' },
]

export const EVENTS: EventDef[] = [
  { id: 'gamble', title: 'A Mesa da Última Chance', icon: '🎲', desc: '"Apostador, faça uma escolha. O baralho conhece seu coração."', choices: [{ txt: 'Apostar 30 fichas (60% ganhar 60)', action: 'gamble_30' }, { txt: 'Apostar 60 fichas (40% ganhar 130)', action: 'gamble_60' }, { txt: 'Recusar e ir embora', action: 'leave' }] },
  { id: 'cursed_chest', title: 'Baú Amaldiçoado', icon: '📦', desc: 'Um baú pulsa com energia sombria.', choices: [{ txt: 'Abrir (relíquia, -8 HP)', action: 'cursed_open' }, { txt: 'Destruir (+15 fichas)', action: 'cursed_burn' }, { txt: 'Deixar para trás', action: 'leave' }] },
  { id: 'ghost_merchant', title: 'O Mercador Fantasma', icon: '👻', desc: 'Uma figura translúcida vende itens que não deveriam existir.', choices: [{ txt: 'Cura total (90 fichas)', action: 'ghost_heal' }, { txt: '+5 dano permanente (70 fichas)', action: 'ghost_dmg' }, { txt: 'Roubar (50/50: grátis ou -20 HP)', action: 'ghost_steal' }] },
  { id: 'blood_shrine', title: 'Santuário de Sangue', icon: '🩸', desc: 'Uma estátua drena gota a gota. Em troca, oferece poder.', choices: [{ txt: 'Oferecer 10 HP: relíquia', action: 'shrine_relic' }, { txt: 'Oferecer 15 HP: +80 fichas', action: 'shrine_gold' }, { txt: 'Ignorar', action: 'leave' }] },
  { id: 'mirror_room', title: 'Sala dos Espelhos', icon: '🪞', desc: 'Você vê reflexos de si mesmo perdendo.', choices: [{ txt: 'Quebrar espelho (aleatório)', action: 'mirror_break' }, { txt: 'Contemplar (+2 trocas próx. combate)', action: 'mirror_watch' }, { txt: 'Sair correndo', action: 'leave' }] },
  { id: 'card_fortune', title: 'Leitura das Cartas', icon: '🔮', desc: 'Uma cartomante lê seu destino. Três cartas, três futuros.', choices: [{ txt: 'Carta da Espada (+20 HP)', action: 'fortune_heal' }, { txt: 'Carta do Ouro (+50 fichas)', action: 'fortune_gold' }, { txt: 'Carta do Vazio (relíquia, -12 HP)', action: 'fortune_relic' }] },
]

export const LORES: Record<HandType, string> = {
  'Carta Alta': '"A carta mais fraca... mas ainda é uma carta."',
  'Par': '"Dois lados da mesma moeda amaldiçoada."',
  'Dois Pares': '"Dupla traição. Dupla recompensa."',
  'Trinca': '"Três almas presas no mesmo momento."',
  'Sequência': '"O destino tem uma ordem. Mas nem sempre é a que você espera."',
  'Flush': '"Sangue do mesmo naipe. Pureza corrompida."',
  'Full House': '"A casa cheia de fantasmas que não partem."',
  'Quadra': '"Quatro reis caídos. Quatro reinos consumidos."',
  'Straight Flush': '"Perfeição ainda pode sangrar."',
  'Royal Flush': '"O fim de todas as apostas. O começo de tudo."',
}

// Ícones/nomes das classes (espelha o CharacterClass já usado na ficha)
export const CLASS_META: Record<ClassId, { name: string; icon: string }> = {
  gambler: { name: 'Apostador', icon: '🎰' },
  trickster: { name: 'Trapaceiro', icon: '🃏' },
  knight: { name: 'Cavaleiro', icon: '⚔️' },
  necromancer: { name: 'Necromante', icon: '💀' },
  dealer: { name: 'Dealer Infernal', icon: '🔥' },
}
