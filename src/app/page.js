import Link from "next/link";
import TrackSelection from "@/components/TrackSelection";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Home">
          <span className="brand-mark">SG</span>
          <span>
            <strong>Saudi German Health</strong>
            <small>Careers</small>
          </span>
        </Link>
        <Link className="header-link" href="/dashboard">
          HR Portal <span aria-hidden="true">→</span>
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR FUTURE STARTS HERE</span>
          <h1>
            Be part of
            <br />
            <span>care that makes a difference.</span>
          </h1>
          <p>
            Join a team that brings expertise and compassion together. Help us
            improve the health of our communities and grow your career with us.
          </p>
          <a className="button button-primary hero-button" href="#tracks">
            Explore opportunities <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-cross">+</div>
          <div className="hero-card">
            <span className="hero-card-icon">✚</span>
            <span>Better care, together</span>
            <strong>Expertise that matters</strong>
          </div>
          <span className="hero-spark spark-one">✦</span>
          <span className="hero-spark spark-two">✦</span>
        </div>
      </section>

      <section className="tracks-section" id="tracks">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MANY OPPORTUNITIES, ONE PURPOSE</span>
            <h2>Choose your career path</h2>
          </div>
          <p>We are looking for passionate people committed to better health for all.</p>
        </div>
        <TrackSelection />
      </section>

      <section className="process-strip" aria-label="Application steps">
        <div><span>1</span><p><strong>Choose your field</strong><small>Find the path that fits your experience</small></p></div>
        <i aria-hidden="true" />
        <div><span>2</span><p><strong>Complete your application</strong><small>Tell us about your experience and goals</small></p></div>
        <i aria-hidden="true" />
        <div><span>3</span><p><strong>We’ll be in touch</strong><small>Our team will carefully review your application</small></p></div>
      </section>

      <footer className="site-footer">
        <span>Saudi German Health</span>
        <span>Building a healthier future, together</span>
      </footer>
    </main>
  );
}
