import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Loader from "../Loader/Loader";
import "./search.css";

import AlbumSelect from "../AlbumSelect/AlbumSelect";
import TrackSelect from "../TrackSelect/TrackSelect";

const Search = ({ apiUrl, sendDataToParent, searchTerm }) => {
  const api_url = apiUrl.apiUrl;
  const [searchValue, setSearchValue] = useState("");
  const accessToken = Cookies.get("access_token");
  const refreshToken = Cookies.get("refresh_token");
  const [audio, setAudio] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const transport = axios.create({
    withCredentials: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

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

  const [searchResults, setSearchResults] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (searchTerm) => {
    setIsLoading(true);

    try {
      // Check if the search results are already in localStorage
      const cachedResults = localStorage.getItem("searchResults");
      const cached = cachedResults ? JSON.parse(cachedResults) : null;

      if (cached && cached.searchTerm === searchTerm) {
        // Use cached results
        setSearchResults(cached.data);
        setIsLoading(false);
        console.log("Using cached results");
      } else {
        // Perform a new search

        const response = await transport.get(
          `${api_url}/search-all?searchTerm=${encodeURIComponent(
            searchTerm
          )}&types=album,playlist,track,artist&limit=10`
        );

        const trackIds = response.data.body.tracks.items.map(
          (track) => track.id
        );

        const tracks = await transport.get(
          `${api_url}/get-tracks?trackIds=${trackIds.join(",")}`
        );

        const tracksBody = tracks.data.body.tracks;
        const searchResponse = response.data.body;
        // append the tracks to the search response
        searchResponse.tracks = tracksBody;

        // Cache the new results
        localStorage.setItem(
          "searchResults",
          JSON.stringify({ searchTerm, data: searchResponse })
        );

        setSearchResults(searchResponse);
        console.log(searchResponse);
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (searchTerm !== "") {
      handleSearch(searchTerm);
    }
    setSearchValue(searchTerm);
  }, [searchTerm]);

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

  const handleArtistHover = useCallback(
    (artist) => {
      const { images, name, uri } = artist;
      sendDataToParent({
        trackImage: images[0].url,
        trackName: name,
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

  const renderTracks = () => {
    if (isLoading) {
      return <div style={{ marginTop: 2 }}>{/* <Loader /> */}</div>;
    }

    return (
      <div>
        <h2 style={{ color: "#949ca8" }}>Tracks</h2>
        <div className="tracks-container">
          {searchResults.tracks.map((track) => (
            <div key={track.id} className="search-tracks-container">
              <div
                className="search-track"
                onMouseEnter={
                  selectedTrack ? null : () => handleTrackHover(track)
                }
                onMouseLeave={() => setAudio(null)}
                onClick={() => handleTrackClick(track)}
              >
                <img
                  src={track.album.images[0].url}
                  className="track-image"
                  alt="track"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPlaylists = () => {
    if (isLoading) {
      return (
        <div style={{ marginTop: 18 }}>
          <Loader />
        </div>
      );
    }

    return (
      <div>
        <h2 style={{ color: "#949ca8" }}>Playlists</h2>
        <div className="playlists-container">
          {searchResults.playlists.items.map((playlist) => (
            <div key={playlist.id} className="search-playlists-container">
              <div
                className="search-playlist"
                onClick={() => {
                  setSelectedPlaylist(playlist);
                  setSelectedTrack(null);
                  setSelectedAlbum(null);
                }}
              >
                <img
                  src={playlist.images[0].url ? playlist.images[0].url : null}
                  className="playlist-image"
                  alt="playlist"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderArtists = () => {
    if (isLoading) {
      return <div></div>;
    }

    return (
      <div>
        <div className="search-artists-container">
          <span>Artists</span>
          <div>
            <div className="search-artist-images">
              {searchResults.artists.items.map((artist) => (
                <div>
                  {artist.images[0] ? (
                    <img
                      src={artist.images[0]?.url ? artist.images[0].url : null}
                      alt="artist"
                      className="search-artist-image"
                      onClick={() => {
                        setSelectedArtist(artist);
                        setSelectedAlbum(null);
                        setSelectedTrack(null);
                        setSelectedPlaylist(null);
                      }}
                      onMouseEnter={() => handleArtistHover(artist)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  function renderAlbums() {
    if (isLoading) {
      return <div style={{ marginTop: 2 }}>{/* <Loader /> */}</div>;
    }

    return (
      <div>
        <h2 style={{ color: "#949ca8" }}>Albums</h2>
        <div className="albums-container">
          {searchResults.albums.items.map((album) => (
            <div key={album.id} className="search-albums-container">
              <div
                className="search-album"
                onClick={() => {
                  setSelectedAlbum(album);
                  setSelectedTrack(null);
                  setSelectedPlaylist(null);
                }}
              >
                <img
                  src={album.images[0].url}
                  className="album-image"
                  alt="album"
                />
                {/* <span className="album-name">{album.name}</span> */}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderSearch = () => {
    return (
      <div
        className="search-container"
        style={{ backgroundColor: isLoading ? "#bdbdbd" : "#fffefe" }}
      >
        <div className="search-items">
          <span className="search-title">{searchTerm}</span>
          {renderTracks()}
          {renderAlbums()}
          {renderPlaylists()}
        </div>
        <div className="artist-items">{renderArtists()}</div>
      </div>
    );
  };

  const renderSelectedAlbum = () => {
    if (!selectedAlbum) return null;
    return (
      <div>
        <AlbumSelect
          album={selectedAlbum}
          sendDataToParent={sendDataToParent}
          apiUrl={apiUrl}
        />
      </div>
    );
  };

  const renderSelectedPlaylist = () => {
    if (!selectedPlaylist) return null;
    return (
      <div>
        <AlbumSelect
          album={selectedPlaylist}
          sendDataToParent={sendDataToParent}
          apiUrl={apiUrl}
        />
      </div>
    );
  };

  const renderSelectedArtist = () => {
    if (!selectedArtist) return null;
    return (
      <TrackSelect
        track={null}
        sendDataToParent={sendDataToParent}
        parentAudio={null}
        artistId={selectedArtist.id}
        apiUrl={apiUrl}
      />
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

  return searchValue === "" ? (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ marginBottom: 8 }}>
        Search a song, playlist or artist...{" "}
      </div>{" "}
      <Loader />
    </div>
  ) : (
    <div style={{ width: "100%" }}>
      <div>{renderSearch()}</div>
      <div style={{ marginTop: 10 }}>{renderSelectedArtist()}</div>
      <div style={{ marginTop: 10 }}>{renderSelectedTrack()}</div>
      {selectedTrack ? null : (
        <div style={{ marginTop: 10 }}>{renderSelectedAlbum()}</div>
      )}
      {selectedTrack ? null : (
        <div style={{ marginTop: 10 }}>{renderSelectedPlaylist()}</div>
      )}
    </div>
  );
};

export default Search;
