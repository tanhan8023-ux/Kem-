import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Book, Music, Hash, HeartPulse, Sprout, Truck, MoreHorizontal, Settings, Lock, Palette, Mic, Image as ImageIcon, PlusCircle, Smile, CloudSun, Heart, Sun, ShoppingBag, Cloud, CloudRain, CloudLightning, CloudSnow, CloudDrizzle, CloudFog, RefreshCw, Utensils } from 'lucide-react';
import { ThemeSettings, UserProfile } from '../types';

interface Props {
  onNavigate: (screen: 'chat' | 'persona' | 'api' | 'theme' | 'music' | 'xhs' | 'treehole' | 'taobao' | 'fooddelivery') => void;
  onLock: () => void;
  theme: ThemeSettings;
  unreadCount: number;
  userProfile: UserProfile;
}

interface WeatherData {
  temp: number;
  condition: string;
  city: string;
  high: number;
  low: number;
  code: number;
  forecast: Array<{
    day: string;
    code: number;
    temp: number;
  }>;
}

function AppIcon({ id, icon: Icon, label, onClick, theme, badge }: { id: string, icon: any, label: string, onClick?: () => void, theme: ThemeSettings, badge?: number }) {
  const customImage = theme.customIcons?.[id];

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group relative">
      <div 
        className="w-[52px] h-[52px] backdrop-blur-md rounded-[1.2rem] flex items-center justify-center shadow-sm group-active:scale-95 transition-transform overflow-hidden"
        style={{ backgroundColor: customImage ? 'transparent' : theme.iconBgColor }}
      >
        {customImage ? (
          <img src={customImage} alt={label} className="w-full h-full object-cover" />
        ) : (
          <Icon size={26} className="text-neutral-700" strokeWidth={2} />
        )}
      </div>
      {badge && badge > 0 ? (
        <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white z-10 shadow-sm">
          {badge}
        </div>
      ) : null}
      <span className="text-[11px] font-medium text-neutral-800 drop-shadow-sm">{label}</span>
    </button>
  );
}

const getWeatherIcon = (code: number, size: number = 24, className: string = "") => {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return <Sun size={size} className={className} />;
  if (code === 1 || code === 2 || code === 3) return <CloudSun size={size} className={className} />;
  if (code === 45 || code === 48) return <CloudFog size={size} className={className} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle size={size} className={className} />;
  if (code >= 61 && code <= 67) return <CloudRain size={size} className={className} />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className={className} />;
  if (code >= 80 && code <= 82) return <CloudRain size={size} className={className} />;
  if (code >= 95 && code <= 99) return <CloudLightning size={size} className={className} />;
  return <CloudSun size={size} className={className} />;
};

const getWeatherDescription = (code: number) => {
  if (code === 0) return "晴";
  if (code === 1 || code === 2 || code === 3) return "多云";
  if (code === 45 || code === 48) return "雾";
  if (code >= 51 && code <= 55) return "毛毛雨";
  if (code >= 61 && code <= 67) return "雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 80 && code <= 82) return "阵雨";
  if (code >= 95 && code <= 99) return "雷雨";
  return "多云";
};

