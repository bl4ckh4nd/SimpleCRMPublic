import React from 'react';

const Titlebar: React.FC = () => {
  return (
    <div
      // Make it cover the top area, ensure it's draggable, remove visual styling (bg, border)
      // Adjust height as needed, h-8 might still be appropriate to cover the native titlebar area
      className="h-4 w-full fixed top-0 left-0 z-[50] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Content removed - this div is now only for dragging */}
    </div>
  );
};

export default Titlebar;
