import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ルームの URL の QR コード。同じ場所に集まるときや、PC で作った部屋にスマホで入るときに使う
interface Props {
  open: boolean;
  onClose: () => void;
  url: string;
}

const RoomQrDialog: React.FC<Props> = ({ open, onClose, url }) => {
  const [image, setImage] = useState<{ url: string; src: string } | null>(null);

  useEffect(() => {
    if (!open || image?.url === url) return;
    let cancelled = false;
    // QR を作るライブラリは、開いたときにだけ読み込む
    import('qrcode')
      .then((qr) => qr.toDataURL(url, { width: 512, margin: 1, errorCorrectionLevel: 'M' }))
      .then((src) => !cancelled && setImage({ url, src }))
      .catch(() => !cancelled && setImage(null));
    return () => {
      cancelled = true;
    };
  }, [open, url, image?.url]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="p-4 rounded bg-white w-[90vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>ルームのQRコード</DialogTitle>
        </DialogHeader>
        <div className="aspect-square w-full max-w-72 mx-auto">
          {image?.url === url && <img src={image.src} alt="ルームのQRコード" className="w-full h-full" />}
        </div>
        <p className="text-xs text-gray-600 break-all text-center select-all">{url}</p>
      </DialogContent>
    </Dialog>
  );
};

export default RoomQrDialog;
