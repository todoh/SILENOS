"use strict";

cssTools.grid = {
  fields:{ columns:words('Columnas CSS','1fr 1fr 1fr'), rows:words('Filas CSS','auto auto auto'), gap:number('Separación',12,0,60), areas:area('Áreas: nombres separados por espacios. Una fila por línea.','cabecera cabecera cabecera\nmenu contenido contenido\npie pie pie')},
  render(v) {
    if (!CSS.supports('grid-template-columns',v.columns) || !CSS.supports('grid-template-rows',v.rows)) throw new Error('Revisa las medidas de Grid. Por ejemplo: 1fr 2fr 1fr.');
    const rows = readRows(v.areas);
    const names = [...new Set(rows.flat())].filter(x=>x!=='.');
    if (!rows.every(row=>row.every(x=>x==='.' || /^[a-z][a-z0-9-]*$/i.test(x)))) throw new Error('Usa nombres como cabecera, o un punto para celdas vacías.');
    const areas = rows.map(row=>'"'+row.join(' ')+'"').join(' ');
    if (areas && !CSS.supports('grid-template-areas',areas)) throw new Error('Todas las filas deben tener la misma longitud y cada área debe formar un rectángulo.');
    const css = block('.grid',['display: grid;','grid-template-columns: '+v.columns+';','grid-template-rows: '+v.rows+';','gap: '+v.gap+'px;',...(areas?['grid-template-areas: '+areas+';']:[])])
      + names.map(name=>'\n'+block('.area-'+name,['grid-area: '+name+';'])).join('');
    const html = '<div class="grid">\n'+(areas?names.map(name=>'  <div class="item area-'+name+'">'+name+'</div>').join('\n'):boxes(6))+'\n</div>';
    return sample(css,html,{code:'<style>\n'+css+'\n</style>\n\n'+html,filename:'grid.html'});
  }
};
cssTools.flexbox = {
  fields:{ direction:select('Dirección',['row','row-reverse','column','column-reverse']), justify:select('Eje principal',['flex-start','center','flex-end','space-between','space-around','space-evenly']), align:select('Eje transversal',['stretch','flex-start','center','flex-end','baseline']), wrap:select('Ajuste',['wrap','nowrap','wrap-reverse']), content:select('Alineación de líneas',['stretch','center','flex-start','flex-end','space-between','space-around']), gap:number('Separación',10,0,50), count:number('Elementos',6,1,18), basis:number('Tamaño inicial de cada elemento (px)',75,30,230)},
  render(v) {
    const css = block('.flex',['display: flex;','flex-direction: '+v.direction+';','justify-content: '+v.justify+';','align-items: '+v.align+';','align-content: '+v.content+';','flex-wrap: '+v.wrap+';','gap: '+v.gap+'px;','min-height: 245px;'])+'\n'+block('.flex > *',['flex-basis: '+v.basis+'px;']);
    return sample(css,'<div class="flex">'+boxes(v.count)+'</div>',{height:410});
  }
};
cssTools['clip-path'] = {
  fields:{ type:select('Forma',['Polígono','Círculo']), image:upload('Imagen opcional'), points:area('Vértices del polígono. X Y en % por línea','50 0\n100 100\n0 100'), radius:number('Radio del círculo (%)',42,0,100), x:number('Centro X (%)',50,0,100), y:number('Centro Y (%)',50,0,100)},
  render(v) {
    let shape = 'circle('+v.radius+'% at '+v.x+'% '+v.y+'%)';
    if (v.type==='Polígono') {
      const points = readRows(v.points);
      if (points.length < 3 || !points.every(row=>row.length===2 && row.every(n=>numeric(n,0,100)))) throw new Error('Introduce tres o más pares X Y entre 0 y 100.');
      shape = 'polygon('+points.map(row=>row.map(n=>Number(n)+'%').join(' ')).join(', ')+')';
    }
    const rule = block('.demo',['clip-path: '+shape+';']);
    return sample('.demo{background:'+(safeImage(v.image)||'linear-gradient(135deg,#677ced,#fd9b6b)')+' center / cover}\n'+rule,'<div class="demo"></div>',{code:rule});
  }
};
cssTools.animaciones = {
  fields:{ frames:area('Fotogramas: % X(px) Y(px) giro(°) escala opacidad','0 0 0 0 1 1\n50 0 -55 180 0.75 0.45\n100 0 0 360 1 1'), duration:number('Duración (s)',2,0.1,30,0.1), ease:select('Curva',['ease-in-out','linear','ease','ease-in','ease-out']), loop:toggle('Repetir continuamente'), reverse:toggle('Alternar dirección',false)},
  render(v) {
    const frames = readRows(v.frames);
    if (frames.length < 2 || !frames.every(row=>row.length===6 && row.every((n,i)=>numeric(n,[0,-600,-600,-1440,0,0][i],[100,600,600,1440,8,1][i])))) throw new Error('Introduce al menos dos fotogramas válidos. La opacidad va de 0 a 1.');
    const lines = frames.sort((a,b)=>Number(a[0])-Number(b[0])).map(row=>{
      const [p,x,y,angle,scale,opacity] = row.map(Number);
      return '  '+p+'% { transform: translate('+x+'px, '+y+'px) rotate('+angle+'deg) scale('+scale+'); opacity: '+opacity+'; }';
    });
    return sample(block('.demo',['width: 85px;','height: 85px;','margin-top: 85px;','border-radius: 16px;','animation: movimiento '+v.duration+'s '+v.ease+' '+(v.loop?'infinite':'1')+' '+(v.reverse?'alternate':'normal')+' both;'])+'\n@keyframes movimiento {\n'+lines.join('\n')+'\n}\n@media (prefers-reduced-motion: reduce) { .demo { animation: none; } }');
  }
};
cssTools.loaders = {
  fields:{ kind:select('Indicador',['Aro','Puntos','Barra']), ink:color('Color','#5542c8'), size:number('Tamaño (px)',56,16,140), duration:number('Duración (s)',1,0.2,5,0.1)},
  render(v) {
    const time = v.duration+'s';
    const rules = {
      Aro:['.loader{width:'+v.size+'px;aspect-ratio:1;border:5px solid '+rgba(v.ink,.2)+';border-top-color:'+v.ink+';border-radius:50%;animation:spin '+time+' linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}',''],
      Puntos:['.loader{display:flex;gap:6px}.loader span{width:'+Math.round(v.size/3)+'px;aspect-ratio:1;background:'+v.ink+';border-radius:50%;animation:bounce '+time+' ease-in-out infinite alternate}.loader span:nth-child(2){animation-delay:'+v.duration/5+'s}.loader span:nth-child(3){animation-delay:'+v.duration*2/5+'s}\n@keyframes bounce{from{opacity:.25;transform:translateY(5px)}to{opacity:1;transform:translateY(-5px)}}','<span></span><span></span><span></span>'],
      Barra:['.loader{width:'+v.size*2+'px;max-width:100%;height:8px;background:'+rgba(v.ink,.2)+';overflow:hidden;border-radius:8px}.loader::after{content:"";display:block;width:40%;height:100%;background:'+v.ink+';animation:slide '+time+' ease-in-out infinite alternate}\n@keyframes slide{to{transform:translateX(150%)}}','']
    };
    const [css, inner] = rules[v.kind];
    const markup = '<div class="loader" role="status" aria-label="Cargando">'+inner+'</div>';
    const styles = css+'\n@media (prefers-reduced-motion: reduce){.loader,.loader span,.loader::after{animation:none}}';
    return sample(styles,markup,{code:'<style>\n'+styles+'\n</style>\n'+markup,filename:'loader.html'});
  }
};
cssTools['tipografia-fluida'] = {
  fields:{ small:number('Ancho mínimo (px)',320,100,4000), large:number('Ancho máximo (px)',1440,100,5000), min:number('Tamaño al ancho mínimo (px)',18,8,160), max:number('Tamaño al ancho máximo (px)',48,8,220), preview:number('Ancho de la vista previa (px)',400,200,1600), text:words('Texto de ejemplo','Tipografía fluida')},
  render(v) {
    if (v.small>=v.large) throw new Error('El ancho máximo debe ser mayor que el mínimo.');
    const slope = (v.max-v.min)/(v.large-v.small);
    const rounded = n=>Number(n.toFixed(6));
    const intercept = rounded(v.min-slope*v.small);
    const fluid = 'calc('+intercept+'px '+(slope<0?'-':'+')+' '+rounded(Math.abs(slope)*100)+'vw)';
    return sample(block('.fluid',['font-size: clamp('+Math.min(v.min,v.max)+'px, '+fluid+', '+Math.max(v.min,v.max)+'px);','overflow-wrap: anywhere;']),'<p class="fluid">'+escapeHTML(v.text)+'</p>',{width:v.preview,height:160});
  }
};
cssTools.viewports = {
  fields:{ preset:select('Tamaño inicial',['Móvil · 375','Tableta · 768','Escritorio · 1280','Personalizado']), width:number('Ancho personalizado',520,200,2200), height:number('Altura',460,160,1300), html:area('HTML','<main class="layout"><article>Contenido</article><aside>Barra lateral</aside></main>'), css:area('CSS','.layout { display: grid; gap: 1rem; }\narticle, aside { background: #dce1ff; color: #171743; padding: 1rem; }\n@media (min-width: 700px) { .layout { grid-template-columns: 2fr 1fr; } }') },
  render(v) {
    const width = v.preset==='Personalizado'?v.width:Number(v.preset.split(' · ')[1]);
    return sample(v.css,v.html || ' ',{width,height:v.height,raw:true,note:width+' × '+v.height+' px. La vista se puede desplazar si es más ancha que la pantalla.'});
  }
};
cssTools['tarjetas-3d'] = {
  fields:{ perspective:number('Perspectiva',650,150,2000), x:number('Rotación X',-15,-80,80), y:number('Rotación Y',25,-80,80), depth:number('Profundidad del texto',42,0,100), face:color('Color de la tarjeta','#624bdb'), text:words('Texto','Tarjeta 3D')},
  render(v) {
    const css = [block('.scene',['perspective: '+v.perspective+'px;','padding: 28px;']),block('.card3d',['display: grid;','place-items: center;','width: min(100%, 280px);','height: 150px;','margin: auto;','color: white;','background: '+v.face+';','border-radius: 18px;','transform-style: preserve-3d;','transform: rotateX('+v.x+'deg) rotateY('+v.y+'deg);']),block('.card3d span',['transform: translateZ('+v.depth+'px);','font: 800 1.4rem system-ui;'])].join('\n');
    return sample(css,'<div class="scene"><div class="card3d"><span>'+escapeHTML(v.text)+'</span></div></div>');
  }
};
cssTools.skeleton = {
  fields:{ avatar:toggle('Añadir avatar'), rows:number('Líneas',4,1,10), base:color('Base','#cdd4e0'), highlight:color('Brillo','#f9faff'), radius:number('Radio (px)',8,0,30), speed:number('Duración (s)',1.5,0.3,5,0.1)},
  render(v) {
    const css = [
      block('.skeleton',['display: grid;','gap: 11px;','max-width: 420px;']),
      block('.skeleton span',['display: block;','height: 17px;','border-radius: '+v.radius+'px;','background: linear-gradient(100deg, '+v.base+' 25%, '+v.highlight+' 50%, '+v.base+' 75%);','background-size: 220% 100%;','animation: brillo '+v.speed+'s linear infinite;']),
      '.skeleton .avatar { width: 56px; height: 56px; border-radius: 50%; }\n.skeleton span:last-child:not(.avatar) { width: 68%; }',
      '@keyframes brillo { from { background-position: 165% 0; } to { background-position: -60% 0; } }\n@media (prefers-reduced-motion: reduce) { .skeleton span { animation: none; } }'
    ].join('\n');
    const html = '<div class="skeleton" aria-hidden="true">'+(v.avatar?'<span class="avatar"></span>':'')+'<span></span>'.repeat(v.rows)+'</div>';
    return sample(css,html,{code:'<style>\n'+css+'\n</style>\n'+html,filename:'skeleton.html'});
  }
};
cssTools.reset = {
  fields:{ sizing:toggle('Tamaño de cajas uniforme'), margins:toggle('Eliminar margen del body'), text:toggle('Tipografía base'), forms:toggle('Controles heredan tipografía'), images:toggle('Medios adaptables'), headings:toggle('Equilibrar líneas de títulos'), motion:toggle('Respetar movimiento reducido') },
  render(v) {
    const rules = {sizing:'*, *::before, *::after { box-sizing: border-box; }',margins:'body { margin: 0; }',text:'body { font: 1rem/1.5 system-ui, sans-serif; }',forms:'button, input, select, textarea { font: inherit; }',images:'img, video, svg { max-inline-size: 100%; block-size: auto; }',headings:'h1, h2, h3 { text-wrap: balance; }',motion:'@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; } }'};
    const css = Object.keys(rules).filter(key=>v[key]).map(key=>rules[key]).join('\n\n');
    return sample(css,'<h1>Ejemplo de un título de varias palabras para un sitio web</h1><p>Un párrafo y controles de formulario.</p><input placeholder="Campo de texto"> <button>Botón</button>',{raw:true});
  }
};

