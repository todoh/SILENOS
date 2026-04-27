const SAMPLE_CARDS = [
  { name:'Dragón Ancestral', img:'assets/cards/dragon_ancestral.jpg', faction:'Bestia mítica', n:'I' },
  { name:'Ciber Samurái', img:'assets/cards/ciber_samurai.jpg', faction:'Tecno-orden', n:'II' },
  { name:'Fénix', img:'assets/cards/fenix.jpg', faction:'Elemental', n:'III' },
  { name:'Titán de Hielo', img:'assets/cards/titan_hielo.jpg', faction:'Coloso', n:'IV' },
];

function CardTile({ c }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a href="/cartas/"
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        display:'block',perspective:'1400px',cursor:'pointer'
      }}
    >
      <div style={{
        position:'relative',aspectRatio:'3/4.4',
        background:'#0A0A0A',
        overflow:'hidden',
        boxShadow: hover
          ? '0 40px 80px -30px rgba(0,0,0,.35)'
          : '0 10px 30px -15px rgba(0,0,0,.18)',
        transition:'box-shadow .5s, transform .6s cubic-bezier(.2,.8,.2,1)',
        transform: hover ? 'translateY(-12px) rotateY(-3deg)' : 'translateY(0)',
        transformStyle:'preserve-3d',
      }}>
        <img src={c.img} alt={c.name} style={{
          width:'100%',height:'100%',objectFit:'cover',
          filter: hover ? 'saturate(1.08) contrast(1.02)' : 'saturate(1) contrast(1)',
          transition:'filter .6s, transform .8s',
          transform: hover ? 'scale(1.04)' : 'scale(1)'
        }}/>

        {/* Number */}
        <div className="serif" style={{
          position:'absolute',top:18,left:18,
          fontSize:18,fontStyle:'italic',color:'#fff',opacity:.85
        }}>{c.n}</div>

        {/* Bottom */}
        <div style={{
          position:'absolute',left:0,right:0,bottom:0,
          padding:'40px 18px 18px',
          background:'linear-gradient(transparent, rgba(0,0,0,.85) 70%)',color:'#fff'
        }}>
          <div className="serif" style={{fontSize:22,fontWeight:300,marginBottom:6,letterSpacing:'-.005em'}}>{c.name}</div>
          <div style={{fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',opacity:.65}}>{c.faction}</div>
        </div>
      </div>
    </a>
  );
}

function Cards({ wine }) {
  const wineColor = wine ? 'var(--wine)' : 'var(--ink)';
  return (
    <section id="cartas" data-screen-label="Cartas SILEN" style={{
      position:'relative',padding:'160px 0',
      background:'var(--bg)',
      borderBottom:'1px solid var(--line)'
    }}>
      <div className="container">
        {/* Section header */}
        <div style={{
          display:'grid',gridTemplateColumns:'auto 1fr auto',gap:40,alignItems:'baseline',
          marginBottom:80
        }} className="cards-head">
          <div style={{fontSize:10,letterSpacing:'.3em',textTransform:'uppercase',color:'var(--mute)'}}>
            02 — Coleccionable
          </div>
          <div style={{textAlign:'center'}}>
            <h2 className="serif" style={{
              fontSize:'clamp(40px, 6vw, 84px)',lineHeight:1,fontWeight:300,letterSpacing:'-.015em',marginBottom:20
            }}>
              Cartas <span style={{fontStyle:'italic'}}>SILEN</span>
            </h2>
            <p style={{fontSize:15,color:'var(--mute)',maxWidth:480,margin:'0 auto',lineHeight:1.65,fontWeight:300}}>
              Sumérgete en el universo estratégico y coleccionable. Cada carta, una semilla narrativa.
            </p>
          </div>
          <a href="/cartas/" style={{
            fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink)',
            borderBottom:'1px solid var(--ink)',paddingBottom:4,whiteSpace:'nowrap'
          }}>Ver Colección →</a>
        </div>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',
          gap:32
        }}>
          {SAMPLE_CARDS.map(c => <CardTile key={c.name} c={c}/>)}
        </div>

        <div style={{textAlign:'center',marginTop:72}}>
          <a href="/cartas/" style={{
            display:'inline-flex',alignItems:'center',gap:18,
            padding:'18px 36px',
            border:`1px solid var(--ink)`,
            color:'var(--ink)',fontSize:11,letterSpacing:'.28em',textTransform:'uppercase',fontWeight:400,
            transition:'all .2s'
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='var(--ink)';e.currentTarget.style.color='#fff'}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--ink)'}}
          >
            Ver Colección Completa <span>→</span>
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width:820px){
          .cards-head{grid-template-columns:1fr !important;text-align:left}
          .cards-head > div:nth-child(2){text-align:left !important}
          .cards-head > div:nth-child(2) p{margin:0 !important}
        }
      `}</style>
    </section>
  );
}
window.Cards = Cards;
