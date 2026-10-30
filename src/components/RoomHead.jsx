export default function RoomHead({ num, eyebrow, title, hint }) {
  return (
    <header className="room-head">
      <div className="eyebrow">
        Nº {num} <span className="dash" /> {eyebrow}
      </div>
      <h1>{title}</h1>
      {hint && <p className="hint">{hint}</p>}
    </header>
  );
}