cssTools['clip-path'].setup = ({form, inputs}) => {
  const stage = document.createElement('div');
  stage.className = 'css-polygon';
  stage.setAttribute('aria-label','Editor de vértices');
  form.append(stage);
  const parse = () => readRows(inputs.points.value);
  let selected = 0;
  function plot() {
    stage.hidden = inputs.type.value !== 'Polígono';
    const points = parse();
    stage.replaceChildren();
    if (!points.every(row=>row.length===2 && row.every(n=>numeric(n,0,100)))) return;
    const shape = document.createElement('div');
    shape.className = 'css-polygon-fill';
    shape.style.clipPath = 'polygon('+points.map(row=>row.map(n=>Number(n)+'%').join(' ')).join(',')+')';
    stage.append(shape);
    points.forEach(([x,y],i)=>{
      const point = document.createElement('button');
      point.type = 'button';
      point.style.left = x+'%';
      point.style.top = y+'%';
      point.textContent = i+1;
      point.setAttribute('aria-label','Mover vértice '+(i+1)+' con las flechas');
      point.addEventListener('pointerdown', event=>{
        event.preventDefault();
        selected = i;
        stage.setPointerCapture(event.pointerId);
      });
      point.addEventListener('keydown',event=>{
        const delta = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
        if (!delta) return;
        event.preventDefault();
        move(i,Number(x)+delta[0],Number(y)+delta[1]);
        stage.querySelectorAll('button')[i]?.focus();
      });
      stage.append(point);
    });
  }
  function move(i,x,y) {
    const fit = n=>Math.round(Math.max(0,Math.min(100,n)));
    const points = parse();
    if (!points[i]) return;
    points[i] = [fit(x),fit(y)];
    inputs.points.value = points.map(row=>row.join(' ')).join('\n');
    inputs.points.dispatchEvent(new Event('input'));
  }
  stage.addEventListener('pointermove',event=>{
    if (!stage.hasPointerCapture(event.pointerId)) return;
    const rect = stage.getBoundingClientRect();
    move(selected,(event.clientX-rect.left)/rect.width*100,(event.clientY-rect.top)/rect.height*100);
  });
  inputs.points.addEventListener('input',plot);
  inputs.type.addEventListener('input',plot);
  plot();
};

cssTools.animaciones.fields.position = number('Posición en la línea de tiempo (%)',0,0,100);
cssTools.animaciones.fields.play = toggle('Reproducir vista previa');
const animationRender = cssTools.animaciones.render;
cssTools.animaciones.render = v => {
  const output = animationRender(v);
  if (!v.play) output.previewCSS = output.css + '\n.demo { animation-play-state: paused; animation-delay: -'+v.duration*v.position/100+'s; animation-iteration-count: 1; animation-direction: normal; }';
  return output;
};
