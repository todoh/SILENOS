function App() {
  const [tweaks, setTweaks] = React.useState(window.__TWEAK_DEFAULTS__);

  const setTweak = (k, v) => {
    const edits = typeof k === 'object' ? k : { [k]: v };
    setTweaks(t => ({ ...t, ...edits }));
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits }, '*');
  };

  const wine = tweaks.showWineAccents;

  return (
    <>
      <Header wine={wine}/>
      <main>
        <Hero tagline={tweaks.tagline} useSerifTitles={tweaks.useSerifTitles} wine={wine}/>
        <Cards wine={wine}/>
        <Books wine={wine}/>
        <Docs wine={wine}/>
        <Team wine={wine}/>
      </main>
      <Footer wine={wine}/>
      <Tweaks tweaks={tweaks} setTweak={setTweak}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
