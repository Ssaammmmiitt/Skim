# Sources and Scrapers Benchmark Report

Run Date: 2026-09-09 10:32:51 UTC

## 1. Extractor Comparison

| URL | Fetch Latency (ms) | Trafilatura (len/ms) | BeautifulSoup (len/ms) | OpenGraph (len/ms) |
|---|---|---|---|---|
| https://simonwillison.net/ | 1805.07 | 36486 chars / 42.15 ms | 29405 chars / 21.41 ms | 0 chars / 11.57 ms |
| https://github.blog/ | 527.65 | 3027 chars / 105.14 ms | 10129 chars / 17.41 ms | 89 chars / 17.25 ms |
| https://openai.com/news/ | ERROR: Client error '403 Forbidden' for url 'https://openai.com/news/'
For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403 | - | - | - |
| https://arstechnica.com/ | 1794.68 | 3263 chars / 34.25 ms | 4312 chars / 20.01 ms | 144 chars / 20.93 ms |
| https://www.infoq.com/ | 2152.11 | 2961 chars / 44.94 ms | 3279 chars / 17.18 ms | 0 chars / 16.67 ms |

## 2. API Source Verification

| Source | Status | Items Count | Latency (ms) | Notes |
|---|---|---|---|---|
| dev_to | ok | 30 | 2291.23 | - |
| lobsters | ok | 25 | 1433.72 | - |
| hn_algolia | ok | 20 | 799.52 | - |

## 3. RSS Feeds Verification

| Feed URL | Status | Entries | Latency (ms) |
|---|---|---|---|
| https://github.blog/feed/ | ok | 10 | 766.52 |
| https://simonwillison.net/atom/entries/ | ok | 15 | 612.75 |
| https://feed.infoq.com/ | ok | 15 | 1271.12 |
| https://www.bleepingcomputer.com/feed/ | ok | 15 | 548.45 |
| https://www.theregister.com/headlines.atom | ok | 50 | 1578.16 |
| https://www.phoronix.com/phoronix-rss.php | ok | 32 | 1108.61 |
| https://huggingface.co/blog/feed.xml | ok | 860 | 760.16 |
| https://blog.cloudflare.com/rss/ | ok | 20 | 419.11 |
| https://techcrunch.com/feed/ | ok | 20 | 523.87 |
| https://feeds.arstechnica.com/arstechnica/index | ok | 20 | 367.39 |
