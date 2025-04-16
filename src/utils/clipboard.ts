/**
 * Copy a text to the clipboard.
 *
 * @param {string} text - copy target value
 * @returns {Promise<void>} If the Clipboard API or copy command is not supported or not enabled, it's rejected.
 *
 * @licence MIT
 * @see https://t28.dev/correct-implementation-of-clipboard-in-js
 */
export const copyToClipboard = (text: string): Promise<void> => {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }

  const dummyEl = document.createElement("input");
  dummyEl.value = text;
  dummyEl.readOnly = true;
  dummyEl.style.position = "absolute";
  dummyEl.style.opacity = "0";
  document.body.appendChild(dummyEl);

  dummyEl.setSelectionRange(0, 5000_0000_0000);

  const result = document.execCommand("copy");
  dummyEl.parentNode?.removeChild(dummyEl);

  return result
    ? Promise.resolve()
    : Promise.reject(
        new Error("Copy is not supported or enable on this device."),
      );
};
