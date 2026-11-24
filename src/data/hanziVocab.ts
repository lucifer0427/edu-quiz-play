import type { Grade } from '../types/quiz';

export interface HanziWordEntry {
  char: string;
  word: string;
}

export const GRADE_HANZI_VOCAB: Record<Grade, HanziWordEntry[]> = {
  1: [
    { char: '一', word: '一個、第一' },
    { char: '二', word: '二月、十二' },
    { char: '三', word: '三個、星期三' },
    { char: '人', word: '大人、好人' },
    { char: '大', word: '大樹、大家' },
    { char: '小', word: '小鳥、小學' },
    { char: '山', word: '高山、爬山' },
    { char: '水', word: '喝水、水果' },
    { char: '火', word: '火車、小火龍' },
    { char: '木', word: '木頭、樹木' },
    { char: '日', word: '日出、生日' },
    { char: '月', word: '月亮、一月' },
    { char: '手', word: '拍手、小手' },
    { char: '口', word: '門口、開口' },
    { char: '天', word: '天空、今天' },
    { char: '花', word: '開花、花朵' },
    { char: '草', word: '小草、草原' },
    { char: '家', word: '回家、大家' },
  ],
  2: [
    { char: '春', word: '春天、春風' },
    { char: '夏', word: '夏天、盛夏' },
    { char: '秋', word: '秋天、秋風' },
    { char: '冬', word: '冬天、冬季' },
    { char: '風', word: '微風、大風' },
    { char: '雨', word: '下雨、雨傘' },
    { char: '雲', word: '白雲、烏雲' },
    { char: '星', word: '星星、星期' },
    { char: '早', word: '早安、早上' },
    { char: '書', word: '看書、書包' },
    { char: '寫', word: '寫字、書寫' },
    { char: '畫', word: '畫畫、圖畫' },
    { char: '笑', word: '微笑、笑聲' },
    { char: '愛', word: '愛心、可愛' },
    { char: '朋', word: '朋友、親朋' },
    { char: '友', word: '友情、好友' },
  ],
  3: [
    { char: '勇', word: '勇敢、勇氣' },
    { char: '敢', word: '敢於、勇敢' },
    { char: '思', word: '思考、意思' },
    { char: '考', word: '考試、思考' },
    { char: '努', word: '努力、加把勁' },
    { char: '力', word: '力量、努力' },
    { char: '準', word: '準備、準時' },
    { char: '備', word: '準備、具備' },
    { char: '謝', word: '謝謝、感謝' },
    { char: '禮', word: '禮貌、禮物' },
    { char: '貌', word: '禮貌、面貌' },
    { char: '幫', word: '幫忙、幫助' },
  ],
  4: [
    { char: '察', word: '觀察、察覺' },
    { char: '覺', word: '感覺、發覺' },
    { char: '探', word: '探索、探險' },
    { char: '索', word: '線索、思索' },
    { char: '專', word: '專心、專門' },
    { char: '注', word: '注意、專注' },
    { char: '記', word: '記憶、筆記' },
    { char: '憶', word: '回憶、記憶' },
    { char: '挑', word: '挑戰、挑選' },
    { char: '戰', word: '挑戰、作戰' },
    { char: '積', word: '累積、積極' },
    { char: '極', word: '積極、北極' },
  ],
  5: [
    { char: '繁', word: '繁體、繁榮' },
    { char: '體', word: '體積、身體' },
    { char: '研', word: '研究、研讀' },
    { char: '究', word: '研究、究竟' },
    { char: '創', word: '創造、創新' },
    { char: '造', word: '創造、建造' },
    { char: '邏', word: '邏輯、巡邏' },
    { char: '輯', word: '邏輯、編輯' },
    { char: '解', word: '解析、了解' },
    { char: '析', word: '分析、解析' },
  ],
  6: [
    { char: '慎', word: '謹慎、慎重' },
    { char: '重', word: '重要、尊重' },
    { char: '謙', word: '謙虛、謙讓' },
    { char: '虛', word: '謙虛、虛心' },
    { char: '毅', word: '毅力、堅毅' },
    { char: '誠', word: '誠實、真誠' },
    { char: '實', word: '誠實、實驗' },
    { char: '責', word: '責任、負責' },
    { char: '任', word: '責任、任務' },
    { char: '慧', word: '智慧、聰慧' },
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
