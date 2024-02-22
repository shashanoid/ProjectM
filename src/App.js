import Home from "./components/Home/Home";

import "./App.css";

function App() {
  // const apiUrl = `http://localhost:8080/api`;
  const apiUrl = `http://147.182.255.65:8080/api`;

  return (
    <div className="main">
      <Home apiUrl={apiUrl} />
    </div>
  );
}

export default App;
