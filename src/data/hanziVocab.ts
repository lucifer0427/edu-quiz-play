import type { Grade } from '../types/quiz';

export interface HanziWordEntry {
  char: string;
  zhuyin?: string;
  word: string;
}

export const GRADE_HANZI_VOCAB: Record<Grade, HanziWordEntry[]> = {
  1: [
    { char: '一', zhuyin: 'ㄧ', word: '一個、第一' },
    { char: '二', zhuyin: 'ㄦˋ', word: '二月、十二' },
    { char: '三', zhuyin: 'ㄙㄢ', word: '三個、星期三' },
    { char: '人', zhuyin: 'ㄖㄣˊ', word: '大人、好人' },
    { char: '大', zhuyin: 'ㄉㄚˋ', word: '大樹、大家' },
    { char: '小', zhuyin: 'ㄒㄧㄠˇ', word: '小鳥、小學' },
    { char: '山', zhuyin: 'ㄕㄢ', word: '高山、爬山' },
    { char: '水', zhuyin: 'ㄕㄨㄟˇ', word: '喝水、水果' },
    { char: '火', zhuyin: 'ㄏㄨㄛˇ', word: '火車、小火龍' },
    { char: '木', zhuyin: 'ㄇㄨˋ', word: '木頭、樹木' },
    { char: '日', zhuyin: 'ㄖˋ', word: '日出、生日' },
    { char: '月', zhuyin: 'ㄩㄝˋ', word: '月亮、一月' },
    { char: '手', zhuyin: 'ㄕㄡˇ', word: '拍手、小手' },
    { char: '口', zhuyin: 'ㄎㄡˇ', word: '門口、開口' },
    { char: '天', zhuyin: 'ㄊㄧㄢ', word: '天空、今天' },
    { char: '花', zhuyin: 'ㄏㄨㄚ', word: '開花、花朵' },
    { char: '草', zhuyin: 'ㄘㄠˇ', word: '小草、草原' },
    { char: '家', zhuyin: 'ㄐㄧㄚ', word: '回家、大家' },
  ],
  2: [
    { char: '春', zhuyin: 'ㄔㄨㄣ', word: '春天、春風' },
    { char: '夏', zhuyin: 'ㄒㄧㄚˋ', word: '夏天、盛夏' },
    { char: '秋', zhuyin: 'ㄑㄧㄡ', word: '秋天、秋風' },
    { char: '冬', zhuyin: 'ㄉㄨㄥ', word: '冬天、冬季' },
    { char: '風', zhuyin: 'ㄈㄥ', word: '微風、大風' },
    { char: '雨', zhuyin: 'ㄩˇ', word: '下雨、雨傘' },
    { char: '雲', zhuyin: 'ㄩㄣˊ', word: '白雲、烏雲' },
    { char: '星', zhuyin: 'ㄒㄧㄥ', word: '星星、星期' },
    { char: '早', zhuyin: 'ㄗㄠˇ', word: '早安、早上' },
    { char: '書', zhuyin: 'ㄕㄨ', word: '看書、書包' },
    { char: '寫', zhuyin: 'ㄒㄧㄝˇ', word: '寫字、書寫' },
    { char: '畫', zhuyin: 'ㄏㄨㄚˋ', word: '畫畫、圖畫' },
    { char: '笑', zhuyin: 'ㄒㄧㄠˋ', word: '微笑、笑聲' },
    { char: '愛', zhuyin: 'ㄞˋ', word: '愛心、可愛' },
    { char: '朋', zhuyin: 'ㄆㄥˊ', word: '朋友、親朋' },
    { char: '友', zhuyin: 'ㄧㄡˇ', word: '友情、好友' },
  ],
  3: [
    { char: '勇', zhuyin: 'ㄩㄥˇ', word: '勇敢、勇氣' },
    { char: '敢', zhuyin: 'ㄍㄢˇ', word: '敢於、勇敢' },
    { char: '思', zhuyin: 'ㄙ', word: '思考、意思' },
    { char: '考', zhuyin: 'ㄎㄠˇ', word: '考試、思考' },
    { char: '努', zhuyin: 'ㄋㄨˇ', word: '努力、加把勁' },
    { char: '力', zhuyin: 'ㄌㄧˋ', word: '力量、努力' },
    { char: '準', zhuyin: 'ㄓㄨㄣˇ', word: '準備、準時' },
    { char: '備', zhuyin: 'ㄅㄟˋ', word: '準備、具備' },
    { char: '謝', zhuyin: 'ㄒㄧㄝˋ', word: '謝謝、感謝' },
    { char: '禮', zhuyin: 'ㄌㄧˇ', word: '禮貌、禮物' },
    { char: '貌', zhuyin: 'ㄇㄠˋ', word: '禮貌、面貌' },
    { char: '幫', zhuyin: 'ㄅㄤ', word: '幫忙、幫助' },
  ],
  4: [
    { char: '察', zhuyin: 'ㄔㄚˊ', word: '觀察、察覺' },
    { char: '覺', zhuyin: 'ㄐㄩㄝˊ', word: '感覺、發覺' },
    { char: '探', zhuyin: 'ㄊㄢˋ', word: '探索、探險' },
    { char: '索', zhuyin: 'ㄙㄨㄛˇ', word: '線索、思索' },
    { char: '專', zhuyin: 'ㄓㄨㄢ', word: '專心、專門' },
    { char: '注', zhuyin: 'ㄓㄨˋ', word: '注意、專注' },
    { char: '記', zhuyin: 'ㄐㄧˋ', word: '記憶、筆記' },
    { char: '憶', zhuyin: 'ㄧˋ', word: '回憶、記憶' },
    { char: '挑', zhuyin: 'ㄊㄧㄠ', word: '挑戰、挑選' },
    { char: '戰', zhuyin: 'ㄓㄢˋ', word: '挑戰、作戰' },
    { char: '積', zhuyin: 'ㄐㄧ', word: '累積、積極' },
    { char: '極', zhuyin: 'ㄐㄧˊ', word: '積極、北極' },
  ],
  5: [
    { char: '繁', zhuyin: 'ㄈㄢˊ', word: '繁體、繁榮' },
    { char: '體', zhuyin: 'ㄊㄧˇ', word: '體積、身體' },
    { char: '研', zhuyin: 'ㄧㄢˊ', word: '研究、研讀' },
    { char: '究', zhuyin: 'ㄐㄧㄡˋ', word: '研究、究竟' },
    { char: '創', zhuyin: 'ㄔㄨㄤˋ', word: '創造、創新' },
    { char: '造', zhuyin: 'ㄗㄠˋ', word: '創造、建造' },
    { char: '邏', zhuyin: 'ㄌㄨㄛˊ', word: '邏輯、巡邏' },
    { char: '輯', zhuyin: 'ㄐㄧˊ', word: '邏輯、編輯' },
    { char: '解', zhuyin: 'ㄐㄧㄝˇ', word: '解析、了解' },
    { char: '析', zhuyin: 'ㄒㄧ', word: '分析、解析' },
  ],
  6: [
    { char: '慎', zhuyin: 'ㄕㄣˋ', word: '謹慎、慎重' },
    { char: '重', zhuyin: 'ㄓㄨㄥˋ', word: '重要、尊重' },
    { char: '謙', zhuyin: 'ㄑㄧㄢ', word: '謙虛、謙讓' },
    { char: '虛', zhuyin: 'ㄒㄩ', word: '謙虛、虛心' },
    { char: '毅', zhuyin: 'ㄧˋ', word: '毅力、堅毅' },
    { char: '誠', zhuyin: 'ㄔㄥˊ', word: '誠實、真誠' },
    { char: '實', zhuyin: 'ㄕˊ', word: '誠實、實驗' },
    { char: '責', zhuyin: 'ㄗㄜˊ', word: '責任、負責' },
    { char: '任', zhuyin: 'ㄖㄣˋ', word: '責任、任務' },
    { char: '慧', zhuyin: 'ㄏㄨㄟˋ', word: '智慧、聰慧' },
  ],
};

/**
 * 從家長或老師貼上的文字中萃取出不重複的中文字元（過濾標點、英數與空白）。
 */
export function extractHanziCharacters(input: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ch of input) {
    if (/[\u4e00-\u9fff]/.test(ch) && !seen.has(ch)) {
      seen.add(ch);
      result.push(ch);
    }
  }
  return result.slice(0, 30);
}
