import React from "react";
import "./LoadingSpinner.css";

const LoadingSpinner = ({ size = "medium", text = "Loading..." }) => {
  const sizeClass = `spinner-${size}`;

  return (
    <div
      className="loading-container"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={`spinner ${sizeClass}`}>
        <div className="spinner-circle"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
