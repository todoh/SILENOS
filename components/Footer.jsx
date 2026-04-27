function Footer({ wine }) {
  const wineColor = wine ? 'var(--wine)' : 'var(--ink)';
  const cols = [
    { title:'Sistema', items:[['Silenos v4','/4/'],['Silenos v3','/3/']] },
    { title:'Universos', items:[['Cartas SILEN','/cartas/'],['Catálogo','#catalogo']] },
    { title:'Creadores', items:[['Equipo','#equipo'],['Cristina Lobo','/Cristina_Lobo/']] },
  ];
  return (
    <footer style={{
      position:'relative',padding:'96px 0 36px',
      background:'var(--bg)',
      borderTop:'1px solid var(--line)'
    }}>
      <div className="container">
        <div style={{
          display:'grid',gridTemplateColumns:'1.4fr repeat(3, 1fr)',
          gap:48,marginBottom:80
        }} className="footer-grid">
          <div>
            <div style={{display:'flex',alignItems:'baseline',letterSpacing:'.02em',fontWeight:400,fontSize:18,marginBottom:18}}>
              <span>SILEN</span>
              <span style={{color:wineColor}}>OS</span>
              <span style={{color:'var(--mute-2)'}}>.</span>
            </div>
            <p style={{fontSize:13,color:'var(--mute)',lineHeight:1.7,maxWidth:280,fontWeight:300}}>
              Un entorno de desarrollo narrativo donde la literatura converge con el código.
            </p>
          </div>
          {cols.map(c=>(
            <div key={c.title}>
              <div style={{fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--mute)',marginBottom:22}}>{c.title}</div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {c.items.map(([l,h])=>(
                  <a key={l} href={h} style={{fontSize:13,color:'var(--ink)',transition:'color .15s',fontWeight:300}}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--mute)'}
                    onMouseLeave={e=>e.currentTarget.style.color='var(--ink)'}
                  >{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          display:'flex',justifyContent:'space-between',alignItems:'center',
          paddingTop:28,borderTop:'1px solid var(--line)',
          flexWrap:'wrap',gap:16
        }}>
          <span style={{fontSize:11,color:'var(--mute)',letterSpacing:'.05em'}}>
            © 2026 SILENOS. Todos los derechos reservados.
          </span>
          <span style={{fontSize:10,color:'var(--mute)',letterSpacing:'.22em',textTransform:'uppercase'}}>
            <span style={{color:wineColor,marginRight:6}}>●</span> Sistema operativo · Local · Soberano
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width:780px){
          .footer-grid{grid-template-columns:1fr 1fr !important}
        }
      `}</style>
    </footer>
  );
}
window.Footer = Footer;
