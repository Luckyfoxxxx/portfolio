import type { NewsItem } from "@portfolio/db";

interface NewsFeedProps {
  news: NewsItem[];
}

export function NewsFeed({ news }: NewsFeedProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-medium">News</h2>
      </div>
      <div className="divide-y divide-gray-800">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 transition-colors hover:bg-gray-800/50"
          >
            <p className="text-sm leading-snug">{item.headline}</p>
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
          </a>
        ))}
      </div>
    </div>
  );
}
