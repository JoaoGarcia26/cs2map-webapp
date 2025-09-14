import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import "./app.css";
import PlayerCard from "./components/PlayerCard";
import Radar from "./components/Radar";
import { getLatency, Latency } from "./components/latency";
import MaskedIcon from "./components/maskedicon";

const CONNECTION_TIMEOUT = 5000;

// Backward-compatible local dev toggles (used when VITE_WS_URL isn't set)
const USE_LOCALHOST = 1;
const PUBLIC_IP = "".trim();
const PORT = 22006;

const EFFECTIVE_IP = USE_LOCALHOST ? "localhost" : PUBLIC_IP.match(/[a-zA-Z]/) ? window.location.hostname : PUBLIC_IP;

// Netlify/Prod: prefer environment-based URL and path
const ENV_WS_URL = import.meta.env.VITE_WS_URL; // e.g. wss://relay.example.com
const ENV_WS_PATH = import.meta.env.VITE_WS_PATH || "/cs2_webradar";

const normalizeBase = (s) => (s || "").replace(/\/$/, "");
const getRelayFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const relay = params.get("relay")?.trim();
  if (!relay) return undefined;
  if (/^wss?:\/\//i.test(relay)) return normalizeBase(relay);
  return normalizeBase(`ws://${relay}`);
};

const buildWsUrl = (room, token) => {
  const override = getRelayFromLocation();
  const base = override
    ? override
    : ENV_WS_URL
    ? normalizeBase(ENV_WS_URL)
    : `ws://${USE_LOCALHOST ? "localhost" : EFFECTIVE_IP}:${PORT}`;
  const path = ENV_WS_PATH.startsWith("/") ? ENV_WS_PATH : `/${ENV_WS_PATH}`;
  const q = new URLSearchParams({ role: "viewer", room: room || "default" });
  if (token) q.set("t", token);
  return `${base}${path}?${q.toString()}`;
};

const getRoomFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const qpRoom = params.get("room");
  if (qpRoom) return qpRoom.trim();
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === "r" && parts[1]) return parts[1].trim();
  return "default";
};

const getTokenFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("t")?.trim();
};

const DEFAULT_SETTINGS = {
  dotSize: 1,
  bombSize: 0.5,
  showAllNames: false,
  showEnemyNames: true,
  showViewCones: false,
};

const loadSettings = () => {
  const savedSettings = localStorage.getItem("radarSettings");
  return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
};

const App = () => {
  const [averageLatency, setAverageLatency] = useState(0);
  const [playerArray, setPlayerArray] = useState([]);
  const [mapData, setMapData] = useState();
  const [localTeam, setLocalTeam] = useState();
  const [bombData, setBombData] = useState();
  const [settings, setSettings] = useState(loadSettings());
  const [bannerOpened, setBannerOpened] = useState(true)

  // Save settings to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("radarSettings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let webSocket = null;
    let connectionTimeout = null;
    let retry = 0;

    const room = getRoomFromLocation();
    const token = getTokenFromLocation();

    const connect = () => {
      const webSocketURL = buildWsUrl(room, token);
      try {
        webSocket = new WebSocket(webSocketURL);
      } catch (error) {
        document.getElementsByClassName("radar_message")[0].textContent = `${error}`;
        scheduleReconnect();
        return;
      }

      connectionTimeout = setTimeout(() => {
        try { webSocket?.close(); } catch {}
      }, CONNECTION_TIMEOUT);

      webSocket.onopen = () => {
        clearTimeout(connectionTimeout);
        retry = 0;
        console.info(`connected to the web socket: room=${room}`);
      };

      webSocket.onclose = () => {
        clearTimeout(connectionTimeout);
        console.error("disconnected from the web socket");
        scheduleReconnect();
      };

      webSocket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        document.getElementsByClassName("radar_message")[0].textContent = `WebSocket connection failed. Check your link or server.`;
        console.error(error);
      };

      webSocket.onmessage = async (event) => {
        setAverageLatency(getLatency());
        const parsedData = JSON.parse(await event.data.text());
        setPlayerArray(parsedData.m_players);
        setLocalTeam(parsedData.m_local_team);
        setBombData(parsedData.m_bomb);

        const map = parsedData.m_map;
        if (map !== "invalid") {
          setMapData({
            ...(await (await fetch(`data/${map}/data.json`)).json()),
            name: map,
          });
          document.body.style.backgroundImage = `url(./data/${map}/background.png)`;
        }
      };
    };

    const scheduleReconnect = () => {
      const delay = Math.min(5000, 500 * Math.pow(2, retry++));
      setTimeout(connect, delay);
    };

    connect();
    return () => {
      try { clearTimeout(connectionTimeout); webSocket?.close(); } catch {}
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col"
      style={{
        background: `radial-gradient(50% 50% at 50% 50%, rgba(20, 40, 55, 0.95) 0%, rgba(7, 20, 30, 0.95) 100%)`,
        backdropFilter: `blur(7.5px)`,
      }}
    >
      <div className={`w-full h-full flex flex-col justify-center overflow-hidden relative`}>
        {bombData && bombData.m_blow_time > 0 && !bombData.m_is_defused && (
          <div className={`absolute left-1/2 top-2 flex-col items-center gap-1 z-50`}>
            <div className={`flex justify-center items-center gap-1`}>
              <MaskedIcon
                path={`./assets/icons/c4_sml.png`}
                height={32}
                color={
                  (bombData.m_is_defusing &&
                    bombData.m_blow_time - bombData.m_defuse_time > 0 &&
                    `bg-radar-green`) ||
                  (bombData.m_blow_time - bombData.m_defuse_time < 0 &&
                    `bg-radar-red`) ||
                  `bg-radar-secondary`
                }
              />
              <span>{`${bombData.m_blow_time.toFixed(1)}s ${(bombData.m_is_defusing &&
                `(${bombData.m_defuse_time.toFixed(1)}s)`) ||
                ""
                }`}</span>
            </div>
          </div>
        )}

        <div className={`flex items-center justify-evenly`}>
          <Latency
            value={averageLatency}
            settings={settings}
            setSettings={setSettings}
          />

          <ul id="terrorist" className="lg:flex hidden flex-col gap-7 m-0 p-0">
            {playerArray
              .filter((player) => player.m_team == 2)
              .map((player) => (
                <PlayerCard
                  isOnRightSide={false}
                  key={player.m_idx}
                  playerData={player}
                />
              ))}
          </ul>

          {(playerArray.length > 0 && mapData && (
            <Radar
              playerArray={playerArray}
              radarImage={`./data/${mapData.name}/radar.png`}
              mapData={mapData}
              localTeam={localTeam}
              averageLatency={averageLatency}
              bombData={bombData}
              settings={settings}
            />
          )) || (
              <div id="radar" className={`relative overflow-hidden origin-center`}>
                <h1 className="radar_message">
                  Connected! Waiting for data from usermode
                </h1>
              </div>
            )}

          <ul
            id="counterTerrorist"
            className="lg:flex hidden flex-col gap-7 m-0 p-0"
          >
            {playerArray
              .filter((player) => player.m_team == 3)
              .map((player) => (
                <PlayerCard
                  isOnRightSide={true}
                  key={player.m_idx}
                  playerData={player}
                  settings={settings}
                />
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
