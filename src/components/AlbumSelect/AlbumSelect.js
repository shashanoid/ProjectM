import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Loader from "../Loader/Loader";
import "./albumselect.css";
import { formatDate } from "../helper";

const AlbumSelect = ({
  album,
  sendDataToParent,
  topSelectedTrack,
  selectedAlbumTrack,
  apiUrl = null,
}) => {
  const api_url = apiUrl.apiUrl;
  const [audio, setAudio] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const accessToken = Cookies.get("access_token");
  const [albumTracks, setAlbumTracks] = useState(null);

  const transport = axios.create({
    withCredentials: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const handleTrackHover = useCallback((track) => {
    if (topSelectedTrack) {
      topSelectedTrack.audio.pause();
    }

    if (selectedAlbumTrack) {
      selectedAlbumTrack.pause();
    }

    const { preview_url, name, artists } = track;
    setAudio(new Audio(preview_url));
    sendDataToParent({
      trackImage: album.images[0].url,
      trackName: name,
      trackArtist: artists[0].name,
      trackId: track.id,
    });
  });

  useEffect(() => {
    if (!audio) return;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(console.error);
    }

    return () => audio.pause();
  }, [audio]);

  useEffect(() => {
    if (album) {
      const tracks = album.tracks;
      var hasTrackHref = false;
      const type = album.type;

      try {
        hasTrackHref = tracks.href ? true : false;
      } catch (e) {}

      if (tracks && tracks.items) {
        setAlbumTracks(tracks);
        return;
      } else if (tracks && hasTrackHref) {
        const trackHref = tracks.href;
        if (type === "album") {
          const albumId = trackHref.match(/albums\/(.+?)\/tracks/)[1];
          transport
            .get(`${api_url}/album/${albumId}`)
            .then((res) => {
              setAlbumTracks(res.data.body);
            })
            .catch((e) => console.error(e));
        } else if (type === "playlist") {
          const playlistId = trackHref.match(/playlists\/(.+?)\/tracks/)[1];
          transport
            .get(`${api_url}/playlist-tracks/${playlistId}`)
            .then((res) => {
              setAlbumTracks(res.data.body.tracks);
            })
            .catch((e) => console.error(e));
        }
      } else {
        const albumId = album.id;
        // fetch tracks
        transport
          .get(`${api_url}/album/${albumId}`)
          .then((res) => {
            console.log(res.data.body);
            setAlbumTracks(res.data.body);
          })
          .catch((e) => console.error(e));
      }
    }
  }, [album]);

  const renderAlbum = (album, track) => {
    if (!track) return null;
    return (
      <div key={track.id} className="album-track">
        <div>
          <img
            key={track.id}
            src={album.images[0].url}
            alt="album"
            width={48}
            height={48}
            style={{ cursor: "pointer" }}
            onMouseEnter={selectedTrack ? null : () => handleTrackHover(track)}
            onMouseLeave={() => setAudio(null)}
          />
        </div>
        <span className="album-track-name">{track.name}</span>
      </div>
    );
  };

  return (
    <div className="album-container">
      <div className="album-header">
        <div className="album-photo">
          {true && (
            <img
              alt="header"
              src={album.images[0].url}
              width={120}
              height={120}
            />
          )}
        </div>
        <div className="album-description">
          <span className="album-title">{album.name}</span>
          <span className="album-release-date">
            {album.release_date ? "Released" : "Playlist Tracks"}{" "}
            {album.release_date ? formatDate(album.release_date) : null}
          </span>
          <div className="album-tracks-container">
            {albumTracks
              ? albumTracks.items.map((track) => (
                  <div key={track.id}>
                    {album.type === "album" ? renderAlbum(album, track) : null}
                    {album.type === "playlist"
                      ? renderAlbum(album, track.track ? track.track : null)
                      : null}
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumSelect;
