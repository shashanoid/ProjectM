import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Loader from "../Loader/Loader";
import "./newreleases.css";

import AlbumSelect from "../AlbumSelect/AlbumSelect";

const NewRelease = ({ apiUrl, sendDataToParent }) => {
  const api_url = apiUrl.apiUrl;
  const [audio, setAudio] = useState(null);
  const accessToken = Cookies.get("access_token");
  const refreshToken = Cookies.get("refresh_token");
  const [newReleasedTracks, setNewReleasedTracks] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  const [selectedTrack, setSelectedTrack] = useState(null);

  // cache TTL of 10 hours (36000000 milliseconds)
  const TTL = 36000000;
  const transport = axios.create({
    withCredentials: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // refresh token if it's expired
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

  useEffect(() => {
    const fetchNewReleases = async () => {
      const cachedData = localStorage.getItem("newReleasesCache");
      const now = new Date().getTime();

      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (now - timestamp < TTL) {
          setNewReleasedTracks(data);
          return;
        }
      }

      try {
        const response = await transport.get(`${api_url}/new-releases`);

        // setNewReleases(response.data.newReleases);
        const newReleasesAlbumIds = response.data.newReleases.map(
          (album) => album.id
        );

        // break newReleasesAlbumIds into chunks of 20

        const albumChunks = [];
        for (let i = 0; i < newReleasesAlbumIds.length; i += 20) {
          albumChunks.push(newReleasesAlbumIds.slice(i, i + 20));
        }

        const albumTracks = await Promise.all(
          albumChunks.map(async (chunk) => {
            const albumResponse = await transport.get(
              `${api_url}/albums?albumIds=${chunk}`
            );
            return albumResponse.data.body.albums;
          })
        );

        const albumTracksFlat = await albumTracks.flat();

        setNewReleasedTracks(albumTracksFlat);
        localStorage.setItem(
          "newReleasesCache",
          JSON.stringify({ data: albumTracksFlat, timestamp: now })
        );
      } catch (error) {
        console.error(error);
      }
    };

    fetchNewReleases();
  }, []);

  useEffect(() => {
    if (!audio) return;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(console.error);
    }

    return () => audio.pause();
  }, [audio]);

  const handleAlbumHover = useCallback(
    (album) => {
      const { tracks, images, name, artists } = album;
      const albumTrack = new Audio(tracks.items[0].preview_url);
      setAudio(albumTrack);
      sendDataToParent({
        trackImage: images[0].url,
        trackName: name,
        trackArtist: artists[0].name,
        trackId: album.id,
        trackUri: tracks.items[0].uri,
      });
    },
    [sendDataToParent]
  );

  const handleAlbumClick = (album) => {
    setAudio(null);
    setSelectedAlbum(album);
    if (selectedTrack && album.id === album.id) {
      setSelectedTrack(null);
    } else if (selectedTrack && album.id !== album.id) {
      selectedTrack.audio.pause();
      setSelectedTrack(null);
    } else {
      if (selectedTrack) {
        selectedTrack.audio.pause();
      }
      album.audio = new Audio(album.tracks.items[0].preview_url);
      setSelectedTrack(album);
    }
  };

  useEffect(() => {
    if (!selectedTrack) return;
    selectedTrack.audio.loop = true;
    const playPromise = selectedTrack.audio.play();
    if (playPromise !== undefined) {
      playPromise.then((_) => {}).catch((error) => {});
    }

    return () => {
      selectedTrack.audio.pause();
      selectedTrack.audio.currentTime = 0;
    };
  }, [selectedTrack]);

  const renderTopTracks = () => {
    if (newReleasedTracks.length === 0) return <Loader />;

    return (
      <div className="discovery-container">
        <div className="discovery-header">
          <div className="disovery-photo"></div>
          <div>
            <h2 className="discovery-title">New Releases</h2>
            <p className="discovery-text">
              Here are some of the latest tracks released on Spotify
            </p>
          </div>
        </div>
        <div className="discovery-music-container">
          {newReleasedTracks.map((album) => (
            <div
              key={album.id}
              className={
                selectedTrack && selectedTrack.id !== album.id
                  ? "new-release-album-blur"
                  : ""
              }
              onClick={() => handleAlbumClick(album)}
            >
              <img
                alt="track"
                src={album.images[0].url ? album.images[0].url : ""}
                width={96}
                height={96}
                onMouseEnter={
                  selectedTrack ? null : () => handleAlbumHover(album)
                }
                onMouseLeave={() => setAudio(null)}
                style={{ cursor: "pointer", borderRadius: "2px" }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedAlbumRef = React.createRef();

  useEffect(() => {
    if (selectedTrack && selectedAlbumRef.current) {
      selectedAlbumRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTrack]);

  const renderSeletedAlbum = () => {
    if (!selectedTrack) return null;
    return (
      <div ref={selectedAlbumRef}>
        <AlbumSelect
          album={selectedAlbum}
          sendDataToParent={sendDataToParent}
          topSelectedTrack={selectedTrack}
          selectedAlbumTrack={null}
        />
      </div>
    );
  };

  return (
    <div>
      {renderTopTracks()}
      {selectedAlbum ? (
        <div style={{ marginTop: "8px" }}>{renderSeletedAlbum()}</div>
      ) : null}
    </div>
  );
};

export default NewRelease;
