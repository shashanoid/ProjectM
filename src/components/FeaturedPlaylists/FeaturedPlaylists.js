import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import "./featuredplaylists.css";
import Loader from "../Loader/Loader";

import AlbumSelect from "../AlbumSelect/AlbumSelect";

const FeaturedPlaylists = ({ apiUrl, sendDataToParent }) => {
  const api_url = apiUrl.apiUrl;
  const [topTracks, setTopTracks] = useState([]);
  const [audio, setAudio] = useState(null);
  const accessToken = Cookies.get("access_token");
  const [refreshToken, setRefreshToken] = useState(
    Cookies.get("refresh_token")
  );

  const transport = axios.create({
    withCredentials: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  useEffect(() => {
    const TTL = 3600000; // Cache TTL of 1 hour (3600000 milliseconds)

    const fetchDiscovery = async () => {
      try {
        const cachedData = localStorage.getItem("featuredPlaylistsCache");
        const now = new Date().getTime();

        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (now - timestamp < TTL) {
            setTopTracks(data);
            return;
          }
        }

        try {
          const response = await transport.get(`${api_url}/featured-playlists`);

          localStorage.setItem(
            "featuredPlaylistsCache",
            JSON.stringify({
              data: response.data.body.playlists,
              timestamp: now,
            })
          );
          setTopTracks(response.data.body.playlists);
        } catch (error) {
          console.error(error);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchDiscovery();
  }, [accessToken, audio]);

  const refresh = async () => {
    try {
      const url = `${api_url}/refresh`;
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

  const handlePlaylistHover = useCallback(
    (track) => {
      const { images, name, uri } = track;
      sendDataToParent({
        trackImage: images[0].url,
        trackName: name,
        trackUri: uri,
      });
    },
    [sendDataToParent]
  );

  const handlePlaylistSelect = (track) => {
    setSelectedPlaylist(track);
  };

  useEffect(() => {
    if (!audio) return;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(console.error);
    }

    return () => audio.pause();
  }, [audio]);

  const renderDiscoverWeekly = () => {
    if (topTracks.length === 0) return <Loader />;

    return (
      <div className="top-tracks-container">
        <div className="top-tracks-header">
          <div className="top-tracks-description">
            <h2 className="top-tracks-title">Featured Playlists</h2>
            <p className="top-tracks-text">
              Here are some of the top playlists on Spotify
            </p>
          </div>
        </div>
        <div className="top-tracks-music-container">
          {topTracks.items.map((track) => (
            <div key={track.id}>
              <img
                alt="track"
                src={track.images[0].url}
                width={88}
                height={88}
                style={{
                  cursor: "pointer",
                  borderRadius: "2px",
                }}
                onMouseEnter={() => handlePlaylistHover(track)}
                onClick={() => handlePlaylistSelect(track)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedTrackRef = useRef(null); // Ref for the selected track element

  useEffect(() => {
    if (selectedPlaylist && selectedTrackRef.current) {
      selectedTrackRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedPlaylist]);

  const renderSelectedTrack = () => {
    if (!selectedPlaylist) return null;
    return (
      <div ref={selectedTrackRef}>
        <AlbumSelect
          album={selectedPlaylist}
          sendDataToParent={sendDataToParent}
          apiUrl={apiUrl}
        />
      </div>
    );
  };

  return (
    <div>
      <div>
        {renderDiscoverWeekly()}
        <div style={{ marginTop: "8px" }}>{renderSelectedTrack()}</div>
      </div>
    </div>
  );
};

export default FeaturedPlaylists;
