const SISTEMA_BASE = {
  title: 'Sistema Central SILENOS',
  intro: 'El entorno principal actúa como puente y gestor de ventanas que unifica todas las herramientas en un sistema operativo virtual de navegador.',
  blocks: [
    {
      title: 'Arquitectura y entorno de escritorio',
      points: [
        ['Gestor de ventanas', 'Aplicaciones flotantes, redimensionables y minimizables que simulan un SO de escritorio.'],
        ['Gestor de escritorio y dock', 'Iconos, barra de tareas y organización del espacio de trabajo.'],
        ['Sistema de archivos virtual', 'Permite a las aplicaciones guardar, leer y gestionar JSON, texto y exportaciones DOCX en el navegador.'],
        ['Drag & drop universal', 'Soporte para arrastrar elementos entre ventanas y organización espacial libre.'],
      ]
    },
    {
      title: 'Motor de Inteligencia Artificial',
      points: [
        ['AI Service & Workers', 'Gestionan peticiones a APIs (OpenAI, Anthropic) y modelos locales sin bloquear la interfaz.'],
        ['Portapapeles universal', 'Soporta HTML, CSS, JSON, YouTube e imágenes para transferir datos entre aplicaciones.'],
      ]
    },
    {
      title: 'Evolución de versiones',
      points: [
        ['Versión 3', 'Introduce el escritorio completo, editores de código, gestores de libros y visualizadores 3D.'],
        ['Versión 4', 'Mejora la estructura con Tailwind, motor físico para el universo e interacciones de ventanas más pulidas.'],
        ['Versión 5', 'Se enfoca en Studios (Coder, Datos, Game, Narrative) y un manejo robusto a nivel de servidor.'],
      ]
    },
  ]
};

