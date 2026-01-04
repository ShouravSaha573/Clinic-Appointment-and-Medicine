const AuthImagePattern = ({ title, subtitle, backgroundSrc }) => {
  const hasBackground = typeof backgroundSrc === "string" && backgroundSrc.trim().length > 0;
  const resolvedBackgroundSrc = hasBackground
    ? backgroundSrc.startsWith("http://") || backgroundSrc.startsWith("https://")
      ? backgroundSrc
      : `${import.meta.env.BASE_URL}${backgroundSrc.replace(/^\//, "")}`
    : null;

  return (
    <div
      className={`hidden lg:flex items-center justify-center p-12 ${
        hasBackground ? "bg-cover bg-center" : "bg-base-200"
      } relative overflow-hidden`}
      style={hasBackground ? { backgroundImage: `url(${resolvedBackgroundSrc})` } : undefined}
    >
      {hasBackground ? (
        <div className="absolute inset-0 bg-base-200/80" />
      ) : null}

      <div className="relative max-w-md text-center">
        {!hasBackground ? (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-2xl bg-primary/10 ${i % 2 === 0 ? "animate-pulse" : ""}`}
              />
            ))}
          </div>
        ) : null}

        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-base-content/60">{subtitle}</p>
      </div>
    </div>
  );
};
  
  export default AuthImagePattern;