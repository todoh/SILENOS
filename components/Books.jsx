const BOOKS = [
  { title:'Illuminati', cat:'Sociedades Secretas', n:'I', url:'https://www.amazon.es/dp/B0GSNLYGP2?binding=paperback&qid=1777304284&sr=1-4&ref=dbs_dp_rwt_sb_pc_tpbk' },
  { title:'Kabbalah', cat:'Misticismo Hebreo', n:'II', url:'https://www.amazon.es/-/es/dp/B0DQCXH1Y9?binding=paperback&ref=dbs_m_mng_rwt_sft_tpbk_tkin&qid=1777304147&sr=8-2' },
  { title:'Egipto', cat:'Misterios del Nilo', n:'III', url:'https://www.amazon.es/dp/B0FL7Y5NVM?binding=paperback&qid=1777304337&sr=1-20&ref=dbs_dp_rwt_sb_pc_tpbk' },
  { title:'Incas', cat:'Andes Sagrados', n:'IV', url:'https://www.amazon.es/dp/B0G92W2S5B?binding=kindle_edition&ref_=ast_author_bsi' },
  { title:'Hermetismo', cat:'Filosofía Oculta', n:'V', url:'https://www.amazon.es/dp/B0GRS6FDXF?binding=kindle_edition&ref_=ast_author_bsi' },
  { title:'Roma', cat:'Imperio Eterno', n:'VI', url:'https://www.amazon.es/dp/B0GGN889PT?binding=kindle_edition&ref_=ast_author_bsi' },
  { title:'Maya', cat:'Cosmología Mesoamericana', n:'VII', url:'https://www.amazon.es/dp/B0GRHN91PL?binding=kindle_edition&ref_=ast_author_bsi' },
  { title:'India', cat:'Dharma y Mitología', n:'VIII', url:'https://www.amazon.es/dp/B0FQPGBJT7?binding=kindle_edition&ref_=ast_author_bsi' },
];

const AMAZON_AUTHOR_URL = 'https://www.amazon.es/s?i=stripbooks&rh=p_27%3ALa%2BTejedora%2Bde%2BMundos&ref=dp_byline_sr_book_3';

function BookCover({ b, i }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a href={b.url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{display:'block',cursor:'pointer'}}
    >
      <div style={{
        position:'relative',aspectRatio:'2/3',
        background:'#FAFAFA',
        border:'1px solid var(--line-strong)',
        boxShadow: hover
          ? '0 30px 60px -25px rgba(0,0,0,.25)'
          : '0 12px 30px -18px rgba(0,0,0,.12)',
        transform: hover ? 'translateY(-8px)' : 'translateY(0)',
        transition:'all .5s cubic-bezier(.2,.8,.2,1)',
        overflow:'hidden'
      }}>
        {/* Inner frame */}
        <div style={{position:'absolute',inset:14,border:'1px solid var(--line-strong)'}}/>

        {/* Top mark */}
        <div className="serif" style={{
          position:'absolute',top:36,left:0,right:0,textAlign:'center',
          fontSize:14,letterSpacing:'.4em',color:'var(--mute)',textTransform:'uppercase'
        }}>{b.n}</div>

        {/* Hairline ornament */}
        <div style={{
          position:'absolute',top:64,left:'50%',width:24,height:1,
          background:'var(--ink)',transform:'translateX(-50%)'
        }}/>

        {/* Title */}
        <div className="serif" style={{
          position:'absolute',top:'42%',left:24,right:24,
          textAlign:'center',transform:'translateY(-50%)',
          fontSize:26,lineHeight:1.15,fontWeight:300,letterSpacing:'-.01em',
          color:'var(--ink)',textWrap:'balance',
          fontStyle:'italic'
        }}>
          {b.title}
        </div>

        {/* Author */}
        <div style={{
          position:'absolute',bottom:60,left:0,right:0,textAlign:'center',
          fontSize:9,letterSpacing:'.32em',textTransform:'uppercase',color:'var(--mute)'
        }}>
          La Tejedora de Mundos
        </div>

        {/* Bottom mark */}
        <div style={{
          position:'absolute',bottom:36,left:'50%',width:18,height:1,
          background:'var(--mute-2)',transform:'translateX(-50%)'
        }}/>
      </div>
    </a>
  );
}

function Books({ wine }) {
  const wineColor = wine ? 'var(--wine)' : 'var(--ink)';
  return (
    <section id="catalogo" data-screen-label="Catalogo Tejedora" style={{
      position:'relative',padding:'180px 0',
      background:'#FAFAFA',
      borderBottom:'1px solid var(--line)'
    }}>
      <div className="container">
        <div style={{textAlign:'center',marginBottom:96}}>
          <div style={{fontSize:10,letterSpacing:'.3em',textTransform:'uppercase',color:'var(--mute)',marginBottom:24}}>
            03 — Catálogo Editorial
          </div>
          <h2 className="serif" style={{
            fontSize:'clamp(48px, 7vw, 104px)',lineHeight:1,fontWeight:300,letterSpacing:'-.02em',marginBottom:28
          }}>
            La Tejedora <br/><span style={{fontStyle:'italic'}}>de Mundos</span>
          </h2>
          <p style={{fontSize:16,color:'var(--mute)',maxWidth:520,margin:'0 auto 32px',lineHeight:1.7,fontWeight:300}}>
            Descubre nuestra colección literaria oficial: ocho colecciones que tejen mitologías, sociedades secretas y cosmologías ancestrales.
          </p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16}}>
            <span style={{width:40,height:1,background:'var(--line-strong)'}}/>
            <span style={{fontSize:9,letterSpacing:'.35em',textTransform:'uppercase',color:'var(--mute)'}}>
              Ocho colecciones · Disponible en Amazon
            </span>
            <span style={{width:40,height:1,background:'var(--line-strong)'}}/>
          </div>
        </div>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',
          gap:40,
          marginBottom:96
        }}>
          {BOOKS.map((b,i)=>(
            <div key={b.title}>
              <BookCover b={b} i={i}/>
              <div style={{textAlign:'center',marginTop:24}}>
                <div style={{fontSize:9,letterSpacing:'.28em',textTransform:'uppercase',color:'var(--mute)',marginBottom:8}}>{b.cat}</div>
                <div className="serif" style={{fontSize:18,fontStyle:'italic',color:'var(--ink)',marginBottom:14,fontWeight:300}}>{b.title}</div>
                <a href={b.url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink)',
                  borderBottom:'1px solid var(--ink)',paddingBottom:3
                }}>Ver en Amazon ↗</a>
              </div>
            </div>
          ))}
        </div>

        <div style={{textAlign:'center'}}>
          <a href={AMAZON_AUTHOR_URL} target="_blank" rel="noopener noreferrer" style={{
            display:'inline-flex',alignItems:'center',gap:18,
            padding:'22px 40px',
            background:'var(--ink)',
            color:'#fff',fontSize:11,letterSpacing:'.28em',textTransform:'uppercase',fontWeight:400,
            transition:'background .2s'
          }}
          onMouseEnter={e=>e.currentTarget.style.background=wineColor}
          onMouseLeave={e=>e.currentTarget.style.background='var(--ink)'}
          >
            Ver toda la colección en Amazon <span>↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
window.Books = Books;
