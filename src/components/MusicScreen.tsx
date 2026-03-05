import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Search, Play, Pause, SkipBack, SkipForward, Music as MusicIcon, Share2, Compass, X, Upload, Disc, List, Plus } from 'lucide-react';
import { Song, UserProfile, Persona } from '../types';

interface Props {
  onBack: () => void;
  userProfile: UserProfile;
  personas: Persona[];
  onShareToChat: (song: Song, personaId: string) => void;
  onShareToMoments: (song: Song) => void;
  listeningWithPersonaId?: string;
  songs: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onAddSong: (song: Song) => void;
  onSelectSong: (index: number) => void;
}

export function MusicScreen({ 
  onBack, 
  userProfile, 
  personas, 
  onShareToChat, 
  onShareToMoments, 
  listeningWithPersonaId,
  songs,
  currentSongIndex,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onAddSong,
  onSelectSong
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [listenSeconds, setListenSeconds] = useState(0);
  const [onlineSongs, setOnlineSongs] = useState<Song[]>([]);
  const [hotSongs, setHotSongs] = useState<Song[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isLoadingHot, setIsLoadingHot] = useState(false);

  const [currentLyrics, setCurrentLyrics] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSong = songs[currentSongIndex];
  const listeningWith = listeningWithPersonaId ? personas.find(p => p.id === listeningWithPersonaId) : null;

  // Update local lyrics when song changes
  useEffect(() => {
    if (!currentSong) return;
    setCurrentLyrics(currentSong.lyrics);

    // If it's an online song (from Netease) and lyrics are placeholder, fetch them
    if (currentSong.url?.includes('music.163.com') && (currentSong.lyrics === '[00:00.00] 正在获取歌词...' || !currentSong.lyrics)) {
      const fetchLyrics = async () => {
        try {
          const res = await fetch(`/api/music/lyrics?id=${currentSong.id}`);
          const data = await res.json();
          if (data.lrc) {
            setCurrentLyrics(data.lrc);
          } else {
            setCurrentLyrics('[00:00.00] 暂无歌词');
          }
        } catch (e) {
          console.error("Lyrics failed", e);
          setCurrentLyrics('[00:00.00] 获取歌词失败');
        }
      };
      fetchLyrics();
    }
  }, [currentSong]);
  useEffect(() => {
    const fetchHotSongs = async () => {
      setIsLoadingHot(true);
      try {
        const res = await fetch('/api/music/hot');
        const data = await res.json();
        if (data.results) {
          const results = data.results.map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            cover: item.cover || defaultCover,
            url: `https://music.163.com/song/media/outer/url?id=${item.id}.mp3`,
            lyrics: '[00:00.00] 正在获取歌词...',
            duration: item.duration,
            source: 'netease'
          }));
          setHotSongs(results);
        }
      } catch (e) {
        console.error("Failed to fetch hot songs", e);
      } finally {
        setIsLoadingHot(false);
      }
    };
    
    fetchHotSongs();
  }, []);

  // Debounced online search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setOnlineSongs([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        // Fetch from both Netease and QQ
        const [neteaseRes, qqRes] = await Promise.all([
          fetch(`/api/music/search?q=${encodeURIComponent(searchQuery)}`),
          fetch(`/api/music/search/qq?q=${encodeURIComponent(searchQuery)}`)
        ]);

        const [neteaseData, qqData] = await Promise.all([
          neteaseRes.json(),
          qqRes.json()
        ]);

        const neteaseResults = (neteaseData.results || []).map((item: any) => ({
          ...item,
          lyrics: '[00:00.00] 正在获取歌词...',
          source: 'netease'
        }));

        const qqResults = (qqData.results || []).map((item: any) => ({
          ...item,
          lyrics: '[00:00.00] 暂无歌词 (QQ音乐)',
          source: 'qq'
        }));

        // Merge results, alternating or just netease first
        const merged = [];
        const maxLen = Math.max(neteaseResults.length, qqResults.length);
        for (let i = 0; i < maxLen; i++) {
          if (neteaseResults[i]) merged.push(neteaseResults[i]);
          if (qqResults[i]) merged.push(qqResults[i]);
        }

        setOnlineSongs(merged);
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);



  const defaultUserAvatar = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80';
  const defaultAiAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
  const defaultCover = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80';

  // Timer for "Listen Together" duration
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setListenSeconds(s => s + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    onSeek(time);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newSong: Song = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: '本地上传',
        cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
        lyrics: '[00:00.00] 暂无歌词',
      };
      // @ts-ignore - Adding url property dynamically
      newSong.url = url;
      
      onAddSong(newSong);
    }
  };

  const handleSongClick = async (song: Song) => {
    let songToPlay = { ...song };

    // If it's a QQ song, try to find a matching Netease stream for better playback
    if (song.source === 'qq') {
      try {
        const query = `${song.title} ${song.artist}`;
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          // Use the first Netease result's URL but keep QQ's metadata
          songToPlay.url = data.results[0].url;
          songToPlay.id = data.results[0].id; // Use Netease ID for lyrics etc.
        }
      } catch (e) {
        console.error("Failed to resolve QQ song to Netease stream", e);
      }
    }

    const index = songs.findIndex(s => s.id === songToPlay.id);
    if (index !== -1) {
      onSelectSong(index);
    } else {
      // Online song
      onAddSong(songToPlay);
      // Select the last song (which is the one we just added)
      // We use a small timeout to allow state to update
      setTimeout(() => {
        onSelectSong(songs.length); 
      }, 100);
    }
    setIsSearching(false);
    setSearchQuery('');
  };

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatListenTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full bg-neutral-900 flex flex-col text-white pt-12 relative overflow-hidden">
      
      {/* Blurred Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-110 transition-all duration-1000" 
        style={{ backgroundImage: `url(${currentSong?.cover || defaultCover})` }} 
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Header */}
      <div className="h-14 flex items-center px-4 shrink-0 z-10 relative justify-between">
        <button onClick={onBack} className="text-white p-2 active:opacity-70">
          <ChevronLeft size={28} />
        </button>
        
        <div className="flex flex-col items-center">
          {listeningWith && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-neutral-400">正在与 {listeningWith.name} 一起听歌</span>
            </div>
          )}
          {!isSearching && <h2 className="text-white text-[16px] font-medium">音乐</h2>}
        </div>

        {isSearching ? (
          <div className="flex-1 flex items-center bg-white/10 rounded-full px-3 py-1.5 mx-2">
            <Search size={16} className="text-neutral-300" />
            <input 
              type="text" 
              placeholder="搜索热门歌曲..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[14px] text-white ml-2 w-full placeholder-neutral-400"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1">
                <X size={14} className="text-neutral-400" />
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => setShowShare(true)} className="text-white p-2 active:opacity-70">
            <Share2 size={22} />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        
        {/* Search Results */}
        {isSearching ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-900/80 backdrop-blur-md">
            {/* Local Results */}
            {filteredSongs.length > 0 && (
              <div>
                <h3 className="text-neutral-400 text-xs font-medium mb-2 px-2">本地音乐</h3>
                <div className="space-y-2">
                  {filteredSongs.map(song => (
                    <div 
                      key={song.id} 
                      onClick={() => handleSongClick(song)}
                      className="flex items-center gap-3 p-2 rounded-lg active:bg-white/10 cursor-pointer"
                    >
                      <img src={song.cover} alt={song.title} className="w-12 h-12 rounded-md object-cover" />
                      <div className="flex-1">
                        <div className="text-[15px] font-medium">{song.title}</div>
                        <div className="text-[12px] text-neutral-400">{song.artist}</div>
                      </div>
                      {currentSong?.id === song.id && isPlaying && (
                        <MusicIcon size={16} className="text-green-400 animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Online Results */}
            <div>
              <h3 className="text-neutral-400 text-xs font-medium mb-2 px-2">在线搜索结果</h3>
              {isSearchingOnline ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : onlineSongs.length > 0 ? (
                <div className="space-y-2">
                  {onlineSongs.map(song => (
                    <div 
                      key={song.id} 
                      onClick={() => handleSongClick(song)}
                      className="flex items-center gap-3 p-2 rounded-lg active:bg-white/10 cursor-pointer hover:bg-white/5"
                    >
                      <img src={song.cover} alt={song.title} className="w-12 h-12 rounded-md object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium truncate flex items-center gap-2">
                          {song.title}
                          {song.source === 'qq' && <span className="text-[9px] bg-green-500/20 text-green-400 px-1 rounded">QQ</span>}
                          {song.source === 'netease' && <span className="text-[9px] bg-red-500/20 text-red-400 px-1 rounded">网易</span>}
                        </div>
                        <div className="text-[12px] text-neutral-400 truncate">{song.artist}</div>
                      </div>
                      <div className="px-2 py-1 rounded-full border border-white/20 text-[10px] text-neutral-300">
                        试听
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-neutral-500 py-8 text-[14px]">
                  {searchQuery ? '未找到相关在线音乐' : '输入关键词搜索在线音乐'}
                </div>
              )}
            </div>
          </div>
        ) : !currentSong ? (
          /* Empty State / Hot Songs */
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
             <div className="text-center mb-8 mt-4">
               <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <MusicIcon size={40} className="text-white/50" />
               </div>
               <h2 className="text-xl font-medium text-white mb-2">暂无播放歌曲</h2>
               <p className="text-neutral-400 text-sm">搜索或选择下方热门歌曲开始播放</p>
             </div>

             <div className="flex-1">
               <h3 className="text-white text-sm font-medium mb-4 flex items-center gap-2">
                 <div className="w-1 h-4 bg-green-500 rounded-full"/>
                 热门推荐
               </h3>
               {isLoadingHot ? (
                 <div className="flex justify-center py-8">
                   <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                 </div>
               ) : (
                 <div className="space-y-3">
                   {hotSongs.map((song, i) => (
                     <div 
                       key={song.id}
                       onClick={() => handleSongClick(song)}
                       className="flex items-center gap-4 p-3 rounded-xl bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
                     >
                       <div className="text-neutral-500 font-medium w-4 text-center">{i + 1}</div>
                       <img src={song.cover} className="w-12 h-12 rounded-lg object-cover" />
                       <div className="flex-1 min-w-0">
                         <div className="text-white font-medium truncate">{song.title}</div>
                         <div className="text-neutral-400 text-xs truncate">{song.artist}</div>
                       </div>
                       <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                         <Play size={14} className="ml-0.5" />
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        ) : (
          /* Player View */
          <div className="flex-1 flex flex-col">
            
            {/* Listen Together Status */}
            <div className="w-full pt-6 flex flex-col items-center justify-center gap-2 shrink-0">
              <div className="flex -space-x-4">
                <img src={userProfile.avatarUrl || defaultUserAvatar} className="w-12 h-12 rounded-full border-2 border-neutral-900 object-cover z-10" alt="User" />
                <img src={personas[0]?.avatarUrl || defaultAiAvatar} className="w-12 h-12 rounded-full border-2 border-neutral-900 object-cover" alt="AI" />
              </div>
              <span className="text-[14px] text-neutral-300 font-medium">
                一起听 {formatListenTime(listenSeconds)}
              </span>
            </div>

            {/* Vinyl Record Area */}
            <div className="flex-1 relative flex items-center justify-center my-8" onClick={() => setShowLyrics(!showLyrics)}>
              {showLyrics ? (
                <div className="absolute inset-0 px-8 py-4 overflow-y-auto no-scrollbar mask-linear-fade">
                  <div className="space-y-8 text-center py-20">
                    {(currentLyrics || currentSong.lyrics || '').split('\n').map((line, i) => {
                      const text = line.replace(/\[.*?\]/, '').trim();
                      return text ? (
                        <p key={i} className="text-[16px] text-white/80 font-medium leading-loose">
                          {text}
                        </p>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="relative w-[300px] h-[300px] flex items-center justify-center">
                  {/* Vinyl Record */}
                  <div className={`absolute inset-0 rounded-full bg-neutral-950 border-[8px] border-neutral-800 shadow-2xl flex items-center justify-center ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}>
                    <div className="w-[280px] h-[280px] rounded-full border border-white/10 flex items-center justify-center">
                      <img src={currentSong.cover} alt="Album Art" className="w-[200px] h-[200px] rounded-full object-cover shadow-lg" />
                    </div>
                  </div>
                  {/* Needle */}
                  <div className="absolute -top-10 right-10 w-20 h-32 bg-neutral-700 rounded-lg shadow-xl origin-top-right rotate-12 transition-transform duration-500" style={{ transform: isPlaying ? 'rotate(0deg)' : 'rotate(-20deg)' }} />
                </div>
              )}
            </div>

            {/* Song Info */}
            <div className="px-8 mb-8">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <h2 className="text-[20px] font-bold text-white truncate">{currentSong.title}</h2>
                  <p className="text-[14px] text-neutral-400 truncate">{currentSong.artist}</p>
                </div>
                <button className="p-2 text-neutral-400 active:text-red-500">
                  <div className="w-6 h-6" /> {/* Placeholder for Like */}
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="w-full pb-10 px-8 flex flex-col gap-6 shrink-0">
              {/* Progress Bar */}
              <div className="w-full flex items-center gap-3">
                <span className="text-[10px] text-neutral-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
                <div className="flex-1 relative h-6 flex items-center group">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                  </div>
                  <div 
                    className="absolute h-3 w-3 bg-white rounded-full shadow-md transition-all duration-100"
                    style={{ left: `${(currentTime / (duration || 1)) * 100}%`, marginLeft: '-6px' }}
                  />
                </div>
                <span className="text-[10px] text-neutral-400 font-mono w-10">{formatTime(duration)}</span>
              </div>

              {/* Play Controls */}
              <div className="flex items-center justify-between px-4">
                <button onClick={() => setShowPlaylist(true)} className="text-neutral-400 hover:text-white p-2">
                  <List size={24} />
                </button>
                
                <div className="flex items-center gap-8">
                  <button onClick={onPrev} className="text-white active:scale-90 transition-transform">
                    <SkipBack size={32} className="fill-current" />
                  </button>
                  <button 
                    onClick={onPlayPause} 
                    className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg"
                  >
                    {isPlaying ? <Pause size={32} className="fill-current" /> : <Play size={32} className="fill-current ml-1" />}
                  </button>
                  <button onClick={onNext} className="text-white active:scale-90 transition-transform">
                    <SkipForward size={32} className="fill-current" />
                  </button>
                </div>

                <button onClick={() => fileInputRef.current?.click()} className="text-neutral-400 hover:text-white p-2">
                  <Upload size={24} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="audio/*" 
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playlist Modal */}
      {showPlaylist && (
        <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setShowPlaylist(false)}>
          <div className="bg-neutral-900 rounded-t-2xl p-6 h-[60%] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-[16px] font-medium">播放列表 ({songs.length})</h3>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-[12px] text-neutral-400 border border-neutral-700 rounded-full px-3 py-1">
                <Plus size={14} /> 添加本地音乐
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {songs.map((song, index) => (
                <div 
                  key={song.id} 
                  onClick={() => {
                    onSelectSong(index);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl active:bg-white/10 cursor-pointer ${currentSongIndex === index ? 'bg-white/10' : ''}`}
                >
                  {currentSongIndex === index && isPlaying ? (
                    <div className="w-4 h-4 flex items-end gap-0.5 justify-center">
                      <div className="w-1 bg-green-500 animate-[bounce_1s_infinite] h-2" />
                      <div className="w-1 bg-green-500 animate-[bounce_1.2s_infinite] h-3" />
                      <div className="w-1 bg-green-500 animate-[bounce_0.8s_infinite] h-4" />
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-[12px] w-4 text-center">{index + 1}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[14px] font-medium truncate ${currentSongIndex === index ? 'text-green-500' : 'text-white'}`}>{song.title}</div>
                    <div className="text-[12px] text-neutral-500 truncate">{song.artist}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); /* Delete logic */ }} className="text-neutral-600 p-2">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setShowShare(false)}>
          <div className="bg-neutral-800 rounded-t-2xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-white text-[15px] font-medium mb-6 text-center">分享歌曲</h3>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {personas.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => { onShareToChat(currentSong, p.id); setShowShare(false); }} 
                  className="flex flex-col items-center gap-2 shrink-0 w-16"
                >
                  <img src={p.avatarUrl || defaultAiAvatar} className="w-12 h-12 rounded-xl object-cover" alt="avatar" />
                  <span className="text-[11px] text-neutral-300 truncate w-full text-center">{p.name}</span>
                </button>
              ))}
              <button 
                onClick={() => { onShareToMoments(currentSong); setShowShare(false); }} 
                className="flex flex-col items-center gap-2 shrink-0 w-16"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-700 flex items-center justify-center text-white">
                  <Compass size={24} />
                </div>
                <span className="text-[11px] text-neutral-300 truncate w-full text-center">朋友圈</span>
              </button>
            </div>
            <button 
              onClick={() => setShowShare(false)}
              className="w-full mt-6 py-3 bg-neutral-700 text-white rounded-xl text-[15px] font-medium active:bg-neutral-600"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
