export const DemoVideo = ({
  src,
  poster,
  caption,
  aspectRatio = "16 / 10",
  className = "",
}) => {
  return (
    <figure className={`not-prose my-6 w-full ${className}`}>
      <div
        className="overflow-hidden rounded-2xl border border-gray-950/10 bg-gray-100 dark:border-white/10 dark:bg-white/5"
        style={{ aspectRatio }}
      >
        <video
          src={src}
          poster={poster}
          loop
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