export function HomeScreen({ onNavigate, onLock, theme, unreadCount, userProfile }: Props) {
  const [time, setTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    let isMounted = true;

    // Function to fetch weather data
    const fetchWeather = async (latitude: number, longitude: number, cityName?: string) => {
      if (!isFinite(latitude) || !isFinite(longitude)) {
        console.error("Invalid coordinates:", latitude, longitude);
        handleFallback("无效坐标");
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        // 1. Fetch Weather Data
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!weatherRes.ok) throw new Error(`Weather API failed: ${weatherRes.status}`);
        const weatherData = await weatherRes.json();

        if (!isMounted) return;

        // 2. Determine City Name
        let finalCityName = cityName;
        if (!finalCityName) {
          try {
            // Reverse Geocoding if city name not provided
            const cityRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`
            );
            const cityData = await cityRes.json();
            finalCityName = cityData.city || cityData.locality || cityData.principalSubdivision || "未知城市";
          } catch (e) {
            console.error("Reverse geocoding failed", e);
            finalCityName = "未知城市";
          }
        }
        
        // Simplify city name
        finalCityName = finalCityName?.replace(/市$/, '') || "未知城市";

        // Process Forecast
        const daily = weatherData.daily;
        const forecast = [];
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        // Get next 4 days (skipping today which is index 0)
        for (let i = 1; i <= 4; i++) {
          const date = new Date(daily.time[i]);
          forecast.push({
            day: days[date.getDay()],
            code: daily.weather_code[i],
            temp: Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2)
          });
        }

        setWeather({
          temp: Math.round(weatherData.current.temperature_2m),
          condition: getWeatherDescription(weatherData.current.weather_code),
          city: finalCityName,
          high: Math.round(daily.temperature_2m_max[0]),
          low: Math.round(daily.temperature_2m_min[0]),
          code: weatherData.current.weather_code,
          forecast: forecast
        });
        setLoading(false);

      } catch (error) {
        console.error("Failed to fetch weather:", error);
        if (!isMounted) return;
        setErrorMsg("获取失败");
        setLoading(false);
      }
    };

    const handleFallback = (msg: string) => {
       if (!isMounted) return;
       console.warn("Weather fallback triggered:", msg);
       // Default to Beijing if location fails
       if (msg === "定位失败" || msg === "无定位权限" || msg === "无效坐标") {
         fetchWeather(39.9042, 116.4074, "北京");
       } else {
         setErrorMsg(msg);
         setLoading(false);
       }
    };

    // Check for custom location override
    if (theme.weatherLocation && theme.weatherLocation.trim() !== '') {
      const locationQuery = theme.weatherLocation.trim();
      // Geocode the custom location
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery)}&count=1&language=zh&format=json`)
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          if (data.results && data.results.length > 0) {
            const { latitude, longitude } = data.results[0];
            fetchWeather(latitude, longitude, locationQuery); 
          } else {
            handleFallback("未找到该城市");
          }
        })
        .catch(err => {
          console.error("Geocoding failed:", err);
          handleFallback("搜索失败");
        });
    } else {
      // Use Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
          (error) => {
            console.error("Geolocation error:", error);
            handleFallback("定位失败");
          },
          { timeout: 10000 }
        );
      } else {
        handleFallback("无定位权限");
      }
    }

    return () => {
      isMounted = false;
    };
  }, [theme.weatherLocation]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]); // Re-run when location setting changes

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('zh-CN', options);
  };

  const getDaysTogether = () => {
    if (!userProfile.anniversaryDate) return 0;
    const start = new Date(userProfile.anniversaryDate).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    if (width === 0) return;
    const page = Math.round(scrollLeft / width);
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="w-full h-full pt-16 pb-6 flex flex-col overflow-hidden relative">
      {/* Scrollable Pages Container */}
      <div 
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >
        {/* Page 1 */}
        <div className="min-w-full w-full h-full snap-center px-5 flex flex-col shrink-0 content-start gap-y-5">
          {/* Top Section - Time and Weather */}
          <div className="flex flex-col items-center justify-center py-1">
            <div 
              className="text-[60px] font-medium tracking-tight leading-none drop-shadow-md"
              style={{ color: theme.timeColor || '#ffffff' }}
            >
              {formatTime(time)}
            </div>
            <div 
              className="text-[13px] mt-1.5 font-medium drop-shadow-sm mb-4"
              style={{ color: theme.timeColor ? `${theme.timeColor}e6` : '#ffffffe6' }}
            >
              {formatDate(time)}
            </div>
          </div>

          {/* Widgets Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Anniversary Widget */}
            <div className="bg-white/60 backdrop-blur-xl rounded-[1.5rem] p-4 flex flex-col justify-center shadow-sm border border-white/50 relative overflow-hidden h-[130px]">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-300/20 rounded-full blur-xl"></div>
              <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-blue-300/20 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={16} className="fill-pink-400 text-pink-400 animate-pulse" />
                  <span className="text-[13px] text-neutral-600 font-medium">相恋</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-neutral-800 tracking-tight">{getDaysTogether()}</span>
                  <span className="text-[14px] text-neutral-500 font-medium">天</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-2">
                  {userProfile.anniversaryDate ? `Since ${userProfile.anniversaryDate}` : '请在接口与人设中设置纪念日'}
                </div>
              </div>
            </div>

            {/* Image Widget */}
            <div className="h-[130px] rounded-[1.5rem] overflow-hidden shadow-sm border border-white/40">
              <img 
                src={theme.widgetImages?.bottomLeft || "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80"} 
                className="w-full h-full object-cover"
                alt="Portrait 2"
              />
            </div>
          </div>

          {/* Apps Row 1 */}
          <div className="grid grid-cols-4 gap-y-4 gap-x-2 place-items-center mt-2">
            <AppIcon id="chat" icon={MessageCircle} label="微信" onClick={() => onNavigate('chat')} theme={theme} badge={unreadCount} />
            <AppIcon id="persona" icon={Book} label="世界书" onClick={() => onNavigate('persona')} theme={theme} />
            <AppIcon id="music" icon={Music} label="音乐" onClick={() => onNavigate('music')} theme={theme} />
            <AppIcon id="xhs" icon={Hash} label="小红书" onClick={() => onNavigate('xhs')} theme={theme} />
          </div>

          {/* Weather Widget */}
          <div className="w-full h-[160px] rounded-[2rem] relative overflow-hidden shadow-lg border border-white/20 shrink-0 mt-2">
            {/* Background */}
            <div className="absolute inset-0 z-0">
              <img 
                src={theme.weatherWidgetBg || "https://images.unsplash.com/photo-1595835018635-43d94615d5d7?auto=format&fit=crop&w=800&q=80"} 
                className="w-full h-full object-cover"
                alt="Weather Background"
              />
              <div className="absolute inset-0 bg-black/10"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 w-full h-full p-5 flex flex-col justify-between text-white">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    {weather ? getWeatherIcon(weather.code, 24, "text-white drop-shadow-md") : <CloudSun size={24} className="text-white drop-shadow-md" />}
                    <span className="text-lg font-medium drop-shadow-md">{weather?.condition || (loading ? "加载中..." : (errorMsg || "无数据"))}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 opacity-90">
                    <span className="text-xs drop-shadow-md">
                      {errorMsg ? errorMsg : (weather?.city || (theme.weatherLocation ? "搜索中..." : "定位中..."))}
                    </span>
                    <button 
                      onClick={() => loadWeather()} 
                      className={`ml-1 p-1 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors ${loading ? 'animate-spin' : ''}`}
                    >
                      <RefreshCw size={10} className="text-white" />
                    </button>
                  </div>
                </div>
                <div className="text-6xl font-light tracking-tighter drop-shadow-md">
                  {weather?.temp ?? "--"}°
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div className="flex gap-4 text-xs font-medium">
                  {weather?.forecast ? (
                    weather.forecast.map((day, index) => (
                      <div key={index} className="flex flex-col items-center gap-1">
                        <span className="opacity-80">{day.day}</span>
                        {getWeatherIcon(day.code, 14)}
                        <span>{day.temp}°</span>
                      </div>
                    ))
                  ) : (
                    // Skeleton / Loading state
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex flex-col items-center gap-1 opacity-50">
                        <span className="w-6 h-3 bg-white/30 rounded"></span>
                        <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                        <span className="w-4 h-3 bg-white/30 rounded"></span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-col items-end text-xs font-medium opacity-90">
                  <span>H: {weather?.high ?? "--"}°</span>
                  <span>L: {weather?.low ?? "--"}°</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 */}
        <div className="min-w-full w-full h-full snap-center px-5 flex flex-col shrink-0 content-start pt-4">
          <div className="grid grid-cols-4 gap-y-4 gap-x-2 place-items-center">
            <AppIcon id="game" icon={HeartPulse} label="游戏" theme={theme} />
            <AppIcon id="treehole" icon={Sprout} label="树洞" onClick={() => onNavigate('treehole')} theme={theme} />
            <AppIcon id="express" icon={Truck} label="快递" theme={theme} />
            <AppIcon id="taobao" icon={ShoppingBag} label="淘宝" onClick={() => onNavigate('taobao')} theme={theme} />
            <AppIcon id="fooddelivery" icon={Utensils} label="外卖" onClick={() => onNavigate('fooddelivery')} theme={theme} />
            <AppIcon id="more" icon={MoreHorizontal} label="更多" theme={theme} />
          </div>
        </div>
      </div>

      {/* Pagination Indicators */}
      <div className="flex justify-center gap-2 my-3 shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${currentPage === 0 ? 'bg-white' : 'bg-white/40'}`} />
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${currentPage === 1 ? 'bg-white' : 'bg-white/40'}`} />
      </div>

      {/* Dock */}
      <div className="mt-auto h-[60px] mx-5 bg-white/50 backdrop-blur-2xl rounded-[2rem] flex items-center justify-around px-6 shadow-sm border border-white/40 shrink-0">
        <button onClick={() => onNavigate('api')} className="w-11 h-11 bg-black/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform overflow-hidden">
          {theme.customIcons?.['dock_settings'] ? (
             <img src={theme.customIcons['dock_settings']} className="w-full h-full object-cover" alt="Settings" />
          ) : (
             <Settings size={22} />
          )}
        </button>
        <button onClick={onLock} className="w-11 h-11 bg-black/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform overflow-hidden">
          {theme.customIcons?.['dock_lock'] ? (
             <img src={theme.customIcons['dock_lock']} className="w-full h-full object-cover" alt="Lock" />
          ) : (
             <Lock size={22} />
          )}
        </button>
        <button onClick={() => onNavigate('theme')} className="w-11 h-11 bg-black/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform overflow-hidden">
          {theme.customIcons?.['dock_theme'] ? (
             <img src={theme.customIcons['dock_theme']} className="w-full h-full object-cover" alt="Theme" />
          ) : (
             <Palette size={22} />
          )}
        </button>
      </div>
    </div>
  );
}
