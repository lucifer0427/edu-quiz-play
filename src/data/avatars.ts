import type { HeroAvatar } from '../types/quiz';

export const HERO_AVATARS: HeroAvatar[] = [
  {
    id: 'hero-knight',
    name: '小勇者',
    title: '初心守護者',
    description: '戴著勇氣頭盔，準備好迎接每一個知識挑戰！',
    price: 0,
    accentHex: '#f59e0b',
    bgClass: 'bg-amber-100',
    ringClass: 'ring-amber-400',
  },
  {
    id: 'hero-mage',
    name: '星光法師',
    title: '閃耀魔導士',
    description: '揮動星星法杖，用聰明咒語破解難題！',
    price: 80,
    accentHex: '#8b5cf6',
    bgClass: 'bg-violet-100',
    ringClass: 'ring-violet-400',
  },
  {
    id: 'hero-shiba',
    name: '柴犬騎士',
    title: '忠誠小夥伴',
    description: '活力滿滿的柴犬戰士，答對時尾巴會搖不停！',
    price: 120,
    accentHex: '#ea580c',
    bgClass: 'bg-orange-100',
    ringClass: 'ring-orange-400',
  },
  {
    id: 'hero-cat',
    name: '貓咪學者',
    title: '圖書館長',
    description: '戴著圓眼鏡的聰明貓咪，最擅長找線索與解析！',
    price: 150,
    accentHex: '#ec4899',
    bgClass: 'bg-pink-100',
    ringClass: 'ring-pink-400',
  },
  {
    id: 'hero-robot',
    name: '機器人助手',
    title: '極速運算機',
    description: '搭載超強晶片，計算與記憶力都是滿分等級！',
    price: 200,
    accentHex: '#0ea5e9',
    bgClass: 'bg-sky-100',
    ringClass: 'ring-sky-400',
  },
  {
    id: 'hero-dino',
    name: '恐龍探險家',
    title: '遠古大冒險家',
    description: '戴著探險帽的小恐龍，最喜歡探索大自然與宇宙！',
    price: 260,
    accentHex: '#10b981',
    bgClass: 'bg-emerald-100',
    ringClass: 'ring-emerald-400',
  },
];

export function getAvatarById(id: string): HeroAvatar {
  return HERO_AVATARS.find((a) => a.id === id) ?? HERO_AVATARS[0];
}