const PROGRAMAS = [
  {
    n:'01', name:'Librojuego Studio', tag:'Aventuras interactivas con IA',
    desc:'Suite completa para crear, editar y exportar aventuras "elige tu propia aventura" asistidas por modelos locales (Ollama).',
    features:[
      'Motor de generación masiva y colosal de tramas y nodos',
      'Módulos de combate y tienda con mecánicas RPG narradas por IA',
      'Analizador de rutas y bitácora dinámica para evitar callejones sin salida',
      'Motores visual y de audio para recursos multimedia inmersivos',
      'Exportador a DOCX y vídeo del árbol completo de decisiones',
    ]
  },
  {
    n:'02', name:'Escaleta 2', tag:'Planificación estructural narrativa',
    desc:'Herramienta para guionistas y novelistas dedicada a la planificación de historias, escenas y ritmos narrativos.',
    features:[
      'El Director: asistente de IA que supervisa ritmo, arcos y conflictos',
      'AI Writer especializado en redactar escenas detalladas',
      'Análisis de coherencia narrativa y continuidad lógica',
      'Generadores de storyboards visuales, audio y vídeo',
    ]
  },
  {
    n:'03', name:'Datos Studio II', tag:'Worldbuilding visual',
    desc:'Entorno visual para gestionar bases de datos relacionales orientadas a la construcción de mundos y la gestión de tramas.',
    features:[
      'Lienzo de tramas con nodos interconectados (visual scripting)',
      'IA capaz de generar bases de datos completas y poblar mundos',
      'Procesamiento por lotes de retratos y referencias visuales',
      'Núcleo de coherencia para mantener la cohesión del lore',
    ]
  },
  {
    n:'04', name:'Nexus', tag:'Wikia personal del creador',
    desc:'El planificador maestro y enciclopedia interactiva de tu universo literario o de juego.',
    features:[
      'Chronos: constructor de líneas de tiempo del universo',
      'Mapas interactivos con pines y enlaces al codex',
      'Codex de personajes con hojas dinámicas e interrelaciones',
      'Planificador asistido por IA basado en el lore introducido',
    ]
  },
  {
    n:'05', name:'SILENOS Cartas', tag:'Trading card game completo',
    desc:'Videojuego de cartas coleccionables jugable en el navegador, con fuerte componente de fantasía.',
    features:[
      'Motor de reglas con turnos, recursos, daño y estado del tablero',
      'Sinergias entre razas: dragones, magos, necromantes, slimes…',
      'IA del oponente con decisiones tácticas en base al tablero',
      'Dashboard con tienda, sobres animados y constructor de mazos',
    ]
  },
  {
    n:'06', name:'Cronología 3', tag:'Maquetación temporal de obras',
    desc:'Especializado en la maquetación temporal y secuenciación de obras largas, ensamblando manuscritos coherentes.',
    features:[
      'Ensamblador de libros desde fragmentos dispersos',
      'Storyboard core en formato tarjeta/guion gráfico',
      'Sintonía con Nexus para enlazar eventos y personajes',
    ]
  },
  {
    n:'07', name:'SILENOS Voz', tag:'Interfaz conversacional y agentes',
    desc:'Sistema de agentes autónomos controlado por audio, con TTS, STT y orquestación multi-agente.',
    features:[
      'Procesamiento de micrófono, Text-to-Speech y Speech-to-Text',
      'Múltiples agentes de IA cooperando en tareas complejas',
      'Narrative Studio para dictar y explorar mundos imaginativos',
      'Resumen y organización automática de tormentas de ideas',
    ]
  },
  {
    n:'08', name:'Pollination', tag:'Multimedia y narrativa visual',
    desc:'Experimentación multimedia, visualización 3D y storyboard avanzado con generación integrada.',
    features:[
      'Visualizador 3D con modificadores en navegador',
      'Storyboard avanzado con generación de imagen, voz y música',
      'Animáticas completas para previsualizar escenas',
    ]
  },
  {
    n:'09', name:'MIDI & Koreh', tag:'Producción de audio y síntesis',
    desc:'Generación musical asistida por IA y sintetizador polifónico nativo del navegador.',
    features:[
      'IA capaz de generar y procesar secuencias MIDI',
      'Sintetizador polifónico Koreh para diseño sonoro',
      'Composición musical funcional integrada en el flujo',
    ]
  },
  {
    n:'10', name:'Herramientas auxiliares', tag:'Extractor · Formulario · Tarot',
    desc:'Utilidades complementarias: minería de datos, recolección de información y oráculo creativo.',
    features:[
      'Extractor de texto y assets de otros formatos',
      'Formularios estándar para recolección de datos',
      'Aplicación de tarot como oráculo creativo para historias',
    ]
  },
];

