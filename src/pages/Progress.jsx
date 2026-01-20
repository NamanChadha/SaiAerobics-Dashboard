import "../styles/progress.css";

export default function Progress({ percent }) {
  return (
    <div className="progress-wrapper">
      <svg viewBox="0 0 100 50">
        <path
          d="M10 50 A40 40 0 0 1 90 50"
          className="bg-arc"
        />
        <path
          d="M10 50 A40 40 0 0 1 90 50"
          className="fg-arc"
          strokeDasharray={`${percent * 1.26} 126`}
        />
      </svg>
      <span>{percent}%</span>
    </div>
  );
}
