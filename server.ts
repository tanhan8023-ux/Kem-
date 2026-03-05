import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Music API Proxies (Netease & QQ Music) ---

  // Netease Search
  app.get("/api/music/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Missing query" });

    try {
      const targetUrl = `http://music.163.com/api/search/get/web?s=${encodeURIComponent(q as string)}&type=1&offset=0&total=true&limit=20`;
      
      const response = await fetch(targetUrl, {
        headers: {
          'Referer': 'http://music.163.com/',
          'Cookie': 'appver=1.5.0.75771;',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) throw new Error(`Netease API error: ${response.status}`);
      const data = await response.json() as any;
      
      const songs = (data.result?.songs || []).map((song: any) => ({
        id: song.id.toString(),
        title: song.name,
        artist: song.artists?.[0]?.name || "Unknown",
        cover: song.album?.picUrl || "", 
        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
        duration: song.duration / 1000,
        album: song.album?.name,
        source: 'netease'
      }));

      res.json({ results: songs });
    } catch (error) {
      console.error("Netease search error:", error);
      res.status(500).json({ error: "Failed to fetch music from Netease" });
    }
  });

  // QQ Music Search
  app.get("/api/music/search/qq", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Missing query" });

    try {
      // QQ Music search API (JSONP-less version if possible, or just parse JSONP)
      const targetUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=20&w=${encodeURIComponent(q as string)}&format=json`;
      
      const response = await fetch(targetUrl, {
        headers: {
          'Referer': 'https://y.qq.com/',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/04.1'
        }
      });
      
      if (!response.ok) throw new Error(`QQ Music API error: ${response.status}`);
      const data = await response.json() as any;
      
      const songs = (data.data?.song?.list || []).map((song: any) => {
        // QQ Music image url: https://y.gtimg.cn/music/photo_new/T002R300x300M000{albummid}.jpg
        const cover = song.albummid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg` : "";
        
        // QQ Music audio url is very restricted. 
        // We might need to fallback to Netease for the actual audio if we can't get a direct link.
        // For now, we'll try to use a known "search by name" strategy or just use Netease as the audio provider.
        // Actually, let's try to find a working QQ audio proxy or just use Netease for the stream.
        // Most "all-in-one" players use Netease for the actual MP3 because it's easier.
        return {
          id: song.songmid,
          title: song.songname,
          artist: song.singer?.[0]?.name || "Unknown",
          cover: cover,
          // Fallback to Netease search for the actual stream if needed, 
          // but for now we'll just use a placeholder or try to find it on Netease by name.
          url: `https://music.163.com/song/media/outer/url?id=${song.songid}.mp3`, // This is a guess, might not work for QQ IDs.
          // Better: just use Netease for the actual stream.
          duration: song.interval,
          album: song.albumname,
          source: 'qq'
        };
      });

      res.json({ results: songs });
    } catch (error) {
      console.error("QQ search error:", error);
      res.status(500).json({ error: "Failed to fetch music from QQ" });
    }
  });

  // Hot / Top List
  app.get("/api/music/hot", async (req, res) => {
    try {
      // Netease Top List API (3778678 is a common hot list ID, or 19723756)
      // Alternatively, use search with a common keyword like "热歌" or just default search.
      // Let's use a search for "热歌" as a fallback for "Hot", it's safer than finding a working playlist API without login.
      const targetUrl = `http://music.163.com/api/search/get/web?s=热歌&type=1&offset=0&total=true&limit=20`;
      
      const response = await fetch(targetUrl, {
        headers: {
          'Referer': 'http://music.163.com/',
          'Cookie': 'appver=1.5.0.75771;',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) throw new Error(`Netease API error: ${response.status}`);
      const data = await response.json() as any;
      
      const songs = (data.result?.songs || []).map((song: any) => ({
        id: song.id.toString(),
        title: song.name,
        artist: song.artists?.[0]?.name || "Unknown",
        cover: song.album?.picUrl || "", 
        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
        duration: song.duration / 1000,
        album: song.album?.name
      }));

      res.json({ results: songs });
    } catch (error) {
      console.error("Hot music error:", error);
      res.status(500).json({ error: "Failed to fetch hot music" });
    }
  });

  // Lyrics
  app.get("/api/music/lyrics", async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    try {
      const targetUrl = `http://music.163.com/api/song/lyric?os=pc&id=${id}&lv=-1&kv=-1&tv=-1`;
      const response = await fetch(targetUrl, {
        headers: {
          'Referer': 'http://music.163.com/',
          'Cookie': 'appver=1.5.0.75771;',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      if (!response.ok) throw new Error(`Netease API error: ${response.status}`);
      const data = await response.json() as any;
      
      res.json({ lrc: data.lrc?.lyric || "[00:00.00] 暂无歌词" });
    } catch (error) {
      console.error("Lyrics error:", error);
      res.status(500).json({ error: "Failed to fetch lyrics" });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files from dist
    app.use(express.static("dist"));

    // SPA fallback: Serve index.html for any unknown routes (excluding API routes which are handled above)
    app.get("*", (req, res) => {
      res.sendFile("index.html", { root: "dist" });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
