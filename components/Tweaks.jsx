function Tweaks({ tweaks, setTweak }) {
  const [active, setActive] = React.useState(false);

  React.useEffect(()=>{
    function onMessage(e){
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode') setActive(true);
      if (d.type === '__deactivate_edit_mode') setActive(false);
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return ()=> window.removeEventListener('message', onMessage);
  },[]);

  if (!active) return null;

  const dismiss = ()=>{
    setActive(false);
    window.parent.postMessage({type:'__edit_mode_dismissed'}, '*');
  };

  return (
    <div style={{
      position:'fixed',right:24,bottom:24,zIndex:100,
      width:300,
      background:'rgba(255,255,255,.96)',
      backdropFilter:'blur(14px)',
      border:'1px solid var(--line-strong)',
      color:'var(--ink)',
      boxShadow:'0 30px 80px -20px rgba(0,0,0,.2)',
      padding:22,
      fontFamily:'Montserrat, sans-serif'
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,paddingBottom:14,borderBottom:'1px solid var(--line)'}}>
        <div style={{fontSize:10,letterSpacing:'.28em',textTransform:'uppercase',color:'var(--ink)',fontWeight:500}}>Tweaks</div>
        <button onClick={dismiss} style={{
          background:'transparent',border:'1px solid var(--line-strong)',color:'var(--mute)',
          width:24,height:24,cursor:'pointer',fontFamily:'inherit',fontSize:14
        }}>×</button>
      </div>

      <Section label="Acento rojo vino">
        <Toggle label="Activar en SILENOS" value={tweaks.showWineAccents} onChange={v=>setTweak('showWineAccents', v)}/>
      </Section>

      <Section label="Tipografía del título">
        <Segmented value={tweaks.useSerifTitles ? 'serif':'sans'} onChange={v=>setTweak('useSerifTitles', v==='serif')}
          options={[['serif','Cormorant'],['sans','Montserrat']]}/>
      </Section>

      <Section label="Subtítulo del Hero">
        <textarea
          value={tweaks.tagline}
          onChange={e=>setTweak('tagline', e.target.value)}
          rows={3}
          style={{
            width:'100%',background:'#FAFAFA',
            border:'1px solid var(--line-strong)',color:'var(--ink)',
            padding:'10px 12px',fontFamily:'inherit',fontSize:12,resize:'vertical',
            fontWeight:300,outline:'none'
          }}
        />
      </Section>
    </div>
  );
}

function Section({label, children}){
  return (
    <div style={{marginBottom:18}}>
      <div style={{fontSize:9,color:'var(--mute)',letterSpacing:'.22em',textTransform:'uppercase',marginBottom:10}}>{label}</div>
      {children}
    </div>
  );
}

function Segmented({value, onChange, options}){
  return (
    <div style={{display:'grid',gridTemplateColumns:`repeat(${options.length},1fr)`,gap:0,border:'1px solid var(--line-strong)'}}>
      {options.map(([v,l],i)=>(
        <button key={v} onClick={()=>onChange(v)} style={{
          padding:'10px 6px',
          background: value===v ? 'var(--ink)' : '#fff',
          color: value===v ? '#fff' : 'var(--mute)',
          border:'none',borderLeft: i>0 ? '1px solid var(--line-strong)':'none',
          cursor:'pointer',fontSize:10,fontWeight:400,letterSpacing:'.12em',textTransform:'uppercase',
          fontFamily:'inherit',transition:'all .15s'
        }}>{l}</button>
      ))}
    </div>
  );
}

function Toggle({label, value, onChange}){
  return (
    <button onClick={()=>onChange(!value)} style={{
      display:'flex',justifyContent:'space-between',alignItems:'center',
      width:'100%',padding:'10px 12px',
      background:'#FAFAFA',border:'1px solid var(--line-strong)',
      color:'var(--ink)',cursor:'pointer',fontFamily:'inherit',fontSize:12,textAlign:'left',fontWeight:300
    }}>
      <span>{label}</span>
      <span style={{
        width:30,height:16,background: value ? 'var(--wine)' : 'var(--line-strong)',
        position:'relative',transition:'.2s'
      }}>
        <span style={{
          position:'absolute',top:2,left: value ? 16 : 2,
          width:12,height:12,background:'#fff',transition:'.2s'
        }}/>
      </span>
    </button>
  );
}

window.Tweaks = Tweaks;
