import type { NewsItem } from "@portfolio/db";

interface NewsFeedProps {
  news: NewsItem[];
}

function isSafeUrl(url: string): boolean {
  return url.startsWith("https://") || url.startsWith("http://");
}

export function NewsFeed({ news }: NewsFeedProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-medium">News</h2>
      </div>
      <div className="divide-y divide-gray-800">
        {news.map((item) => {
          const isLink = isSafeUrl(item.url);
          const content = (
            <>
              <p className="text-sm leading-snug">
                {item.headline}
                {isLink && (
                  <span className="ml-1 text-gray-500" aria-label="opens in new tab">↗</span>
                )}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                {item.source && <span>{item.source}</span>}
                <span>
                  {item.publishedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </>
          );

          return isLink ? (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 transition-colors hover:bg-gray-800/50"
            >
              {content}
            </a>
          ) : (
            <div key={item.id} className="block px-4 py-3">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
