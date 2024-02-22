import React, { useEffect, useState, useCallback, useRef } from "react";
import { Typography } from "antd";
import Cookies from "js-cookie";
import axios from "axios";
import ReactGA from "react-ga";
import NavButton from "../NavButton";
import "./home.css";

import Discovery from "../Discovery/Discovery";
import TopTracks from "../TopTracks/TopTracks";
import FeaturedPlaylists from "../FeaturedPlaylists/FeaturedPlaylists";
import Search from "../Search/Search";

const { Text } = Typography;

const transport = axios.create({
  withCredentials: true,
});

function Home(apiUrl) {
  const api_url = apiUrl.apiUrl;
  const [accessToken, setAccessToken] = useState(Cookies.get("access_token"));
  const [refreshToken, setRefreshToken] = useState(
    Cookies.get("refresh_token")
  );
  const [currentTrackData, setCurrentTrackData] = useState(null);
  const [currentTab, setCurrentTab] = useState("Discover Weekly");
  const isLoggedIn = accessToken && accessToken !== "";

  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    ReactGA.pageview("/");
  }, []);

  const receiveDataFromChild = useCallback((data) => {
    setCurrentTrackData(data);
  }, []);

  const refresh = async () => {
    try {
      const url = `${api_url}/refresh`;
      let response = await transport.get(url);
      let expiry_time = new Date(new Date().getTime() + response.data.maxAge);
      Cookies.set("access_token", response.data.access_token, {
        expires: expiry_time,
      });
      setAccessToken(response.data.access_token);
      ReactGA.event({
        category: "Auth",
        action: "Refreshed auth token",
        label: "Home Page",
      });
      // reload the page to get the new access token
      window.location.reload();
    } catch (e) {
      setAccessToken(null);
      setRefreshToken(null);
    }
  };

  if (!accessToken && refreshToken) {
    refresh();
  }

  // listen to access token, if it changes, refresh the page
  useEffect(() => {
    if (!accessToken && refreshToken) {
      refresh();
    }
  }, [accessToken, refreshToken]);

  const handleSearchInputChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      setSearchTerm(searchValue);
    }
  };

  const searchInputRef = useRef(null);
  useEffect(() => {
    if (showSearchInput) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  return (
    <div className="gradient">
      <div
        style={{
          position: "absolute",
          right: "5%",
        }}
      >
        <NavButton
          setAccessToken={setAccessToken}
          setRefreshToken={setRefreshToken}
          apiUrl={api_url}
        />
      </div>

      {/* <div
        style={{
          position: "absolute",
          left: "4%",
        }}
      >
        <div class="neon-sign">Discover M</div>
      </div> */}

      <div className="home center">
        {/* <h1 className="title"> Project M </h1> */}
        <div className="music-section">
          <div className="scrollable-section">
            {isLoggedIn ? (
              <div className="buttonContainer">
                <button
                  className="button"
                  onClick={() => {
                    setCurrentTab("Discover Weekly");
                    setShowSearchInput(false);
                  }}
                  style={{
                    backgroundColor:
                      currentTab === "Discover Weekly" ? "#df3079" : "",
                  }}
                >
                  Discover Weekly
                </button>
                <button
                  className="button"
                  onClick={() => {
                    setCurrentTab("Top Songs");
                    setShowSearchInput(false);
                  }}
                  style={{
                    backgroundColor:
                      currentTab === "Top Songs" ? "#df3079" : "",
                  }}
                >
                  Top Songs
                </button>
                <button
                  className="button"
                  onClick={() => {
                    setCurrentTab("Featured");
                    setShowSearchInput(false);
                  }}
                  style={{
                    backgroundColor: currentTab === "Featured" ? "#df3079" : "",
                  }}
                >
                  Featured
                </button>
                {/* {showSearchInput ? (
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchValue}
                    onChange={handleSearchInputChange}
                    onKeyPress={handleKeyPress}
                    className="search-button"
                    placeholder="Search"
                  />
                ) : (
                  <button
                    className="button"
                    onClick={() => {
                      setShowSearchInput(true);
                      setCurrentTab("Search");
                    }}
                  >
                    Search
                  </button>
                )} */}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleKeyPress}
                  className="search-button"
                  placeholder="Search.."
                  onClick={() => {
                    setShowSearchInput(true);
                    setCurrentTab("Search");
                  }}
                />
              </div>
            ) : null}
            <div className="music-select-div">
              {currentTab === "Discover Weekly" ? (
                <Discovery
                  apiUrl={apiUrl}
                  sendDataToParent={receiveDataFromChild}
                />
              ) : null}
              {currentTab === "Top Songs" ? (
                <TopTracks
                  apiUrl={apiUrl}
                  sendDataToParent={receiveDataFromChild}
                />
              ) : null}
              {currentTab === "Featured" ? (
                <FeaturedPlaylists
                  apiUrl={apiUrl}
                  sendDataToParent={receiveDataFromChild}
                />
              ) : null}
              {currentTab === "Search" ? (
                <Search
                  sendDataToParent={receiveDataFromChild}
                  searchTerm={searchTerm}
                  apiUrl={apiUrl}
                />
              ) : null}
            </div>
          </div>
          <div className="fixed-section">
            <div className="track-div">
              {currentTrackData ? (
                <div>
                  <img
                    src={currentTrackData.trackImage}
                    alt="current track"
                    style={{
                      maxWidth: "100%", // Sets the maximum width to 100% of the parent
                      height: "auto", // Adjusts height automatically
                      borderRadius: "2px",
                      boxShadow: "0px 20px 16px rgba(0, 0, 0, 0.8)",
                      marginBottom: "10px",
                      maxHeight: "350px",
                    }}
                  />
                  <div>
                    <Text className="track-info" strong>
                      {currentTrackData.trackName}
                    </Text>
                    <br />
                    <Text className="track-info">
                      {currentTrackData.trackArtist}
                    </Text>
                    <div>
                      <a href={currentTrackData.trackUri}>
                        <button
                          type="primary"
                          style={{
                            backgroundColor: "rgba(1, 0, 0.5, 0.2)",
                            border: "none",
                            color: "#fff",
                            height: "40px",
                            cursor: "pointer",
                            width: "100%",
                            marginTop: "16px",
                            transition: "background-color 0.2s ease", // Smooth transition for color change
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#1DB954"; // Change background color on hover
                            e.target.style.color = "black";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor =
                              "rgba(0, 0, 0, 0.3)"; // Restore original background color when not hovered
                            e.target.style.color = "#fff";
                          }}
                        >
                          Play on Spotify
                        </button>
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
