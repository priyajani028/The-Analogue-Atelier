/** An original instant camera, drawn in CSS. `lens` renders inside the glass. */
export default function CameraBody({ lens, onShutter, pressed }) {
  return (
    <div className="cam">
      <div className="cam-hump" />
      <div className="cam-top">
        <div className="cam-flash" />
        <div className="cam-vf" />
        <div className="cam-stripe" />
        <button className={`cam-shutter ${pressed ? 'down' : ''}`} onPointerDown={(e) => e.button === 0 && onShutter && onShutter()} aria-label="Take a picture" />
      </div>
      <div className="cam-bottom">
        <div className="cam-plate">Instant · Nº 7</div>
        <div className="cam-slot" />
      </div>
      <div className="cam-lens">
        <div className="cam-lens-ring">
          <div className="cam-glass">
            {lens}
            <div className="cam-glare" />
          </div>
        </div>
      </div>
    </div>
  );
}
