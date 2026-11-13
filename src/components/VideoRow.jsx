import VideoCard from "./VideoCard";

export default function VideoRow({ title, videos, id }) {
  if (!videos.length) return null;
  return (
    <section className="section" id={id}>
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{videos.length} videos</span>
      </div>
      <div className="video-grid">
        {videos.map((video) => <VideoCard key={video.id} video={video} />)}
      </div>
    </section>
  );
}