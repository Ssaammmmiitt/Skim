import asyncio
import time
import httpx
import trafilatura
from bs4 import BeautifulSoup
import feedparser
import json
import os

# Create the docs directory if it doesn't exist
os.makedirs("../docs", exist_ok=True)

# 1. Extractor Comparison
TEST_URLS = [
    "https://simonwillison.net/",
    "https://github.blog/",
    "https://openai.com/news/",
    "https://arstechnica.com/",
    "https://www.infoq.com/"
]

async def fetch_url(client, url):
    try:
        start_time = time.time()
        response = await client.get(url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
        latency = (time.time() - start_time) * 1000
        return url, response.text, latency, None
    except Exception as e:
        return url, None, 0, str(e)

def extract_trafilatura(html):
    start = time.time()
    result = trafilatura.extract(html, include_links=True, include_images=False)
    latency = (time.time() - start) * 1000
    return result, latency

def extract_bs4(html):
    start = time.time()
    soup = BeautifulSoup(html, 'html.parser')
    paragraphs = soup.find_all('p')
    result = "\n".join([p.get_text() for p in paragraphs])
    latency = (time.time() - start) * 1000
    return result, latency

def extract_og(html):
    start = time.time()
    soup = BeautifulSoup(html, 'html.parser')
    og_desc = soup.find("meta", property="og:description")
    result = og_desc["content"] if og_desc else None
    latency = (time.time() - start) * 1000
    return result, latency

async def run_extractor_benchmark():
    results = []
    async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}) as client:
        tasks = [fetch_url(client, url) for url in TEST_URLS]
        fetched_pages = await asyncio.gather(*tasks)

        for url, html, fetch_lat, error in fetched_pages:
            if error:
                results.append({"url": url, "error": error})
                continue
            
            traf_res, traf_lat = extract_trafilatura(html)
            bs4_res, bs4_lat = extract_bs4(html)
            og_res, og_lat = extract_og(html)

            results.append({
                "url": url,
                "fetch_ms": fetch_lat,
                "trafilatura": {"len": len(traf_res) if traf_res else 0, "ms": traf_lat},
                "bs4": {"len": len(bs4_res) if bs4_res else 0, "ms": bs4_lat},
                "og": {"len": len(og_res) if og_res else 0, "ms": og_lat}
            })
    return results

# 2. API Source Verification
async def verify_apis():
    results = {}
    async with httpx.AsyncClient() as client:
        # Dev.to
        try:
            start = time.time()
            res = await client.get("https://dev.to/api/articles", headers={"api-key": "uZJfR14tqcukiBPdjHDjTWXm", "User-Agent": "SkimBot"})
            res.raise_for_status()
            data = res.json()
            results["dev_to"] = {"status": "ok", "count": len(data), "ms": (time.time() - start) * 1000}
        except Exception as e:
             results["dev_to"] = {"status": "error", "error": str(e)}
        
        # Lobsters
        try:
            start = time.time()
            res = await client.get("https://lobste.rs/hottest.json", headers={"User-Agent": "SkimBot"})
            res.raise_for_status()
            data = res.json()
            results["lobsters"] = {"status": "ok", "count": len(data), "ms": (time.time() - start) * 1000}
        except Exception as e:
            results["lobsters"] = {"status": "error", "error": str(e)}

        # Hacker News Algolia
        try:
            start = time.time()
            res = await client.get("https://hn.algolia.com/api/v1/search?tags=front_page")
            res.raise_for_status()
            data = res.json()
            results["hn_algolia"] = {"status": "ok", "count": len(data.get("hits", [])), "ms": (time.time() - start) * 1000}
        except Exception as e:
            results["hn_algolia"] = {"status": "error", "error": str(e)}
            
    return results

# 3. Curated Publisher RSS Feeds
RSS_FEEDS = [
    "https://github.blog/feed/",
    "https://simonwillison.net/atom/entries/",
    "https://feed.infoq.com/",
    "https://www.bleepingcomputer.com/feed/",
    "https://www.theregister.com/headlines.atom",
    "https://www.phoronix.com/phoronix-rss.php",
    "https://huggingface.co/blog/feed.xml",
    "https://blog.cloudflare.com/rss/",
    "https://techcrunch.com/feed/",
    "https://feeds.arstechnica.com/arstechnica/index"
]

def verify_rss():
    results = []
    for url in RSS_FEEDS:
        start = time.time()
        try:
            feed = feedparser.parse(url)
            results.append({
                "url": url,
                "status": "ok",
                "entries": len(feed.entries),
                "ms": (time.time() - start) * 1000
            })
        except Exception as e:
             results.append({
                "url": url,
                "status": "error",
                "error": str(e)
            })
    return results

async def main():
    print("Starting Extraction Benchmark...")
    extractor_results = await run_extractor_benchmark()
    
    print("Starting API Verification...")
    api_results = await verify_apis()
    
    print("Starting RSS Verification...")
    rss_results = verify_rss()

    report = f"""# Sources and Scrapers Benchmark Report

Run Date: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}

## 1. Extractor Comparison

| URL | Fetch Latency (ms) | Trafilatura (len/ms) | BeautifulSoup (len/ms) | OpenGraph (len/ms) |
|---|---|---|---|---|
"""
    for r in extractor_results:
        if "error" in r:
            report += f"| {r['url']} | ERROR: {r['error']} | - | - | - |\n"
        else:
             report += f"| {r['url']} | {r['fetch_ms']:.2f} | {r['trafilatura']['len']} chars / {r['trafilatura']['ms']:.2f} ms | {r['bs4']['len']} chars / {r['bs4']['ms']:.2f} ms | {r['og']['len']} chars / {r['og']['ms']:.2f} ms |\n"

    report += """
## 2. API Source Verification

| Source | Status | Items Count | Latency (ms) | Notes |
|---|---|---|---|---|
"""
    for k, v in api_results.items():
        if v["status"] == "ok":
            report += f"| {k} | {v['status']} | {v['count']} | {v['ms']:.2f} | - |\n"
        else:
             report += f"| {k} | {v['status']} | - | - | {v.get('error')} |\n"

    report += """
## 3. RSS Feeds Verification

| Feed URL | Status | Entries | Latency (ms) |
|---|---|---|---|
"""
    for r in rss_results:
        if r["status"] == "ok":
            report += f"| {r['url']} | {r['status']} | {r['entries']} | {r['ms']:.2f} |\n"
        else:
             report += f"| {r['url']} | {r['status']} | - | - |\n"
             
    with open("../docs/sources_and_scrapers_benchmark.md", "w") as f:
        f.write(report)
        
    print("Benchmark complete! Saved to docs/sources_and_scrapers_benchmark.md")

if __name__ == "__main__":
    asyncio.run(main())
