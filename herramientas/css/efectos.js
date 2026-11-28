"use strict";

cssTools.degradados = {
  fields: { type: select('Tipo', ['linear','radial','conic']), angle:number('Ángulo (°)', 120, 0, 360), x:number('Centro X (%)',50,0,100), y:number('Centro Y (%)',50,0,100), stops:area('Paradas: color HEX y posición (%) por línea','#624bdb 0\n#ed698f 55\n#ffce78 100') },
  render(v) {
    const stops = readRows(v.stops);
    if (stops.length < 2 || !stops.every(([c,p,...rest]) => hexColor(c) && numeric(p,0,100) && !rest.length)) throw new Error('Introduce dos o más paradas como #624bdb 25.');
    const center = 'at ' + v.x + '% ' + v.y + '%';
    const head = {linear:v.angle+'deg',radial:'circle '+center,conic:'from '+v.angle+'deg '+center};
    return panel(['background: '+v.type+'-gradient('+head[v.type]+', '+stops.map(([c,p])=>c+' '+p+'%').join(', ')+');']);
  }
};

function shadows(text) {
  return {
    fields: { layers:area(text ? 'Capas: X Y desenfoque HEX por línea' : 'Capas: X Y desenfoque extensión HEX [inset] por línea', text ? '0 0 8 #f77cff\n2 3 2 #32165e' : '0 14 30 -8 #666688\n0 3 8 0 #aaaabb'), foreground:color('Color principal',text ? '#ffffff' : '#f3f1ff'), background:color('Fondo',text ? '#24153b' : '#e8edf3') },
    render(v) {
      const rows = readRows(v.layers);
      const count = text ? 3 : 4;
      if (!rows.length || !rows.every(row => row.length >= count+1 && row.length <= count+(text?1:2) && row.slice(0,count).every((n,i)=>numeric(n,i===2?0:-500,500)) && hexColor(row[count]) && (!row[count+1] || row[count+1]==='inset'))) throw new Error('Revisa las capas. Usa medidas en píxeles y un color HEX por línea.');
      const css = rows.map(row=>row.slice(0,count).map(n=>Number(n)+'px').concat(row.slice(count)).join(' '));
      const rule = block('.demo',[
        (text?'text-shadow':'box-shadow')+': '+css.join(', ')+';',
        text?'color: '+v.foreground+';':'background: '+v.foreground+';',
        ...(text?['font: 800 56px system-ui;','background: transparent;','text-align: center;','height: auto;']:[])
      ]);
      return sample(rule+'\n'+block('body',['background: '+v.background+';']), text?'<div class="demo">SILENOS</div>':'<div class="demo"></div>', {code:rule});
    }
  };
}
cssTools.sombras = shadows(false);
cssTools['sombras-texto'] = shadows(true);
cssTools.glassmorphism = {
  fields:{tint:color('Tinte','#ffffff'), opacity:number('Opacidad (%)',28,0,100), blur:number('Desenfoque',14,0,80), border:number('Opacidad del borde (%)',55,0,100), radius:number('Radio',24,0,80)},
  render(v) {
    const rules = block('.demo',['background: '+rgba(v.tint,v.opacity/100)+';', 'backdrop-filter: blur('+v.blur+'px);','border: 1px solid '+rgba(v.tint,v.border/100)+';', 'border-radius: '+v.radius+'px;']);
    return sample('body{background:radial-gradient(circle at 30% 20%,#fbb677,transparent 35%),linear-gradient(125deg,#7171eb,#27b7a0)}\n'+rules,'<div class="demo"></div>',{code:rules});
  }
};
cssTools.neumorphism = {
  fields:{surface:color('Superficie','#e2e8f1'), distance:number('Distancia',12,0,45), blur:number('Desenfoque',24,0,90), intensity:number('Intensidad (%)',25,0,100), radius:number('Radio',24,0,100), inset:toggle('Efecto hundido',false)},
  render(v) {
    const rgb = v.surface.slice(1).match(/../g).map(x=>parseInt(x,16));
    const tint = target => '#'+rgb.map(x=>Math.round(x+(target-x)*v.intensity/100).toString(16).padStart(2,'0')).join('');
    const shadow = (offset,tone) => (v.inset?'inset ':'')+offset+'px '+offset+'px '+v.blur+'px '+tone;
    const rules = block('.demo',['background: '+v.surface+';','border-radius: '+v.radius+'px;','box-shadow: '+shadow(v.distance,tint(0))+', '+shadow(-v.distance,tint(255))+';']);
    return sample('body { background: '+v.surface+'; }\n'+rules,'<div class="demo"></div>',{code:rules});
  }
};
cssTools.bordes = {
  fields:Object.fromEntries(['X','Y'].flatMap(axis=>['Superior izquierda','Superior derecha','Inferior derecha','Inferior izquierda'].map((name,i)=>[axis+i,number(name+' · '+axis+' (%)',[25,50,15,35][i],0,100)]))),
  render(v) {
    const radii = axis => Array.from({length:4},(_,i)=>v[axis+i]+'%').join(' ');
    return panel(['border-radius: '+radii('X')+' / '+radii('Y')+';']);
  }
};
cssTools.filtros = {
  fields:{image:upload('Imagen opcional'), blur:number('Desenfoque (px)',0,0,35), bright:number('Brillo (%)',110,0,250), contrast:number('Contraste (%)',115,0,250), saturation:number('Saturación (%)',120,0,250), hue:number('Matiz (°)',0,0,360), shadow:number('Sombra (px)',8,0,35), shade:color('Color de sombra','#334475')},
  render(v) {
    const filter = 'blur('+v.blur+'px) brightness('+v.bright+'%) contrast('+v.contrast+'%) saturate('+v.saturation+'%) hue-rotate('+v.hue+'deg) drop-shadow(0 '+v.shadow+'px '+v.shadow+'px '+v.shade+')';
    return panel(['background: '+(safeImage(v.image)||'linear-gradient(130deg,#374ff2,#fa715e,#ffed81)')+' center / cover;','filter: '+filter+';']);
  }
};
cssTools.cursores = {
  fields:{ preset:select('Puntero estándar',['auto','pointer','crosshair','grab','grabbing','text','help','wait','not-allowed','move','zoom-in','cell','copy','progress','ew-resize','ns-resize','none']), image:upload('Imagen de cursor (recomendado: PNG de 32 × 32)'), x:number('Punto activo X',0,0,127), y:number('Punto activo Y',0,0,127)},
  render(v) {
    const fallback = v.preset==='auto'?'auto':v.preset;
    return sample(block('.demo',['cursor: '+(v.image?safeImage(v.image)+' '+v.x+' '+v.y+', ':'')+fallback+';','display: grid;','place-items: center;']),'<div class="demo">Mueve el puntero sobre esta zona</div>');
  }
};
cssTools.scrollbar = {
  fields:{ width:number('Ancho (px)',14,4,36), thumb:color('Control','#6652bf'), track:color('Canal','#dcd8ee'), radius:number('Radio (px)',8,0,25), border:number('Borde (px)',2,0,8)},
  render(v) {
    const css = [
      '@supports not selector(::-webkit-scrollbar) {\n  .demo { scrollbar-color: '+v.thumb+' '+v.track+'; scrollbar-width: '+(v.width<12?'thin':'auto')+'; }\n}',
      block('.demo',['overflow: auto;','padding: 16px;','background: #fff;']),
      block('.demo::-webkit-scrollbar',['width: '+v.width+'px;','height: '+v.width+'px;']),
      block('.demo::-webkit-scrollbar-track',['background: '+v.track+';']),
      block('.demo::-webkit-scrollbar-thumb',['background: '+v.thumb+';','border-radius: '+v.radius+'px;','border: '+v.border+'px solid '+v.track+';'])
    ].join('\n');
    return sample(css,'<div class="demo" tabindex="0" aria-label="Área desplazable">'+boxes(12)+'</div>',{note:'Firefox utiliza el ancho estándar auto o thin.'});
  }
};
cssTools.botones = {
  fields:{ label:words('Texto','Empezar'), fill:color('Fondo','#5542c8'), ink:color('Texto','#ffffff'), hover:color('Fondo al pasar el puntero','#392697'), radius:number('Radio',12,0,50), padding:number('Relleno lateral',24,4,60), movement:select('Microinteracción',['Elevar','Ampliar','Solo color'])},
  render(v) {
    const transform = {Elevar:'translateY(-4px)',Ampliar:'scale(1.08)','Solo color':'none'};
    return sample([
      block('.button',['background: '+v.fill+';','color: '+v.ink+';','border: 0;','border-radius: '+v.radius+'px;','padding: 12px '+v.padding+'px;','font: 600 1rem system-ui;','cursor: pointer;','transition: transform .18s, background .18s;']),
      block('.button:hover',['background: '+v.hover+';','transform: '+transform[v.movement]+';']),
      block('.button:active',['transform: scale(.97);']),
      block('.button:focus-visible',['outline: 2px solid currentColor;','outline-offset: 3px;','box-shadow: 0 0 0 6px #24243b;']),
      '@media (prefers-reduced-motion: reduce) { .button { transition: none; } }'
    ].join('\n'),'<button type="button" class="button">'+escapeHTML(v.label)+'</button>');
  }
};
cssTools.patrones = {
  fields:{ kind:select('Patrón',['Rayas','Cuadros','Puntos','Zigzag']), base:color('Fondo','#eeeaff'), ink:color('Motivo','#5441c6'), size:number('Tamaño (px)',24,4,100), angle:number('Inclinación de rayas (°)',45,0,360)},
  render(v) {
    const patterns = {
      Rayas:'repeating-linear-gradient('+v.angle+'deg,'+v.ink+' 0 '+v.size/2+'px,transparent 0 '+v.size+'px)',
      Cuadros:'conic-gradient('+v.ink+' 25%,transparent 0 50%,'+v.ink+' 0 75%,transparent 0)',
      Puntos:'radial-gradient(circle,'+v.ink+' 22%,transparent 25%)',
      Zigzag:'linear-gradient(135deg,'+v.ink+' 25%,transparent 25%),linear-gradient(225deg,'+v.ink+' 25%,transparent 25%),linear-gradient(315deg,'+v.ink+' 25%,transparent 25%),linear-gradient(45deg,'+v.ink+' 25%,transparent 25%)'
    };
    return panel(['background-color: '+v.base+';', 'background-image: '+patterns[v.kind]+';', 'background-size: '+(v.kind==='Rayas'?'auto':v.size+'px '+v.size+'px')+';', ...(v.kind==='Zigzag'?['background-position: 0 0, 0 0, '+v.size/2+'px '+v.size/2+'px, '+v.size/2+'px '+v.size/2+'px;']:[])]);
  }
};
cssTools['texto-degradado'] = {
  fields:{ label:words('Texto','Diseño en color'), start:color('Color inicial','#4820aa'), end:color('Color final','#c92669'), angle:number('Ángulo',90,0,360), size:number('Tamaño (px)',58,16,130), image:upload('Imagen de relleno opcional')},
  render(v) {
    return sample(block('.gradient-text',['font: 850 '+v.size+'px / 1.1 system-ui;','overflow-wrap: anywhere;','background: '+(safeImage(v.image)||'linear-gradient('+v.angle+'deg, '+v.start+', '+v.end+')')+' center / cover;','background-clip: text;','color: transparent;']),'<div class="gradient-text">'+escapeHTML(v.label)+'</div>');
  }
};
cssTools.triangulos = {
  fields:{ kind:select('Figura',['Triángulo','Flecha']), angle:number('Orientación (° en sentido horario)',0,0,360), size:number('Tamaño',100,20,170), fill:color('Color','#624bdb')},
  render(v) {
    const shape = v.kind==='Flecha'?'0 34%,55% 34%,55% 0,100% 50%,55% 100%,55% 66%,0 66%':'0 0,100% 50%,0 100%';
    return panel(['width: '+v.size+'px;','height: '+v.size+'px;','background: '+v.fill+';','clip-path: polygon('+shape+');','transform: rotate('+v.angle+'deg);']);
  }
};
