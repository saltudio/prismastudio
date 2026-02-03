import React, { useState, useEffect } from 'react';

// High-contrast, on-brand brutalist palette
const colors = ['#FFFF00', '#0055FF']; 
const shapeTypes = ['rect', 'circle', 'star', 'diamond', 'triangle'];

interface Shape {
  id: number;
  type: string;
  color: string;
  top: string;
  left: string;
  size: number;
  rotation: number;
  strokeWidth: number;
  shadowOffset: number;
}

const generateShapes = (count: number): Shape[] => {
  const shapes: Shape[] = [];
  const width = window.innerWidth > 1920 ? window.innerWidth : 1920; 
  const height = window.innerHeight > 1080 ? window.innerHeight : 1080;

  for (let i = 0; i < count; i++) {
    const size = Math.random() * 150 + 50; // 50px to 200px for more impact
    shapes.push({
      id: i,
      type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      top: `${Math.random() * height}px`,
      left: `${Math.random() * width}px`,
      size: size,
      rotation: Math.random() * 90 - 45, // Keep rotations somewhat grounded
      strokeWidth: Math.floor(Math.random() * 5) + 5, // 5px to 9px stroke (thicker)
      shadowOffset: Math.floor(Math.random() * 6) + 6, // 6px to 11px shadow (heavier)
    });
  }
  return shapes;
};

const BrutalistBackground: React.FC = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);

  useEffect(() => {
    setShapes(generateShapes(25)); // Generate 25 shapes for a cleaner, robust feel
  }, []);

  const renderShape = (shape: Shape) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      top: shape.top,
      left: shape.left,
      transform: `rotate(${shape.rotation}deg)`,
      width: `${shape.size}px`,
      height: `${shape.size}px`,
      border: `${shape.strokeWidth}px solid #000`,
      boxShadow: `${shape.shadowOffset}px ${shape.shadowOffset}px 0px #000`,
      backgroundColor: shape.color,
      transition: 'transform 0.2s ease-out', // Subtle interaction hint
    };

    // Use clip-path for non-rectangular shapes to keep the div a square
    switch (shape.type) {
      case 'circle':
        style.borderRadius = '50%';
        break;
      case 'star':
        style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        break;
      case 'diamond':
         style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
        break;
      case 'triangle':
        style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
        break;
      case 'rect':
      default:
        break;
    }
    return <div key={shape.id} style={style}></div>;
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-brutal-bg dark:bg-brutal-dark">
      {shapes.map(renderShape)}
    </div>
  );
};

export default BrutalistBackground;