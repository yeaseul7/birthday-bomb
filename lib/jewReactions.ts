/** 보석이 컷 + 오른쪽 상단 말풍선 대사 */
export type JewReaction = {
  id: number;
  imageSrc: string;
  line: string;
};

export const JEW_REACTIONS: JewReaction[] = [
  { id: 1, imageSrc: "/jewel/1.png", line: "별거없네 킼" },
  { id: 2, imageSrc: "/jewel/2.png", line: "날 맞출 수 있을거라 생각했나?" },
  { id: 3, imageSrc: "/jewel/3.png", line: "잠시 기절.." },
  { id: 4, imageSrc: "/jewel/4.png", line: "내 생일~" },
  { id: 5, imageSrc: "/jewel/5.png", line: "피했죠?" },
  { id: 6, imageSrc: "/jewel/6.png", line: "아으 시원해.." },
  { id: 7, imageSrc: "/jewel/7.png", line: "응 하나도 안아파~" },
  { id: 8, imageSrc: "/jewel/8.png", line: "이건 좀 아프다 조심해라" },
];

export const JEW_DEFAULT_REACTION: JewReaction =
  JEW_REACTIONS.find((r) => r.id === 4) ?? JEW_REACTIONS[3]!;

/** 기본(4.png) 제외 — 1,2,3,5,6 중 무작위 */
export function pickRandomJewReactionExcludingDefault(): JewReaction {
  const pool = JEW_REACTIONS.filter((r) => r.id !== 4);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** 반응 컷을 잠깐 보여줄 시간(ms) */
export function randomReactionDwellMs(): number {
  return 750 + Math.random() * 450;
}

/** 한 번 탭할 때 1·2·3·5·6 컷으로 잠깐 바뀔 확률 (0~1). 나머지는 4.png 유지 */
export const JEW_REACTION_FLASH_CHANCE = 0.45;
