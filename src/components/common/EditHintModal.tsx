import React, { useState, useEffect } from "react";

interface Props {
  initialValue?: string;
  onSubmit: (hint: string) => void;
  onClose: () => void;
}

const EditHintModal: React.FC<Props> = ({ initialValue = "", onSubmit, onClose }) => {
  const [hint, setHint] = useState(initialValue);

  useEffect(() => {
    setHint(initialValue); // 初期値をモーダル表示時に反映
  }, [initialValue]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-80 text-black">
        <h2 className="text-xl font-bold mb-4">たとえワードを入力</h2>
        <input
          type="text"
          className="w-full border rounded px-2 py-1 mb-4 bg-white text-black"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="例：お父さんの靴下"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">キャンセル</button>
          <button
            onClick={() => onSubmit(hint)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditHintModal;
