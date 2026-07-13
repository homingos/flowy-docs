export const VideoPlayer = ({
  src,
  poster,
  aspectRatio = "16 / 9",
  title,
  className = "",
}) => {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div
        className={`not-prose relative mx-auto my-6 w-full max-w-screen-md overflow-hidden rounded-2xl border border-gray-950/10 dark:border-white/10 ${className}`}
        style={{ aspectRatio }}
      >
        <video
          src={src}
          controls
          autoPlay
          playsInline
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={title ? `Play video: ${title}` : "Play video"}
      style={{ aspectRatio }}
      className={`not-prose group relative mx-auto my-6 block w-full max-w-screen-md cursor-pointer overflow-hidden rounded-2xl border border-gray-950/10 bg-gray-100 dark:border-white/10 dark:bg-white/5 ${className}`}
      onClick={() => setPlaying(true)}
    >
      <img
        src={poster}
        alt={title || "Video thumbnail"}
        className="h-full w-full cursor-pointer object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent sm:h-28" />
      <div className="absolute bottom-6 flex w-full items-center justify-between px-6">
        <p className="max-w-sm text-left text-lg font-semibold leading-tight text-white">
          {title}
        </p>
        <div
          className="rounded-full p-3 shadow-lg transition-all duration-300 group-hover:scale-110 group-active:scale-95"
          style={{ backgroundColor: "#5C9987" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="#ffffff"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        </div>
      </div>
    </button>
  );
};
