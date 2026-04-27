const TEAM = [
  {
    name:'Manuel Rodsua',
    role:'Fundador · Desarrollador · Escritor',
    bio:'Arquitecto del sistema SILENOS. Programa los puentes entre la palabra escrita y el código, defendiendo la soberanía local y la privacidad absoluta.',
    initials:'MR',
  },
  {
    name:'Cristina Lobo',
    role:'Co-Creadora · Diseño · Creatividad',
    bio:'Tejedora visual y narrativa del proyecto. Diseña el lenguaje, los símbolos y la cosmología que dan forma a cada mundo dentro y fuera del editor.',
    initials:'CL',
  },
];

function Avatar({ p }) {
  return (
    <div style={{
      position:'relative',width:120,height:120,flexShrink:0
    }}>
      <div style={{
        position:'absolute',inset:0,
        borderRadius:'50%',
        border:'1px solid var(--line-strong)'
      }}/>
      <div style={{
        position:'absolute',inset:6,
        borderRadius:'50%',
        background:'#FAFAFA',
        display:'grid',placeItems:'center',
        fontFamily:"'Cormorant Garamond', serif",fontStyle:'italic',
        fontSize:38,fontWeight:300,color:'var(--ink)'
      }}>{p.initials}</div>
    </div>
  );
}

function TeamCard({ p, wine }) {
  const wineColor = wine ? 'var(--wine)' : 'var(--ink)';
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        position:'relative',padding:'56px 48px',
        background:'rgba(255,255,255,.55)',
        backdropFilter:'blur(20px) saturate(180%)',
        WebkitBackdropFilter:'blur(20px) saturate(180%)',
        border:'1px solid var(--line)',
        boxShadow: hover
          ? '0 40px 80px -40px rgba(0,0,0,.18)'
          : '0 18px 40px -25px rgba(0,0,0,.08)',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        transition:'all .4s'
      }}
    >
      <div style={{display:'flex',alignItems:'center',gap:28,marginBottom:36}} className="team-head">
        <Avatar p={p}/>
        <div>
          <div className="serif" style={{fontSize:32,fontWeight:300,letterSpacing:'-.01em',marginBottom:10,fontStyle:'italic'}}>{p.name}</div>
          <div style={{fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--mute)'}}>{p.role}</div>
        </div>
      </div>

      <p style={{fontSize:15,lineHeight:1.75,color:'var(--ink-soft)',fontWeight:300}}>
        {p.bio}
      </p>

      <div style={{
        marginTop:40,paddingTop:24,
        borderTop:'1px solid var(--line)',
        display:'flex',justifyContent:'space-between',alignItems:'center'
      }}>
        <span style={{fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--mute)'}}>
          Equipo SILEN<span style={{color:wineColor}}>OS</span> · Núcleo
        </span>
        <span style={{width:6,height:6,borderRadius:'50%',background:wineColor}}/>
      </div>

      <style>{`
        @media (max-width:560px){
          .team-head{flex-direction:column;align-items:flex-start;gap:20px}
        }
      `}</style>
    </div>
  );
}

function Team({ wine }) {
  return (
    <section id="equipo" data-screen-label="Equipo" style={{
      position:'relative',padding:'180px 0',
      background:'var(--bg)',
      borderBottom:'1px solid var(--line)'
    }}>
      <div className="container">
        <div style={{textAlign:'center',marginBottom:96}}>
          <div style={{fontSize:10,letterSpacing:'.3em',textTransform:'uppercase',color:'var(--mute)',marginBottom:24}}>
            04 — Tras el sistema
          </div>
          <h2 className="serif" style={{fontSize:'clamp(44px, 6vw, 88px)',lineHeight:1,fontWeight:300,letterSpacing:'-.02em',marginBottom:24}}>
            Conoce a los <span style={{fontStyle:'italic'}}>Creadores</span>
          </h2>
          <p style={{fontSize:16,color:'var(--mute)',maxWidth:480,margin:'0 auto',lineHeight:1.7,fontWeight:300}}>
            Dos voces, un solo entorno. Código, palabra y diseño tejidos por un mismo hilo.
          </p>
        </div>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(380px, 1fr))',
          gap:32,maxWidth:1080,margin:'0 auto'
        }}>
          {TEAM.map(p => <TeamCard key={p.name} p={p} wine={wine}/>)}
        </div>
      </div>
    </section>
  );
}
window.Team = Team;
