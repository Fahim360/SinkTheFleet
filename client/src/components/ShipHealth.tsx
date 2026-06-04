import React from "react";
import { Ship, SHIP_DEFINITIONS } from "../types";

interface ShipHealthProps {
  ships: Ship[];
  label?: string;
}

export const ShipHealth: React.FC<ShipHealthProps> = ({ ships, label }) => {
  return (
    <div>
      {label && (
        <div className="placement-title" style={{ marginBottom: 4 }}>{label}</div>
      )}
      <div className="ship-health-list">
        {SHIP_DEFINITIONS.map((def) => {
          const ship = ships.find((s) => s.id === def.id);
          if (!ship) {
            // Not yet placed / no info — show greyed
            return (
              <div key={def.id} className="ship-health-item" style={{ opacity: 0.25 }}>
                <span className="ship-health-name">{def.name}</span>
                <div className="ship-health-cells">
                  {Array.from({ length: def.size }).map((_, i) => (
                    <div key={i} className="ship-health-cell" />
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div
              key={def.id}
              className={`ship-health-item ${ship.sunk ? "sunk" : ""}`}
            >
              <span className="ship-health-name">
                {ship.sunk ? "✕ " : ""}{def.name}
              </span>
              <div className="ship-health-cells">
                {ship.cells.map((_, i) => {
                  const hitCount = ship.hits;
                  let cellClass = "ship-health-cell alive";
                  if (ship.sunk) {
                    cellClass = "ship-health-cell sunk-cell";
                  } else if (i < hitCount) {
                    cellClass = "ship-health-cell dead";
                  }
                  return <div key={i} className={cellClass} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
