import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import ReactGA from "react-ga";
import Cookies from "js-cookie";

const NavButton = (props) => {
  const api_url = props.apiUrl;
  const [redirectPath] = useState(null);
  const accessToken = Cookies.get("access_token");
  const isLoggedIn = accessToken && accessToken !== "";

  const logout = () => {
    ReactGA.event({
      category: "Auth",
      action: "Log out button pressed",
      label: "Navbar",
    });

    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    Cookies.remove("userID");

    props.setAccessToken && props.setAccessToken(null);
    props.setRefreshToken && props.setRefreshToken(null);

    window.location = "/";
  };

  const login = () => {
    ReactGA.event({
      category: "Auth",
      action: "Log in button pressed",
      label: "Navbar",
    });

    const URI = api_url ? api_url : "";
    window.location = `${URI}/login`;
  };

  if (redirectPath) {
    return <Navigate to={redirectPath} />;
  }

  return (
    <div>
      <button
        onClick={isLoggedIn ? logout : login}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          border: "none",
          color: "#fff",
          width: "100px",
          height: "40px",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {isLoggedIn ? "Log out" : "Log in"}
        </span>
      </button>
    </div>
  );
};

export default NavButton;
