import React from "react";
import { useNavigate } from "react-router-dom"; 
import "./MyCarsPreview.css"; // Added this line to link your CSS file

const MyCarsPreview = ({ cars }) => {
  const navigate = useNavigate();

  return (
    <div className="my-cars-preview-container" style={{ width: '100%' }}>
      {/* Header with Title and View All Button */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "20px" 
      }}>
        <h3 style={{ margin: 0, color: "white", fontSize: "1.2rem" }}>My Cars</h3>
        <button 
          onClick={() => navigate("/owner/cars")}
          style={{
            background: "linear-gradient(90deg, #7c3aed 0%, #db2777 100%)",
            border: "none",
            color: "white",
            padding: "8px 20px",
            borderRadius: "20px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.85rem",
            boxShadow: "0 4px 10px rgba(219, 39, 119, 0.3)",
            transition: "transform 0.2s"
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          View All
        </button>
      </div>

      {/* Grid Layout to use the horizontal space */}
      <div style={{ 
        display: "flex", 
        gap: "15px", 
        flexWrap: "wrap", 
        width: "100%" 
      }}>
        {cars && cars.length > 0 ? (
          cars.map((car, index) => (
            <div key={index} style={{
              background: "rgba(255, 255, 255, 0.05)",
              padding: "20px",
              borderRadius: "12px",
              flex: "1 1 calc(25% - 15px)", // Spreads cars across the empty space
              minWidth: "180px",
              border: "1px solid #333",
              textAlign: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
            }}>
              <p style={{ 
                margin: "0 0 8px 0", 
                fontWeight: "bold", 
                color: "white", 
                fontSize: "1rem",
                textTransform: "capitalize" 
              }}>
                {car.model}
              </p>
              <div style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                background: car.status === 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: car.status === 0 ? "#22c55e" : "#ef4444",
                fontWeight: "600"
              }}>
                {car.status === 0 ? "● Available" : "● Rented"}
              </div>
            </div>
          ))
        ) : (
          <div style={{ 
            width: "100%", 
            padding: "40px", 
            textAlign: "center", 
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "12px",
            border: "1px dashed #444" 
          }}>
            <p style={{ color: "#666", margin: 0 }}>No cars registered in your fleet yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCarsPreview;