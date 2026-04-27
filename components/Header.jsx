function Header({ wine }) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(()=>{
    const onScroll = ()=> setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
    return ()=> window.removeEventListener('scroll', onScroll);
  },[]);
  const wineColor = wine ? 'var(--wine)' : 'var(--ink)';

  const links = [
    {label:'Silenos v4', href:'#hero'},
    {label:'Cartas', href:'#cartas'},
    {label:'Catálogo', href:'#catalogo'},
    {label:'Docs', href:'#documentacion'},
    {label:'Equipo', href:'#equipo'},
  ];

  return (
    <header style={{
      position:'sticky',top:0,zIndex:50,
      background: scrolled ? 'rgba(255,255,255,.86)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
      borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      transition:'all .3s ease',
    }}>
      <div className="container" style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        height:80
      }}>
        <a href="#" style={{display:'flex',alignItems:'baseline',letterSpacing:'.02em',fontWeight:400,fontSize:15}}>
          <span>SILEN</span>
          <span style={{color:wineColor}}>OS</span>
          <span style={{color:'var(--mute-2)'}}>.</span>
        </a>

        <nav style={{display:'flex',alignItems:'center',gap:42}} className="nav-desktop">
          {links.map(l=>(
            <a key={l.href} href={l.href} style={{
              fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',fontWeight:400,
              color:'var(--mute)',transition:'color .2s'
            }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--ink)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--mute)'}
            >{l.label}</a>
          ))}
        </nav>

        <a href="/4/" style={{
          display:'inline-flex',alignItems:'center',gap:14,
          padding:'12px 22px',
          background:wineColor,
          color:'#fff',fontWeight:400,fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',
          transition:'background .2s'
        }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--ink)'}
        onMouseLeave={e=>e.currentTarget.style.background=wineColor}
        >
          Entrar a Silenos v4
          <span style={{opacity:.7}}>→</span>
        </a>
      </div>

      <style>{`
        @media (max-width: 820px){
          .nav-desktop{display:none !important}
        }
      `}</style>
    </header>
  );
}
window.Header = Header;
