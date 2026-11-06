const AppVersion = () => {
  const formattedDate = new Date(__BUILD_DATE__).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span className="text-xs text-white">
      v{__APP_VERSION__}（Updated: {formattedDate}）
    </span>
  );
};

export default AppVersion;
