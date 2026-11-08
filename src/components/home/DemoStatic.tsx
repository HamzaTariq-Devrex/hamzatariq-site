import { DEMO_ANSWER, DEMO_QUESTION, DEMO_SCENES } from "./demoContent";

/**
 * The live demo's first frame as plain HTML (no JavaScript): the AI chatbot tab with its complete
 * answer. Server-rendered so the hero is complete at first paint; HeroDemo swaps in the interactive
 * LiveDemo once the page has loaded, starting from this exact frame.
 */
const DemoStatic = () => (
  <div className="demo">
    <div className="demo-bar-top">
      <span className="demo-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="demo-live">
        <span className="demo-live-dot" aria-hidden="true" />
        Live demo
      </span>
    </div>
    <div className="demo-tabs" role="tablist" aria-label="Live demo">
      {DEMO_SCENES.map((s, i) => (
        <button key={s.id} type="button" role="tab" className="demo-tab" aria-selected={i === 0} tabIndex={i === 0 ? 0 : -1}>
          {s.label}
        </button>
      ))}
    </div>
    <div className="demo-body" role="tabpanel">
      <div className="demo-scene">
        <div className="demo-chat">
          <p className="demo-msg is-user">{DEMO_QUESTION}</p>
          <div className="demo-msg-row">
            <span className="demo-avatar" aria-hidden="true">
              AI
            </span>
            <p className="demo-msg is-bot">{DEMO_ANSWER}</p>
          </div>
          <p className="demo-foot">Answers from this site&apos;s own content · try it bottom right</p>
        </div>
      </div>
    </div>
  </div>
);

export default DemoStatic;