const FAQ = [
  {
    q:'¿Cómo manejo las ventanas en SILENOS v4?',
    a:'Cada herramienta abre una ventana flotante. Arrastra desde la cabecera para moverla, tira de los bordes para redimensionar, haz clic en cualquier zona para enfocarla y usa los botones de la esquina superior derecha para minimizar, maximizar o cerrar.'
  },
  {
    q:'¿Cómo navego por el "Universo" o lienzo infinito?',
    a:'Mantén pulsado en un espacio vacío y arrastra para hacer paneo. Usa la rueda del ratón para zoom. Arrastra cualquier nodo para reposicionarlo y observa cómo el motor físico lo acomoda. Crea una caja de selección arrastrando en vacío para mover grupos enteros.'
  },
  {
    q:'¿Cómo se comunican entre sí las aplicaciones?',
    a:'A través del App Bridge. Puedes abrir Data Studio a la izquierda con tus personajes y Book Studio a la derecha para escribir; lo que redactes consultará automáticamente la base de datos y podrás arrastrar referencias visuales del lienzo a cualquier app abierta.'
  },
  {
    q:'¿Cómo creo una historia en Librojuego Studio?',
    a:'Doble clic en el lienzo (o clic derecho) crea un nuevo nodo de historia. Selecciónalo para editar título, descripción y multimedia. Para añadir una decisión, arrastra desde el puerto de salida de un nodo hasta otro y la conexión queda creada.'
  },
  {
    q:'¿Cómo dejo que la IA escriba por mí?',
    a:'En el panel de Herramientas IA elige "Generar Opciones" para sugerencias de caminos o "Generación Masiva" para que la IA escriba la continuación completa y cree los nodos. Activa el módulo de Bitácora para que la IA recuerde lo ocurrido en páginas anteriores.'
  },
  {
    q:'¿Puedo añadir combates y tiendas a mi librojuego?',
    a:'Sí. Cambia el "Tipo" de un nodo a Combate o Tienda; se abrirá un panel para configurar la vida del monstruo, el daño o los objetos en venta. El motor de juego resuelve el resto al jugarse en Modo Jugador.'
  },
  {
    q:'¿Cómo exporto mi aventura a Word o vídeo?',
    a:'Desde la herramienta de exportación. El sistema transforma el mapa mental en un DOCX con páginas numeradas e hipervínculos automáticos ("Pasa a la página 34"), o lo compila en formatos compactos y vídeo.'
  },
  {
    q:'¿Es necesario conexión a internet?',
    a:'No para el núcleo. SILENOS prioriza la soberanía local: puedes ejecutar modelos de IA con Ollama en tu propia máquina y todos los archivos viven en tu disco duro. Las APIs en la nube son opcionales.'
  },
  {
    q:'¿Mis datos están protegidos?',
    a:'Sí. Privacidad absoluta sobre el disco duro local. SILENOS no envía tus textos ni assets a ningún servidor sin tu consentimiento explícito.'
  },
  {
    q:'¿Hay modo oscuro y claro?',
    a:'Sí. SILENOS v4 hereda preferencias visuales para cuidar la vista en sesiones largas y se ajusta desde la configuración del sistema.'
  },
];

