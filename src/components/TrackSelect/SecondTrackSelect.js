import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Loader from "../Loader/Loader";
import "./trackselect.css";
import { formatLargeNumber } from "../helper";
import AlbumSelect from "../AlbumSelect/AlbumSelect";

const SecondTrackSelect = ({
  track,
  sendDataToParent,
  parentAudio,
  artistId = null,
  apiUrl = null,
}) => {
  const api_url = apiUrl.apiUrl;
  const [audio, setAudio] = useState(null);
  const accessToken = Cookies.get("access_token");
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [artistData, setArtistData] = useState(null);
  const [artistTopTracks, setArtistTopTracks] = useState(null);
  const [artistAlbums, setArtistAlbums] = useState(null);
  const [relatedArtists, setRelatedArtists] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedAlbumTrack, setSelectedAlbumTrack] = useState(null);
  const [clickedAlbumTrack, setClickedAlbumTrack] = useState(false);

  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedArtistId, setSelectedArtistId] = useState(artistId);
  const [isLoading, setIsLoading] = useState(false);
  const [secondSelectArtist, setSecondSelectArtist] = useState(null);

  // if accessToken is null, refresh the page
  if (!accessToken) {
    window.location.reload();
  }

  useEffect(() => {
    if (artistId) {
      setSelectedArtistId(artistId);
    }
  }, [artistId]);

  const getArtistId = (track) => {
    if (selectedArtistId) {
      return selectedArtistId;
    }
    if (secondSelectArtist) {
      return secondSelectArtist;
    } else {
      const trackArtistId = track.artists[0].id;
      return trackArtistId;
    }
  };

  useEffect(() => {
    const transport = axios.create({
      withCredentials: true,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const TTL = 3600000;
    const fetchDiscovery = async () => {
      setIsLoading(true);
      var fetchArtistId = null;

      fetchArtistId = getArtistId(track);

      const artistResponse = await transport.get(
        `${api_url}/artist/${fetchArtistId}`
      );

      const artistsData = artistResponse.data.body;
      // has objects: albums, artist, relatedArtists, topTracks
      // artist ID = artistsData.artist.id
      // const artistsData = mockArtistData;

      await setArtistData(artistsData);
      const artistTopTracks = artistsData.topTracks.tracks;
      await setArtistTopTracks(artistTopTracks);

      // related artists
      const relatedArtists = artistsData.relatedArtists.artists;
      await setRelatedArtists(relatedArtists);

      const artistAlbums = artistsData.albums.items;
      // await setArtistAlbums(artistAlbums);
      const albumIds = artistAlbums.map((album) => album.id);

      const albumsResponse = await transport.get(
        `${api_url}/albums?albumIds=${albumIds}`
      );

      setArtistAlbums(albumsResponse.data.body.albums);
      setIsLoading(false);
    };

    fetchDiscovery();
  }, [selectedArtistId, secondSelectArtist]);

  const handleTrackHover = useCallback((track) => {
    if (parentAudio) {
      parentAudio.pause();
    }
    if (selectedAlbumTrack) {
      selectedAlbumTrack.pause();
    }
    const { preview_url, album, name, artists, uri } = track;
    setAudio(new Audio(preview_url));
    sendDataToParent({
      trackImage: album.images[0].url,
      trackName: name,
      trackArtist: artists[0].name,
      trackId: track.id,
      trackUri: uri,
    });
  });

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

  const handleAlbumHover = useCallback((album) => {
    setClickedAlbumTrack(false);
    setSelectedTrack(null);

    if (parentAudio) {
      parentAudio.pause();
    }
    if (selectedTrack) {
      selectedTrack.audio.pause();
      setSelectedTrack(null);
    }

    if (selectedAlbumTrack) {
      selectedAlbumTrack.pause();
      setSelectedAlbumTrack(null);
    }

    const { images, name, artists, tracks } = album;
    const album_first_track = tracks.items[0];
    const albumTrack = new Audio(album_first_track.preview_url);
    setSelectedAlbumTrack(albumTrack);
    sendDataToParent({
      trackImage: images[0].url,
      trackName: name,
      trackArtist: artists[0].name,
      trackId: tracks.items[0].id,
    });
  });

  const handleAlbumClick = (album) => {
    setSelectedTrack(null);
    setAudio(null);
    const albumTrack = new Audio(album.tracks.items[0].preview_url);
    setSelectedAlbumTrack(albumTrack);
    setClickedAlbumTrack(true);
    setSelectedAlbum(album);
  };

  const handleArtistClick = (artistId) => {
    setSelectedArtistId(null);
    setSecondSelectArtist(artistId);
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
    if (!selectedAlbumTrack) return;

    const playPromise = selectedAlbumTrack.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(console.error);
    }

    return () => selectedAlbumTrack.pause();
  }, [selectedAlbumTrack]);

  useEffect(() => {
    if (!audio) return;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(console.error);
    }

    return () => audio.pause();
  }, [audio]);

  const renderSelectedTrack = () => {
    return (
      <div>
        {artistData ? (
          <div
            className="artist-container"
            style={isLoading ? { opacity: 0.5 } : {}}
          >
            <div className="artist-info">
              <div className="main-artist-info">
                <img
                  key={"artist-image"}
                  src={artistData ? artistData.artist.images[0].url : null}
                  alt="Artist Art"
                  className="artist-image"
                />
                <div className="name-info">
                  <span className="artist-name">
                    {artistData ? artistData.artist.name : null}
                  </span>
                  <span className="genres">
                    {artistData
                      ? artistData.artist.genres.map((genre) => {
                          return (
                            <span key={`genre-${genre}`} className="genre">
                              {genre}
                            </span>
                          );
                        })
                      : null}
                  </span>
                  <span className="followers">
                    {artistData
                      ? `${formatLargeNumber(
                          artistData.artist.followers.total
                        )} followers`
                      : null}
                  </span>
                </div>
              </div>
              <div className="related-artists-container">
                <span className="related-artists-title">Related Artists</span>
                <div className="related-artists">
                  {relatedArtists
                    ? relatedArtists.map((artist) => (
                        <div key={artist.id} className="related-artist">
                          <img
                            alt="related artist"
                            src={artist.images[0].url}
                            className="related-artist-image"
                            onClick={() => handleArtistClick(artist.id)}
                          />
                        </div>
                      ))
                    : null}
                </div>
              </div>
            </div>
            <div className="artist-top-tracks-container">
              <div className="artist-top-tracks-title">Top Tracks</div>
              <div className="artist-top-tracks">
                {artistTopTracks
                  ? artistTopTracks.map(
                      (track) =>
                        track.preview_url && (
                          <div
                            key={track.id}
                            className={
                              selectedTrack && selectedTrack.id !== track.id
                                ? "top-track-blur"
                                : ""
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <img
                              alt="track"
                              src={track.album.images[0].url}
                              width={86}
                              height={86}
                              onMouseEnter={
                                selectedTrack
                                  ? null
                                  : () => handleTrackHover(track)
                              }
                              onMouseLeave={() => setAudio(null)}
                              onClick={() => handleTrackClick(track)}
                            />
                          </div>
                        )
                    )
                  : null}
              </div>
            </div>

            <div className="artist-albums-container">
              <div className="artist-albums-title">Albums</div>
              <div className="artist-albums">
                {artistAlbums
                  ? artistAlbums.map((album) => (
                      <div
                        key={album.id}
                        className={selectedTrack ? "album-blur" : ""}
                      >
                        <img
                          alt="album"
                          src={album.images[0].url}
                          width={86}
                          height={86}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={
                            selectedTrack ? null : () => handleAlbumHover(album)
                          }
                          onMouseLeave={
                            clickedAlbumTrack
                              ? null
                              : () => setSelectedAlbumTrack(null)
                          }
                          onClick={() => handleAlbumClick(album)}
                        />
                      </div>
                    ))
                  : null}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{ marginTop: "20px", textAlign: "center", padding: "20px" }}
          >
            <Loader />
          </div>
        )}
      </div>
    );
  };

  const selectedAlbumRef = React.createRef();

  useEffect(() => {
    if (selectedAlbum && selectedAlbumRef.current) {
      selectedAlbumRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedAlbum]);

  const renderSeletedAlbum = () => {
    return (
      <div ref={selectedAlbumRef}>
        <AlbumSelect
          album={selectedAlbum}
          sendDataToParent={sendDataToParent}
          topSelectedTrack={selectedTrack}
          selectedAlbumTrack={selectedAlbumTrack}
          apiUrl={apiUrl}
        />
      </div>
    );
  };
  return (
    <div>
      {renderSelectedTrack()}
      {selectedAlbum ? (
        <div style={{ marginTop: "8px" }}>{renderSeletedAlbum()}</div>
      ) : null}
    </div>
  );
};

export default SecondTrackSelect;
