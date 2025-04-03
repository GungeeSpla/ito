import { Topic } from "../types/Topic";

export const selectRandomTopics = (
  allTopics: Topic[],
  selectedSet: string,
  usedTitles: string[],
  customTopics: Topic[],
  count: number = 3,
): Topic[] => {
  const sourceTopics =
    selectedSet === "custom"
      ? customTopics.filter((t) => !usedTitles.includes(t.title))
      : allTopics.filter(
          (t) => t.set === selectedSet && !usedTitles.includes(t.title),
        );

  return sourceTopics.sort(() => 0.5 - Math.random()).slice(0, count);
};
