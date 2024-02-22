import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import "./discovery.css";
import Loader from "../Loader/Loader";

import TrackSelect from "../TrackSelect/TrackSelect";

const Discovery = ({ apiUrl, sendDataToParent }) => {
  const api_url = apiUrl.apiUrl;
  const [discoverWeeklyInfo, setDiscoverWeeklyInfo] = useState({});
  const [discoverWeeklyTracks, setDiscoverWeeklyTracks] = useState([]);
  const [audio, setAudio] = useState(null);
  const accessToken = Cookies.get("access_token");
  const [refreshToken, setRefreshToken] = useState(
    Cookies.get("refresh_token")
  );

  const [selectedTrack, setSelectedTrack] = useState(null);
  const transport = axios.create({
    withCredentials: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const [showToast, setShowToast] = useState(false);


  const Toast = () => (
    <div className="toast">
      <h2>Welcome! to Project M</h2>
      <p>Hover over any image to play song!</p>
      <img
        src="https://w7.pngwing.com/pngs/590/688/png-transparent-computer-icons-pointer-hyperlink-cursor-miscellaneous-cdr-text.png"
        alt="Hand Pointer"
      />

      <button className="button" onClick={() => setShowToast(false)}>
        Dismiss
      </button>
    </div>
  );

  useEffect(() => {
    const TTL = 3600000; // Cache TTL of 1 hour (3600000 milliseconds)

    const fetchDiscovery = async () => {
      try {
        const cachedData = localStorage.getItem("discoverWeeklyCache");
        const now = new Date().getTime();

        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (now - timestamp < TTL) {
            setDiscoverWeeklyInfo(data.info);
            setDiscoverWeeklyTracks(data.tracks);
            return;
          }
        }

        const playlistsResponse = await transport.get(`${api_url}/playlists`);
        const discoverWeekly = playlistsResponse.data.playlists.find(
          (p) => p.name === "Discover Weekly"
        );

        if (discoverWeekly) {
          setDiscoverWeeklyInfo(discoverWeekly);

          const playlistResponse = await transport.get(
            `${api_url}/playlist/${discoverWeekly.id}`
          );
          const newCacheData = {
            info: discoverWeekly,
            tracks: playlistResponse.data.playlistTracks.map(
              (item) => item.track
            ),
          };

          localStorage.setItem(
            "discoverWeeklyCache",
            JSON.stringify({
              data: newCacheData,
              timestamp: now,
            })
          );

          localStorage.setItem(
            "userPlaylists",
            JSON.stringify(playlistsResponse.data.playlists)
          );

          setDiscoverWeeklyInfo(discoverWeekly);
          setDiscoverWeeklyTracks(
            playlistResponse.data.playlistTracks.map((item) => item.track)
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchDiscovery();

    return () => {
      if (selectedTrack && selectedTrack.audio) {
        selectedTrack.audio.pause();
      }
    };
  }, [accessToken, audio, selectedTrack]);

  const refresh = async () => {
    try {
      const url = `${apiUrl}/refresh`;
      let response = await transport.get(url);
      let expiry_time = new Date(new Date().getTime() + response.data.maxAge);
      Cookies.set("access_token", response.data.access_token, {
        expires: expiry_time,
      });

      window.location.reload();
    } catch (e) {}
  };

  // if access token changes, reload the page only once to get the new access token
  useEffect(() => {
    if (!accessToken && refreshToken) {
      refresh();
    }
  }, [accessToken]);

  const handleTrackHover = useCallback(
    (track) => {
      const { preview_url, album, name, artists, uri } = track;
      setAudio(new Audio(preview_url));
      sendDataToParent({
        trackImage: album.images[0].url,
        trackName: name,
        trackArtist: artists[0].name,
        trackId: track.id,
        trackUri: uri,
      });
    },
    [sendDataToParent]
  );

  const handleTrackClick = (track) => {
    setAudio(null);
    if (selectedTrack && track.id === selectedTrack.id) {
      setSelectedTrack(null);
    } else if (selectedTrack && track.id !== selectedTrack.id) {
      selectedTrack.audio.pause();
      setSelectedTrack(null);
    } else {
      if (selectedTrack) {
        selectedTrack.audio.pause();
      }
      track.audio = new Audio(track.preview_url);
      setSelectedTrack(track);
    }
  };

  useEffect(() => {
    if (!selectedTrack) return;
    selectedTrack.audio.loop = true;
    const playPromise = selectedTrack.audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(console.error);
    }

    return () => {
      selectedTrack.audio.pause();
      selectedTrack.audio.currentTime = 0;
    };
  }, [selectedTrack]);

  useEffect(() => {
    if (!audio) return;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(console.error);
    }

    return () => audio.pause();
  }, [audio]);

  const renderDiscoverWeekly = () => {
    if (discoverWeeklyTracks.length === 0) return <Loader />;

    return (
      <div className="discovery-container">
        <div className="discovery-header">
          <div className="disovery-photo">
            {discoverWeeklyInfo.image && (
              <img
                alt="header"
                src={discoverWeeklyInfo.image}
                width={120}
                height={120}
              />
            )}
          </div>
          <div className="discovery-description">
            <h2 className="discovery-title">Discover Weekly</h2>
            <p className="discovery-text">
              Your weekly mixtape of fresh music. Enjoy new music and deep cuts
              picked for you. Updates every Monday.
            </p>
          </div>
        </div>
        <div className="discovery-music-container">
          {discoverWeeklyTracks.map((track) => (
            <div
              key={track.id}
              className={
                selectedTrack && selectedTrack.id !== track.id
                  ? "discovery-track-blur"
                  : ""
              }
              onClick={() => handleTrackClick(track)}
            >
              <img
                alt="track"
                src={track.album.images[0].url}
                width={96}
                height={96}
                onMouseEnter={
                  selectedTrack ? null : () => handleTrackHover(track)
                }
                onMouseLeave={() => setAudio(null)}
                style={{
                  cursor: "pointer",
                  borderRadius: "2px",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedTrackRef = useRef(null); // Ref for the selected track element

  useEffect(() => {
    if (selectedTrack && selectedTrackRef.current) {
      selectedTrackRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTrack]);

  const renderSelectedTrack = () => {
    if (!selectedTrack) return null;
    return (
      <div ref={selectedTrackRef}>
        <TrackSelect
          track={selectedTrack}
          sendDataToParent={sendDataToParent}
          parentAudio={selectedTrack.audio}
          apiUrl={apiUrl}
        />
      </div>
    );
  };

  return (
    <div>
      <div className={`discovery ${showToast ? "blur-background" : ""}`}>
        <div>
          {renderDiscoverWeekly()}
          <div style={{ marginTop: "8px" }}>{renderSelectedTrack()}</div>
        </div>
      </div>
    </div>
  );
};

export default Discovery;
