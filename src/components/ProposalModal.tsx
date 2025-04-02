import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (topic: { title: string; min?: string; max?: string }) => void;
};

const ProposalModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;

    const topic = {
      title: title.trim(),
      min: min.trim(),
      max: max.trim(),
    };

    onSubmit(topic);
    setTitle("");
    setMin("");
    setMax("");
    onClose();
  };

  const handleCancel = () => {
    setTitle("");
    setMin("");
    setMax("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>お題を提案する</DialogTitle>
          <DialogDescription>
            タイトルは必須です。1と100の意味は省略できます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：投げたいもの"
              required
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="min">1の意味（省略可）</Label>
              <Input
                id="min"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="例：投げたくない"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="max">100の意味（省略可）</Label>
              <Input
                id="max"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="例：投げたい"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>決定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProposalModal;
