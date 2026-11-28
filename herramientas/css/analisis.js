"use strict";

const compareWeight = (a,b) => a[0]-b[0] || a[1]-b[1] || a[2]-b[2];
function splitSelectors(text) {
  const parts = [];
  let depth = 0, start = 0, quote = '';
  for (let i=0; i<text.length; i++) {
    const char = text[i];
    if (char==='\\') { i++; continue; }
    if (quote) { if (char===quote) quote=''; continue; }
    if (char==='"' || char==="'") { quote=char; continue; }
    if (char==='(' || char==='[') depth++;
    if (char===')' || char===']') depth--;
    if (char===',' && !depth) { parts.push(text.slice(start,i)); start=i+1; }
  }
  parts.push(text.slice(start));
  return parts.map(part=>part.trim());
}

function specificity(selector) {
  const weight = [0,0,0];
  const identifier = /^(?:[\w\-\u0080-\uffff]|\\(?:[0-9a-f]{1,6}\s?|.))+/i;
  let i = 0;
  const ident = () => {
    const name = selector.slice(i).match(identifier)?.[0] || '';
    i += name.length;
    return name;
  };
  const argument = (open,close) => {
    const start = ++i;
    let depth = 1, quote = '';
    while (i < selector.length) {
      const c = selector[i++];
      if (c==='\\') { i++; continue; }
      if (quote) { if (c===quote) quote=''; continue; }
      if (c==='"' || c==="'") { quote=c; continue; }
      if (c===open) depth++;
      if (c===close && --depth===0) return selector.slice(start,i-1);
      if (open==='(' && c==='[') { i--; argument('[',']'); }
    }
    throw new Error('Selector sin cerrar.');
  };
  const addMaximum = list => {
    const strongest = splitSelectors(list).map(specificity).sort(compareWeight).at(-1);
    strongest.forEach((n,index)=>weight[index]+=n);
  };
  while (i < selector.length) {
    const c = selector[i];
    if (c==='#' || c==='.') {
      weight[c==='#'?0:1]++;
      i++;
      ident();
    } else if (c==='[') {
      weight[1]++;
      argument('[',']');
    } else if (c===':') {
      i++;
      const double = selector[i]===':';
      if (double) i++;
      const name = ident().toLowerCase();
      const args = selector[i]==='(' ? argument('(',')') : '';
      if (double || ['before','after','first-line','first-letter'].includes(name)) {
        weight[2]++;
        if (name==='slotted' && args) addMaximum(args);
      } else if (['is','not','has'].includes(name)) {
        if (args) addMaximum(args);
      } else if (name!=='where') {
        weight[1]++;
        if (/^nth-(last-)?child$/.test(name)) {
          const clause = args.match(/\s+of\s+([\s\S]+)/i);
          if (clause) addMaximum(clause[1]);
        }
        if (['host','host-context'].includes(name) && args) addMaximum(args);
      }
    } else if (selector.slice(i,i+2)==='/*') {
      const end = selector.indexOf('*/',i+2);
      i = end < 0 ? selector.length : end+2;
    } else {
      const name = ident();
      if (!name) i++;
      if (name && (selector[i]!=='|' || selector[i+1]==='|')) weight[2]++;
    }
  }
  return weight;
}

cssTools.especificidad = {
  fields:{ selectors:area('Selectores separados por saltos de línea o comas','#menu .enlace\narticle:is(.destacado, #portada)\n:where(.tarjeta) > a:hover') },
  render(v) {
    const selectors = v.selectors.split(/\r?\n/).flatMap(splitSelectors).filter(Boolean);
    if (!selectors.length) throw new Error('Escribe uno o más selectores.');
    const entries = selectors.map(selector => {
      const sheet = new CSSStyleSheet();
      try { sheet.insertRule(selector+' {}'); }
      catch { return {selector,error:true}; }
      if (!sheet.cssRules[0]?.selectorText || /&/.test(selector.replace(/\[[^\]]*\]/g,''))) return {selector,error:true};
      return {selector, weight:specificity(sheet.cssRules[0].selectorText)};
    }).sort((a,b)=>Number(Boolean(a.error))-Number(Boolean(b.error)) || (a.weight && b.weight ? compareWeight(b.weight,a.weight) : 0));
    return { 
      html:'<table><thead><tr><th>Selector</th><th>ID</th><th>Clase</th><th>Tipo</th></tr></thead><tbody>'+entries.map(e=>'<tr><td><code>'+escapeHTML(e.selector)+'</code></td>'+(e.error?'<td colspan="3">Selector no válido o anidado</td>':e.weight.map(n=>'<td>'+n+'</td>').join(''))+'</tr>').join('')+'</tbody></table>',
      css:'table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #acb7cb;text-align:left}code{overflow-wrap:anywhere}',
      code:entries.map(e=>e.selector+' → '+(e.error?'no válido o anidado':e.weight.join(', '))).join('\n'),
      filename:'especificidad.txt',
      note:'Ordenados por peso: ID, clases/atributos/pseudoclases y tipos/pseudoelementos.'
    };
  }
};

cssTools.fuentes = {
  fields:{ families:area('Familias a comprobar, una por línea','Arial\nGeorgia\nSegoe UI\nInter\nHelvetica Neue\nTimes New Roman\nConsolas\nVerdana\nRoboto'), text:words('Texto de muestra','El veloz murciélago hindú · 0123456789'), size:number('Tamaño de muestra (px)',24,12,72)},
  render(v) {
    const families = [...new Set(v.families.split(/\r?\n/).map(f=>f.trim()).filter(Boolean))].slice(0,40);
    if (!families.length) throw new Error('Escribe al menos una familia tipográfica.');
    const context = document.createElement('canvas').getContext('2d');
    const fallback = ['monospace','serif','sans-serif'];
    const probe = 'mmmWWWWiii0123456789';
    const measure = stack => {
      context.font = '64px '+stack;
      return context.measureText(probe).width;
    };
    const found = families.map(name=>{
      const quoted = '"'+name.replace(/["\\]/g,'\\$&')+'"';
      return [name,fallback.some(base=>Math.abs(measure(quoted+', '+base)-measure(base))>.01)];
    });
    const html = found.map(([name,available])=>'<div><b>'+escapeHTML(name)+'</b> · '+(available?'Detectada':'No detectada')+'<p style="font-family:'+escapeHTML('"'+name.replace(/[;"\\]/g,'\\$&')+'", sans-serif')+'">'+escapeHTML(v.text)+'</p></div>').join('');
    return sample('p{font-size:'+v.size+'px;margin:.25em 0 .75em;overflow-wrap:anywhere}',html,{
      code:found.map(([name,yes])=>name+': '+(yes?'detectada':'no detectada')).join('\n'),filename:'fuentes.txt',
      note:'Detección por comparación de métricas. El navegador puede ocultar fuentes locales o usar una sustitución.'
    });
  }
};
