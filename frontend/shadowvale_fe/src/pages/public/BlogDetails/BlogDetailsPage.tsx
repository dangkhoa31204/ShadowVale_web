import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const BlogDetailsPage: React.FC = () => {
  useParams<{ id: string }>();

  const article = {
    id: '1',
    tag: 'AI Development',
    logId: '8472-A',
    date: '2042.10.18',
    readTime: '12 Min Read',
    title: 'Enemy AI Development: Neural Networks in the Shadows',
    description: 'How we trained adversarial entities to predict player movement patterns in zero-visibility environments.',
    operator: 'M. CHEN',
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe1OVtY7G7ijyRLSB2nqu8YPqPJlYPtRrttEwc3ZhEUlYjwtYoMUKYrSrkraJuPsJPWmjzUj1rofeycGD3z_wzuesjvnrS0CVv7MVF8jTG5Qnhh0GdNH06qBMRoqFQD5Z9HVHZ8EQTyyedzECYCLOiviAVPy3nv0Sf2F77MUzCd9iF77eSd-k7TkJz9KkV3bHtX7X-YZKgMUc3ad3apQOZt9cn4lpjmiP154vXykfymKZ0bqoZvNH0AA'
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-8">
      {/* Breadcrumb & Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-on-surface-variant font-data-mono text-data-mono text-xs uppercase">
          <Link to="/blogs" className="hover:text-primary cursor-pointer transition-colors">Intelligence Briefings</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface">AI Development</span>
        </div>
        <div className="inline-flex items-center px-2 py-1 rounded bg-primary-container/20 border border-primary/30 text-primary font-label-caps text-label-caps">
          <span className="material-symbols-outlined text-[14px] mr-1">smart_toy</span>
          AI DEVELOPMENT
        </div>
        <h1 className="font-display-lg text-display-lg text-on-surface">Enemy AI Development: Neural Networks in the Shadows</h1>
        <div className="flex flex-wrap items-center gap-4 text-on-surface-variant font-data-mono text-data-mono border-y border-border-subtle py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">person</span>
            <span>Operator M. Chen</span>
          </div>
          <span className="text-border-subtle">•</span>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>{article.date}</span>
          </div>
          <span className="text-border-subtle">•</span>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">timer</span>
            <span>{article.readTime}</span>
          </div>
        </div>
      </header>

      {/* Hero Image */}
      <div className="w-full h-64 md:h-96 rounded-xl overflow-hidden border border-outline-variant relative bg-surface-container-lowest">
        <img alt="Hero Image" className="w-full h-full object-cover" src={article.imageSrc} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
      </div>

      {/* Content Layout */}
      <div className="flex flex-col lg:flex-row gap-8 relative justify-between">
        {/* Article Content */}
        <article className="flex-1 w-full lg:max-w-[800px]">
          <section className="prose prose-invert max-w-none text-on-surface font-body-md text-body-md leading-relaxed space-y-6">
            <p className="text-on-surface-variant text-lg">
              The deployment of autonomous hostiles within the ShadowVale ecosystem requires a paradigm shift from traditional state-machine logic to dynamic, neural-network-driven behavioral trees. This briefing outlines the architectural framework governing enemy perception and predictive pathfinding in low-visibility environments.
            </p>

            <h2 className="font-title-sm text-title-sm text-on-surface mt-8 pt-4 border-t border-border-subtle">1. Perception Algorithms (Sensor Fusion)</h2>
            <p>
              Our hostile AI models rely on a simulated "sensor fusion" approach, combining visual, auditory, and systemic anomaly detection to locate operatives. Instead of perfect global knowledge, AI agents operate within constrained sensory cones.
            </p>
            
            <ul className="list-none space-y-2 pl-0 my-4">
              <li className="flex items-start gap-3 bg-surface-container-low p-3 rounded border border-outline-variant">
                <span className="material-symbols-outlined text-primary mt-0.5 text-[18px]">visibility</span>
                <div>
                  <strong className="text-on-surface block font-data-mono text-data-mono mb-1">Visual Cone Raycasting</strong>
                  <span className="text-on-surface-variant">Dynamic lighting directly affects visual detection range. Agents use volumetric raycasting to calculate line-of-sight against ambient light levels.</span>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-surface-container-low p-3 rounded border border-outline-variant">
                <span className="material-symbols-outlined text-info mt-0.5 text-[18px]">volume_up</span>
                <div>
                  <strong className="text-on-surface block font-data-mono text-data-mono mb-1">Acoustic Propagation Network</strong>
                  <span className="text-on-surface-variant">Footsteps and weapon discharges generate acoustic nodes that propagate through the navmesh, decaying based on environmental materials.</span>
                </div>
              </li>
            </ul>

            <h2 className="font-title-sm text-title-sm text-on-surface mt-8 pt-4 border-t border-border-subtle">2. Predictive Pathfinding (A* & Heuristics)</h2>
            <p>
              When an operative breaks line-of-sight, the AI transitions from direct pursuit to predictive interception. The navmesh is heavily annotated with "tactical nodes" (cover points, shadow zones, choke points).
            </p>
            
            <div className="bg-surface p-4 rounded-lg border border-outline-variant my-4 font-data-mono text-data-mono text-on-surface-variant overflow-x-auto">
              <span className="text-tertiary"># Pathfinding heuristic weight calculation</span><br />
              <span className="text-info">def</span> calculate_node_weight(node, target_last_known):<br />
                  base_cost = distance(node, target_last_known)<br />
                  cover_bonus = node.get_cover_value() * <span className="text-warning">1.5</span><br />
                  light_penalty = node.get_illumination() * <span className="text-error">2.0</span><br />
                  <span className="text-info">return</span> base_cost - cover_bonus + light_penalty
            </div>

            <h2 className="font-title-sm text-title-sm text-on-surface mt-8 pt-4 border-t border-border-subtle">Conclusion</h2>
            <p>
              By combining constrained sensor fusion with tactical heuristics, the ShadowVale enemy AI provides a challenging, non-deterministic combat puzzle that rewards stealth and penalizes predictable movement.
            </p>
          </section>

          {/* Bottom Navigation */}
          <nav className="mt-8 pt-6 border-t border-border-subtle flex flex-col sm:flex-row justify-between gap-4">
            <Link 
              to="/blogs" 
              className="group flex flex-col gap-1 p-4 rounded-lg border border-outline-variant bg-surface-container-low hover:border-primary transition-colors flex-1"
            >
              <span className="text-on-surface-variant font-label-caps text-label-caps flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">arrow_back</span> Back to Briefings
              </span>
              <span className="font-title-sm text-title-sm text-on-surface group-hover:text-primary transition-colors">All Intelligence Briefings</span>
            </Link>
            <Link 
              to="/blogs/2" 
              className="group flex flex-col gap-1 p-4 rounded-lg border border-outline-variant bg-surface-container-low hover:border-primary transition-colors flex-1 items-end text-right"
            >
              <span className="text-on-surface-variant font-label-caps text-label-caps flex items-center gap-1">
                Next <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
              <span className="font-title-sm text-title-sm text-on-surface group-hover:text-primary transition-colors">Data-Driven Game Design</span>
            </Link>
          </nav>
        </article>

        {/* Sidebar Sticky */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-6 lg:sticky lg:top-[88px] lg:h-fit">
          {/* Table of Contents */}
          <div className="bg-surface-container rounded-xl border border-outline-variant p-5">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">list</span> Table of Contents
            </h3>
            <ul className="space-y-3 font-body-md text-body-md">
              <li><a className="text-primary hover:underline" href="#">Overview</a></li>
              <li><a className="text-on-surface hover:text-primary transition-colors" href="#">1. Perception Algorithms</a></li>
              <li><a className="text-on-surface hover:text-primary transition-colors" href="#">2. Predictive Pathfinding</a></li>
              <li><a className="text-on-surface hover:text-primary transition-colors" href="#">Conclusion</a></li>
            </ul>
          </div>

          {/* Related Briefings */}
          <div className="bg-surface-container rounded-xl border border-outline-variant p-5">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">library_books</span> Related Briefings
            </h3>
            <div className="space-y-4">
              <Link to="/blogs" className="block group">
                <h4 className="font-title-sm text-[14px] text-on-surface group-hover:text-primary transition-colors mb-1">Designing Stealth Systems</h4>
                <p className="font-data-mono text-[11px] text-on-surface-variant">SysDesign • 8 Min Read</p>
              </Link>
              <div className="h-px w-full bg-border-subtle" />
              <Link to="/blogs/2" className="block group">
                <h4 className="font-title-sm text-[14px] text-on-surface group-hover:text-primary transition-colors mb-1">Data-Driven Game Design</h4>
                <p className="font-data-mono text-[11px] text-on-surface-variant">Architecture • 15 Min Read</p>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default BlogDetailsPage;