function ProgramCard({ p, expanded, onToggle }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{
      borderTop:'1px solid var(--line)',
      transition:'background .25s',
      background: hover ? '#FAFAFA' : 'transparent'
    }}
    onMouseEnter={()=>setHover(true)}
    onMouseLeave={()=>setHover(false)}
    >
      <button onClick={onToggle} style={{
        width:'100%',display:'grid',gridTemplateColumns:'80px 1fr auto',gap:32,alignItems:'baseline',
        padding:'32px 8px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left',
        fontFamily:'inherit',color:'var(--ink)'
      }}>
        <span className="serif" style={{fontSize:18,fontStyle:'italic',color:'var(--mute)'}}>{p.n}</span>
        <span>
          <span className="serif" style={{fontSize:'clamp(22px, 2.4vw, 32px)',fontWeight:300,letterSpacing:'-.01em',display:'block'}}>
            {p.name}
          </span>
          <span style={{fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--mute)',marginTop:6,display:'block'}}>
            {p.tag}
          </span>
        </span>
        <span style={{
          fontSize:18,fontWeight:300,color:'var(--ink)',
          transition:'transform .3s',
          transform: expanded ? 'rotate(45deg)' : 'rotate(0)'
        }}>+</span>
      </button>

      <div style={{
        maxHeight: expanded ? 800 : 0,
        overflow:'hidden',
        transition:'max-height .5s cubic-bezier(.2,.8,.2,1), opacity .4s',
        opacity: expanded ? 1 : 0,
      }}>
        <div style={{
          display:'grid',gridTemplateColumns:'80px 1fr auto',gap:32,
          padding:'0 8px 40px'
        }} className="program-body">
          <span/>
          <div style={{maxWidth:680}}>
            <p style={{fontSize:15,lineHeight:1.7,color:'var(--ink-soft)',marginBottom:24,fontWeight:300}}>
              {p.desc}
            </p>
            <ul style={{listStyle:'none',padding:0,display:'flex',flexDirection:'column',gap:10}}>
              {p.features.map(f=>(
                <li key={f} style={{display:'flex',gap:14,alignItems:'baseline',fontSize:13,color:'var(--ink)',fontWeight:300}}>
                  <span style={{width:14,height:1,background:'var(--ink)',flexShrink:0,transform:'translateY(-4px)'}}/>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <span/>
        </div>
      </div>

      <style>{`
        @media (max-width:680px){
          .program-body{grid-template-columns:1fr !important;padding:0 8px 32px !important}
        }
      `}</style>
    </div>
  );
}

function FaqItem({ item, open, onToggle }) {
  return (
    <div style={{borderTop:'1px solid var(--line)'}}>
      <button onClick={onToggle} style={{
        width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',gap:24,
        padding:'24px 8px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left',
        fontFamily:'inherit',color:'var(--ink)',fontSize:15,fontWeight:400
      }}>
        <span style={{flex:1}}>{item.q}</span>
        <span style={{
          fontSize:16,color:'var(--mute)',
          transition:'transform .3s',
          transform: open ? 'rotate(45deg)' : 'rotate(0)'
        }}>+</span>
      </button>
      <div style={{
        maxHeight: open ? 400 : 0,
        overflow:'hidden',
        transition:'max-height .4s cubic-bezier(.2,.8,.2,1), opacity .35s, padding .35s',
        opacity: open ? 1 : 0,
        padding: open ? '0 8px 28px' : '0 8px'
      }}>
        <p style={{
          fontSize:14,lineHeight:1.75,color:'var(--ink-soft)',fontWeight:300,maxWidth:760
        }}>{item.a}</p>
      </div>
    </div>
  );
}

function Docs({ wine }) {
  const [tab, setTab] = React.useState('ecosistema');
  const [openProgram, setOpenProgram] = React.useState(null);
  const [openFaq, setOpenFaq] = React.useState(null);

  return (
    <section id="documentacion" data-screen-label="Documentacion" style={{
      position:'relative',padding:'180px 0',
      background:'var(--bg)',
      borderBottom:'1px solid var(--line)'
    }}>
      <div className="container">
        <div style={{textAlign:'center',marginBottom:80}}>
          <div style={{fontSize:10,letterSpacing:'.3em',textTransform:'uppercase',color:'var(--mute)',marginBottom:24}}>
            05 — Manual del sistema
          </div>
          <h2 className="serif" style={{
            fontSize:'clamp(44px, 6.4vw, 92px)',lineHeight:1,fontWeight:300,letterSpacing:'-.02em',marginBottom:24
          }}>
            Documentación e <span style={{fontStyle:'italic'}}>instrucciones</span>
          </h2>
          <p style={{fontSize:16,color:'var(--mute)',maxWidth:560,margin:'0 auto',lineHeight:1.7,fontWeight:300}}>
            Una guía completa de cada función del ecosistema. Despliega cada apartado para entrar en detalle.
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex',justifyContent:'center',gap:0,
          borderTop:'1px solid var(--line)',
          borderBottom:'1px solid var(--line)',
          marginBottom:24
        }} className="docs-tabs">
          {[
            ['ecosistema','Ecosistema'],
            ['programas','Programas'],
            ['silenos4','Guía SILENOS v4'],
            ['librojuego','Guía Librojuego'],
            ['faq','FAQ'],
          ].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              padding:'22px 28px',background:'transparent',border:'none',cursor:'pointer',
              fontFamily:'inherit',fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',
              color: tab===k ? 'var(--ink)' : 'var(--mute)',fontWeight: tab===k ? 500 : 300,
              borderBottom: tab===k ? '1px solid var(--ink)' : '1px solid transparent',
              marginBottom:-1,transition:'all .2s'
            }}>{l}</button>
          ))}
        </div>

        {/* Content */}
        {tab==='ecosistema' && (
          <div style={{maxWidth:880,margin:'0 auto',padding:'40px 0'}}>
            <p style={{fontSize:17,lineHeight:1.75,color:'var(--ink-soft)',marginBottom:48,fontWeight:300}}>
              {SISTEMA_BASE.intro}
            </p>
            {SISTEMA_BASE.blocks.map(b=>(
              <div key={b.title} style={{marginBottom:48,paddingTop:40,borderTop:'1px solid var(--line)'}}>
                <h3 className="serif" style={{fontSize:28,fontWeight:300,fontStyle:'italic',marginBottom:24,letterSpacing:'-.01em'}}>
                  {b.title}
                </h3>
                <div style={{display:'grid',gap:18}}>
                  {b.points.map(([k,v])=>(
                    <div key={k} style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:24}} className="doc-row">
                      <div style={{fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--mute)',paddingTop:3}}>{k}</div>
                      <div style={{fontSize:14,lineHeight:1.7,color:'var(--ink)',fontWeight:300}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='programas' && (
          <div style={{maxWidth:980,margin:'0 auto'}}>
            {PROGRAMAS.map((p,i)=>(
              <ProgramCard key={p.n} p={p}
                expanded={openProgram===i}
                onToggle={()=>setOpenProgram(openProgram===i ? null : i)}
              />
            ))}
            <div style={{borderTop:'1px solid var(--line)'}}/>
          </div>
        )}

        {tab==='silenos4' && (
          <div style={{maxWidth:880,margin:'0 auto',padding:'40px 0'}}>
            <p style={{fontSize:17,lineHeight:1.75,color:'var(--ink-soft)',marginBottom:48,fontWeight:300}}>
              SILENOS v4 no es solo una página: es un entorno de escritorio virtual y un lienzo infinito diseñado para potenciar tu creatividad y gestionar tus proyectos literarios o narrativos.
            </p>

            {[
              {
                t:'Características principales',
                rows:[
                  ['Entorno multitarea','Ventanas flotantes, aplicaciones simultáneas y trabajo en paralelo sin perder contexto.'],
                  ['Universo (lienzo infinito)','Tus archivos existen como nodos físicos con masa, rebote y acomodo orgánico.'],
                  ['Herramientas integradas','Book Studio, Data Studio y App Bridge se comunican entre sí de forma transparente.'],
                ]
              },
              {
                t:'Manejo de ventanas',
                rows:[
                  ['Mover','Arrastra desde la cabecera de la ventana hasta cualquier punto de la pantalla.'],
                  ['Redimensionar','Sitúa el cursor en bordes o esquinas hasta ver una flecha doble y arrastra.'],
                  ['Enfocar','Haz clic en cualquier zona de la ventana para traerla al frente.'],
                  ['Estado','Usa los botones superiores derechos para minimizar, maximizar o cerrar.'],
                ]
              },
              {
                t:'Navegación del Universo',
                rows:[
                  ['Paneo','Mantén pulsado en un espacio vacío y arrastra para mover la cámara.'],
                  ['Zoom','Rueda del ratón para acercarte a un grupo o alejarte para vista aérea.'],
                  ['Mover elemento','Clic y arrastra cualquier nodo; el motor físico hace el resto.'],
                  ['Selección múltiple','Crea una caja de selección arrastrando desde un área vacía.'],
                ]
              },
              {
                t:'Aplicaciones integradas',
                rows:[
                  ['Lanzar','Usa el menú principal o la barra inferior (Dock) para abrir una aplicación.'],
                  ['Organizar','Recomendamos Data Studio a la izquierda y Book Studio a la derecha.'],
                  ['Compartir','Exporta datos o arrastra referencias del lienzo directamente a las apps abiertas.'],
                ]
              },
            ].map(b=>(
              <div key={b.t} style={{marginBottom:48,paddingTop:40,borderTop:'1px solid var(--line)'}}>
                <h3 className="serif" style={{fontSize:28,fontWeight:300,fontStyle:'italic',marginBottom:24,letterSpacing:'-.01em'}}>
                  {b.t}
                </h3>
                <div style={{display:'grid',gap:18}}>
                  {b.rows.map(([k,v])=>(
                    <div key={k} style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:24}} className="doc-row">
                      <div style={{fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--mute)',paddingTop:3}}>{k}</div>
                      <div style={{fontSize:14,lineHeight:1.7,color:'var(--ink)',fontWeight:300}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='librojuego' && (
          <div style={{maxWidth:880,margin:'0 auto',padding:'40px 0'}}>
            <p style={{fontSize:17,lineHeight:1.75,color:'var(--ink-soft)',marginBottom:48,fontWeight:300}}>
              Librojuego Studio es tu motor para escribir, diseñar y jugar aventuras "elige tu propia aventura" impulsadas por IA. Combina escritura tradicional con mecánicas de videojuego.
            </p>

            {[
              {
                t:'Características principales',
                rows:[
                  ['Mapa visual','Cada fragmento es un nodo; las flechas son las decisiones del lector.'],
                  ['Co-escritor IA (Ollama)','Generación básica, masiva y colosal de tramas, opciones y desenlaces.'],
                  ['Sistema de rol','Combates con tiradas y enemigos; inventario, oro y tiendas integradas.'],
                  ['Modo jugador','Pasa de Editor a libro digital con imágenes, sonido y decisiones interactivas.'],
                ]
              },
              {
                t:'Crear y estructurar tu historia',
                rows:[
                  ['Crear nodo','Doble clic (o clic derecho) en un espacio vacío del lienzo.'],
                  ['Editar contenido','Selecciona el nodo y usa el panel lateral para título, descripción y multimedia.'],
                  ['Conectar decisiones','Arrastra desde el puerto de salida de un nodo hasta otro nodo.'],
                ]
              },
              {
                t:'Usar la Inteligencia Artificial',
                rows:[
                  ['Sugerir caminos','Selecciona un nodo y elige "Generar Opciones" en el panel de Herramientas IA.'],
                  ['Escribir continuación','Usa "Generación Masiva" para crear nodos y conexiones automáticamente.'],
                  ['Mantener contexto','Activa Bitácora para que la IA recuerde lo ocurrido en páginas anteriores.'],
                ]
              },
              {
                t:'Combates, tiendas y publicación',
                rows:[
                  ['Combate / Tienda','Cambia el tipo del nodo; configura vida del monstruo, daño o inventario.'],
                  ['Modo Jugador','Botón superior; juega tu aventura como lo haría un lector final.'],
                  ['Exportar a Word','Compila el árbol completo en DOCX con páginas numeradas e hipervínculos.'],
                ]
              },
            ].map(b=>(
              <div key={b.t} style={{marginBottom:48,paddingTop:40,borderTop:'1px solid var(--line)'}}>
                <h3 className="serif" style={{fontSize:28,fontWeight:300,fontStyle:'italic',marginBottom:24,letterSpacing:'-.01em'}}>
                  {b.t}
                </h3>
                <div style={{display:'grid',gap:18}}>
                  {b.rows.map(([k,v])=>(
                    <div key={k} style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:24}} className="doc-row">
                      <div style={{fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--mute)',paddingTop:3}}>{k}</div>
                      <div style={{fontSize:14,lineHeight:1.7,color:'var(--ink)',fontWeight:300}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='faq' && (
          <div style={{maxWidth:880,margin:'0 auto'}}>
            {FAQ.map((item,i)=>(
              <FaqItem key={i} item={item}
                open={openFaq===i}
                onToggle={()=>setOpenFaq(openFaq===i ? null : i)}
              />
            ))}
            <div style={{borderTop:'1px solid var(--line)'}}/>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width:780px){
          .docs-tabs{flex-wrap:wrap;justify-content:flex-start}
          .docs-tabs button{padding:16px 18px !important}
          .doc-row{grid-template-columns:1fr !important;gap:6px !important}
        }
      `}</style>
    </section>
  );
}
window.Docs = Docs;
