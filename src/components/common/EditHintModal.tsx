import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  initialValue?: string;
  open: boolean;
  onSubmit: (hint: string) => void;
  onClose: () => void;
}

const EditHintModal: React.FC<Props> = ({
  initialValue = "",
  open,
  onSubmit,
  onClose,
}) => {
  const [hint, setHint] = useState(initialValue);

  useEffect(() => {
    setHint(initialValue);
  }, [initialValue]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>たとえワードを入力</DialogTitle>
          <DialogDescription>
            数値をたとえるワードを入力できます。
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="例：お父さんの靴下"
          className="h-24"
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={() => onSubmit(hint)}>決定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditHintModal;
