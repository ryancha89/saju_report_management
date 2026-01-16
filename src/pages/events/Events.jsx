import { Link } from 'react-router-dom'
import './Events.css'

export default function Events() {
  return (
    <div className="events-container">
      <div className="events-content">
        <div className="video-wrapper">
          <video
            src="/img/2026_video_v2_02.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="events-video"
          />
          <img
            src="/img/title_v2_02.png"
            alt="Title"
            className="title-image"
          />
        </div>
        <img
          src="/img/2026_story_v2_02.jpg"
          alt="Event Image"
          className="events-image"
        />
        <div className="bottom-video-wrapper">
          <video
            src="/img/2026_video_v2_01.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="events-video"
          />
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="button-wrapper">
        <div className="button-container">
          <Link to="/user-info?product=life_journey" className="button-link">
            <div className="button-inner">
              <button className="glow-button">
                신년 사주 밝히기
              </button>
              <div className="sparkle sparkle-1"></div>
              <div className="sparkle sparkle-2"></div>
              <div className="sparkle sparkle-3"></div>
              <div className="sparkle sparkle-4"></div>
              <div className="sparkle sparkle-5"></div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
