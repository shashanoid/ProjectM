import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import "./toptracks.css";
import Loader from "../Loader/Loader";

import TrackSelect from "../TrackSelect/TrackSelect";

const TopTracks = ({ apiUrl, sendDataToParent }) => {
  const api_url = apiUrl.apiUrl;
  const [topTracks, setTopTracks] = useState([]);
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

  useEffect(() => {
    const TTL = 3600000; // Cache TTL of 1 hour (3600000 milliseconds)

    const fetchDiscovery = async () => {
      try {
        const cachedData = localStorage.getItem("topTracksCache");
        const now = new Date().getTime();

        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (now - timestamp < TTL) {
            setTopTracks(data);
            return;
          }
        }

        try {
          const response = await transport.get(`${api_url}/top-tracks`);

          localStorage.setItem(
            "topTracksCache",
            JSON.stringify({
              data: response.data.topTracks,
              timestamp: now,
            })
          );
          setTopTracks(response.data.topTracks);
        } catch (error) {
          console.error(error);
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
    if (topTracks.length === 0) return <Loader />;

    return (
      <div className="top-tracks-container">
        <div className="top-tracks-header">
          <div className="top-tracks-description">
            <h2 className="top-tracks-title">Top Tracks</h2>
            <p className="top-tracks-text">
              Your top tracks based on your listening habits.
            </p>
          </div>
        </div>
        <div className="top-tracks-music-container">
          {topTracks.map((track) => (
            <div
              key={track.id}
              className={
                selectedTrack && selectedTrack.id !== track.id
                  ? "top-tracks-track-blur"
                  : ""
              }
              onClick={() => handleTrackClick(track)}
            >
              <img
                alt="track"
                src={track.album.images[0].url}
                width={88}
                height={88}
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
      <div>
        {renderDiscoverWeekly()}
        <div style={{ marginTop: "8px" }}>{renderSelectedTrack()}</div>
      </div>
    </div>
  );
};

export default TopTracks;
