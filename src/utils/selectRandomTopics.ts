import { Topic } from "../types/Topic";

export const selectRandomTopics = (
  allTopics: Topic[],
  selectedSet: string,
  usedTitles: string[],
  count: number = 3,
): Topic[] => {
  return allTopics
    .filter((t) => t.set === selectedSet && !usedTitles.includes(t.title))
    .sort(() => 0.5 - Math.random())
    .slice(0, count);
};
