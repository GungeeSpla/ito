export type Topic = {
  title: string; // お題のタイトル（例: 重そうなもの）
  min: string;   // 1のときの意味（例: 軽い）
  max: string;   // 100のときの意味（例: 重い）
  set: "normal" | "rainbow" | "classic" | "salmon"; // お題セットの種類
};
