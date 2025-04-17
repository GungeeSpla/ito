import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";

// Propsの型
type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (topic: { title: string; min?: string; max?: string }) => void;
};

const ProposalModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  // モーダルが開いたときにスクロール位置をトップに戻す（スマホ対策）
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 50);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      min: min.trim(),
      max: max.trim(),
    });

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
      <DialogContent
        className="p-4 rounded bg-white shadow-lg z-50 fixed left-1/2 -translate-x-1/2 
          sm:max-w-md w-[90vw]
          top-[1rem]    sm:top-1/2
          translate-y-0 sm:-translate-y-1/2"
      >
        <DialogHeader>
          <DialogTitle>お題を提案する</DialogTitle>
          <DialogDescription>
            タイトルは必須。1と100の意味は省略できます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Textarea
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

        <DialogFooter className="mt-4 flex flex-row gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            キャンセル
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            決定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProposalModal;
