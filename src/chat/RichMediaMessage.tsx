type Props = {
  url: string;
  alt?: string;
  captionHtml?: string;
};

export default function RichMediaMessage({
  url,
  alt = "Image attachment",
  captionHtml,
}: Props) {
  return (
    <figure className="chat-rich-media">
      <a
        className="chat-rich-media__frame"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open image"
      >
        <img
          className="chat-rich-media__image"
          src={url}
          alt={alt}
          loading="lazy"
        />
        <span className="chat-rich-media__expand" aria-hidden="true">
          ↗
        </span>
      </a>
      {captionHtml && (
        <figcaption
          className="chat-rich-media__caption chat-markdown"
          dangerouslySetInnerHTML={{ __html: captionHtml }}
        />
      )}
    </figure>
  );
}
