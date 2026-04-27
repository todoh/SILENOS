function Hero({ tagline, useSerifTitles, wine }) {
  const wineColor = wine ? 'var(--wine)' : 'var(--ink)';

  return (
    <section id="hero" data-screen-label="Hero v4" style={{
      position:'relative',minHeight:'100vh',
      display:'flex',flexDirection:'column',
      borderBottom:'1px solid var(--line)',
      paddingTop:40
    }}>
      {/* Top meta strip */}
      <div className="container" style={{
        display:'flex',justifyContent:'space-between',alignItems:'center',
        fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--mute)',
        paddingTop:16
      }}>
        <span>Versión 4 — Disponible</span>
        <span>MMXXVI · Build 4.0</span>
      </div>

      <div className="container" style={{
        flex:1,display:'grid',
        gridTemplateColumns:'1fr',
        alignItems:'center',
        padding:'80px 40px 120px',
        gap:60
      }}>
        <div style={{maxWidth:980,margin:'0 auto',textAlign:'center',width:'100%'}}>

          <div style={{
            display:'inline-flex',alignItems:'center',gap:14,
            fontSize:10,letterSpacing:'.3em',textTransform:'uppercase',color:'var(--mute)',
            marginBottom:48
          }}>
            <span style={{width:32,height:1,background:'var(--line-strong)'}}/>
            <span>Sistema operativo narrativo</span>
            <span style={{width:32,height:1,background:'var(--line-strong)'}}/>
          </div>

          {useSerifTitles ? (
            <h1 className="serif" style={{
              fontSize:'clamp(56px, 11vw, 168px)',
              lineHeight:.92,
              letterSpacing:'-.02em',
              fontWeight:300,
              marginBottom:36,
              textWrap:'balance'
            }}>
              Bienvenido a<br/>
              <span style={{fontStyle:'italic',fontWeight:300}}>
                Silenos <span style={{color:wineColor}}>v4</span>
              </span>
            </h1>
          ) : (
            <h1 style={{
              fontSize:'clamp(44px, 8.4vw, 124px)',
              lineHeight:.96,
              letterSpacing:'-.04em',
              fontWeight:200,
              marginBottom:36,
              textWrap:'balance',
              textTransform:'uppercase'
            }}>
              Bienvenido a<br/>
              Silenos <span style={{color:wineColor,fontWeight:300}}>v4</span>
            </h1>
          )}

          <p style={{
            maxWidth:560,margin:'0 auto 64px',
            fontSize:16,
            lineHeight:1.7,color:'var(--mute)',fontWeight:300,
            textWrap:'balance'
          }}>
            {tagline}
          </p>

          <div style={{display:'flex',justifyContent:'center',gap:16,flexWrap:'wrap',alignItems:'center'}}>
            <a href="/4/" style={{
              display:'inline-flex',alignItems:'center',gap:18,
              padding:'22px 40px',
              background:wineColor,
              color:'#fff',fontWeight:400,
              fontSize:11,letterSpacing:'.28em',textTransform:'uppercase',
              transition:'background .2s, padding .25s'
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--ink)';e.currentTarget.style.paddingRight='48px'}}
            onMouseLeave={e=>{e.currentTarget.style.background=wineColor;e.currentTarget.style.paddingRight='40px'}}
            >
              Iniciar Silenos v4
              <span style={{fontWeight:300}}>→</span>
            </a>

            <a href="#cartas" style={{
              fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink)',
              padding:'22px 8px',
              borderBottom:'1px solid var(--ink)',
              transition:'color .2s, border-color .2s'
            }}
            onMouseEnter={e=>{e.currentTarget.style.color='var(--mute)';e.currentTarget.style.borderColor='var(--mute)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='var(--ink)';e.currentTarget.style.borderColor='var(--ink)'}}
            >
              Explorar el ecosistema
            </a>
          </div>
        </div>
      </div>

      {/* Bottom meta strip */}
      <div className="container" style={{
        display:'grid',gridTemplateColumns:'repeat(4, minmax(0,1fr))',
        borderTop:'1px solid var(--line)',
        padding:'28px 40px'
      }} className="hero-stats">
        {[
          ['I.','Doce módulos integrados'],
          ['II.','Worldbuilding local'],
          ['III.','Orquestación de I.A.'],
          ['IV.','Soberanía total'],
        ].map(([n,l])=>(
          <div key={l} style={{display:'flex',gap:14,alignItems:'baseline'}}>
            <span className="serif" style={{fontSize:14,fontStyle:'italic',color:'var(--mute-2)'}}>{n}</span>
            <span style={{fontSize:11,color:'var(--ink)',letterSpacing:'.04em',fontWeight:300}}>{l}</span>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width:780px){
          .hero-stats{grid-template-columns:1fr 1fr !important;gap:18px}
        }
      `}</style>
    </section>
  );
}
window.Hero = Hero;
